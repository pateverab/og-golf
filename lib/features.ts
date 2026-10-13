/**
 * Product switches.
 *
 * OG Golf is a personal, single-player app: one "Me" profile plays every new
 * round. The multiplayer UI (player picker, hole-screen player chips, live
 * leaderboard, other players' columns) is kept in the code behind this flag
 * so it can come back later, e.g. as optional total-only scores for others
 * behind the Card. The data model (players[], per-player scores) is unchanged
 * either way, and old multiplayer rounds and backups keep working.
 */
export const MULTIPLAYER_ENABLED = false;
