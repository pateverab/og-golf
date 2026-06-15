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
    createdAt: daysAgoIso(30),
  };
}

function createTestPlayers(): Player[] {
  const updatedAt = daysAgoIso(1);

  return [
    {
      id: TEST_PLAYER_IDS.pat,
      name: "Patricio Aguilar",
      nickname: "Pat",
      handicap: 0,
      updatedAt,
    },
    {
      id: TEST_PLAYER_IDS.carlos,
      name: "Carlos Mendoza",
      nickname: "Carl",
      handicap: 0,
      updatedAt,
    },
    {
      id: TEST_PLAYER_IDS.maria,
      name: "María López",
      handicap: 0,
      updatedAt,
    },
    {
      id: TEST_PLAYER_IDS.alex,
      name: "Alex Rivera",
      nickname: "Riv",
      handicap: 0,
      updatedAt,
    },
  ];
}

function createTestRound(course: Course): Round {
  const date = daysAgoIso(3);
  const participants: Array<{ playerId: string; vsPar: number; seed: number }> = [
    { playerId: TEST_PLAYER_IDS.maria, vsPar: 1, seed: 301 },
    { playerId: TEST_PLAYER_IDS.pat, vsPar: 6, seed: 302 },
    { playerId: TEST_PLAYER_IDS.carlos, vsPar: 9, seed: 303 },
    { playerId: TEST_PLAYER_IDS.alex, vsPar: 15, seed: 304 },
  ];

  const playerScores: PlayerRoundScore[] = participants.map((participant) => ({
    playerId: participant.playerId,
    scores: buildScores(course.holes, participant.vsPar, participant.seed),
  }));

  return {
    id: `${TEST_ID_PREFIX}round-01`,
    courseId: course.id,
    date,
    playerScores,
    completed: true,
    createdAt: date,
    roundLength: 18,
    nineSide: "front",
    startingHole: 1,
  };
}

export function hasTestDataLoaded(players: Player[]): boolean {
  return players.some((player) => player.id.startsWith(TEST_ID_PREFIX));
}

export function getTestDataSuccessMessage(): string {
  return "Test data loaded! Added 4 players, 1 course, and 1 completed round. Tap Start New Round to try the Live Leaderboard.";
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
  const testRound = createTestRound(testCourse);

  const courses = [...existingCourses, testCourse];
  const players = [...existingPlayers, ...testPlayers];
  const rounds = [...existingRounds, testRound];
  const completedRounds = rounds.filter((round) => round.completed);
  const updatedPlayers = recalculateAllHandicaps(players, completedRounds, courses);

  return { courses, players: updatedPlayers, rounds, added: true };
}