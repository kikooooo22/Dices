import { ComboResult } from '../game/engine';
import { gameEvents } from './events';
import { useGameStore } from './store';

let initialized = false;

const TIER_CHIPS: Record<ComboResult['tier'], number> = {
  common: 1,
  rare: 2,
  epic: 4,
  legendary: 7,
  cosmic: 15,
};

export const initSubsystemBridge = (): void => {
  if (initialized) return;
  initialized = true;

  gameEvents.on('roll:completed', ({ roll, source, count }) => {
    if (source === 'minigame') return;
    if (roll.combos.length === 0) return;

    const store = useGameStore.getState();
    const { state } = store;

    // Award Casino Chips based on highest combo tier achieved in the roll
    let bestTier: ComboResult['tier'] = 'common';
    const tierOrder: ComboResult['tier'][] = ['common', 'rare', 'epic', 'legendary', 'cosmic'];
    for (const c of roll.combos) {
      if (tierOrder.indexOf(c.tier) > tierOrder.indexOf(bestTier)) {
        bestTier = c.tier;
      }
    }

    let chipsEarned = 0;
    if (bestTier !== 'common' || roll.streak >= 2 || state.currencies.chips < 10) {
      chipsEarned = TIER_CHIPS[bestTier];
      if (count > 1) {
        chipsEarned = Math.min(50, Math.round(chipsEarned * Math.sqrt(count)));
      }
    }

    if (chipsEarned > 0) {
      store.addCurrency('chips', chipsEarned, `combo:${bestTier}`);
    }

    // Award Cosmic Shards when Misterio Cósmico is unlocked & high-tier combos land
    const cosmicLvl = state.upgrades.cosmic_secret || 0;
    if (cosmicLvl > 0 && (bestTier === 'epic' || bestTier === 'legendary' || bestTier === 'cosmic')) {
      const shardReward =
        bestTier === 'cosmic' ? cosmicLvl * 3 : bestTier === 'legendary' ? cosmicLvl * 2 : cosmicLvl;
      store.addCurrency('shards', shardReward, `cosmic:${bestTier}`);
    }
  });
};
