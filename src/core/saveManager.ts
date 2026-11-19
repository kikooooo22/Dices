import { INITIAL_CURRENCIES } from '../game/currencies';
import { UpgradeId } from '../game/engine';
import { GameState } from './types';

export const SAVE_STORAGE_KEY = 'pal_alensis_dice_save_v3';
const LEGACY_KEYS = ['pal_alensis_dice_save_v2', 'dice_clicker_save'];

export const INITIAL_UPGRADES: Record<UpgradeId, number> = {
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
};

export const createInitialGameState = (): GameState => ({
  version: 3,
  points: 0,
  currencies: { ...INITIAL_CURRENCIES },
  totalPointsEarned: 0,
  totalRolls: 0,
  comboStreak: 0,
  highestStreak: 0,
  upgrades: { ...INITIAL_UPGRADES },
  globalMult: 1,
  milestone1Unlocked: false,
  milestone2Unlocked: false,
  cheatsUnlocked: false,
  activeBuffs: [],
  minigameStats: {},
  lastSavedAt: Date.now(),
});

export const loadSavedGameState = (): GameState => {
  const initial = createInitialGameState();
  try {
    let raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_KEYS) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          raw = legacyRaw;
          break;
        }
      }
    }
    if (!raw) return initial;

    const parsed = JSON.parse(raw);
    const upgs = { ...INITIAL_UPGRADES, ...(parsed.upgrades || {}) };
    if (parsed.upgrades?.worst_case_elim !== undefined && parsed.upgrades?.less_is_more === undefined) {
      upgs.less_is_more = parsed.upgrades.worst_case_elim;
    }

    const points = typeof parsed.points === 'number' && Number.isFinite(parsed.points) ? parsed.points : 0;
    const currencies = {
      ...INITIAL_CURRENCIES,
      ...(parsed.currencies || {}),
      points,
    };

    const milestone1Unlocked = Boolean(parsed.milestone1Unlocked);

    return {
      ...initial,
      ...parsed,
      version: 3,
      points,
      currencies,
      upgrades: upgs,
      globalMult: milestone1Unlocked ? 2 : 1,
      cheatsUnlocked: Boolean(parsed.cheatsUnlocked),
      activeBuffs: Array.isArray(parsed.activeBuffs) ? parsed.activeBuffs : [],
      minigameStats: parsed.minigameStats && typeof parsed.minigameStats === 'object' ? parsed.minigameStats : {},
      lastSavedAt: typeof parsed.lastSavedAt === 'number' ? parsed.lastSavedAt : Date.now(),
    };
  } catch (e) {
    console.error('Failed to parse save game:', e);
    return initial;
  }
};

let lastSavedSnapshot = '';

export const persistGameState = (state: GameState, force = false): void => {
  try {
    const payload = JSON.stringify({
      ...state,
      lastSavedAt: Date.now(),
    });
    if (force || payload !== lastSavedSnapshot) {
      localStorage.setItem(SAVE_STORAGE_KEY, payload);
      lastSavedSnapshot = payload;
    }
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
};

export const clearSavedGameState = (): void => {
  lastSavedSnapshot = '';
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
    for (const legacyKey of LEGACY_KEYS) {
      localStorage.removeItem(legacyKey);
    }
  } catch (e) {
    // ignore storage errors
  }
};
