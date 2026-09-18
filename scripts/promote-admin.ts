/**
 * Promote an existing user to ADMIN.
 *
 *   npm run promote-admin -- someone@example.com
 *
 * Every account from /auth/register is a USER and the /users routes are
 * admin-only, so this is how the first administrator is created. The user
 * must already exist; register them first. Uses DATABASE_URL from the
 * environment (Prisma also reads it from .env).
 */
import { PrismaClient, Role } from '@prisma/client';

interface Output {
  log: (line: string) => void;
  error: (line: string) => void;
}

export async function run(
  args: string[],
  prisma: PrismaClient,
  out: Output = console,
): Promise<number> {
  const email = args[0]?.trim().toLowerCase();
  if (!email) {
    out.error('Usage: npm run promote-admin -- <email>');
    return 1;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    out.error(`No user found with email ${email}`);
    return 1;
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: Role.ADMIN },
    select: { id: true, name: true, email: true, role: true },
  });
  const note = user.role === Role.ADMIN ? ' (was already ADMIN)' : '';
  out.log(`Promoted ${updated.email} to ${updated.role}${note}`);
  out.log(JSON.stringify(updated, null, 2));
  return 0;
}

if (require.main === module) {
  const prisma = new PrismaClient();
  run(process.argv.slice(2), prisma)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());
}
