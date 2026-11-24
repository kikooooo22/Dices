import { ComboResult, UpgradeId } from '../game/engine';
import { CurrencyId } from '../game/currencies';

export type RollSource = 'manual' | 'auto' | 'minigame';

export interface LastRollData {
  id: number;
  faces: number[];
  ghosts: number[];
  baseSum: number;
  totalEarned: number;
  combos: ComboResult[];
  colorMap: Record<number, string>;
  streak: number;
  streakBonus: number;
  timestamp: number;
}

export interface RollConfig {
  diceCount: number;
  sides: number;
  flatBonus: number;
  materialMult: number;
  comboMult: number;
  globalMult: number;
  lessIsMoreProb: number;
  magnetismProb: number;
  ghostProb: number;
  extraGhostDice: number;
  autoRollSpeedMult: number;
  pointsMult: number;
}

export interface ActiveBuff {
  id: string;
  name: string;
  desc: string;
  durationMs: number;
  remainingMs: number;
  color?: string;
  modifiers: Partial<RollConfig>;
}

export interface MinigameStats {
  played: number;
  wins: number;
  bestReward: number;
}

export interface GameState {
  version: number;
  points: number;
  currencies: Record<CurrencyId, number>;
  totalPointsEarned: number;
  totalRolls: number;
  comboStreak: number;
  highestStreak: number;
  upgrades: Record<UpgradeId, number>;
  globalMult: number;
  milestone1Unlocked: boolean;
  milestone2Unlocked: boolean;
  cheatsUnlocked: boolean;
  activeBuffs: ActiveBuff[];
  minigameStats: Record<string, MinigameStats>;
  lastSavedAt: number;
}
