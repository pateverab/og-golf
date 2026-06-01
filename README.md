# OG Golf

A clean, modern, mobile-friendly golf score tracking web application built with Next.js 15, TypeScript, and Tailwind CSS.

**OG Golf — Track. Improve. Own the Course.**

All data is stored locally in your browser using localStorage. No accounts, no servers, no external access.

## Features (v1)

- Add and manage golf courses (name, location, pars per hole)
- Add, view, and delete players
- Automatic handicap calculation based on rounds played
- Start new rounds with one or more players on a selected course
- Fast per-hole score entry with large +/- buttons and number input
- Live leaderboard during the round (total, vs par, position)
- Complete round history with score summaries
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

Everything lives in browser localStorage. Clearing your browser data will remove all courses, players, and rounds.

## Future Ideas

- Real course lookup via API (currently manual + suggested templates)
- Round export (CSV / PDF)
- Simple statistics dashboard
- PWA support for offline use on the course

Built for golfers who want fast, beautiful, private score tracking.

Tagline: **OG Golf — Track. Improve. Own the Course.**
