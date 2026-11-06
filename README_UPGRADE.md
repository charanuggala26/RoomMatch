# RoomMatch upgrade

## What's new
- Added an API-backed Overview dashboard with home and roommate-match summaries.
- Added quick links for roommate discovery, preferences, and shared expenses.
- Applied a premium full dark theme across the app.
- Refined navigation, cards, forms, buttons, modals, authentication, and responsive mobile layouts.

## Protected files
`server/server.js` and `server/.env` are preserved exactly as uploaded. No backend routes, MongoDB settings, or credentials were changed.

## Run locally
1. Open a terminal in `client`.
2. Run `npm install`.
3. Run `npm run dev`.
4. Start the backend with your existing setup.

A production build could not be verified in this environment because the uploaded dependency bundle lacked the platform-specific Rollup binary. The original package lockfiles are preserved.
