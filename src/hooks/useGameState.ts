import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UpgradeId, 
  UPGRADES, 
  getCost, 
  getDiceCount, 
  getDiceSides,
  getMaterialMult,
  getAutoRollsPerSec,
  getFlatBonus,
  getLessIsMoreProb,
  getMagnetismProb,
  getGhostDiceProbability,
  getComboMult,
  evaluateCombos,
  ComboResult
} from '../game/engine';

export interface LastRollData {
  id: number;
  faces: number[];
  ghosts: number[];
  baseSum: number;
  totalEarned: number;
  combos: ComboResult[];
  streak: number;
  streakBonus: number;
  timestamp: number;
}

export interface GameState {
  points: number;
  totalPointsEarned: number;
  totalRolls: number;
  comboStreak: number;
  highestStreak: number;
  upgrades: Record<UpgradeId, number>;
  globalMult: number; // For the Real.jpg milestone (x2)
  milestone1Unlocked: boolean; // Real.jpg (x2 mult)
  milestone2Unlocked: boolean; // Fake.jpg (Game over / trophy)
  cheatsUnlocked: boolean; // Unlocked via Ode to Joy musical Konami code
}

export const INITIAL_STATE: GameState = {
  points: 0,
  totalPointsEarned: 0,
  totalRolls: 0,
  comboStreak: 0,
  highestStreak: 0,
  upgrades: {
    extra_dice: 0,
    dice_sides: 0,
    material_tier: 0,
    manual_cooldown: 0,
    auto_roller: 0,
    cushioned_surface: 0,
    flat_bonus: 0,
    less_is_more: 0,
    table_magnetism: 0,
    ghost_dice: 0,
    combo_mult: 0,
    hold_to_roll: 0,
    cosmic_secret: 0,
  },
  globalMult: 1,
  milestone1Unlocked: false,
  milestone2Unlocked: false,
  cheatsUnlocked: false,
};

const STORAGE_KEY = 'pal_alensis_dice_save_v2';

