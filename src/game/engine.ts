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
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  // 1. Capacidad y Tipo de Dados
  extra_dice: {
    id: 'extra_dice',
    name: 'Más Dados',
    desc: 'Tira un dado adicional por tirada.',
    category: 'dice',
    baseCost: 500,
    growth: 3.8,
    maxLevel: 9 // 1 + 9 = 10 dados en total
  },
  dice_sides: {
    id: 'dice_sides',
    name: 'Evolución Poliédrica',
    desc: 'Aumenta las caras de los dados para obtener números más altos en cada tirada.',
    category: 'dice',
    baseCost: 1200,
    growth: 4.5,
    maxLevel: 4
  },
  material_tier: {
    id: 'material_tier',
    name: 'Calidad de Material',
    desc: 'Multiplica los puntos de cada tirada según la calidad del material de los dados.',
    category: 'dice',
    baseCost: 2500,
    growth: 5.8,
    maxLevel: 5
  },

  // 2. Automatización y Ritmo
  manual_cooldown: {
    id: 'manual_cooldown',
    name: 'Dedos Rápidos',
    desc: 'Reduce drásticamente el tiempo de tirada manual de los dados.',
    category: 'automation',
    baseCost: 50,
    growth: 1.55,
    maxLevel: 40 // Velocidad extrema absurda para el endgame
  },
  auto_roller: {
    id: 'auto_roller',
    name: 'Mano Mecánica (Auto-Roller)',
    desc: 'Tira los dados automáticamente de forma pasiva y constante.',
    category: 'automation',
    baseCost: 350,
    growth: 1.75,
    maxLevel: 20
  },
  cushioned_surface: {
    id: 'cushioned_surface',
    name: 'Superficie Acolchada',
    desc: 'Acelera la animación de los dados para que las tiradas se resuelvan más rápido.',
    category: 'automation',
    baseCost: 200,
    growth: 1.7,
    maxLevel: 10
  },
  hold_to_roll: {
    id: 'hold_to_roll',
    name: 'Lanzamiento Continuo',
    desc: 'Permite mantener presionada la mesa o el botón para tirar dados continuamente.',
    category: 'automation',
    baseCost: 1000,
    growth: 1.0,
    maxLevel: 1
  },

  // 3. Modificadores de Probabilidad (Loaded Dice)
  flat_bonus: {
    id: 'flat_bonus',
    name: 'Caras Trucadas',
    desc: 'Añade puntos base adicionales a cada dado antes de multiplicar.',
    category: 'probability',
    baseCost: 150,
    growth: 1.65,
    maxLevel: 20
  },
  less_is_more: {
    id: 'less_is_more',
    name: 'Menos es Más',
    desc: 'Probabilidad de convertir los resultados de 1 en el valor más alto del dado.',
    category: 'probability',
    baseCost: 1500,
    growth: 3.2,
    maxLevel: 5
  },
  table_magnetism: {
    id: 'table_magnetism',
    name: 'Magnetismo de Mesa',
    desc: 'Aumenta la probabilidad de que caigan números repetidos para armar combos.',
    category: 'probability',
    baseCost: 800,
    growth: 3.0,
    maxLevel: 5
  },
  ghost_dice: {
    id: 'ghost_dice',
    name: 'Dado Fantasma',
    desc: 'Probabilidad de invocar un dado fantasma que suma puntos extra en cada tiro.',
    category: 'probability',
    baseCost: 4000,
    growth: 3.8,
    maxLevel: 5
  },

  // 4. Combos y Sinergias
  combo_mult: {
    id: 'combo_mult',
    name: 'Multiplicador de Combos',
    desc: 'Aumenta el multiplicador de puntos de todas las combinaciones y combos de dados.',
    category: 'combos',
    baseCost: 600,
    growth: 1.6,
    maxLevel: 20
  },

  // 5. Secretos y Especiales
  cosmic_secret: {
    id: 'cosmic_secret',
    name: 'Misterio Cósmico',
    desc: 'Un antiguo secreto enigmático. (Efecto en desarrollo para futuras actualizaciones)',
    category: 'milestones',
    baseCost: 25000,
    growth: 3.2,
    maxLevel: 5
  },
};

export const getCost = (id: UpgradeId, currentLevel: number): number => {
  const upg = UPGRADES[id];
  if (!upg) return 999999999;
  return Math.floor(upg.baseCost * Math.pow(upg.growth, currentLevel));
};

