import { recalculateAllHandicaps } from "./calculations";
import type { Course, Hole, HoleScore, Player, PlayerRoundScore, Round } from "./types";

export const TEST_ID_PREFIX = "og-test-";

const TEST_COURSE_ID = `${TEST_ID_PREFIX}course-quito`;

const TEST_PLAYER_IDS = {
  pat: `${TEST_ID_PREFIX}player-pat`,
  carlos: `${TEST_ID_PREFIX}player-carlos`,
  maria: `${TEST_ID_PREFIX}player-maria`,
  alex: `${TEST_ID_PREFIX}player-alex`,
} as const;

const COURSE_PARS = [4, 4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5];

// 5 group rounds — each player appears in every round with varied vs-par scores
const ROUND_SCHEDULE: Array<{
  id: string;
  daysAgo: number;
  vsPar: Record<keyof typeof TEST_PLAYER_IDS, number>;
}> = [
  { id: "01", daysAgo: 42, vsPar: { maria: 2, pat: 11, carlos: 10, alex: 18 } },
  { id: "02", daysAgo: 33, vsPar: { maria: 1, pat: 9, carlos: 11, alex: 17 } },
  { id: "03", daysAgo: 24, vsPar: { maria: 0, pat: 8, carlos: 9, alex: 16 } },
  { id: "04", daysAgo: 15, vsPar: { maria: -1, pat: 6, carlos: 8, alex: 14 } },
  { id: "05", daysAgo: 6, vsPar: { maria: 0, pat: 5, carlos: 7, alex: 12 } },
];

function buildHoles(pars: number[]): Hole[] {
  return pars.map((par, index) => ({ number: index + 1, par }));
}

function buildScores(holes: Hole[], targetVsPar: number, seed: number): HoleScore[] {
  const scores = holes.map((hole) => ({ holeNumber: hole.number, score: hole.par }));
  let remaining = targetVsPar;
  let state = seed;

  const nextRandom = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  let guard = 0;
  while (remaining !== 0 && guard < holes.length * 40) {
    const index = Math.floor(nextRandom() * holes.length);

    if (remaining > 0) {
      scores[index].score += 1;
      remaining -= 1;
    } else if (scores[index].score > 1) {
      scores[index].score -= 1;
      remaining += 1;
    }

    guard += 1;
  }

  return scores.sort((a, b) => a.holeNumber - b.holeNumber);
}

function daysAgoIso(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(10, 30, 0, 0);
  return date.toISOString();
}

function createTestCourse(): Course {
  return {
    id: TEST_COURSE_ID,
    name: "Quito Tenis y Golf Club",
    location: "Quito, Ecuador",
    holes: buildHoles(COURSE_PARS),
    createdAt: daysAgoIso(45),
  };
}

function createTestPlayers(): Player[] {
  const updatedAt = daysAgoIso(1);

  return [
    { id: TEST_PLAYER_IDS.pat, name: "Patricio Aguilar", nickname: "Pat", handicap: 0, updatedAt },
    { id: TEST_PLAYER_IDS.carlos, name: "Carlos Mendoza", nickname: "Carl", handicap: 0, updatedAt },
    { id: TEST_PLAYER_IDS.maria, name: "María López", handicap: 0, updatedAt },
    { id: TEST_PLAYER_IDS.alex, name: "Alex Rivera", nickname: "Riv", handicap: 0, updatedAt },
  ];
}

function createTestRounds(course: Course): Round[] {
  const playerKeys = Object.keys(TEST_PLAYER_IDS) as Array<keyof typeof TEST_PLAYER_IDS>;

  return ROUND_SCHEDULE.map((schedule, roundIndex) => {
    const date = daysAgoIso(schedule.daysAgo);
    const playerScores: PlayerRoundScore[] = playerKeys.map((key, playerIndex) => ({
      playerId: TEST_PLAYER_IDS[key],
      scores: buildScores(
        course.holes,
        schedule.vsPar[key],
        roundIndex * 100 + playerIndex + 1
      ),
    }));

    return {
      id: `${TEST_ID_PREFIX}round-${schedule.id}`,
      courseId: course.id,
      date,
      playerScores,
      completed: true,
      createdAt: date,
      roundLength: 18 as const,
      nineSide: "front" as const,
      startingHole: 1 as const,
    };
  });
}

export function hasTestDataLoaded(players: Player[]): boolean {
  return players.some((player) => player.id.startsWith(TEST_ID_PREFIX));
}

export function getTestDataSuccessMessage(): string {
  return "Test data loaded! Added 4 players, 1 course, and 5 completed rounds (5 per player). Check the Stats tab for handicap charts, or start a new round for the Live Leaderboard.";
}

export function mergeTestData(
  existingCourses: Course[],
  existingPlayers: Player[],
  existingRounds: Round[]
): {
  courses: Course[];
  players: Player[];
  rounds: Round[];
  added: boolean;
} {
  if (hasTestDataLoaded(existingPlayers)) {
    return {
      courses: existingCourses,
      players: existingPlayers,
      rounds: existingRounds,
      added: false,
    };
  }

  const testCourse = createTestCourse();
  const testPlayers = createTestPlayers();
  const testRounds = createTestRounds(testCourse);

  const courses = [...existingCourses, testCourse];
  const players = [...existingPlayers, ...testPlayers];
  const rounds = [...existingRounds, ...testRounds];
  const completedRounds = rounds.filter((round) => round.completed);
  const updatedPlayers = recalculateAllHandicaps(players, completedRounds, courses);

  return { courses, players: updatedPlayers, rounds, added: true };
}