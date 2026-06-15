import { recalculateAllHandicaps } from "./calculations";
import type { Course, Hole, HoleScore, Player, PlayerRoundScore, Round } from "./types";

export const TEST_ID_PREFIX = "og-test-";

const TEST_PLAYER_IDS = {
  pat: `${TEST_ID_PREFIX}player-pat`,
  carlos: `${TEST_ID_PREFIX}player-carlos`,
  maria: `${TEST_ID_PREFIX}player-maria`,
  alex: `${TEST_ID_PREFIX}player-alex`,
} as const;

const TEST_COURSE_IDS = {
  quito: `${TEST_ID_PREFIX}course-quito`,
  arrayanes: `${TEST_ID_PREFIX}course-arrayanes`,
} as const;

const QUITO_PARS = [4, 4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5];
const ARRAYANES_PARS = [4, 4, 5, 3, 4, 5, 3, 4, 4, 4, 3, 5, 4, 3, 5, 4, 3, 4];

interface RoundSpec {
  id: string;
  daysAgo: number;
  courseId: string;
  holes: Hole[];
  participants: Array<{ playerId: string; vsPar: number; seed: number }>;
}

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
    const hole = holes[index];

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

function createTestCourses(): Course[] {
  const baseCreatedAt = daysAgoIso(90);

  return [
    {
      id: TEST_COURSE_IDS.quito,
      name: "Quito Tenis y Golf Club",
      location: "Quito, Ecuador",
      holes: buildHoles(QUITO_PARS),
      createdAt: baseCreatedAt,
    },
    {
      id: TEST_COURSE_IDS.arrayanes,
      name: "Arrayanes Golf Course",
      location: "Quito, Ecuador",
      holes: buildHoles(ARRAYANES_PARS),
      createdAt: daysAgoIso(85),
    },
  ];
}

function createTestPlayers(): Player[] {
  const baseUpdatedAt = daysAgoIso(1);

  return [
    {
      id: TEST_PLAYER_IDS.pat,
      name: "Patricio Aguilar",
      nickname: "Pat",
      handicap: 0,
      updatedAt: baseUpdatedAt,
    },
    {
      id: TEST_PLAYER_IDS.carlos,
      name: "Carlos Mendoza",
      nickname: "Carl",
      handicap: 0,
      updatedAt: baseUpdatedAt,
    },
    {
      id: TEST_PLAYER_IDS.maria,
      name: "María López",
      handicap: 0,
      updatedAt: baseUpdatedAt,
    },
    {
      id: TEST_PLAYER_IDS.alex,
      name: "Alex Rivera",
      nickname: "Riv",
      handicap: 0,
      updatedAt: baseUpdatedAt,
    },
  ];
}

