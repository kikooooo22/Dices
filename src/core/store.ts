import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { CurrencyId } from '../game/currencies';
import { getCost, UPGRADES, UpgradeId } from '../game/engine';
import { gameEvents } from './events';
import { simulateRolls } from './rollSimulation';
import {
  clearSavedGameState,
  createInitialGameState,
  loadSavedGameState,
  persistGameState,
} from './saveManager';
import { ActiveBuff, GameState, LastRollData, RollSource } from './types';

export interface GameStore {
  state: GameState;
  lastRoll: LastRollData | null;
  isAutoRollPaused: boolean;
  isGlobalPaused: boolean;

  performRoll: (source?: RollSource, count?: number) => LastRollData;
  buyUpgrade: (id: UpgradeId) => boolean;
  addPoints: (amount: number, reason?: string) => void;
  addCurrency: (currency: CurrencyId, amount: number, reason?: string) => void;
  spendCurrency: (currency: CurrencyId, amount: number, reason?: string) => boolean;
  addBuff: (buff: Omit<ActiveBuff, 'remainingMs'>) => void;
  tickBuffs: (dtMs: number) => void;
  recordMinigameResult: (minigameId: string, won: boolean, reward: number) => void;
  unlockCheats: () => void;
  disableCheats: () => void;
  maxAllUpgrades: () => void;
  triggerMilestone1: () => void;
  triggerMilestone2: () => void;
  toggleAutoRoll: () => void;
  setGlobalPaused: (paused: boolean) => void;
  hardReset: () => void;
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    state: loadSavedGameState(),
    lastRoll: null,
    isAutoRollPaused: false,
    isGlobalPaused: false,

    performRoll: (source = 'manual', count = 1) => {
      const current = get().state;
      const result = simulateRolls(current, count);

      set((store) => {
        const nextPoints = store.state.points + result.totalEarned;
        return {
          lastRoll: result.lastRoll,
          state: {
            ...store.state,
            points: nextPoints,
            currencies: {
              ...store.state.currencies,
              points: nextPoints,
            },
            totalPointsEarned: store.state.totalPointsEarned + result.totalEarned,
            totalRolls: store.state.totalRolls + result.rollsExecuted,
            comboStreak: result.newStreak,
            highestStreak: Math.max(store.state.highestStreak, result.highestStreak),
          },
        };
      });

      gameEvents.emit('roll:completed', {
        roll: result.lastRoll,
        source,
        count: result.rollsExecuted,
        totalBatchPoints: result.totalEarned,
      });

      if (result.totalEarned > 0) {
        gameEvents.emit('currency:changed', {
          currency: 'points',
          delta: result.totalEarned,
          total: get().state.points,
          reason: `roll:${source}`,
        });
      }

      return result.lastRoll;
    },

    buyUpgrade: (id) => {
      const upg = UPGRADES[id];
      if (!upg) return false;

      const current = get().state;
      const currentLevel = current.upgrades[id] || 0;
      if (currentLevel >= upg.maxLevel) return false;

      const cost = getCost(id, currentLevel);
      if (current.points < cost) return false;

      const nextPoints = current.points - cost;
      const newLevel = currentLevel + 1;

      set((store) => ({
        state: {
          ...store.state,
          points: nextPoints,
          currencies: {
            ...store.state.currencies,
            points: nextPoints,
          },
          upgrades: {
            ...store.state.upgrades,
            [id]: newLevel,
          },
        },
      }));

      gameEvents.emit('upgrade:bought', { id, newLevel, cost });
      gameEvents.emit('currency:changed', {
        currency: 'points',
        delta: -cost,
        total: nextPoints,
        reason: `upgrade:${id}`,
      });

      return true;
    },

    addCurrency: (currency, amount, reason) => {
      if (amount === 0) return;
      set((store) => {
        const currentVal =
          currency === 'points'
            ? store.state.points
            : store.state.currencies[currency] || 0;
        const nextVal = Math.max(0, currentVal + amount);
        const nextPoints = currency === 'points' ? nextVal : store.state.points;

        return {
          state: {
            ...store.state,
            points: nextPoints,
            totalPointsEarned:
              currency === 'points' && amount > 0
                ? store.state.totalPointsEarned + amount
                : store.state.totalPointsEarned,
            currencies: {
              ...store.state.currencies,
              [currency]: nextVal,
            },
          },
        };
      });

      const total =
        currency === 'points'
          ? get().state.points
          : get().state.currencies[currency] || 0;

      gameEvents.emit('currency:changed', {
        currency,
        delta: amount,
        total,
        reason,
      });
    },

