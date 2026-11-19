import {
  getComboMult,
  getDiceCount,
  getDiceSides,
  getFlatBonus,
  getGhostDiceProbability,
  getLessIsMoreProb,
  getMagnetismProb,
  getMaterialMult,
} from '../game/engine';
import { GameState, RollConfig } from './types';

export type RollConfigHook = (config: RollConfig, state: GameState) => RollConfig;

const registeredConfigHooks = new Map<string, RollConfigHook>();

/**
 * Register a custom modifier hook (for relics, prestige perks, or minigame effects).
 * Returns an unsubscribe function.
 */
export const registerRollModifier = (id: string, hook: RollConfigHook): (() => void) => {
  registeredConfigHooks.set(id, hook);
  return () => {
    registeredConfigHooks.delete(id);
  };
};

const applyModifierPatch = (config: RollConfig, patch: Partial<RollConfig>): RollConfig => {
  return {
    diceCount: Math.max(1, config.diceCount + (patch.diceCount ?? 0)),
    sides: patch.sides ? Math.max(config.sides, patch.sides) : config.sides,
    flatBonus: config.flatBonus + (patch.flatBonus ?? 0),
    materialMult: config.materialMult * (patch.materialMult ?? 1),
    comboMult: config.comboMult * (patch.comboMult ?? 1),
    globalMult: config.globalMult * (patch.globalMult ?? 1),
    lessIsMoreProb: Math.min(1, Math.max(0, config.lessIsMoreProb + (patch.lessIsMoreProb ?? 0))),
    magnetismProb: Math.min(1, Math.max(0, config.magnetismProb + (patch.magnetismProb ?? 0))),
    ghostProb: Math.min(1, Math.max(0, config.ghostProb + (patch.ghostProb ?? 0))),
    extraGhostDice: Math.max(0, config.extraGhostDice + (patch.extraGhostDice ?? 0)),
    autoRollSpeedMult: Math.max(0.1, config.autoRollSpeedMult * (patch.autoRollSpeedMult ?? 1)),
    pointsMult: Math.max(0, config.pointsMult * (patch.pointsMult ?? 1)),
  };
};

/**
 * Compute the effective roll configuration after applying upgrades,
 * cosmic secret resonance, active buffs, and registered subsystem hooks.
 */
export const computeEffectiveRollConfig = (state: GameState): RollConfig => {
  const cosmicLevel = state.upgrades.cosmic_secret || 0;
  const cosmicMult = 1 + cosmicLevel * 0.15;

  let config: RollConfig = {
    diceCount: getDiceCount(state.upgrades.extra_dice),
    sides: getDiceSides(state.upgrades.dice_sides),
    flatBonus: getFlatBonus(state.upgrades.flat_bonus),
    materialMult: getMaterialMult(state.upgrades.material_tier),
    comboMult: getComboMult(state.upgrades.combo_mult),
    globalMult: state.globalMult * cosmicMult,
    lessIsMoreProb: getLessIsMoreProb(state.upgrades.less_is_more || 0),
    magnetismProb: getMagnetismProb(state.upgrades.table_magnetism),
    ghostProb: getGhostDiceProbability(state.upgrades.ghost_dice),
    extraGhostDice: 0,
    autoRollSpeedMult: 1,
    pointsMult: 1,
  };

  for (let i = 0; i < state.activeBuffs.length; i++) {
    const buff = state.activeBuffs[i];
    if (buff.remainingMs > 0) {
      config = applyModifierPatch(config, buff.modifiers);
    }
  }

  registeredConfigHooks.forEach((hook) => {
    config = hook(config, state);
  });

  return config;
};
