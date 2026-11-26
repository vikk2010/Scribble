# Scribble

A social web app: sign up with email or phone, create a profile, post to a public feed, and chat and call with friends.

Built with Next.js 16 (App Router, TypeScript, Tailwind CSS) and Supabase (auth, Postgres, storage, realtime).

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Email and phone signup, profiles, avatars, public profile pages | In progress |
| 2 | Public feed: text, image and short video posts, likes, comments | Planned |
| 3 | Friends, 1:1 and group chat | Planned |
| 4 | Voice and video calls (LiveKit) | Planned |

## Local setup

1. Install Node.js 22 and run `npm install`.
2. Create a free project at [supabase.com](https://supabase.com).
3. Apply the database migration in `supabase/migrations/` (paste it into the Supabase SQL editor, or run `supabase db push` with the Supabase CLI).
4. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Project Settings > API**.
5. In Supabase **Authentication > Email Templates > Magic Link**, include `{{ .Token }}` so emails carry the 6-digit code the login screen asks for.
6. Run `npm run dev` and open http://localhost:3000.

### Turning on phone signup

1. In Supabase **Authentication > Sign In / Providers > Phone**, enable phone and connect an SMS provider (Twilio, MessageBird, Vonage or Textlocal).
2. Set `NEXT_PUBLIC_PHONE_AUTH_ENABLED=true` and restart. The login screen then shows Email and Phone tabs.

SMS codes cost money per message, so phone is off by default.

## Scripts

- `npm run dev`: start the dev server
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript
- `npm run build`: production build

## Project layout

- `src/app/login`: email or phone one-time-code login and signup
- `src/app/onboarding`: first-time profile setup
- `src/app/settings/profile`: edit profile and photo
- `src/app/u/[username]`: public profile page
- `src/lib/supabase`: Supabase clients for the browser, server and proxy
- `src/proxy.ts`: refreshes the session and guards signed-in pages
- `supabase/migrations`: database schema and row-level security policies
