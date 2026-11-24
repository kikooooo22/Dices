import { useEffect } from 'react';
import { startGameClock } from '../core/clock';
import { useGameStore } from '../core/store';
import type { GameState, LastRollData } from '../core/types';

export type { GameState, LastRollData };

export const useGameState = (isGlobalPaused: boolean = false) => {
  const state = useGameStore((s) => s.state);
  const lastRoll = useGameStore((s) => s.lastRoll);
  const isAutoRollPaused = useGameStore((s) => s.isAutoRollPaused);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);
  const addPoints = useGameStore((s) => s.addPoints);
  const unlockCheats = useGameStore((s) => s.unlockCheats);
  const disableCheats = useGameStore((s) => s.disableCheats);
  const maxAllUpgrades = useGameStore((s) => s.maxAllUpgrades);
  const performRoll = useGameStore((s) => s.performRoll);
  const triggerMilestone1 = useGameStore((s) => s.triggerMilestone1);
  const triggerMilestone2 = useGameStore((s) => s.triggerMilestone2);
  const hardReset = useGameStore((s) => s.hardReset);
  const toggleAutoRoll = useGameStore((s) => s.toggleAutoRoll);
  const setGlobalPaused = useGameStore((s) => s.setGlobalPaused);

  useEffect(() => {
    setGlobalPaused(isGlobalPaused);
  }, [isGlobalPaused, setGlobalPaused]);

  useEffect(() => {
    return startGameClock();
  }, []);

  return {
    state,
    buyUpgrade,
    addPoints,
    unlockCheats,
    disableCheats,
    maxAllUpgrades,
    rollDice: () => performRoll('manual', 1),
    lastRoll,
    triggerMilestone1,
    triggerMilestone2,
    hardReset,
    toggleAutoRoll,
    isAutoRollPaused,
  };
};