export const useGameState = (isGlobalPaused: boolean = false) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('dice_clicker_save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const upgs = parsed.upgrades || {};
        if (upgs.worst_case_elim !== undefined && upgs.less_is_more === undefined) {
          upgs.less_is_more = upgs.worst_case_elim;
        }
        return {
          ...INITIAL_STATE,
          ...parsed,
          upgrades: { ...INITIAL_STATE.upgrades, ...upgs },
          globalMult: parsed.milestone1Unlocked ? 2 : 1,
          cheatsUnlocked: Boolean(parsed.cheatsUnlocked),
        };
      } catch (e) {
        console.error('Failed to parse save game:', e);
      }
    }
    return INITIAL_STATE;
  });

  const [lastRoll, setLastRoll] = useState<LastRollData | null>(null);
  const [isAutoRollPaused, setIsAutoRollPaused] = useState(false);

  // Ref to access current state in async intervals and callbacks without stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist state in background (throttled) to prevent massive FPS drops on high roll speeds
  useEffect(() => {
    let lastSavedString = '';
    const saveState = () => {
      try {
        const stateStr = JSON.stringify(stateRef.current);
        if (stateStr !== lastSavedString) {
          localStorage.setItem(STORAGE_KEY, stateStr);
          lastSavedString = stateStr;
        }
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    };

    // Save automatically every 2 seconds
    const intervalId = setInterval(saveState, 2000);

    // Also attempt to save when user closes the tab
    const handleBeforeUnload = () => saveState();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveState();
    };
  }, []);

  const buyUpgrade = useCallback((id: UpgradeId) => {
    setState(prev => {
      const upg = UPGRADES[id];
      if (!upg) return prev;
      const currentLevel = prev.upgrades[id] || 0;
      if (currentLevel >= upg.maxLevel) return prev;

      const cost = getCost(id, currentLevel);
      if (prev.points < cost) return prev;

      return {
        ...prev,
        points: prev.points - cost,
        upgrades: {
          ...prev.upgrades,
          [id]: currentLevel + 1
        }
      };
    });
  }, []);

  const addPoints = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      points: prev.points + amount,
      totalPointsEarned: prev.totalPointsEarned + amount,
    }));
  }, []);

  const unlockCheats = useCallback(() => {
    setState(prev => ({
      ...prev,
      cheatsUnlocked: true
    }));
  }, []);

  const disableCheats = useCallback(() => {
    setState(prev => ({
      ...prev,
      cheatsUnlocked: false
    }));
  }, []);

  const maxAllUpgrades = useCallback(() => {
    setState(prev => {
      const maxedUpgrades = {} as Record<UpgradeId, number>;
      Object.values(UPGRADES).forEach(u => {
        maxedUpgrades[u.id] = u.maxLevel;
      });
      return {
        ...prev,
        upgrades: maxedUpgrades,
        points: Math.max(prev.points, 1000000000),
      };
    });
  }, []);

  const triggerMilestone1 = useCallback(() => {
    setState(prev => {
      if (prev.milestone1Unlocked) return prev;
      return {
        ...prev,
        milestone1Unlocked: true,
        globalMult: 2
      };
    });
  }, []);

  const triggerMilestone2 = useCallback(() => {
    setState(prev => {
      if (prev.milestone2Unlocked) return prev;
      return {
        ...prev,
        milestone2Unlocked: true,
      };
    });
  }, []);

  const hardReset = useCallback(() => {
    setState(INITIAL_STATE);
    setLastRoll(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('dice_clicker_save');
    } catch (e) {}
  }, []);

  const toggleAutoRoll = useCallback(() => {
    setIsAutoRollPaused(prev => !prev);
  }, []);

  // Single roll execution logic
  const rollDice = useCallback(() => {
    const current = stateRef.current;
    const diceCount = getDiceCount(current.upgrades.extra_dice);
    const sides = getDiceSides(current.upgrades.dice_sides);
    const flat = getFlatBonus(current.upgrades.flat_bonus);
    const matMult = getMaterialMult(current.upgrades.material_tier);
    const comboM = getComboMult(current.upgrades.combo_mult);
    const lessIsMoreProb = getLessIsMoreProb(current.upgrades.less_is_more || 0);
    const magnetismProb = getMagnetismProb(current.upgrades.table_magnetism);
    const ghostProb = getGhostDiceProbability(current.upgrades.ghost_dice);

    const faces: number[] = [];
    let baseSum = 0;

    // Determine a possible magnetized target face to encourage duplicates if table magnetism triggers
    let magneticTarget: number | null = null;
    if (magnetismProb > 0 && Math.random() < magnetismProb) {
      // Pick either an even number or a high number
      const evens = Array.from({ length: sides }, (_, i) => i + 1).filter(n => n % 2 === 0);
      magneticTarget = evens.length > 0 ? evens[Math.floor(Math.random() * evens.length)] : sides;
    }

    for (let i = 0; i < diceCount; i++) {
      let face: number;
      if (magneticTarget !== null && Math.random() < magnetismProb) {
        face = magneticTarget;
      } else {
        face = Math.floor(Math.random() * sides) + 1;
      }

      // Less is More: converts 1s into max sides
      if (face === 1 && Math.random() < lessIsMoreProb) {
        face = sides;
      }

      faces.push(face);
      baseSum += face + flat;
    }

    // Ghost dice roll
    const ghosts: number[] = [];
    if (ghostProb > 0 && Math.random() < ghostProb) {
      let ghostFace = Math.floor(Math.random() * sides) + 1;
      if (ghostFace === 1 && Math.random() < lessIsMoreProb) {
        ghostFace = sides;
      }
      ghosts.push(ghostFace);
      baseSum += ghostFace + flat;
    }

    // Evaluate combos on standard dice
    const combos = evaluateCombos(faces, sides);
    let totalComboMult = 1;
    const hasCombo = combos.length > 0;
    if (hasCombo) {
      const sortedCombos = [...combos].sort((a, b) => b.mult - a.mult);
      totalComboMult = sortedCombos[0].mult;
      for (let i = 1; i < sortedCombos.length; i++) {
        totalComboMult += (sortedCombos[i].mult - 1) * 0.4;
      }
      totalComboMult *= comboM;
    }

    // Streaks mechanic: consecutive combo rolls accumulate +15% with smooth soft cap
    const newStreak = hasCombo ? current.comboStreak + 1 : 0;
    const streakBonus = newStreak > 1 
      ? Number((1 + Math.min(2.5, (newStreak - 1) * 0.15) + (newStreak > 18 ? Math.min(1.0, (newStreak - 18) * 0.03) : 0)).toFixed(2)) 
      : 1;
    const newRollId = current.totalRolls + 1;

    const totalEarned = Math.round(baseSum * matMult * totalComboMult * streakBonus * current.globalMult);

    const rollData: LastRollData = {
      id: newRollId,
      faces,
      ghosts,
      baseSum,
      totalEarned,
      combos,
      streak: newStreak,
      streakBonus,
      timestamp: Date.now(),
    };

    setLastRoll(rollData);

    setState(prev => ({
      ...prev,
      points: prev.points + totalEarned,
      totalPointsEarned: prev.totalPointsEarned + totalEarned,
      totalRolls: prev.totalRolls + 1,
      comboStreak: newStreak,
      highestStreak: Math.max(prev.highestStreak, newStreak),
    }));

    return rollData;
  }, []);

  // Auto roller background timer
  useEffect(() => {
    if (isAutoRollPaused || isGlobalPaused) return;
    const rollsPerSec = getAutoRollsPerSec(state.upgrades.auto_roller);
    if (rollsPerSec <= 0) return;

    const intervalMs = Math.max(50, 1000 / rollsPerSec);
    const timer = setInterval(() => {
      rollDice();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [state.upgrades.auto_roller, rollDice, isAutoRollPaused, isGlobalPaused]);

  return {
    state,
    buyUpgrade,
    addPoints,
    unlockCheats,
    disableCheats,
    maxAllUpgrades,
    rollDice,
    lastRoll,
    triggerMilestone1,
    triggerMilestone2,
    hardReset,
    toggleAutoRoll,
    isAutoRollPaused,
  };
};
