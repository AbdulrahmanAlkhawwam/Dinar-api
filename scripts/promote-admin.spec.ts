import { PrismaClient, Role } from '@prisma/client';
import { InMemoryPrisma } from '../test/utils/in-memory-prisma';
import { run } from './promote-admin';

describe('promote-admin', () => {
  let prisma: InMemoryPrisma;
  let output: string[];
  let errors: string[];

  const promote = (args: string[]) =>
    run(args, prisma as unknown as PrismaClient, {
      log: (line: string) => output.push(line),
      error: (line: string) => errors.push(line),
    });

  beforeEach(async () => {
    prisma = new InMemoryPrisma();
    output = [];
    errors = [];
    await prisma.user.create({
      data: { name: 'Jane', email: 'jane@example.com', password: 'hash' },
    });
  });

  it('sets role to ADMIN for the given email and prints the user', async () => {
    const exitCode = await promote(['jane@example.com']);

    expect(exitCode).toBe(0);
    const [jane] = [...prisma.users.values()];
    expect(jane.role).toBe(Role.ADMIN);
    expect(output.join('\n')).toContain('jane@example.com');
    expect(output.join('\n')).toContain('ADMIN');
    expect(output.join('\n')).not.toContain('hash');
  });

  it('matches the email case-insensitively, as stored emails are lowercase', async () => {
    const exitCode = await promote(['  Jane@Example.COM ']);

    expect(exitCode).toBe(0);
    expect([...prisma.users.values()][0].role).toBe(Role.ADMIN);
  });

  it('exits non-zero when the user does not exist', async () => {
    const exitCode = await promote(['nobody@example.com']);

    expect(exitCode).not.toBe(0);
    expect(errors.join('\n')).toContain('nobody@example.com');
  });

  it('exits non-zero with usage when no email is given', async () => {
    const exitCode = await promote([]);

    expect(exitCode).not.toBe(0);
    expect(errors.join('\n')).toMatch(/usage/i);
  });
});