function createTestRounds(courses: Course[]): Round[] {
  const quitoHoles = courses.find((c) => c.id === TEST_COURSE_IDS.quito)!.holes;
  const arrayanesHoles = courses.find((c) => c.id === TEST_COURSE_IDS.arrayanes)!.holes;

  const specs: RoundSpec[] = [
    {
      id: `${TEST_ID_PREFIX}round-01`,
      daysAgo: 63,
      courseId: TEST_COURSE_IDS.quito,
      holes: quitoHoles,
      participants: [
        { playerId: TEST_PLAYER_IDS.pat, vsPar: 11, seed: 101 },
        { playerId: TEST_PLAYER_IDS.carlos, vsPar: 9, seed: 102 },
        { playerId: TEST_PLAYER_IDS.maria, vsPar: 2, seed: 103 },
      ],
    },
    {
      id: `${TEST_ID_PREFIX}round-02`,
      daysAgo: 56,
      courseId: TEST_COURSE_IDS.arrayanes,
      holes: arrayanesHoles,
      participants: [
        { playerId: TEST_PLAYER_IDS.pat, vsPar: 10, seed: 201 },
        { playerId: TEST_PLAYER_IDS.carlos, vsPar: 11, seed: 202 },
        { playerId: TEST_PLAYER_IDS.alex, vsPar: 19, seed: 203 },
      ],
    },
    {
      id: `${TEST_ID_PREFIX}round-03`,
      daysAgo: 49,
      courseId: TEST_COURSE_IDS.quito,
      holes: quitoHoles,
      participants: [
        { playerId: TEST_PLAYER_IDS.pat, vsPar: 9, seed: 301 },
        { playerId: TEST_PLAYER_IDS.maria, vsPar: 1, seed: 302 },
        { playerId: TEST_PLAYER_IDS.alex, vsPar: 18, seed: 303 },
        { playerId: TEST_PLAYER_IDS.carlos, vsPar: 8, seed: 304 },
      ],
    },
    {
      id: `${TEST_ID_PREFIX}round-04`,
      daysAgo: 42,
      courseId: TEST_COURSE_IDS.arrayanes,
      holes: arrayanesHoles,
      participants: [
        { playerId: TEST_PLAYER_IDS.carlos, vsPar: 7, seed: 401 },
        { playerId: TEST_PLAYER_IDS.maria, vsPar: 0, seed: 402 },
        { playerId: TEST_PLAYER_IDS.alex, vsPar: 17, seed: 403 },
      ],
    },
    {
      id: `${TEST_ID_PREFIX}round-05`,
      daysAgo: 35,
      courseId: TEST_COURSE_IDS.quito,
      holes: quitoHoles,
      participants: [
        { playerId: TEST_PLAYER_IDS.pat, vsPar: 8, seed: 501 },
        { playerId: TEST_PLAYER_IDS.carlos, vsPar: 9, seed: 502 },
        { playerId: TEST_PLAYER_IDS.maria, vsPar: -1, seed: 503 },
        { playerId: TEST_PLAYER_IDS.alex, vsPar: 16, seed: 504 },
      ],
    },
    {
      id: `${TEST_ID_PREFIX}round-06`,
      daysAgo: 28,
      courseId: TEST_COURSE_IDS.arrayanes,
      holes: arrayanesHoles,
      participants: [
        { playerId: TEST_PLAYER_IDS.pat, vsPar: 7, seed: 601 },
        { playerId: TEST_PLAYER_IDS.maria, vsPar: 1, seed: 602 },
      ],
    },
    {
      id: `${TEST_ID_PREFIX}round-07`,
      daysAgo: 21,
      courseId: TEST_COURSE_IDS.quito,
      holes: quitoHoles,
      participants: [
        { playerId: TEST_PLAYER_IDS.pat, vsPar: 6, seed: 701 },
        { playerId: TEST_PLAYER_IDS.carlos, vsPar: 8, seed: 702 },
        { playerId: TEST_PLAYER_IDS.maria, vsPar: 2, seed: 703 },
        { playerId: TEST_PLAYER_IDS.alex, vsPar: 15, seed: 704 },
      ],
    },
    {
      id: `${TEST_ID_PREFIX}round-08`,
      daysAgo: 14,
      courseId: TEST_COURSE_IDS.arrayanes,
      holes: arrayanesHoles,
      participants: [
        { playerId: TEST_PLAYER_IDS.pat, vsPar: 5, seed: 801 },
        { playerId: TEST_PLAYER_IDS.carlos, vsPar: 7, seed: 802 },
        { playerId: TEST_PLAYER_IDS.alex, vsPar: 14, seed: 803 },
      ],
    },
    {
      id: `${TEST_ID_PREFIX}round-09`,
      daysAgo: 7,
      courseId: TEST_COURSE_IDS.quito,
      holes: quitoHoles,
      participants: [
        { playerId: TEST_PLAYER_IDS.pat, vsPar: 4, seed: 901 },
        { playerId: TEST_PLAYER_IDS.maria, vsPar: 0, seed: 902 },
        { playerId: TEST_PLAYER_IDS.alex, vsPar: 13, seed: 903 },
      ],
    },
    {
      id: `${TEST_ID_PREFIX}round-10`,
      daysAgo: 2,
      courseId: TEST_COURSE_IDS.arrayanes,
      holes: arrayanesHoles,
      participants: [
        { playerId: TEST_PLAYER_IDS.pat, vsPar: 3, seed: 1001 },
        { playerId: TEST_PLAYER_IDS.carlos, vsPar: 6, seed: 1002 },
        { playerId: TEST_PLAYER_IDS.maria, vsPar: -2, seed: 1003 },
        { playerId: TEST_PLAYER_IDS.alex, vsPar: 12, seed: 1004 },
      ],
    },
  ];

  return specs.map((spec) => {
    const date = daysAgoIso(spec.daysAgo);
    const playerScores: PlayerRoundScore[] = spec.participants.map((participant) => ({
      playerId: participant.playerId,
      scores: buildScores(spec.holes, participant.vsPar, participant.seed),
    }));

    return {
      id: spec.id,
      courseId: spec.courseId,
      date,
      playerScores,
      completed: true,
      createdAt: date,
      roundLength: 18,
      nineSide: "front" as const,
      startingHole: 1 as const,
    };
  });
}

export function hasTestDataLoaded(players: Player[]): boolean {
  return players.some((player) => player.id.startsWith(TEST_ID_PREFIX));
}

export function getTestDataSummary(): string {
  return "4 players, 2 courses, and 10 completed rounds";
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

  const testCourses = createTestCourses();
  const testPlayers = createTestPlayers();
  const testRounds = createTestRounds(testCourses);

  const courses = [...existingCourses, ...testCourses];
  const players = [...existingPlayers, ...testPlayers];
  const rounds = [...existingRounds, ...testRounds];
  const completedRounds = rounds.filter((round) => round.completed);
  const updatedPlayers = recalculateAllHandicaps(players, completedRounds, courses);

  return { courses, players: updatedPlayers, rounds, added: true };
}