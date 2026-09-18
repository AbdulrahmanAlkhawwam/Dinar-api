import { Prisma, Role } from '@prisma/client';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  refreshToken: string | null;
  phone: string | null;
  avatar: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

type Select = Partial<Record<keyof StoredUser, boolean>>;
type Where = { id?: string; email?: string };

function pick(user: StoredUser, select?: Select) {
  if (!select) {
    return { ...user };
  }
  return Object.fromEntries(
    Object.entries(user).filter(([key]) => select[key as keyof StoredUser]),
  );
}

function uniqueEmailError() {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`email`)',
    { code: 'P2002', clientVersion: Prisma.prismaVersion.client },
  );
}

function notFoundError() {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: Prisma.prismaVersion.client,
  });
}

/**
 * Stand-in for PrismaService that keeps users in memory, so e2e tests can
 * boot the full AppModule without touching a real database. It implements
 * only the `user` delegate calls the users and auth modules make, including
 * the unique-email constraint.
 */
export class InMemoryPrisma {
  readonly users = new Map<string, StoredUser>();
  private nextId = 1;

  $connect() {
    return Promise.resolve();
  }

  $disconnect() {
    return Promise.resolve();
  }

  private find(where: Where) {
    return [...this.users.values()].find(
      (user) =>
        (where.id === undefined || user.id === where.id) &&
        (where.email === undefined || user.email === where.email),
    );
  }

  private emailTaken(email: string | undefined, exceptId?: string) {
    return [...this.users.values()].some(
      (user) => user.email === email && user.id !== exceptId,
    );
  }

  readonly user = {
    findUnique: ({ where, select }: { where: Where; select?: Select }) => {
      const user = this.find(where);
      return Promise.resolve(user ? pick(user, select) : null);
    },

    findMany: ({ select }: { select?: Select } = {}) =>
      Promise.resolve(
        [...this.users.values()]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((user) => pick(user, select)),
      ),

    create: ({
      data,
      select,
    }: {
      data: Partial<StoredUser>;
      select?: Select;
    }) => {
      if (this.emailTaken(data.email)) {
        return Promise.reject(uniqueEmailError());
      }
      const now = new Date(Date.now() + this.nextId);
      const user: StoredUser = {
        id: `user-${this.nextId++}`,
        name: data.name ?? '',
        email: data.email ?? '',
        password: data.password ?? '',
        refreshToken: data.refreshToken ?? null,
        phone: data.phone ?? null,
        avatar: data.avatar ?? null,
        role: data.role ?? Role.USER,
        createdAt: now,
        updatedAt: now,
      };
      this.users.set(user.id, user);
      return Promise.resolve(pick(user, select));
    },

    update: ({
      where,
      data,
      select,
    }: {
      where: Where;
      data: Partial<StoredUser>;
      select?: Select;
    }) => {
      const user = this.find(where);
      if (!user) {
        return Promise.reject(notFoundError());
      }
      if (data.email !== undefined && this.emailTaken(data.email, user.id)) {
        return Promise.reject(uniqueEmailError());
      }
      // Like Prisma, `undefined` means "leave unchanged"; `null` clears.
      const changes = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      );
      Object.assign(user, changes, { updatedAt: new Date() });
      return Promise.resolve(pick(user, select));
    },

    delete: ({ where, select }: { where: Where; select?: Select }) => {
      const user = this.find(where);
      if (!user) {
        return Promise.reject(notFoundError());
      }
      this.users.delete(user.id);
      return Promise.resolve(pick(user, select));
    },
  };
}
