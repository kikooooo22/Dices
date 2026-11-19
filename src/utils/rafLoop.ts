type RafCallback = (now: number) => void;

const subscribers = new Set<RafCallback>();
let rafId: number | null = null;

const tick = (now: number) => {
  if (subscribers.size === 0) {
    rafId = null;
    return;
  }

  if (!document.hidden) {
    subscribers.forEach(cb => {
      cb(now);
    });
  }

  if (subscribers.size > 0) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
  }
};

/**
 * Subscribe a callback to the single shared requestAnimationFrame loop.
 * The loop automatically starts on first subscriber and stops when empty.
 */
export const subscribeRaf = (cb: RafCallback): (() => void) => {
  subscribers.add(cb);
  if (rafId === null) {
    rafId = requestAnimationFrame(tick);
  }

  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
};
