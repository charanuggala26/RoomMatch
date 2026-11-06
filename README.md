# RoomMatch: Roommate Compatibility & Expense System (MERN)

Students enter lifestyle preferences, get a **compatibility score** with other users,
see **why** they're compatible (per-preference breakdown), then form a "home" and manage
**rent, electricity, Wi-Fi, groceries and shared purchases** with automatic balance tracking.

## Stack
- **MongoDB + Mongoose**: users, groups, expenses, settlements
- **Express** (ESM) with JWT auth
- **Socket.IO**: authenticated live updates between roommates
- **React 18 + Vite** with React Router
- **Node 18+** required

## Run it

```bash
# 1. API
cd server
cp .env.example .env        # set MONGO_URI (local MongoDB or Atlas) and JWT_SECRET
npm install
npm test                    # optional: scoring engine + realtime auth tests
npm run dev                 # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :5000)
```

To try it, sign up with 2-3 accounts (use different browsers or private windows),
fill in preferences on each, then open **Matches**.

## Demo content for deployment previews

The optional seed creates five clearly marked fictional roommate profiles, two shared
homes, dated expenses, and a couple of recorded settlements. It uses reserved
`.invalid` email addresses, stable record IDs, and skips existing seed records; it
does not delete or overwrite application data. Run it only against a database where
you want demo content:

```bash
cd server
npm run seed:demo -- --dry-run
npm run seed:demo -- --confirm
```

The confirmed run prints a generated password for the demo login
`aanya.rao@roommatch.example.invalid` once. Save it securely if you want to open the
populated demo account. Seeded demo records are shared app data, not a read-only
preview: use a dedicated demo database for a public deployment, and do not seed
these fixtures into a production database containing real users.

## How the score works (`server/utils/compatibility.js`)
| Factor | Weight | How similarity is measured |
|---|---|---|
| Sleep schedule | 15 | early / flexible / night distance |
| Cleanliness | 15 | 1-5 scale difference |
| Food habits | 10 | matrix (veg vs non-veg is the biggest clash) |
| Noise tolerance | 10 | 1-5 scale difference |
| Study habits | 8 | silent / mixed / social distance |
| Guests, smoking, pets, chores, kitchen habits | 25 | Similarity of everyday shared-home expectations |
| Budget | 10 | overlap of the two ₹ ranges |
| Location | 7 | exact / partial / different area |

The weights total 100. Score = sum of `similarity x weight`. The same per-factor numbers, verdicts and notes
are returned by `GET /api/matches/:userId/explain`, which powers **"Why are we compatible?"**.
Profiles saved before the extra lifestyle fields were introduced use neutral defaults
for those fields until their owners update their preferences.

## Live updates (Socket.IO)
`server/realtime.js` authenticates each socket with the same JWT as the REST API.
A user can only join the room of a home they belong to (checked against MongoDB).
When someone adds or deletes an expense, records a payment or adds a roommate, the
server emits a `group:event` to that home's room; open screens refetch and show a toast.
Being added to a home notifies that user's private room, so "My homes" refreshes too.
Try it with two browsers logged in as different roommates in the same home.

## Design
Compatibility is drawn as two overlapping circles (teal is you, marigold is them);
the more you have in common, the more they overlap. The UI uses a left rail on
desktop and a bottom tab bar on mobile, includes a persistent light/dark theme
switch and a `Ctrl+K` quick-navigation palette, and uses Bricolage Grotesque and
Hanken Grotesk. Home lists can be searched and sorted; expense history includes
category/month filters, sorting, filtered totals and CSV export. Expense split
previews validate custom shares before they can be saved. Motion respects
`prefers-reduced-motion`.

## API
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Auth |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/preferences` | Save preferences |
| GET | `/api/matches` | Ranked matches |
| GET | `/api/matches/:userId/explain` | Score breakdown |
| GET/POST | `/api/groups` | List / create homes |
| POST | `/api/groups/join` | Join with invite code |
| GET | `/api/groups/:id` | Expenses, balances, who-pays-whom, pair scores |
| POST | `/api/groups/:id/members` | Add roommate by email |
| POST/DELETE | `/api/groups/:id/expenses[/:eid]` | Add / delete expense (equal or custom split) |
| POST | `/api/groups/:id/settlements` | Record a payment ("Mark paid") |

## Ideas to extend
Recurring rent reminders, per-user receipts upload, email invites, chat between matches,
admin dashboard, deploy API on Render and client on Vercel.
