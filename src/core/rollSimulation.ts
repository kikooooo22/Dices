import { analyzeDiceRoll } from '../game/engine';
import { computeEffectiveRollConfig } from './modifiers';
import { GameState, LastRollData, RollConfig } from './types';

export interface BatchSimulationResult {
  lastRoll: LastRollData;
  totalEarned: number;
  rollsExecuted: number;
  newStreak: number;
  highestStreak: number;
}

const computeStreakBonus = (streak: number): number => {
  if (streak <= 1) return 1;
  return Number(
    (
      1 +
      Math.min(2.5, (streak - 1) * 0.15) +
      (streak > 18 ? Math.min(1.0, (streak - 18) * 0.03) : 0)
    ).toFixed(2)
  );
};

const executeOneRollWithConfig = (
  config: RollConfig,
  currentStreak: number,
  rollId: number,
  nowMs: number
): { rollData: LastRollData; newStreak: number } => {
  const {
    diceCount,
    sides,
    flatBonus,
    materialMult,
    comboMult,
    globalMult,
    lessIsMoreProb,
    magnetismProb,
    ghostProb,
    extraGhostDice,
    pointsMult,
  } = config;

  const faces: number[] = new Array(diceCount);
  let baseSum = 0;

  let magneticTarget: number | null = null;
  if (magnetismProb > 0 && Math.random() < magnetismProb) {
    // Pick a random even face (or max side if sides < 2)
    const evenCount = Math.floor(sides / 2);
    magneticTarget = evenCount > 0 ? (Math.floor(Math.random() * evenCount) + 1) * 2 : sides;
  }

  for (let i = 0; i < diceCount; i++) {
    let face: number;
    if (magneticTarget !== null && Math.random() < magnetismProb) {
      face = magneticTarget;
    } else {
      face = Math.floor(Math.random() * sides) + 1;
    }

    if (face === 1 && lessIsMoreProb > 0 && Math.random() < lessIsMoreProb) {
      face = sides;
    }

    faces[i] = face;
    baseSum += face + flatBonus;
  }

  const ghosts: number[] = [];
  const totalGhostChecks = (ghostProb > 0 ? 1 : 0) + extraGhostDice;
  for (let g = 0; g < totalGhostChecks; g++) {
    const shouldSpawn = g < extraGhostDice || Math.random() < ghostProb;
    if (shouldSpawn) {
      let ghostFace = Math.floor(Math.random() * sides) + 1;
      if (ghostFace === 1 && lessIsMoreProb > 0 && Math.random() < lessIsMoreProb) {
        ghostFace = sides;
      }
      ghosts.push(ghostFace);
      baseSum += ghostFace + flatBonus;
    }
  }

  const { combos, colorMap } = analyzeDiceRoll(faces, sides);
  let totalComboMult = 1;
  const hasCombo = combos.length > 0;

  if (hasCombo) {
    const sortedCombos = [...combos].sort((a, b) => b.mult - a.mult);
    totalComboMult = sortedCombos[0].mult;
    for (let i = 1; i < sortedCombos.length; i++) {
      totalComboMult += (sortedCombos[i].mult - 1) * 0.4;
    }
    totalComboMult *= comboMult;
  }

  const newStreak = hasCombo ? currentStreak + 1 : 0;
  const streakBonus = computeStreakBonus(newStreak);
  const totalEarned = Math.round(
    baseSum * materialMult * totalComboMult * streakBonus * globalMult * pointsMult
  );

  const rollData: LastRollData = {
    id: rollId,
    faces,
    ghosts,
    baseSum,
    totalEarned,
    combos,
    colorMap,
    streak: newStreak,
    streakBonus,
    timestamp: nowMs,
  };

  return { rollData, newStreak };
};

/**
 * Simulates `count` rolls against the current game state.
 * For very large counts (e.g. long offline sessions), samples up to 200 rolls
 * and scales smoothly so simulation always finishes in < 1ms.
 */
export const simulateRolls = (
  state: GameState,
  count: number = 1,
  nowMs: number = Date.now()
): BatchSimulationResult => {
  const safeCount = Math.max(1, Math.floor(count));
  const config = computeEffectiveRollConfig(state);

  const SAMPLE_CAP = 200;
  const simulatedIterations = Math.min(safeCount, SAMPLE_CAP);
  const scaleFactor = safeCount / simulatedIterations;

  let streak = state.comboStreak;
  let highestStreak = state.highestStreak;
  let sampledPoints = 0;
  let lastRoll!: LastRollData;

  for (let i = 0; i < simulatedIterations; i++) {
    const rollId =
      i === simulatedIterations - 1
        ? state.totalRolls + safeCount
        : state.totalRolls + i + 1;

    const res = executeOneRollWithConfig(config, streak, rollId, nowMs);
    streak = res.newStreak;
    if (streak > highestStreak) highestStreak = streak;
    sampledPoints += res.rollData.totalEarned;
    lastRoll = res.rollData;
  }

  const totalEarned =
    scaleFactor === 1 ? sampledPoints : Math.round(sampledPoints * scaleFactor);

  return {
    lastRoll,
    totalEarned,
    rollsExecuted: safeCount,
    newStreak: streak,
    highestStreak,
  };
};
