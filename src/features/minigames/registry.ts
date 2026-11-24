import { BuffWheelGame } from './BuffWheelGame';
import { CroupierChallengeGame } from './CroupierChallengeGame';
import { HighLowGame } from './HighLowGame';
import { MinigameDefinition } from './types';

export const MINIGAME_REGISTRY: MinigameDefinition[] = [
  {
    id: 'high_low',
    name: 'Alta o Baja',
    subtitle: 'Doble o Nada 3D',
    desc: 'Predice si el siguiente dado será mayor, menor o exacto y acumula rachas.',
    badge: 'Apuestas',
    accentGradient: 'from-emerald-600/20 to-teal-900/20',
    borderClass: 'border-emerald-500/60 hover:border-emerald-400',
    isUnlocked: (state) => state.totalRolls >= 10 || state.totalPointsEarned >= 100,
    unlockHint: (state) =>
      `Realiza 10 tiradas (${Math.min(10, state.totalRolls)}/10) o junta 100 pts.`,
    Component: HighLowGame,
  },
  {
    id: 'buff_wheel',
    name: 'Ruleta Astral',
    subtitle: 'Modificadores Temporales',
    desc: 'Gasta Fichas de Casino para activar potenciadores de velocidad, puntos y dados fantasma.',
    badge: '5 Fichas',
    accentGradient: 'from-purple-600/20 to-fuchsia-900/20',
    borderClass: 'border-fuchsia-500/60 hover:border-fuchsia-400',
    isUnlocked: (state) => state.totalRolls >= 20 || state.currencies.chips >= 5,
    unlockHint: (state) =>
      `Realiza 20 tiradas (${Math.min(20, state.totalRolls)}/20) o reúne 5 fichas.`,
    Component: BuffWheelGame,
  },
  {
    id: 'croupier_challenge',
    name: 'Desafío del Crupier',
    subtitle: 'Póker Táctico (Hold & Roll)',
    desc: 'Fija dados entre 3 tiradas para armar manos de póker y ganar puntos, fichas y fragmentos.',
    badge: '3 Fichas / Gratis',
    accentGradient: 'from-amber-600/20 to-orange-900/20',
    borderClass: 'border-amber-500/60 hover:border-amber-400',
    isUnlocked: (state) => (state.upgrades.extra_dice || 0) >= 2 || state.totalRolls >= 35,
    unlockHint: (state) =>
      `Compra 2 niveles de Más Dados (${state.upgrades.extra_dice || 0}/2) o haz 35 tiradas (${Math.min(35, state.totalRolls)}/35).`,
    Component: CroupierChallengeGame,
  },
];
