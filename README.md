Note: The DB is now disabled so webapp is off

# Lacanau 2026

A mobile web app (PWA) that turned a week-long holiday with 13 friends into a game: quests validated by vote, dares, anonymous notes, photos, polls, a shared planning, meal scheduling, a leaderboard and an elimination game.

Built in four days, before and during the trip. The interface is in French.

<!-- Add 3 or 4 screenshots here (home, quests, notes, leaderboard). -->

## What it does

- **Quests and dares** validated by the group's vote: from 3 votes, a strict majority validates or refuses, then the status is frozen. Nobody can vote for themselves.
- **Anonymous notes** with a "reveal" joker, where the author stays hidden even if someone inspects the network requests.
- **Photos, polls, chat with reactions, a shared planning and a leaderboard.**
- **Meals:** groups and slots are drawn at random under per-group day constraints, with a small backtracking solver (`scripts/setup-meals.mjs`).
- **Killer:** an elimination game with secret targets and missions, a confirmation request for the victim, and a history revealed only when the game ends.
- **Admin page** protected by a code that is checked on the server.

## Stack

- Next.js 15 (App Router) and TypeScript
- Tailwind CSS v4
- Supabase: Postgres and Storage
- Vercel for hosting

There is no login. Each person picks a profile on first launch, and the choice is kept in `localStorage`. That is a trust model between friends, not an authentication system.

## Design decisions

- **Rules live in the database.** The vote rule, the ban on voting for yourself and the Killer game logic are Postgres functions (RPC), so the client cannot bypass them.
- **Anonymity by construction.** The `notes` table cannot be read directly. The app reads a view without the author column (`notes_public`) and writes through the `post_note` and `reveal_note` functions.
- **Secrets stay in the database.** The Killer tables have all direct access revoked. Players only see their own target and mission through a `security definer` function, plus a public view without secrets.
- **Row Level Security is permissive on purpose** everywhere else, because the app is meant for a group of friends. Do not reuse that model for public data.
- **End-to-end smoke test** against a real database (votes, reveal joker, ranking, anonymity, polls). It creates its own test data and cleans it up.

## Run it yourself

1. Create a Supabase project and install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Apply the schema and the (fictional) seed data:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

3. Create a `.env.local` file at the root with:

   | Variable | Purpose |
   |----------|---------|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL of your Supabase project |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (anon) key |
   | `ADMIN_CODE` | Code of the `/admin` page, checked on the server |
   | `SUPABASE_DB_PASSWORD` | Postgres password, used by the CLI for migrations |
   | `NEXT_PUBLIC_VLOG_DRIVE_URL` | Optional: shared drive link shown in the app |
   | `NEXT_PUBLIC_TRICOUNT_URL` | Optional: shared expenses link shown in the app |

4. Install and start:

   ```bash
   npm install
   npm run dev
   ```

5. Optional smoke test:

   ```bash
   node --env-file=.env.local scripts/smoke-test.mjs
   ```

On iPhone, open the site in Safari, tap Share, then "Add to Home Screen" to install the PWA.

## Notes

- The original deployment (13 participants, August 2026) has been shut down.
- All participants in the seed data are fictional.

## License

MIT
