export type UpgradeId =
  | 'extra_dice'
  | 'dice_sides'
  | 'material_tier'
  | 'manual_cooldown'
  | 'auto_roller'
  | 'cushioned_surface'
  | 'flat_bonus'
  | 'less_is_more'
  | 'table_magnetism'
  | 'ghost_dice'
  | 'combo_mult'
  | 'hold_to_roll'
  | 'cosmic_secret';

export type UpgradeCategory = 'dice' | 'automation' | 'probability' | 'combos' | 'milestones';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  category: UpgradeCategory;
  baseCost: number;
  growth: number;
  maxLevel: number;
  iconName?: string;
  formatSummary: (level: number, isMax: boolean) => string;
}

export const getCost = (id: UpgradeId, currentLevel: number): number => {
  const upg = UPGRADES[id];
  if (!upg) return 999999999;
  return Math.floor(upg.baseCost * Math.pow(upg.growth, currentLevel));
};

export const getMilestoneRequiredUpgrades = (currentLevel: number): number => {
  const thresholds = [10, 18, 28, 40, 55];
  return thresholds[Math.min(currentLevel, thresholds.length - 1)] ?? 10;
};

export const getDiceCount = (level: number): number => Math.min(10, 1 + level);

export const getDiceSides = (level: number): number => {
  const sidesMap = [6, 8, 10, 12, 20];
  return sidesMap[Math.min(level, sidesMap.length - 1)] || 6;
};

export const getMaterialTierName = (level: number): string => {
  const names = ['Madera Gastada', 'Plástico Brillante', 'Metálico / Cromo', 'Cristal Traslúcido', 'Neón', 'Cósmico'];
  return names[Math.min(level, names.length - 1)] || 'Desconocido';
};

export const getMaterialMult = (level: number): number => {
  const mults = [1, 1.4, 2.0, 3.0, 4.5, 6.5];
  return mults[Math.min(level, mults.length - 1)] || 1;
};

export const getManualCooldown = (level: number): number => {
  return Math.max(0.06, 1.0 * Math.pow(0.87, level));
};

export const getAutoRollsPerSec = (level: number): number => {
  if (level === 0) return 0;
  return Number((0.15 * level + 0.015 * Math.pow(level, 1.6)).toFixed(2));
};

export const getAnimationSpeedMult = (level: number): number => {
  return 1 + level * 0.2;
};

export const getFlatBonus = (level: number): number => {
  return level;
};

export const getLessIsMoreProb = (level: number): number => {
  return level * 0.05;
};

// Backward-compatible alias
export const getWorstCaseProb = getLessIsMoreProb;

export const getMagnetismProb = (level: number): number => {
  return level * 0.08;
};

export const getGhostDiceProbability = (level: number): number => {
  if (level === 0) return 0;
  return 0.02 + (level - 1) * 0.07;
};

export const getComboMult = (level: number): number => {
  return 1 + level * 0.1;
};

