import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from './users.service';

const storedUser = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: null,
  avatar: null,
  role: 'USER',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const uniqueEmailError = () =>
  new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`email`)',
    { code: 'P2002', clientVersion: Prisma.prismaVersion.client },
  );

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn().mockResolvedValue(storedUser),
        update: jest.fn().mockResolvedValue(storedUser),
        findUnique: jest.fn().mockResolvedValue(storedUser),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  const dataPassedTo = (mock: jest.Mock) =>
    (mock.mock.calls[0] as [{ data: Record<string, unknown> }])[0].data;

  describe('create', () => {
    it('stores a bcrypt hash of the password, not the plain password', async () => {
      await service.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'plain-password',
      });

      const data = dataPassedTo(prisma.user.create);
      expect(data.password).not.toBe('plain-password');
      expect(data.password).toMatch(/^\$2[aby]\$12\$/);
      await expect(
        bcrypt.compare('plain-password', data.password as string),
      ).resolves.toBe(true);
    });

    it('turns a duplicate email into a 409 ConflictException', async () => {
      prisma.user.create.mockRejectedValue(uniqueEmailError());

      const result = service.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'plain-password',
      });

      await expect(result).rejects.toBeInstanceOf(ConflictException);
      await expect(result).rejects.toThrow(
        'An account with this email already exists',
      );
    });
  });

  describe('update', () => {
    it('hashes a new password and clears the refresh token', async () => {
      await service.update('user-1', { password: 'new-password' });

      const data = dataPassedTo(prisma.user.update);
      expect(data.password).toMatch(/^\$2[aby]\$12\$/);
      await expect(
        bcrypt.compare('new-password', data.password as string),
      ).resolves.toBe(true);
      expect(data.refreshToken).toBeNull();
    });

    it('leaves the password and refresh token alone when no password is given', async () => {
      await service.update('user-1', { name: 'New Name' });

      const data = dataPassedTo(prisma.user.update);
      expect(data).toEqual({ name: 'New Name' });
      expect(data).not.toHaveProperty('password');
      expect(data).not.toHaveProperty('refreshToken');
    });

    it('turns a duplicate email into a 409 ConflictException', async () => {
      prisma.user.update.mockRejectedValue(uniqueEmailError());

      const result = service.update('user-1', { email: 'taken@example.com' });

      await expect(result).rejects.toBeInstanceOf(ConflictException);
      await expect(result).rejects.toThrow(
        'An account with this email already exists',
      );
    });
  });
});