export const getMilestoneRequiredUpgrades = (currentLevel: number): number => {
  // Cantidad acumulada de mejoras estándar necesarias para desbloquear cada nivel de Secreto:
  // Lvl 0 -> 1: 10
  // Lvl 1 -> 2: 18 (+8)
  // Lvl 2 -> 3: 28 (+10)
  // Lvl 3 -> 4: 40 (+12)
  // Lvl 4 -> 5: 55 (+15)
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
  const mults = [1, 1.5, 2.5, 4.0, 7.0, 12.0];
  return mults[Math.min(level, mults.length - 1)] || 1;
};

export const getManualCooldown = (level: number): number => {
  // Ultra absurd endgame speed: reaching up to ~60+ rolls/second
  return Math.max(0.016, 1.0 * Math.pow(0.89, level));
};

export const getAutoRollsPerSec = (level: number): number => {
  if (level === 0) return 0;
  return 0.3 * level + 0.03 * Math.pow(level, 1.8);
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

export interface ComboResult {
  name: string;
  mult: number;
  tier: 'common' | 'rare' | 'epic' | 'legendary' | 'cosmic';
}

export const evaluateCombos = (faces: number[], sides: number): ComboResult[] => {
  if (faces.length === 0) return [];
  const combos: ComboResult[] = [];

  const counts: Record<number, number> = {};
  faces.forEach(f => {
    counts[f] = (counts[f] || 0) + 1;
  });

  const sortedCounts = Object.values(counts).sort((a, b) => b - a);
  const distinctFaces = Object.keys(counts).map(Number).sort((a, b) => a - b);

  // 1. Primary Poker Hand Evaluation (from Pairs to 10 of a kind)
  if (sortedCounts[0] >= 10) {
    combos.push({ name: '¡DECETO DIVINO (10)!', mult: 500.0, tier: 'cosmic' });
  } else if (sortedCounts[0] === 9) {
    combos.push({ name: '¡Noneto Cósmico (9)!', mult: 250.0, tier: 'cosmic' });
  } else if (sortedCounts[0] === 8) {
    combos.push({ name: '¡Octeto Titánico (8)!', mult: 120.0, tier: 'cosmic' });
  } else if (sortedCounts[0] === 7) {
    combos.push({ name: '¡Septeto Supremo (7)!', mult: 60.0, tier: 'cosmic' });
  } else if (sortedCounts[0] === 6) {
    combos.push({ name: '¡Sexteto Perfecto!', mult: 35.0, tier: 'cosmic' });
  } else if (sortedCounts[0] === 5) {
    combos.push({ name: '¡Quinteto!', mult: 14.0, tier: 'cosmic' });
  } else if (sortedCounts[0] === 4) {
    combos.push({ name: '¡Póker (4 Iguales)!', mult: 5.5, tier: 'legendary' });
  } else if (sortedCounts[0] >= 3 && sortedCounts[1] >= 2) {
    combos.push({ name: '¡Full House!', mult: 3.5, tier: 'epic' });
  } else if (sortedCounts[0] === 3) {
    combos.push({ name: 'Trío', mult: 2.2, tier: 'rare' });
  } else if (sortedCounts[0] === 2 && sortedCounts[1] === 2) {
    const pairCount = sortedCounts.filter(c => c >= 2).length;
    if (pairCount >= 4) {
      combos.push({ name: '¡Cuádruple Pareja!', mult: 3.2, tier: 'epic' });
    } else if (pairCount === 3) {
      combos.push({ name: '¡Triple Pareja!', mult: 2.4, tier: 'rare' });
    } else {
      combos.push({ name: 'Doble Pareja', mult: 1.6, tier: 'rare' });
    }
  } else if (sortedCounts[0] === 2) {
    combos.push({ name: 'Pareja', mult: 1.25, tier: 'common' });
  }

  // 2. Straights (from 4 up to 10 consecutive dice)
  if (distinctFaces.length >= 4) {
    let longestStreak = 1;
    let currentStreak = 1;
    for (let i = 1; i < distinctFaces.length; i++) {
      if (distinctFaces[i] === distinctFaces[i - 1] + 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    if (longestStreak >= 8) {
      combos.push({ name: '¡Mega Escalera (8+)!', mult: 40.0, tier: 'cosmic' });
    } else if (longestStreak >= 6) {
      combos.push({ name: '¡Escalera Suprema (6)!', mult: 18.0, tier: 'cosmic' });
    } else if (longestStreak === 5) {
      combos.push({ name: '¡Escalera Mayor (5)!', mult: 7.5, tier: 'legendary' });
    } else if (longestStreak === 4) {
      combos.push({ name: 'Escalera Menor (4)', mult: 2.8, tier: 'epic' });
    }
  }

  // 3. Paridad Global (Requiere al menos 4 dados)
  if (faces.length >= 4) {
    const allEven = faces.every(f => f % 2 === 0);
    const allOdd = faces.every(f => f % 2 !== 0);
    if (allEven) {
      combos.push({ name: 'Todos Pares', mult: 1.8, tier: 'rare' });
    } else if (allOdd) {
      combos.push({ name: 'Todos Impares', mult: 1.8, tier: 'rare' });
    }
  }

  // 4. Critical Nat Max (Requiere 4 o más dados y TODOS en el valor máximo)
  if (faces.length >= 4 && faces.every(f => f === sides)) {
    const natMult = faces.length >= 8 ? 80.0 : faces.length === 6 ? 30.0 : faces.length === 5 ? 16.0 : 8.0;
    combos.push({ name: `¡NATURAL MÁXIMO (D${sides})!`, mult: natMult, tier: 'cosmic' });
  }

  return combos;
};

// Curated thematic color families with distinct tonal variations per group
export const TIER_COLOR_FAMILIES = {
  // Pairs: Distinct Golden / Amber tonal shades
  pair: ['#facc15', '#f59e0b', '#fbbf24', '#eab308', '#d97706'],
  // Triples: Distinct Cyan / Electric Blue tonal shades
  triple: ['#38bdf8', '#06b6d4', '#60a5fa', '#0ea5e9', '#0284c7'],
  // Poker (4 identical dice): Fire / Flame Orange
  poker: ['#fb923c', '#f97316'],
  // Cosmic hands (5+ identical dice / NatMax): Pink / Magenta
  cosmic: ['#f472b6', '#e879f9', '#ec4899'],
  // Straights: Violet / Purple shades
  straight: ['#c084fc', '#a855f7', '#8b5cf6'],
  // Parity (All even / All odd): Emerald / Teal
  parity: ['#4ade80', '#2dd4bf'],
};

// Returns a mapping of dieIndex -> customBorderColor for each distinct matching group/pair
export const getDiceComboColorMap = (
  faces: number[],
  sides: number
): Record<number, string> => {
  if (faces.length === 0) return {};

  const counts: Record<number, number> = {};
  faces.forEach(f => { counts[f] = (counts[f] || 0) + 1; });

  const colorMap: Record<number, string> = {};
  let pairShadeIdx = 0;
  let tripleShadeIdx = 0;

  // 1. Natural Max (4+ dice all max)
  if (faces.length >= 4 && faces.every(f => f === sides)) {
    faces.forEach((_, idx) => { colorMap[idx] = TIER_COLOR_FAMILIES.cosmic[0]; });
    return colorMap;
  }

  // 2. Identify all groups of 2 or more matching dice (sorted by cluster size)
  const groupFaces = Object.keys(counts)
    .filter(k => counts[Number(k)] >= 2)
    .map(Number)
    .sort((a, b) => counts[b] - counts[a]);

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
      // Each distinct pair gets a different shade within the Golden/Amber family
      color = TIER_COLOR_FAMILIES.pair[pairShadeIdx % TIER_COLOR_FAMILIES.pair.length];
      pairShadeIdx++;
    }

    faces.forEach((faceVal, idx) => {
      if (faceVal === f) {
        colorMap[idx] = color;
      }
    });
  }

  // 3. If no pairs, check for straights
  if (groupFaces.length === 0) {
    const distinctFaces = Object.keys(counts).map(Number).sort((a, b) => a - b);
    if (distinctFaces.length >= 4) {
      let longestStreak = 1;
      let currentStreak = 1;
      let streakEndIdx = 0;
      for (let i = 1; i < distinctFaces.length; i++) {
        if (distinctFaces[i] === distinctFaces[i - 1] + 1) {
          currentStreak++;
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
            streakEndIdx = i;
          }
        } else {
          currentStreak = 1;
        }
      }
      if (longestStreak >= 4) {
        const straightColor = longestStreak >= 6
          ? TIER_COLOR_FAMILIES.straight[2]
          : longestStreak === 5
            ? TIER_COLOR_FAMILIES.straight[1]
            : TIER_COLOR_FAMILIES.straight[0];

        const straightFaces = distinctFaces.slice(streakEndIdx - longestStreak + 1, streakEndIdx + 1);
        const usedFaces = new Set<number>();
        faces.forEach((f, i) => {
          if (straightFaces.includes(f) && !usedFaces.has(f)) {
            colorMap[i] = straightColor;
            usedFaces.add(f);
          }
        });
      }
    }
  }

  // 4. Parity (All even / All odd) if 4+ dice
  if (faces.length >= 4 && Object.keys(colorMap).length === 0) {
    const allEven = faces.every(f => f % 2 === 0);
    const allOdd = faces.every(f => f % 2 !== 0);
    if (allEven || allOdd) {
      faces.forEach((_, idx) => { colorMap[idx] = TIER_COLOR_FAMILIES.parity[0]; });
    }
  }

  return colorMap;
};