export const getHoldToRollEnabled = (level: number): boolean => {
  return level > 0;
};

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  // 1. Capacidad y Tipo de Dados
  extra_dice: {
    id: 'extra_dice',
    name: 'Más Dados',
    desc: 'Tira un dado adicional por tirada.',
    category: 'dice',
    baseCost: 400,
    growth: 3.2,
    maxLevel: 9,
    formatSummary: (level, isMax) =>
      `Dados activos: ${level + 1} dados${!isMax ? ` → ${level + 2} dados` : ''}`,
  },
  dice_sides: {
    id: 'dice_sides',
    name: 'Evolución Poliédrica',
    desc: 'Aumenta las caras de los dados para obtener números más altos en cada tirada.',
    category: 'dice',
    baseCost: 1200,
    growth: 4.2,
    maxLevel: 4,
    formatSummary: (level, isMax) =>
      `Caras del dado: D${getDiceSides(level)}${!isMax ? ` → D${getDiceSides(level + 1)}` : ''}`,
  },
  material_tier: {
    id: 'material_tier',
    name: 'Calidad de Material',
    desc: 'Multiplica los puntos de cada tirada según la calidad del material de los dados.',
    category: 'dice',
    baseCost: 2000,
    growth: 4.8,
    maxLevel: 5,
    formatSummary: (level, isMax) =>
      `Material: ${getMaterialTierName(level)} (x${getMaterialMult(level)})${!isMax ? ` → ${getMaterialTierName(level + 1)} (x${getMaterialMult(level + 1)})` : ''}`,
  },

  // 2. Automatización y Ritmo
  manual_cooldown: {
    id: 'manual_cooldown',
    name: 'Dedos Rápidos',
    desc: 'Reduce drásticamente el tiempo de tirada manual de los dados.',
    category: 'automation',
    baseCost: 50,
    growth: 1.75,
    maxLevel: 20,
    formatSummary: (level, isMax) =>
      `Recarga: ${getManualCooldown(level).toFixed(3)}s (${(1 / getManualCooldown(level)).toFixed(1)}/s)${!isMax ? ` → ${getManualCooldown(level + 1).toFixed(3)}s (${(1 / getManualCooldown(level + 1)).toFixed(1)}/s)` : ''}`,
  },
  auto_roller: {
    id: 'auto_roller',
    name: 'Mano Mecánica (Auto-Roller)',
    desc: 'Tira los dados automáticamente de forma pasiva y constante.',
    category: 'automation',
    baseCost: 350,
    growth: 1.85,
    maxLevel: 15,
    formatSummary: (level, isMax) =>
      level > 0
        ? `Tiros automáticos: ${getAutoRollsPerSec(level).toFixed(1)} tiros/s${!isMax ? ` → ${getAutoRollsPerSec(level + 1).toFixed(1)} tiros/s` : ''}`
        : `Inactivo → Desbloquear ${getAutoRollsPerSec(1).toFixed(2)} tiros/s`,
  },
  cushioned_surface: {
    id: 'cushioned_surface',
    name: 'Superficie Acolchada',
    desc: 'Acelera la animación de los dados para que las tiradas se resuelvan más rápido.',
    category: 'automation',
    baseCost: 200,
    growth: 1.85,
    maxLevel: 10,
    formatSummary: (level, isMax) =>
      `Velocidad animación: x${getAnimationSpeedMult(level).toFixed(1)}${!isMax ? ` → x${getAnimationSpeedMult(level + 1).toFixed(1)}` : ''}`,
  },
  hold_to_roll: {
    id: 'hold_to_roll',
    name: 'Lanzamiento Continuo',
    desc: 'Permite mantener presionada la mesa o el botón para tirar dados continuamente.',
    category: 'automation',
    baseCost: 1000,
    growth: 1.0,
    maxLevel: 1,
    formatSummary: (level) =>
      level > 0 ? 'Tiro continuo activado (mantén presionado)' : 'Habilita disparar manteniendo presionado',
  },

  // 3. Modificadores de Probabilidad (Loaded Dice)
  flat_bonus: {
    id: 'flat_bonus',
    name: 'Caras Trucadas',
    desc: 'Añade puntos base adicionales a cada dado antes de multiplicar.',
    category: 'probability',
    baseCost: 120,
    growth: 1.75,
    maxLevel: 15,
    formatSummary: (level, isMax) =>
      `Puntos base por dado: +${getFlatBonus(level)} pts${!isMax ? ` → +${getFlatBonus(level + 1)} pts` : ''}`,
  },
  less_is_more: {
    id: 'less_is_more',
    name: 'Menos es Más',
    desc: 'Probabilidad de convertir los resultados de 1 en el valor más alto del dado.',
    category: 'probability',
    baseCost: 1500,
    growth: 3.0,
    maxLevel: 5,
    formatSummary: (level, isMax) =>
      `Probabilidad de convertir 1s en máximo: ${level * 5}%${!isMax ? ` → ${(level + 1) * 5}%` : ''}`,
  },
  table_magnetism: {
    id: 'table_magnetism',
    name: 'Magnetismo de Mesa',
    desc: 'Aumenta la probabilidad de que caigan números repetidos para armar combos.',
    category: 'probability',
    baseCost: 800,
    growth: 2.8,
    maxLevel: 5,
    formatSummary: (level, isMax) =>
      `Probabilidad de dados repetidos / pares: ${level * 8}%${!isMax ? ` → ${(level + 1) * 8}%` : ''}`,
  },
  ghost_dice: {
    id: 'ghost_dice',
    name: 'Dado Fantasma',
    desc: 'Probabilidad de invocar un dado fantasma que suma puntos extra en cada tiro.',
    category: 'probability',
    baseCost: 3500,
    growth: 3.5,
    maxLevel: 5,
    formatSummary: (level, isMax) => {
      const prob = Math.round(getGhostDiceProbability(level) * 100);
      const nextProb = Math.round(getGhostDiceProbability(level + 1) * 100);
      return `Probabilidad de dado fantasma: ${prob}%${!isMax ? ` → ${nextProb}%` : ''}`;
    },
  },

  // 4. Combos y Sinergias
  combo_mult: {
    id: 'combo_mult',
    name: 'Multiplicador de Combos',
    desc: 'Aumenta el multiplicador de puntos de todas las combinaciones y combos de dados.',
    category: 'combos',
    baseCost: 500,
    growth: 1.8,
    maxLevel: 15,
    formatSummary: (level, isMax) =>
      `Multiplicador de combos: x${getComboMult(level).toFixed(1)}${!isMax ? ` → x${getComboMult(level + 1).toFixed(1)}` : ''}`,
  },

  // 5. Objetos Especiales
  cosmic_secret: {
    id: 'cosmic_secret',
    name: 'Misterio Cósmico',
    desc: 'Desbloquea resonancia astral que potencia las tiradas y genera Fragmentos Cósmicos.',
    category: 'milestones',
    baseCost: 50000,
    growth: 3.5,
    maxLevel: 5,
    formatSummary: (level, isMax) =>
      `Nivel de misterio: Lvl ${level} (+${level * 15}% global)${!isMax ? ` → Lvl ${level + 1} (+${(level + 1) * 15}%)` : ''}`,
  },
};

