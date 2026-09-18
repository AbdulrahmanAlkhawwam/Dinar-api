# Users endpoint security fix — brief

A task brief for fixing the users module. Written from a review of this
codebase while building the Dinar-web dashboard; paste it into a coding
session opened in this repository.

---

Fix the security defects in the users module of this NestJS + Prisma API
(Dinar). Work test-first, commit with conventional messages (`fix:`, `test:`),
and do not touch unrelated modules.

## What is wrong today

1. `src/modules/users/users.controller.ts` has no guards on any route. Anyone,
   signed in or not, can `GET /api/v1/users` (every user's name, email, phone,
   role), `PATCH` or `DELETE` any user, and `POST /api/v1/users` with
   `"role": "ADMIN"` to make themselves an administrator. That admin token then
   passes `AdminGuard` on products, categories and currencies.
   Confirm: `curl -I https://dinar-api-rust.vercel.app/api/v1/users` returns 200
   with no credentials.

2. `src/modules/users/users.service.ts` `create()` and `update()` pass the DTO
   straight to Prisma, so passwords are stored in plain text.
   `auth.service.ts` `login()` does `bcrypt.compare(dto.password, user.password)`,
   so any account created through `POST /users`, or any password changed through
   `PATCH /users/:id`, can never sign in. `auth.service.ts` `register()` hashes
   correctly with `bcrypt.hash(password, 12)`. Match that.

3. `create()` has no handling for a duplicate email, so Prisma's P2002 surfaces
   as a 500. `register()` already turns it into a 409 ConflictException with the
   message "An account with this email already exists". Match that.

## Required changes

- Guard every route in `UsersController` with
  `@UseGuards(JwtAuthGuard, AdminGuard)` and `@ApiBearerAuth()`, following
  `src/modules/products/products.controller.ts`. Add `@ApiTags('Users')`,
  `@ApiOperation` and `@ApiResponse` decorators (200/201, 401, 403, 404, 409)
  consistent with the other controllers, so Swagger stops showing empty
  `CreateUserDto` / `UpdateUserDto` schemas. Add `@ApiProperty` to both DTOs.
- Hash `password` with bcrypt at cost 12 in both `create()` and `update()`,
  only when a password is present in the DTO. Never return the password or
  refreshToken; the existing `userSelect` already excludes them. Keep it that
  way.
- Add `@MinLength(8)` to `password` in `CreateUserDto` and `UpdateUserDto`,
  matching `RegisterDto`.
- Map P2002 to a 409 in `create()` and `update()`, same message as register.
- When `update()` changes the password, also set `refreshToken: null` so
  existing sessions for that user end.
- Stop an admin locking themselves out: reject, with 400 or 403 and a clear
  message, a `DELETE /users/:id` where `:id` is the caller's own id, and a
  `PATCH /users/:id` that changes the caller's own `role`. Use the existing
  `CurrentUser` decorator to get the caller (`JwtPayload.sub`).

## Bootstrapping the first admin

Once the routes are guarded, the only way to create an admin is the database,
and every account from `/auth/register` is USER. Add a small script,
`scripts/promote-admin.ts`, runnable as
`npm run promote-admin -- someone@example.com`, that uses Prisma to set
`role = ADMIN` for that email and prints the result. It exits non-zero if the
user does not exist. Document it in README.md.

## Existing data

Before finishing, check whether any stored `User.password` is not a bcrypt
hash (bcrypt hashes start with `$2a$`, `$2b$` or `$2y$`). If any exist, do not
rehash them silently: list the affected emails and report them. Those users
need a password reset.

## Tests

The project uses Jest (`npm test` for unit specs next to the source,
`npm run test:e2e` with `test/jest-e2e.json`). Write the tests first and watch
them fail:

- Unit (`users.service.spec.ts`, Prisma mocked): `create()` stores a bcrypt
  hash, not the plain password; `update()` hashes a new password and clears
  refreshToken; `update()` without a password leaves it alone; P2002 becomes a
  409 in both.
- e2e: no token → 401 on all five routes; a USER token → 403; an ADMIN token →
  200/201; an admin cannot delete themselves or change their own role; a user
  created through `POST /users` can then log in through `/auth/login`.

Run `npm run lint`, `npm test`, `npm run test:e2e` and `npm run build`, and
report the actual output.

## Contract the web dashboard relies on (keep these true)

The Dinar-web dashboard (`../Dinar-web`) calls this API with an admin's
bearer token and depends on:

- `GET /users` returning a bare array of users with the `userSelect` fields.
- `PATCH /users/:id` accepting `{ role }` and `{ name, email, phone, avatar,
  role }`, where `phone` and `avatar` may be `null` to clear them.
- `DELETE /users/:id` returning the deleted user.
- `HEAD /users` returning 401 without a token. The dashboard uses this to
  decide whether to show its "user endpoints are not protected" warning.
- `/auth/register` staying public and returning 409 for a duplicate email.

Do not change response shapes or status codes beyond what is listed above.
When done, summarise every file changed and anything that could not be done.

## Deliberately out of scope

- Users editing their own profile. Every route becomes admin-only, because
  that is all the dashboard uses. If the Flutter app ever lets people edit
  themselves, add a separate `/users/me` route rather than loosening these.
- Operations and currencies routes. Operations are already scoped per user,
  and currency writes already require an admin.
