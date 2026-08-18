# Buckets

A real-time, multiplayer scorekeeping app for Buckets, the golf match game, built for Monarch
Bay Golf Club's Marina course. One player hosts a room, everyone else joins from their own phone
with a room code, picks a golf-themed avatar, and the host keeps score for the group live —
everyone watches the scorecard update in real time, but only the host can enter strokes.

## How it works

1. **Splash** — a quick bucket animation on open.
2. **Sign up / log in** — an account (email + password) is required to play at all; your display
   name comes from your account, so your stats and history stay attached to you across every
   round and every device you log into.
3. **Host a round** — get a 5-character room code to text to your group.
4. **Join a round** — everyone else enters that code on their own device (after signing in).
4. **Lobby** — everyone picks a distinct avatar (golf ball, club, tee, beer, bag, flag, cart, cap
   — each with its own goofy face). The host sets the starting hole, then starts the round.
5. **Scorecard** — the host enters strokes, bucket winners, and the optional PG&E challenge for
   each hole. Every player's screen updates live. Guests can watch (and flip back through
   completed holes) but can't edit anything — that's server-enforced, not just hidden UI.
6. **Finish** — the round ends automatically once every score is in (or instantly on a
   hole-in-one). A tie triggers a putt-off screen the host resolves. Then: confetti, the
   winner's name in lights, and the low scorer is on the hook for beers.
7. **Standings** — total rounds, wins, holes won, buckets, PG&E wins, points, and beers owed,
   tracked forever across every round played, from the home screen or lobby at any time.

## Structure

- `server/` — Express + Socket.io. Room/game state lives in memory on the server (source of
  truth, host-only mutations enforced there); accounts, sessions, and finished rounds are
  persisted via `@libsql/client` — a local file in dev, or a hosted [Turso](https://turso.tech)
  database in production. Passwords are hashed with scrypt, never stored in plain text. Also
  serves the built client in production, so the whole app is one deployable service.
- `client/` — Vite + React + TypeScript + Tailwind, talking to the server over a WebSocket
  (Socket.io) for live room state, plus a small REST API for the standings history.

## Local development

```bash
npm run install:all
npm run dev
```

Opens the API on http://localhost:3001 and the app on http://localhost:5173 (Vite proxies both
`/api` and `/socket.io` to the server). Data is stored in `server/data/buckets.db`.

Testing multiplayer locally: each "device" needs its own browser storage (a room session is
remembered per-browser so a refresh rejoins you automatically), so use separate browsers or a
private/incognito window for a second player, not just a second tab in the same browser.

## Playing from separate phones, anywhere

Room codes only work between devices that can reach the **same running server** — running
`npm run dev` on your laptop only works for other devices on your home Wi-Fi. To actually let
friends join from their own phones on cellular data, deploy it as a real website:

1. Create a free database at [turso.tech](https://turso.tech), copy its URL and auth token.
2. Push this code to a GitHub repo.
3. Deploy on [Render](https://render.com) (a `render.yaml` blueprint is included) with
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` set as environment variables. Render supports
   WebSockets on every plan, including free, so Socket.io works without extra configuration.
4. Share the resulting URL (e.g. `https://buckets-xxxx.onrender.com`) with your group — that's
   what they open and use to create/join rooms from their own phones.
5. Optional: on iPhone/Android, open that URL and use "Add to Home Screen" — the app has a web
   manifest so it installs with its own icon and opens full-screen like a native app.

Free-tier note: Render's free web services spin down after inactivity and take ~30-60s to wake
on the next visit (the host creating a room is what wakes it up); once awake, live play is fine.
Room/lobby state lives in the server's memory, so a server restart (deploys, or a free-tier
spin-down mid-round) clears any rooms in progress — finished rounds already saved to standings
are unaffected.

## Rules implemented

- 2 or 3 players. Each hole is worth 2 points to the low score; ties split the points evenly
  (this also covers the 3-player "two players tie" rule).
- A birdie on the winning score doubles the hole's points; an eagle triples them.
- Bucket: 1 extra point per hole to whoever's tee shot is closest to the bucket.
- PG&E special challenge: an optional 1 point per hole, toggled on only for holes where you
  play it.
- A hole-in-one immediately wins the whole match.
- If the match is tied after 9 holes, a putt-off (closest to the hole) decides the winner.
- The lowest total score buys the beers.