export interface ComboResult {
  name: string;
  mult: number;
  tier: 'common' | 'rare' | 'epic' | 'legendary' | 'cosmic';
}

// Curated thematic color families with distinct tonal variations per group
export const TIER_COLOR_FAMILIES = {
  pair: ['#facc15', '#f59e0b', '#fbbf24', '#eab308', '#d97706'],
  triple: ['#38bdf8', '#06b6d4', '#60a5fa', '#0ea5e9', '#0284c7'],
  poker: ['#fb923c', '#f97316'],
  cosmic: ['#f472b6', '#e879f9', '#ec4899'],
  straight: ['#c084fc', '#a855f7', '#8b5cf6'],
  parity: ['#4ade80', '#2dd4bf'],
};

interface FaceAnalysis {
  counts: Record<number, number>;
  sortedCounts: number[];
  distinctFaces: number[];
  longestStraight: number;
  straightFaces: number[];
  allEven: boolean;
  allOdd: boolean;
  allMax: boolean;
}

function analyzeFaces(faces: number[], sides: number): FaceAnalysis {
  const counts: Record<number, number> = {};
  let allEven = faces.length >= 4;
  let allOdd = faces.length >= 4;
  let allMax = faces.length >= 4;

  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    counts[f] = (counts[f] || 0) + 1;
    if (f % 2 === 0) allOdd = false;
    else allEven = false;
    if (f !== sides) allMax = false;
  }

  const distinctFaces = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const sortedCounts = Object.values(counts).sort((a, b) => b - a);

  let longestStraight = 1;
  let currentStreak = 1;
  let streakEndIdx = 0;
  for (let i = 1; i < distinctFaces.length; i++) {
    if (distinctFaces[i] === distinctFaces[i - 1] + 1) {
      currentStreak++;
      if (currentStreak > longestStraight) {
        longestStraight = currentStreak;
        streakEndIdx = i;
      }
    } else {
      currentStreak = 1;
    }
  }

  const straightFaces =
    longestStraight >= 4
      ? distinctFaces.slice(streakEndIdx - longestStraight + 1, streakEndIdx + 1)
      : [];

  return {
    counts,
    sortedCounts,
    distinctFaces,
    longestStraight,
    straightFaces,
    allEven,
    allOdd,
    allMax,
  };
}

export interface RollAnalysisResult {
  combos: ComboResult[];
  colorMap: Record<number, string>;
}

/**
 * Single-pass combo evaluation and per-die color mapping.
 */
