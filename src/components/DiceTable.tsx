import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { formatNumber } from '../utils/format';
import { playComboSound } from '../utils/audio';
import { ComboResult, getDiceComboColorMap } from '../game/engine';
import { Flame, Sparkles, Dices } from 'lucide-react';
import { VectorTrue3DDie, VectorSpinningDiePreview } from './Polyhedron3D';

export { VectorSpinningDiePreview as SpinningDiePreview } from './Polyhedron3D';

interface DiceTableProps {
  faces: number[];
  ghosts?: number[];
  sides: number;
  materialLevel: number;
  manualCooldown: number;
  animationSpeedMult?: number;
  onRoll: () => void;
  cooldownActive: boolean;
  totalEarned: number | null;
  combos: ComboResult[];
  comboStreak?: number;
  streakBonus?: number;
  showFloatingTexts?: boolean;
  enableConfetti?: boolean;
  enableTumbleAnimation?: boolean;
}

const getComboColor = (tier: string) => {
  switch (tier) {
    case 'cosmic':
      return 'text-fuchsia-300 drop-shadow-[0_0_18px_#e879f9]';
    case 'legendary':
      return 'text-yellow-300 drop-shadow-[0_0_15px_#facc15]';
    case 'epic':
      return 'text-purple-400 drop-shadow-[0_0_12px_#c084fc]';
    case 'rare':
      return 'text-cyan-300 drop-shadow-[0_0_10px_#38bdf8]';
    default:
      return 'text-amber-300 drop-shadow-[0_0_6px_#fbbf24]';
  }
};

interface Particle {
  id: string;
  type: 'points' | 'combo' | 'streak';
  text: string;
  x: number;
  y: number;
  rot: number;
  colorClass: string;
}

