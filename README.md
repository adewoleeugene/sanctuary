# Sanctuary

Service roles, cleaning roster, attendance and reports for the sanctuary team.
Next.js 16 + Neon Postgres (Drizzle) + Neon Auth.

## Setup

`.env.local` needs:

```
DATABASE_URL=            # Neon pooled connection string
NEON_AUTH_BASE_URL=      # Neon Auth URL for the branch
NEON_AUTH_COOKIE_SECRET= # openssl rand -base64 32
ADMIN_EMAILS=            # comma-separated; these become admins on first sign-in
QUICK_LOGIN_USERNAME=    # Francess2026: signs in as admin with no password
QUICK_LOGIN_EMAIL=       # the account behind the username
QUICK_LOGIN_PASSWORD=    # random; only the server uses it
```

```bash
npm install
npm run db:migrate   # create tables
npm run db:seed      # 20 members, default roles, activity types and cleaning zones
npm run dev
```

Neon project: `sanctuary` (`crimson-bar-65956023`) in adewoleeugenejohn's account.

## Who can log in

Francess types **Francess2026** in "Username or email" on the sign-in page. No password is needed, so anyone who knows the username gets admin access. To turn it off, remove `QUICK_LOGIN_USERNAME`.

1. An email in `ADMIN_EMAILS` signs up at `/auth/sign-up` and becomes an admin.
2. The admin adds coordinators by email in **Settings → People who can log in** and links each to their member record.
3. The coordinator signs up with that same email and sees the services they coordinate.

Anyone else who signs up sees a "no access" page.

## Changing the schema

Edit `src/db/schema.ts`, then `npm run db:generate` and `npm run db:migrate`.
