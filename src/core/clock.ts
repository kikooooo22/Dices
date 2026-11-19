import { getAutoRollsPerSec } from '../game/engine';
import { gameEvents } from './events';
import { computeEffectiveRollConfig } from './modifiers';
import { persistGameState } from './saveManager';
import { useGameStore } from './store';
import { initSubsystemBridge } from './subsystemBridge';

const TICK_INTERVAL_MS = 50; // 20 Hz simulation tick
const AUTOSAVE_INTERVAL_MS = 2000;
const OFFLINE_MIN_SEC = 10;
const OFFLINE_MAX_SEC = 4 * 3600; // 4 hours cap
const OFFLINE_EFFICIENCY = 0.5; // 50% offline auto-roll rate

let clockTimer: ReturnType<typeof setInterval> | null = null;
let lastTickAt = 0;
let autoRollAccumulator = 0;
let saveAccumulatorMs = 0;
let offlineProcessed = false;
let listenersAttached = false;

const handleBeforeUnload = () => {
  persistGameState(useGameStore.getState().state, true);
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    persistGameState(useGameStore.getState().state, true);
  } else {
    lastTickAt = performance.now();
  }
};

export const processOfflineProgress = (): void => {
  if (offlineProcessed) return;
  offlineProcessed = true;

  const store = useGameStore.getState();
  const { state } = store;
  const baseRollsPerSec = getAutoRollsPerSec(state.upgrades.auto_roller);
  if (baseRollsPerSec <= 0 || !state.lastSavedAt) return;

  const elapsedSec = Math.max(0, (Date.now() - state.lastSavedAt) / 1000);
  if (elapsedSec < OFFLINE_MIN_SEC) return;

  const cappedSec = Math.min(elapsedSec, OFFLINE_MAX_SEC);
  const simulatedRolls = Math.floor(cappedSec * baseRollsPerSec * OFFLINE_EFFICIENCY);
  if (simulatedRolls <= 0) return;

  const prevPoints = store.state.points;
  store.performRoll('auto', simulatedRolls);
  const earned = useGameStore.getState().state.points - prevPoints;

  if (earned > 0) {
    gameEvents.emit('offline:rewarded', {
      elapsedSec: Math.round(cappedSec),
      rollsSimulated: simulatedRolls,
      pointsEarned: earned,
    });
  }
};

const runTick = () => {
  const now = performance.now();
  const rawDtMs = now - lastTickAt;
  lastTickAt = now;

  // Clamp dt to avoid giant spikes when tab wakes from sleep
  const dtMs = Math.min(1000, Math.max(0, rawDtMs));
  const store = useGameStore.getState();

  if (!store.isGlobalPaused) {
    // 1. Tick active buffs
    if (store.state.activeBuffs.length > 0) {
      store.tickBuffs(dtMs);
    }

    // 2. Tick auto-roller with batching
    if (!store.isAutoRollPaused) {
      const baseRps = getAutoRollsPerSec(store.state.upgrades.auto_roller);
      if (baseRps > 0) {
        const config = computeEffectiveRollConfig(store.state);
        const effectiveRps = baseRps * config.autoRollSpeedMult;
        autoRollAccumulator += effectiveRps * (dtMs / 1000);

        if (autoRollAccumulator >= 1) {
          const rollsToRun = Math.floor(autoRollAccumulator);
          autoRollAccumulator -= rollsToRun;
          store.performRoll('auto', rollsToRun);
        }
      } else {
        autoRollAccumulator = 0;
      }
    }
  }

  // 3. Throttled background save
  saveAccumulatorMs += dtMs;
  if (saveAccumulatorMs >= AUTOSAVE_INTERVAL_MS) {
    saveAccumulatorMs = 0;
    persistGameState(useGameStore.getState().state);
  }
};

export const startGameClock = (): (() => void) => {
  initSubsystemBridge();
  if (clockTimer !== null) {
    return stopGameClock;
  }

  processOfflineProgress();
  lastTickAt = performance.now();
  clockTimer = setInterval(runTick, TICK_INTERVAL_MS);

  if (!listenersAttached) {
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    listenersAttached = true;
  }

  return stopGameClock;
};

export const stopGameClock = (): void => {
  if (clockTimer !== null) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
  if (listenersAttached) {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    listenersAttached = false;
  }
  persistGameState(useGameStore.getState().state, true);
};