export const DiceTable: React.FC<DiceTableProps> = ({
  faces,
  ghosts = [],
  sides,
  materialLevel,
  manualCooldown,
  animationSpeedMult = 1,
  onRoll,
  cooldownActive,
  totalEarned,
  combos = [],
  comboStreak = 0,
  streakBonus = 1,
  showFloatingTexts = true,
  enableConfetti = true,
  enableTumbleAnimation = true,
}) => {
  const [rollId, setRollId] = useState(0);
  const prevFaces = useRef(faces);
  const [particles, setParticles] = useState<Particle[]>([]);
  const lastConfettiTimeRef = useRef(0);
  const lastParticleTimeRef = useRef(0);

  // Rolls per second tracking & decay
  const [rps, setRps] = useState<number>(0);
  const rollTimesRef = useRef<number[]>([]);
  const lastRollTimeRef = useRef<number>(0);

  const totalDiceCount = faces.length + ghosts.length;
  // Tamaño completo fijo para todos los dados (igual que cuando hay 3 o menos)
  const dieSize = 96;
  const rowGap = 'gap-2 sm:gap-3.5';
  const colGap = 'gap-3 sm:gap-6';

  // Map each individual die to its matching cluster's unique color
  const comboColorMap = useMemo(() => {
    return getDiceComboColorMap(faces, sides);
  }, [faces, sides]);

  // Combine regular dice and ghost dice into rows of up to 3
  const diceRows = useMemo(() => {
    const allDice: Array<{
      id: string;
      face: number;
      isGhost: boolean;
      comboColor?: string;
    }> = [
      ...faces.map((f, i) => ({
        id: `die-r-${i}`,
        face: f,
        isGhost: false,
        comboColor: comboColorMap[i]
      })),
      ...ghosts.map((g, i) => ({
        id: `die-g-${i}`,
        face: g,
        isGhost: true,
        comboColor: '#38bdf8'
      }))
    ];

    const rows: typeof allDice[] = [];
    for (let i = 0; i < allDice.length; i += 3) {
      rows.push(allDice.slice(i, i + 3));
    }
    return rows;
  }, [faces, ghosts, comboColorMap]);

  // Format rolls per second concisely
  const rpsValue = useMemo(() => {
    if (rps <= 0.1) return null;
    if (rps >= 100) return formatNumber(Math.round(rps));
    if (rps >= 10) return rps.toFixed(1);
    if (rps >= 1) return rps.toFixed(1);
    return rps.toFixed(2);
  }, [rps]);

  // Periodic decay timer: if no roll occurred for > 4s, clear speed capsule
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (lastRollTimeRef.current > 0 && now - lastRollTimeRef.current > 4000) {
        setRps(0);
        rollTimesRef.current = [];
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (faces !== prevFaces.current && faces.length > 0) {
      const now = Date.now();
      const prevTime = lastRollTimeRef.current;
      lastRollTimeRef.current = now;

      // Track speed only if gap between rolls <= 5000ms (5 seconds)
      if (prevTime > 0 && now - prevTime <= 5000) {
        rollTimesRef.current.push(now);
      } else {
        rollTimesRef.current = [now];
      }

      // Filter to sliding 3-second window
      rollTimesRef.current = rollTimesRef.current.filter(t => now - t <= 3000);

      if (rollTimesRef.current.length >= 2) {
        const times = rollTimesRef.current;
        const spanSec = (times[times.length - 1] - times[0]) / 1000;
        if (spanSec > 0) {
          setRps((times.length - 1) / spanSec);
        }
      } else if (prevTime > 0 && now - prevTime <= 5000) {
        const intervalSec = (now - prevTime) / 1000;
        if (intervalSec > 0) {
          setRps(1 / intervalSec);
        }
      }

      const newRollId = rollId + 1;
      setRollId(newRollId);
      prevFaces.current = faces;

      if (totalEarned && totalEarned > 0) {
        const now = Date.now();

        // Audio & Confetti triggers
        if (combos && combos.length > 0) {
          let maxMult = 1;
          combos.forEach(c => {
            if (c.mult > maxMult) maxMult = c.mult;
          });

          playComboSound(maxMult);

          if (enableConfetti && maxMult >= 7.5 && now - lastConfettiTimeRef.current > 1500) {
            lastConfettiTimeRef.current = now;
            confetti({
              particleCount: maxMult >= 20 ? 25 : 15,
              spread: 60,
              ticks: 40,
              gravity: 2,
              startVelocity: 16,
              origin: { y: 0.65 },
              colors: ['#facc15', '#ec4899', '#38bdf8', '#a855f7', '#10b981'],
              zIndex: 30
            });
          }
        }

        // Lightweight Floating Notification Particles (Max 3, if enabled - Instant 100% Solid Opacity)
        if (showFloatingTexts) {
          const canSpawnParticles = now - lastParticleTimeRef.current > 80;

          if (canSpawnParticles) {
            lastParticleTimeRef.current = now;
            const newParticles: Particle[] = [];

            // Points pop (Always in the LOWER/CENTER vertical zone)
            newParticles.push({
              id: `p-${newRollId}`,
              type: 'points',
              text: `+${formatNumber(totalEarned)}`,
              x: (Math.random() - 0.5) * 40,
              y: 20 + (Math.random() - 0.5) * 8, // Lower area below combo
              rot: (Math.random() - 0.5) * 8,
              colorClass: 'text-yellow-300 drop-shadow-[0_4px_6px_rgba(0,0,0,1)]',
            });

            // Combo pop (Always in the UPPER vertical zone)
            if (combos && combos.length > 0) {
              let maxMult = 1;
              let bestCombo = combos[0];
              combos.forEach(c => {
                if (c.mult > maxMult) {
                  maxMult = c.mult;
                  bestCombo = c;
                }
              });

              newParticles.push({
                id: `c-${newRollId}`,
                type: 'combo',
                text: `${bestCombo.name} (x${bestCombo.mult})`,
                x: (Math.random() - 0.5) * 40,
                y: -65 + (Math.random() - 0.5) * 8, // Upper area above points
                rot: (Math.random() - 0.5) * 8,
                colorClass: getComboColor(bestCombo.tier),
              });
            }

            // Streak pop if streak active (Base zone)
            if (comboStreak > 1 && Math.random() < 0.6) {
              newParticles.push({
                id: `s-${newRollId}`,
                type: 'streak',
                text: `🔥 Racha x${comboStreak} (+${((streakBonus - 1) * 100).toFixed(0)}%)`,
                x: (Math.random() - 0.5) * 40,
                y: 75 + (Math.random() - 0.5) * 8,
                rot: (Math.random() - 0.5) * 8,
                colorClass: 'text-orange-400 drop-shadow-[0_0_12px_#fb923c]',
              });
            }

            // Keep strictly at most 3 particles on screen at once
            setParticles(prev => [...prev.slice(-1), ...newParticles].slice(-3));
            setTimeout(() => {
              setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
            }, 700);
          }
        }
      }
    }
  }, [faces, totalEarned, combos, comboStreak, streakBonus, rollId, showFloatingTexts, enableConfetti]);

  return (
    <div 
      className="relative w-full flex-1 min-h-0 bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-900 rounded-2xl sm:rounded-3xl shadow-[inset_0_10px_30px_rgba(0,0,0,0.6),0_6px_20px_rgba(0,0,0,0.5)] border-[6px] sm:border-[12px] border-amber-950 overflow-y-auto overflow-x-hidden cursor-pointer flex flex-col items-center justify-center select-none"
      onClick={() => {
        if (!cooldownActive) onRoll();
      }}
    >
      {/* Table felt textures / casino watermark */}
      <div className="absolute inset-0 pointer-events-none opacity-25 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-black/40" />

      {/* Rolls Per Second Speed Badge: X 🎲/s (Top Left of Table Felt) */}
      {rpsValue && (
        <div 
          className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 bg-cyan-950/85 border border-cyan-500/70 text-cyan-300 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 shadow-lg backdrop-blur-sm z-20 select-none animate-fadeIn"
          title={`Velocidad: ${rpsValue} dados/seg`}
        >
          <span className="font-pixel text-xs sm:text-base font-bold tracking-wide">
            {rpsValue}
          </span>
          <Dices className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300 shrink-0" />
          <span className="font-pixel text-xs sm:text-base font-bold tracking-wide">
            /s
          </span>
        </div>
      )}

      {/* Streak Badge on Table (Top Right of Table Felt) */}
      {comboStreak > 1 && (
        <div 
          className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 bg-orange-950/80 border border-orange-500 text-orange-400 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm z-20"
        >
          <Flame className="w-3.5 h-3.5 text-orange-400 animate-bounce" />
          <span className="font-pixel text-xs sm:text-base font-bold">
            Racha x{comboStreak}
          </span>
        </div>
      )}

      {/* Lightweight Floating Notification Particles (Max 3, if enabled - Instant 100% Solid Opacity) */}
      {showFloatingTexts && (
        <AnimatePresence>
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: p.x, y: p.y, scale: 1.2, rotate: p.rot }}
              animate={{ opacity: 1, x: p.x, y: p.y - 30, scale: 1.0, rotate: p.rot }}
              exit={{ opacity: 0, y: p.y - 60, scale: 0.85 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className={`absolute font-pixel font-black ${
                p.type === 'combo' ? 'text-2xl sm:text-4xl z-30' : p.type === 'streak' ? 'text-xl sm:text-3xl z-20' : 'text-3xl sm:text-5xl z-20'
              } ${p.colorClass} pointer-events-none whitespace-nowrap transform-gpu will-change-transform`}
              style={{ textShadow: '2.5px 2.5px 0 #000, -2.5px -2.5px 0 #000, 2.5px -2.5px 0 #000, -2.5px 2.5px 0 #000, 0 4px 10px rgba(0,0,0,0.95)' }}
            >
              {p.text}
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Main Dice Pool Container (Organized in rows of up to 3 dice) */}
      <div 
        className={`flex flex-col items-center justify-center ${rowGap} p-2 sm:p-4 w-full z-10`} 
      >
        {totalDiceCount === 0 && (
          <div className="text-emerald-950/70 font-pixel text-lg sm:text-2xl text-center font-bold drop-shadow-sm select-none px-4">
            Toca la mesa o pulsa el botón para lanzar
          </div>
        )}

        {diceRows.map((row, rIdx) => (
          <div key={`dice-row-${rIdx}`} className={`flex items-center justify-center ${colGap}`}>
            {row.map(die => (
              <VectorTrue3DDie
                key={die.id}
                finalFace={die.face}
                sides={sides}
                materialLevel={materialLevel}
                rollId={rollId}
                manualCooldown={manualCooldown}
                animationSpeedMult={animationSpeedMult}
                size={dieSize}
                isGhost={die.isGhost}
                comboColor={die.comboColor}
                enableTumbleAnimation={enableTumbleAnimation}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
