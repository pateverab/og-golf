# OG Golf

A clean, modern, mobile-friendly golf score tracking web application built with Next.js 15, TypeScript, and Tailwind CSS.

**OG Golf — Track. Improve. Own the Course.**

All data is stored locally in your browser using localStorage. No accounts, no servers, no external access.

## Features

- Add and manage golf courses (name, location, pars per hole)
- Add, view, and delete players
- Automatic handicap calculation based on rounds played
- Start new rounds with one or more players on a selected course
- Fast per-hole score entry with large +/- buttons and number input
- Live leaderboard during the round (total, vs par, position)
- Complete round history with score summaries
- Player stats with handicap trends over time
- Round export: PDF download, image share, and text “Share a Copy”
- Backup & restore via JSON (import confirms before overwrite)
- PWA shell (installable on iPhone; Install CTA only on iOS Safari when not already installed)
- Light/dark theme toggle
- Premium dark green + gold golf-themed design
- Fully responsive for phone use on the course

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
