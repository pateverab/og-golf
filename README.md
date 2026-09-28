# OG Golf

A clean, modern, mobile-friendly golf score tracking web application built with Next.js 15, TypeScript, and Tailwind CSS.

**OG Golf — Track. Improve. Own the Course.**

All data is stored locally in your browser using localStorage. No accounts, no servers, no external access.

## Features

- Add and manage golf courses (name, location, pars per hole), with edit
- Add, edit, view, and delete players
- Automatic handicap / OG index calculation based on rounds played
- Start rounds with one or more players (18 holes, or front / back 9, any starting hole)
- Live stroke clicker per player: a huge **+1 Stroke** in the thumb zone, Undo, **+1 Penalty**, and **Hole Out**, which commits the score and moves to the next hole once everyone is in
- Solo rounds get a pinned quick **+1** between Prev and Next, always under your thumb
- Optional lie chips (Tee, Fairway, Rough, Bunker, Green, Other) tagged on each shot
- Manual score entry as a fallback on any hole
- Locked on-course screen on iPhone: while a round is active the hole screen never slides, pans, rubber-bands, or pulls to refresh; only the player / leaderboard panel scrolls
- Keeps the screen awake during a round where the browser supports it (Screen Wake Lock)
- Live leaderboard during the round (total, vs par, position)
- Complete round history with official scorecard marks (circles for under par, squares for over par)
- Player stats with handicap trends over time
- Round export: PDF download, image share, and text “Share a Copy” (with clipboard fallbacks)
- Backup & restore via JSON (import confirms before overwrite)
- PWA shell (installable on iPhone; Install CTA only on iOS Safari when not already installed)
- Light/dark theme toggle
- Premium dark green + gold golf-themed design with large touch targets

## Limitations

- iPhone lock screen and volume buttons cannot add strokes in the PWA. Keep the phone awake with OG Golf open to tap +1. Lock-screen volume scoring is not supported.
- Reading the hardware volume buttons or scoring from the lock screen would need a native iOS shell (for example Capacitor or Swift). OG Golf is a web app / PWA today and does not ship one.
- Keeping the screen awake depends on the browser: recent iOS Safari and installed PWAs honor it, older versions may still auto-lock (raise Auto-Lock in iOS Settings if so).
- Data lives in this browser's localStorage only. Clearing browser data or switching phones loses it unless you export a JSON backup.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Design

- Dark forest green (#0a2e1f) primary background
- Gold accents (#c5a36f) for buttons and highlights
- Large touch-friendly controls optimized for quick score entry
- Clean, modern typography and spacing

## Data

Everything lives in browser localStorage. Clearing your browser data will remove all courses, players, and rounds. Use **Backup & Restore** to export or import a JSON backup.

## Future Ideas

- Real course lookup via API (currently manual + suggested templates)
- CSV export
- Cloud sync / multi-device accounts
- Deeper analytics (per-hole tendencies, course difficulty)

Built for golfers who want fast, beautiful, private score tracking.

Tagline: **OG Golf — Track. Improve. Own the Course.**