    spendCurrency: (currency, amount, reason) => {
      if (amount <= 0) return true;
      const currentVal =
        currency === 'points'
          ? get().state.points
          : get().state.currencies[currency] || 0;

      if (currentVal < amount) return false;

      get().addCurrency(currency, -amount, reason);
      return true;
    },

    addPoints: (amount, reason = 'direct') => {
      get().addCurrency('points', amount, reason);
    },

    addBuff: (buffInput) => {
      const buff: ActiveBuff = {
        ...buffInput,
        remainingMs: buffInput.durationMs,
      };
      set((store) => {
        const filtered = store.state.activeBuffs.filter((b) => b.id !== buff.id);
        return {
          state: {
            ...store.state,
            activeBuffs: [...filtered, buff],
          },
        };
      });
      gameEvents.emit('buff:added', { buff });
    },

    tickBuffs: (dtMs) => {
      const buffs = get().state.activeBuffs;
      if (buffs.length === 0 || dtMs <= 0) return;

      const expiredIds: string[] = [];
      const nextBuffs: ActiveBuff[] = [];

      for (let i = 0; i < buffs.length; i++) {
        const remaining = buffs[i].remainingMs - dtMs;
        if (remaining > 0) {
          nextBuffs.push({ ...buffs[i], remainingMs: remaining });
        } else {
          expiredIds.push(buffs[i].id);
        }
      }

      set((store) => ({
        state: {
          ...store.state,
          activeBuffs: nextBuffs,
        },
      }));

      for (const buffId of expiredIds) {
        gameEvents.emit('buff:expired', { buffId });
      }
    },

    recordMinigameResult: (minigameId, won, reward) => {
      set((store) => {
        const prevStats = store.state.minigameStats[minigameId] || {
          played: 0,
          wins: 0,
          bestReward: 0,
        };
        return {
          state: {
            ...store.state,
            minigameStats: {
              ...store.state.minigameStats,
              [minigameId]: {
                played: prevStats.played + 1,
                wins: prevStats.wins + (won ? 1 : 0),
                bestReward: Math.max(prevStats.bestReward, reward),
              },
            },
          },
        };
      });
    },

    unlockCheats: () => {
      set((store) => ({
        state: { ...store.state, cheatsUnlocked: true },
      }));
      gameEvents.emit('cheats:toggled', { enabled: true });
    },

    disableCheats: () => {
      set((store) => ({
        state: { ...store.state, cheatsUnlocked: false },
      }));
      gameEvents.emit('cheats:toggled', { enabled: false });
    },

    maxAllUpgrades: () => {
      set((store) => {
        const maxedUpgrades = {} as Record<UpgradeId, number>;
        Object.values(UPGRADES).forEach((u) => {
          maxedUpgrades[u.id] = u.maxLevel;
        });
        const nextPoints = Math.max(store.state.points, 1_000_000_000);
        return {
          state: {
            ...store.state,
            upgrades: maxedUpgrades,
            points: nextPoints,
            currencies: {
              ...store.state.currencies,
              points: nextPoints,
            },
          },
        };
      });
    },

    triggerMilestone1: () => {
      set((store) => {
        if (store.state.milestone1Unlocked) return store;
        return {
          state: {
            ...store.state,
            milestone1Unlocked: true,
            globalMult: 2,
          },
        };
      });
    },

    triggerMilestone2: () => {
      set((store) => {
        if (store.state.milestone2Unlocked) return store;
        return {
          state: {
            ...store.state,
            milestone2Unlocked: true,
          },
        };
      });
    },

    toggleAutoRoll: () => {
      set((store) => ({ isAutoRollPaused: !store.isAutoRollPaused }));
    },

    setGlobalPaused: (paused) => {
      set({ isGlobalPaused: paused });
    },

    hardReset: () => {
      clearSavedGameState();
      const fresh = createInitialGameState();
      set({
        state: fresh,
        lastRoll: null,
        isAutoRollPaused: false,
      });
      persistGameState(fresh, true);
      gameEvents.emit('game:reset', {});
    },
  }))
);
