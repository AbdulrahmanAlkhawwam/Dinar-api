import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { InMemoryPrisma } from './utils/in-memory-prisma';

const ADMIN = { email: 'admin@example.com', password: 'admin-password' };

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: InMemoryPrisma;
  let adminId: string;
  let adminToken: string;
  let userToken: string;
  let userId: string;

  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    prisma = new InMemoryPrisma();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    // Mirror the setup in src/main.ts createApp().
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: ADMIN.email,
        password: await bcrypt.hash(ADMIN.password, 12),
        role: Role.ADMIN,
      },
    });
    adminId = admin.id as string;

    const login = await http()
      .post('/api/v1/auth/login')
      .send(ADMIN)
      .expect(200);
    adminToken = (login.body as { accessToken: string }).accessToken;

    const register = await http()
      .post('/api/v1/auth/register')
      .send({
        name: 'Regular User',
        email: 'user@example.com',
        password: 'user-password',
      })
      .expect(201);
    const registered = register.body as {
      accessToken: string;
      user: { id: string };
    };
    userToken = registered.accessToken;
    userId = registered.user.id;
  });

  afterEach(async () => {
    await app.close();
  });

  const routes = () =>
    [
      ['post', '/api/v1/users'],
      ['get', '/api/v1/users'],
      ['get', `/api/v1/users/${userId}`],
      ['patch', `/api/v1/users/${userId}`],
      ['delete', `/api/v1/users/${userId}`],
    ] as const;

  const newUser = {
    name: 'Created User',
    email: 'created@example.com',
    password: 'created-password',
  };

  describe('authentication and authorization', () => {
    it('rejects every route with 401 when no token is sent', async () => {
      for (const [method, path] of routes()) {
        await http()[method](path).send(newUser).expect(401);
      }
    });

    it('rejects HEAD /users with 401 when no token is sent', async () => {
      await http().head('/api/v1/users').expect(401);
    });

    it('rejects every route with 403 for a USER token', async () => {
      for (const [method, path] of routes()) {
        await http()
          [method](path)
          .set('Authorization', `Bearer ${userToken}`)
          .send(newUser)
          .expect(403);
      }
      expect(prisma.users.has(userId)).toBe(true);
    });

    it('does not let a USER make themselves an admin', async () => {
      await http()
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...newUser, role: 'ADMIN' })
        .expect(403);
      await http()
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);
      expect(prisma.users.get(userId)?.role).toBe(Role.USER);
    });
  });

  describe('as an admin', () => {
    const asAdmin = <T extends request.Test>(req: T) =>
      req.set('Authorization', `Bearer ${adminToken}`);

    it('POST /users creates a user (201) without exposing secrets', async () => {
      const res = await asAdmin(http().post('/api/v1/users'))
        .send(newUser)
        .expect(201);
      expect(res.body).toMatchObject({
        name: newUser.name,
        email: newUser.email,
        role: 'USER',
      });
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('refreshToken');
    });

    it('GET /users returns a bare array of users (200)', async () => {
      const res = await asAdmin(http().get('/api/v1/users')).expect(200);
      const users = res.body as Record<string, unknown>[];
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(2);
      for (const user of users) {
        expect(Object.keys(user).sort()).toEqual(
          [
            'avatar',
            'createdAt',
            'email',
            'id',
            'name',
            'phone',
            'role',
            'updatedAt',
          ].sort(),
        );
      }
    });

    it('HEAD /users returns 200', async () => {
      await asAdmin(http().head('/api/v1/users')).expect(200);
    });

    it('GET /users/:id returns the user (200), or 404', async () => {
      const res = await asAdmin(http().get(`/api/v1/users/${userId}`)).expect(
        200,
      );
      expect(res.body).toMatchObject({ id: userId, email: 'user@example.com' });
      await asAdmin(http().get('/api/v1/users/missing')).expect(404);
    });

    it('PATCH /users/:id accepts { role }', async () => {
      const res = await asAdmin(http().patch(`/api/v1/users/${userId}`))
        .send({ role: 'ADMIN' })
        .expect(200);
      expect(res.body).toMatchObject({ id: userId, role: 'ADMIN' });
    });

    it('PATCH /users/:id accepts the full profile and null phone/avatar', async () => {
      await asAdmin(http().patch(`/api/v1/users/${userId}`))
        .send({ phone: '+15550100', avatar: 'https://example.com/a.png' })
        .expect(200);

      const res = await asAdmin(http().patch(`/api/v1/users/${userId}`))
        .send({
          name: 'Renamed',
          email: 'renamed@example.com',
          phone: null,
          avatar: null,
          role: 'USER',
        })
        .expect(200);
      expect(res.body).toMatchObject({
        name: 'Renamed',
        email: 'renamed@example.com',
        phone: null,
        avatar: null,
        role: 'USER',
      });
    });

    it('DELETE /users/:id returns the deleted user (200)', async () => {
      const res = await asAdmin(
        http().delete(`/api/v1/users/${userId}`),
      ).expect(200);
      expect(res.body).toMatchObject({ id: userId, email: 'user@example.com' });
      expect(res.body).not.toHaveProperty('password');
      expect(prisma.users.has(userId)).toBe(false);
    });

    it('returns 409 for a duplicate email on create and update', async () => {
      await asAdmin(http().post('/api/v1/users'))
        .send({ ...newUser, email: 'user@example.com' })
        .expect(409);
      await asAdmin(http().patch(`/api/v1/users/${userId}`))
        .send({ email: ADMIN.email })
        .expect(409);
    });

    it('rejects a password shorter than 8 characters (400)', async () => {
      await asAdmin(http().post('/api/v1/users'))
        .send({ ...newUser, password: 'short' })
        .expect(400);
      await asAdmin(http().patch(`/api/v1/users/${userId}`))
        .send({ password: 'short' })
        .expect(400);
    });

    it('cannot delete their own account', async () => {
      const res = await asAdmin(
        http().delete(`/api/v1/users/${adminId}`),
      ).expect(403);
      expect((res.body as { message: string }).message).toMatch(/own account/);
      expect(prisma.users.has(adminId)).toBe(true);
    });

    it('cannot change their own role', async () => {
      const res = await asAdmin(http().patch(`/api/v1/users/${adminId}`))
        .send({ role: 'USER' })
        .expect(403);
      expect((res.body as { message: string }).message).toMatch(/own role/);
      expect(prisma.users.get(adminId)?.role).toBe(Role.ADMIN);
    });

    it('can still edit their own profile when the role is unchanged', async () => {
      const res = await asAdmin(http().patch(`/api/v1/users/${adminId}`))
        .send({ name: 'Head Admin', role: 'ADMIN' })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Head Admin', role: 'ADMIN' });
    });
  });

  describe('passwords set through /users work with /auth/login', () => {
    it('a user created through POST /users can log in', async () => {
      await http()
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      const res = await http()
        .post('/api/v1/auth/login')
        .send({ email: newUser.email, password: newUser.password })
        .expect(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('a password changed through PATCH /users/:id works and ends sessions', async () => {
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com', password: 'user-password' })
        .expect(200);
      expect(prisma.users.get(userId)?.refreshToken).not.toBeNull();

      await http()
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'changed-password' })
        .expect(200);
      expect(prisma.users.get(userId)?.refreshToken).toBeNull();

      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com', password: 'user-password' })
        .expect(401);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com', password: 'changed-password' })
        .expect(200);
    });
  });

  describe('/auth/register', () => {
    it('stays public and returns 409 for a duplicate email', async () => {
      await http()
        .post('/api/v1/auth/register')
        .send({
          name: 'Someone',
          email: 'user@example.com',
          password: 'another-password',
        })
        .expect(409);
    });
  });
});
