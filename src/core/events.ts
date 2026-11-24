import { CurrencyId } from '../game/currencies';
import { UpgradeId } from '../game/engine';
import { ActiveBuff, LastRollData, RollSource } from './types';

export interface GameEventMap {
  'roll:completed': {
    roll: LastRollData;
    source: RollSource;
    count: number;
    totalBatchPoints: number;
  };
  'upgrade:bought': {
    id: UpgradeId;
    newLevel: number;
    cost: number;
  };
  'currency:changed': {
    currency: CurrencyId;
    delta: number;
    total: number;
    reason?: string;
  };
  'buff:added': {
    buff: ActiveBuff;
  };
  'buff:expired': {
    buffId: string;
  };
  'cheats:toggled': {
    enabled: boolean;
  };
  'offline:rewarded': {
    elapsedSec: number;
    rollsSimulated: number;
    pointsEarned: number;
  };
  'game:reset': Record<string, never>;
}

type EventKey = keyof GameEventMap;
type Listener<K extends EventKey> = (payload: GameEventMap[K]) => void;

class TypedEventBus {
  private listeners = new Map<EventKey, Set<Listener<any>>>();

  on<K extends EventKey>(event: K, listener: Listener<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  once<K extends EventKey>(event: K, listener: Listener<K>): () => void {
    const unsub = this.on(event, (payload) => {
      unsub();
      listener(payload);
    });
    return unsub;
  }

  emit<K extends EventKey>(event: K, payload: GameEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;
    set.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error(`Error in event listener for "${String(event)}":`, err);
      }
    });
  }
}

export const gameEvents = new TypedEventBus();
