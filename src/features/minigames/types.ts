import React from 'react';
import { GameState } from '../../core/types';

export interface MinigameDefinition {
  id: string;
  name: string;
  subtitle: string;
  desc: string;
  badge: string;
  accentGradient: string;
  borderClass: string;
  isUnlocked: (state: GameState) => boolean;
  unlockHint: (state: GameState) => string;
  Component: React.FC;
}
