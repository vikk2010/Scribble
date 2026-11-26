# Scribble

A social web app: sign up with email or phone, create a profile, post to a public feed, and chat and call with friends.

Built with Next.js 16 (App Router, TypeScript, Tailwind CSS) and Supabase (auth, Postgres, storage, realtime).

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Email and phone signup, profiles, avatars, public profile pages | Done |
| 1.5 | Orange theme (WCAG AA), groups (create, search, topic filters, trending, join), text and photo posts with a public home feed | Done |
| 2 | Feed extras: likes, comments, short videos (up to 60 seconds) | Done |
| 3 | Friends, 1:1 and group chat in real time, typing indicators, unread markers | Done |
| 4 | 1:1 and group voice and video calls (LiveKit), ringing, missed-call notes | Done |
| 5 | Group chat and live voice rooms: 5 speaker seats on stage, everyone else listens and chats | Done |

## Local setup

1. Install Node.js 22 and run `npm install`.
2. Create a free project at [supabase.com](https://supabase.com).
3. Apply the database migrations in `supabase/migrations/` in order (paste it into the Supabase SQL editor, or run `supabase db push` with the Supabase CLI).
4. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Project Settings > API**.
5. In Supabase **Authentication > Email Templates > Magic Link**, include `{{ .Token }}` so emails carry the 6-digit code the login screen asks for.
6. Run `npm run dev` and open http://localhost:3000.

### Turning on voice and video calls

1. Create a free project at [LiveKit Cloud](https://cloud.livekit.io) and copy its URL, API key and secret (**Settings > Keys**).
2. Set `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` on the server (in `.env.local`, and in Vercel's environment variables). The secret never reaches the browser; `/api/calls/[id]/token` signs a 2-hour token only for members of the call's conversation.
3. Make sure Realtime is on for the `messages` and `calls` tables (the migrations add them to the `supabase_realtime` publication). Calls ring other members through it.

Without these keys the call buttons still show, and the call page explains that calling isn't set up.

### Group voice rooms

Every group has a group chat and a voice room. Up to 5 members sit on stage and talk; everyone else in the group joins as a listener and uses the chat. The database enforces the 5-seat limit (`group_room_speakers` trigger), and `/api/groups/[slug]/room-token` only gives microphone permission to people holding a seat. Taking or leaving a seat reconnects you with the right permission. Speakers get a glowing ring while they talk, and the group owner can move someone off the stage.

The group chat works without LiveKit. Voice needs the same three LiveKit variables as calls. Run the `20261126060000_group_chat_voice_rooms.sql` migration after pulling.

### Turning on phone signup

1. In Supabase **Authentication > Sign In / Providers > Phone**, enable phone and connect an SMS provider (Twilio, MessageBird, Vonage or Textlocal).
2. Set `NEXT_PUBLIC_PHONE_AUTH_ENABLED=true` and restart. The login screen then shows Email and Phone tabs.

SMS codes cost money per message, so phone is off by default.

## Design and accessibility

The brand is an orange-to-rose gradient (`#c2410c` to `#be123c`). White text on it is at least 5.18:1 and brand text on white is 5.18:1, so both meet WCAG 2.1 AA. Dark mode uses lighter tints (`#fb923c`, `#fb7185`). Colors live as CSS variables in `src/app/globals.css`, with the contrast ratios noted next to them.

## Scripts

- `npm run dev`: start the dev server
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript
- `npm run build`: production build

## Project layout

- `src/app/login`: email or phone one-time-code login and signup
- `src/app/onboarding`: first-time profile setup
- `src/app/settings/profile`: edit profile and photo
- `src/app/u/[username]`: public profile page with the user's posts
- `src/app/p/[id]`: a single post with its comments
- `src/app/friends`: find people, friend requests, friends list
- `src/app/messages`: inbox, group chat creation and real-time chat rooms (Supabase Realtime)
- `src/app/calls/[id]`: the call screen (LiveKit); `src/components/IncomingCall.tsx` rings you anywhere in the app
- `src/app/groups`: search, create and join groups (signed-in users only); `groups/[slug]/VoiceRoom.tsx` is the stage and listener room
- `src/app/page.tsx`: home; everyone sees the latest 50 posts in random order, signed-in users can post
- `src/lib/supabase`: Supabase clients for the browser, server and proxy
- `src/proxy.ts`: refreshes the session and guards signed-in pages
- `supabase/migrations`: database schema and row-level security policies