export const analyzeDiceRoll = (faces: number[], sides: number): RollAnalysisResult => {
  if (faces.length === 0) return { combos: [], colorMap: {} };

  const analysis = analyzeFaces(faces, sides);
  const { counts, sortedCounts, longestStraight, straightFaces, allEven, allOdd, allMax } = analysis;
  const combos: ComboResult[] = [];

  // 1. Primary Poker Hand Evaluation
  const top = sortedCounts[0] || 0;
  const second = sortedCounts[1] || 0;

  if (top >= 10) {
    combos.push({ name: '¡DECETO DIVINO (10)!', mult: 120.0, tier: 'cosmic' });
  } else if (top === 9) {
    combos.push({ name: '¡Noneto Cósmico (9)!', mult: 80.0, tier: 'cosmic' });
  } else if (top === 8) {
    combos.push({ name: '¡Octeto Titánico (8)!', mult: 50.0, tier: 'cosmic' });
  } else if (top === 7) {
    combos.push({ name: '¡Septeto Supremo (7)!', mult: 30.0, tier: 'cosmic' });
  } else if (top === 6) {
    combos.push({ name: '¡Sexteto Perfecto!', mult: 16.0, tier: 'cosmic' });
  } else if (top === 5) {
    combos.push({ name: '¡Quinteto!', mult: 8.0, tier: 'cosmic' });
  } else if (top === 4) {
    combos.push({ name: '¡Póker (4 Iguales)!', mult: 4.0, tier: 'legendary' });
  } else if (top >= 3 && second >= 2) {
    combos.push({ name: '¡Full House!', mult: 2.6, tier: 'epic' });
  } else if (top === 3) {
    combos.push({ name: 'Trío', mult: 1.8, tier: 'rare' });
  } else if (top === 2 && second === 2) {
    const pairCount = sortedCounts.filter(c => c >= 2).length;
    if (pairCount >= 4) {
      combos.push({ name: '¡Cuádruple Pareja!', mult: 2.4, tier: 'epic' });
    } else if (pairCount === 3) {
      combos.push({ name: '¡Triple Pareja!', mult: 1.8, tier: 'rare' });
    } else {
      combos.push({ name: 'Doble Pareja', mult: 1.4, tier: 'rare' });
    }
  } else if (top === 2) {
    combos.push({ name: 'Pareja', mult: 1.15, tier: 'common' });
  }

  // 2. Straights
  if (longestStraight >= 8) {
    combos.push({ name: '¡Mega Escalera (8+)!', mult: 25.0, tier: 'cosmic' });
  } else if (longestStraight >= 6) {
    combos.push({ name: '¡Escalera Suprema (6)!', mult: 12.0, tier: 'cosmic' });
  } else if (longestStraight === 5) {
    combos.push({ name: '¡Escalera Mayor (5)!', mult: 5.5, tier: 'legendary' });
  } else if (longestStraight === 4) {
    combos.push({ name: 'Escalera Menor (4)', mult: 2.2, tier: 'epic' });
  }

  // 3. Global Parity
  if (allEven) {
    combos.push({ name: 'Todos Pares', mult: 1.5, tier: 'rare' });
  } else if (allOdd) {
    combos.push({ name: 'Todos Impares', mult: 1.5, tier: 'rare' });
  }

  // 4. Critical Nat Max
  if (allMax) {
    const natMult = faces.length >= 8 ? 35.0 : faces.length === 6 ? 18.0 : faces.length === 5 ? 10.0 : 5.0;
    combos.push({ name: `¡NATURAL MÁXIMO (D${sides})!`, mult: natMult, tier: 'cosmic' });
  }

  // Color Map Computation
  const colorMap: Record<number, string> = {};
  if (allMax) {
    faces.forEach((_, idx) => { colorMap[idx] = TIER_COLOR_FAMILIES.cosmic[0]; });
    return { combos, colorMap };
  }

  const groupFaces = Object.keys(counts)
    .filter(k => counts[Number(k)] >= 2)
    .map(Number)
    .sort((a, b) => counts[b] - counts[a]);

  let pairShadeIdx = 0;
  let tripleShadeIdx = 0;

  for (const f of groupFaces) {
    const count = counts[f];
    let color = '';
    if (count >= 5) {
      color = TIER_COLOR_FAMILIES.cosmic[0];
    } else if (count === 4) {
      color = TIER_COLOR_FAMILIES.poker[0];
    } else if (count === 3) {
      color = TIER_COLOR_FAMILIES.triple[tripleShadeIdx % TIER_COLOR_FAMILIES.triple.length];
      tripleShadeIdx++;
    } else if (count === 2) {
      color = TIER_COLOR_FAMILIES.pair[pairShadeIdx % TIER_COLOR_FAMILIES.pair.length];
      pairShadeIdx++;
    }

    faces.forEach((faceVal, idx) => {
      if (faceVal === f) colorMap[idx] = color;
    });
  }

  if (groupFaces.length === 0 && straightFaces.length >= 4) {
    const straightColor =
      longestStraight >= 6
        ? TIER_COLOR_FAMILIES.straight[2]
        : longestStraight === 5
          ? TIER_COLOR_FAMILIES.straight[1]
          : TIER_COLOR_FAMILIES.straight[0];

    const straightSet = new Set(straightFaces);
    const usedFaces = new Set<number>();
    faces.forEach((f, i) => {
      if (straightSet.has(f) && !usedFaces.has(f)) {
        colorMap[i] = straightColor;
        usedFaces.add(f);
      }
    });
  }

  if (Object.keys(colorMap).length === 0 && (allEven || allOdd)) {
    faces.forEach((_, idx) => { colorMap[idx] = TIER_COLOR_FAMILIES.parity[0]; });
  }

  return { combos, colorMap };
};

export const evaluateCombos = (faces: number[], sides: number): ComboResult[] =>
  analyzeDiceRoll(faces, sides).combos;

export const getDiceComboColorMap = (faces: number[], sides: number): Record<number, string> =>
  analyzeDiceRoll(faces, sides).colorMap;
