# OG Golf

A clean, modern, mobile-friendly golf score tracking web application built with Next.js 15, TypeScript, and Tailwind CSS.

**OG Golf — Track. Improve. Own the Course.**

All data is stored locally in your browser using localStorage. No accounts, no servers, no external access.

## Features

- Add and manage golf courses (name, location, pars per hole), with edit
- Add, edit, view, and delete players
- Automatic handicap / OG index calculation based on rounds played
- Start rounds with one or more players (18 holes, or front / back 9, any starting hole)
- Live stroke clicker, one player at a time: a huge **+1 Stroke** in the thumb zone, Undo, **+1 Penalty**, and **Hole Out**, which commits the score, jumps to the next player who hasn't scored, and moves to the next hole once everyone is in
- Player chips on multiplayer rounds show each player's live / holed-out state; tap one to switch whose clicker is shown
- **+1 Stroke needs a lie**: pick Tee, Fairway, Rough, Bunker, Green or Other first (stroke 1 starts on Tee; Green stays selected while putting; every other shot needs a fresh chip). +1 Penalty, Undo and Hole Out never need a lie
- Hole-summary strip under the hole title: the selected player's last three holes plus **NOW** (par, score with circle / square marks, live "in play" count). Swipe it sideways for earlier / later holes and tap a hole to jump to it
- Big gold running **Total** (holes already scored) with vs par in the bottom bar, between Prev and Next
- Manual score entry as a fallback on any hole (fits in the same clicker area)
- Frozen hole screen on iPhone: during a round the hole view is one fixed, screen-sized frame (top bar, player chips, clicker, Prev / Next) with zero scrolling. It never slides, pans, rubber-bands, pinches, or pulls to refresh, and holes change only with the Prev / Next buttons or a tap on the hole strip (the strip is the only thing that scrolls sideways)
- **Card** button opens a contained overlay with the live leaderboard and a hole-by-hole score grid (tap a hole to jump to it); it is the only vertical scroller on the play view
- **Quit** on the hole screen asks "Quit this round?" with three choices: **Save and continue later** (keeps every score, nothing goes to history or stats), **Start this round again** (clears the scores and restarts on the round's starting hole with the same course and players), or **Quit and delete** (removes the round for good). Restart and delete each ask for a second confirmation inside the modal, with Back
- Resume banner on Home after Save and continue later ("Round in progress at … · Hole N") with a big **Resume** button and the same Quit choices; it survives closing the app. A plain refresh or relaunch mid-round still goes straight back to the hole
- Keeps the screen awake during a round where the browser supports it (Screen Wake Lock)
- Live leaderboard during the round (total, vs par, position), inside the Card overlay
- Complete round history with official scorecard marks (circles for under par, squares for over par)
- Player stats with handicap trends over time
- Round export: PDF download, image share, and text “Share a Copy” (with clipboard fallbacks)
- Backup & restore via JSON (import confirms before overwrite)
- PWA shell (installable on iPhone; Install CTA only on iOS Safari when not already installed)
- Two color schemes: **Clubhouse** (deep green + gold, the former dark mode) and **Sunlight** (high-contrast cream + deep green for bright outdoor light, the former light mode)
- Premium green + gold golf-themed design with large touch targets

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

- Colors are semantic theme tokens: CSS variables in `app/globals.css` (`:root` = Sunlight, `.dark` = Clubhouse) exposed to Tailwind as `og-*` classes (`bg-og-surface`, `text-og-accent-text`, `border-og-plus-border`, …). Add or change colors there, not as hex values in components.
- Gold (`og-accent`) stays reserved for the +1 button, the Total and primary actions
- The exported scorecard image/PDF (`components/RoundScorecard.tsx`, `lib/roundExport.ts`) keeps its own fixed colors so exports look the same in either scheme
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
