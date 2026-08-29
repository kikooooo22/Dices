/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { DiceTable, SpinningDiePreview } from './components/DiceTable';
import { PolyhedronDie } from './components/Polyhedron3D';
import { Shop } from './components/Shop';
import { ResetModal } from './components/ResetModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import {
  getManualCooldown,
  getDiceSides,
  getAutoRollsPerSec,
  getHoldToRollEnabled,
  getAnimationSpeedMult,
  UPGRADES,
  UpgradeId,
  getCost,
  getFlatBonus,
  getMaterialMult,
  getMaterialTierName,
  getMilestoneRequiredUpgrades
} from './game/engine';
import {
  ShoppingCart,
  X,
  Settings,
  Flame,
  Volume2,
  VolumeX,
  BarChart2,
  Pause,
  Wand2,
  EyeOff,
  PartyPopper,
  CheckCheck,
  Monitor,
  Eye,
  RotateCw,
  Zap,
  HelpCircle,
  Lock,
  Dices
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  playRollSound,
  getMasterVolume,
  setMasterVolume,
  playClickSound,
  playBuySound,
  playPartyModeMusic
} from './utils/audio';
import { formatNumber } from './utils/format';
import confetti from 'canvas-confetti';

interface GraphicsSettings {
  showFloatingTexts: boolean;
  showSpinningPreview: boolean;
  enableConfetti: boolean;
  enableDiceRotationAnimation: boolean;
}

const DEFAULT_GRAPHICS: GraphicsSettings = {
  showFloatingTexts: true,
  showSpinningPreview: true,
  enableConfetti: true,
  enableDiceRotationAnimation: true,
};

const AutoRollIndicator = ({
  rollsPerSec,
  isPaused,
  onToggle
}: {
  rollsPerSec: number;
  isPaused: boolean;
  onToggle: () => void;
}) => {
  if (rollsPerSec <= 0) return null;
  const duration = 1 / rollsPerSec;
  const radius = 14;
  const circumference = 2 * Math.PI * radius;

  return (
    <button
      onClick={() => { playClickSound(); onToggle(); }}
      className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl border-2 border-b-4 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0 transition-all cursor-pointer hover:scale-105 active:scale-95 ${isPaused
          ? 'bg-slate-800 border-amber-500/50 border-b-amber-800 shadow-[0_2px_0_#78350f]'
          : 'bg-slate-800 border-blue-500/60 border-b-blue-800 shadow-[0_2px_0_#1e40af]'
        }`}
      title={`Auto-Roller: ${rollsPerSec.toFixed(2)} tiros/seg (${isPaused ? 'Pausado - Clic para reanudar' : 'Activo - Clic para pausar'})`}
    >
      <span className="text-[10px] sm:text-xs font-pixel font-bold text-blue-400 z-10">
        {rollsPerSec >= 1 ? `${rollsPerSec.toFixed(1)}/s` : `1/${(1 / rollsPerSec).toFixed(1)}s`}
      </span>

      {!isPaused && (
        <svg
          viewBox="0 0 44 44"
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none opacity-40"
        >
          <motion.circle
            cx="22" cy="22" r={radius}
            fill="transparent"
            stroke="rgb(59, 130, 246)"
            strokeWidth="28"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: [circumference, 0] }}
            transition={{ duration: Math.max(0.1, duration), ease: "linear", repeat: Infinity }}
          />
        </svg>
      )}
    </button>
  );
};

export default function App() {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isPartyMode, setIsPartyMode] = useState(false);
  const [volume, setVolume] = useState(() => getMasterVolume());

  // Interactive Onboarding Tutorial Step (1, 2, 25, 3, 4, 5, 6, 0 = Inactive)
  const [tutorialStep, setTutorialStep] = useState<number>(() => {
    try {
      const isDone = localStorage.getItem('pal_tutorial_completed');
      return isDone === 'true' ? 0 : 1;
    } catch (e) {
      return 1;
    }
  });

  const tutorialRollsCountRef = useRef(0);

  const startTutorial = () => {
    playClickSound();
    tutorialRollsCountRef.current = 0;
    setIsOptionsOpen(false);
    setIsShopOpen(false);
    setTutorialStep(1);
  };

  const skipTutorial = () => {
    playClickSound();
    setTutorialStep(0);
    try {
      localStorage.setItem('pal_tutorial_completed', 'true');
    } catch (e) { }
  };

  const handleFinishTutorial = () => {
    setTutorialStep(0);
    try {
      localStorage.setItem('pal_tutorial_completed', 'true');
    } catch (e) { }
    confetti({
      particleCount: 50,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#34d399', '#facc15', '#38bdf8', '#a855f7'],
      zIndex: 9999
    });
  };

  // Graphics & Performance settings with localStorage persistence
  const [graphics, setGraphics] = useState<GraphicsSettings>(() => {
    try {
      const saved = localStorage.getItem('pal_graphics_settings');
      if (saved) return { ...DEFAULT_GRAPHICS, ...JSON.parse(saved) };
    } catch (e) { }
    return DEFAULT_GRAPHICS;
  });

  const updateGraphics = (key: keyof GraphicsSettings, value: boolean) => {
    playClickSound();
    setGraphics(prev => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem('pal_graphics_settings', JSON.stringify(updated));
      } catch (e) { }
      return updated;
    });
  };

  const {
    state,
    buyUpgrade,
    addPoints,
    unlockCheats,
    disableCheats,
    maxAllUpgrades,
    rollDice,
    lastRoll,
    triggerMilestone1,
    triggerMilestone2,
    hardReset,
    toggleAutoRoll,
    isAutoRollPaused
  } = useGameState(isOptionsOpen);

  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownFraction, setCooldownFraction] = useState(0); // 0 (ready) to 1 (just fired)
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setMasterVolume(v);
  };

  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const progressReqRef = useRef<number | null>(null);
  const lastRollTimeRef = useRef(0);

  const standardUpgradesBought = Object.entries(state.upgrades).reduce(
    (sum, [id, lvl]) => id === 'cosmic_secret' ? sum : sum + lvl,
    0
  );
  const currentSecretLvl = state.upgrades.cosmic_secret || 0;
  const isSecretLocked = currentSecretLvl < UPGRADES.cosmic_secret.maxLevel && standardUpgradesBought < getMilestoneRequiredUpgrades(currentSecretLvl);

  const affordableCount = Object.values(UPGRADES).filter(def => {
    if (def.category === 'milestones' && isSecretLocked) return false;
    const currentLevel = state.upgrades[def.id] || 0;
    return currentLevel < def.maxLevel && state.points >= getCost(def.id, currentLevel);
  }).length;

  const sides = getDiceSides(state.upgrades.dice_sides);
  const materialTier = state.upgrades.material_tier;
  const manualCooldown = getManualCooldown(state.upgrades.manual_cooldown);
  const animSpeedMult = getAnimationSpeedMult(state.upgrades.cushioned_surface);

  // Advance tutorial step 2/25 -> 3 as soon as user earns 50 points
  useEffect(() => {
    if ((tutorialStep === 2 || tutorialStep === 25) && state.points >= 50) {
      setTutorialStep(3);
    }
  }, [state.points, tutorialStep]);

  const triggerPartyMode = () => {
    setIsPartyMode(true);
    playPartyModeMusic();

    // 8-second continuous confetti party
    const duration = 8000;
    const end = Date.now() + duration;

    const interval: NodeJS.Timeout = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      if (graphics.enableConfetti) {
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 50,
          origin: { x: Math.random(), y: Math.random() * 0.7 },
          colors: ['#f43f5e', '#ec4899', '#a855f7', '#06b6d4', '#10b981', '#facc15'],
          zIndex: 9999,
        });
      }
    }, 350);

    setTimeout(() => {
      setIsPartyMode(false);
    }, duration);
  };

  const handleRoll = (bypassCooldown = false) => {
    if (isOptionsOpen || tutorialStep === 25) return;
    if (cooldownActive && !bypassCooldown) return;

    const cdMs = manualCooldown * 1000;
    const now = Date.now();

    if (bypassCooldown && now - lastRollTimeRef.current < cdMs) return;

    lastRollTimeRef.current = now;
    playRollSound(materialTier);
    rollDice();

    // Tutorial progression hooks: pop-up triggers on 3rd roll if < 50 points
    if (tutorialStep === 1) {
      tutorialRollsCountRef.current = 1;
      // If user already has >= 50 points (e.g. replaying tutorial with existing points/upgrades),
      // no need to wait: jump straight to Step 3 (Open shop)!
      if (state.points >= 50) {
        setTutorialStep(3);
      } else {
        setTutorialStep(2);
      }
    } else if (tutorialStep === 2) {
      tutorialRollsCountRef.current += 1;
      if (tutorialRollsCountRef.current === 3 && state.points < 50) {
        setTutorialStep(25);
      }
    } else if (tutorialStep === 6) {
      handleFinishTutorial();
    }

    setCooldownActive(true);
    setCooldownFraction(1);

    const startTime = Date.now();

    if (progressReqRef.current) {
      cancelAnimationFrame(progressReqRef.current);
    }

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const fraction = Math.max(0, 1 - (elapsed / cdMs));
      setCooldownFraction(fraction);

      if (elapsed < cdMs) {
        progressReqRef.current = requestAnimationFrame(updateProgress);
      } else {
        setCooldownActive(false);
        setCooldownFraction(0);
        progressReqRef.current = null;
      }
    };
    progressReqRef.current = requestAnimationFrame(updateProgress);
  };

  const startHold = (e?: React.PointerEvent) => {
    if (isOptionsOpen || tutorialStep === 25) return;
    if (!getHoldToRollEnabled(state.upgrades.hold_to_roll)) return;
    if (isHoldingRef.current) return;

    if (e && e.currentTarget && e.pointerId !== undefined) {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (err) { }
    }

    isHoldingRef.current = true;
    handleRoll(true);
    holdIntervalRef.current = setInterval(() => {
      if (isHoldingRef.current) {
        handleRoll(true);
      }
    }, 40);
  };

  const stopHold = () => {
    isHoldingRef.current = false;
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  // Global listener: anywhere the pointer is released, clean up hold immediately
  useEffect(() => {
    const handleGlobalRelease = () => {
      stopHold();
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
    };
  }, []);

  // Shop Navigation
  const handleOpenShop = () => {
    if (tutorialStep > 0 && tutorialStep !== 3) return; // Shop locked before step 3
    playClickSound();
    setIsShopOpen(true);
    if (tutorialStep === 3) {
      setTutorialStep(40); // Show shop introduction pop-up
    }
  };

  const handleDismissShopIntro = () => {
    // If it's a first time playthrough (or manual_cooldown not purchased), highlight Dedos Rapidos
    // Otherwise, if they already have manual_cooldown, guide them straight to closing the shop
    if ((state.upgrades.manual_cooldown || 0) < 1) {
      setTutorialStep(4);
    } else {
      setTutorialStep(5);
    }
  };

  const handleCloseShop = () => {
    playClickSound();
    setIsShopOpen(false);
    if (tutorialStep === 5) {
      setTutorialStep(6);
    }
  };

  const handleBuyShopUpgrade = (id: UpgradeId) => {
    buyUpgrade(id);
    if (tutorialStep === 4) {
      setTutorialStep(5);
    }
  };

  return (
    <div className={`w-full h-[100dvh] max-h-[100dvh] bg-slate-950 flex justify-center items-center overflow-hidden font-pixel select-none text-slate-100 p-0 sm:p-3 ${isPartyMode ? 'party-mode-active' : ''
      }`}>
      {/* Background glow ambiance */}
      <div className={`fixed inset-0 pointer-events-none ${isPartyMode
          ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-600/30 via-purple-600/20 to-black animate-pulse'
          : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-black'
        }`} />

      {/* Main App Canvas: Exactly 100dvh on mobile, 0 margin/overflow */}
      <div className={`w-full max-w-lg bg-slate-900 h-[100dvh] max-h-[100dvh] sm:h-[94vh] sm:max-h-[880px] sm:rounded-3xl flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.8)] border-0 sm:border sm:border-slate-800 relative overflow-hidden transition-all ${isPartyMode ? 'party-dancer border-yellow-400' : ''
        }`}>

        {/* Header HUD with z-50 so Shop Button is always on top */}
        <header className={`bg-slate-950 text-white p-2.5 sm:p-4 z-50 shadow-md border-b border-slate-800 shrink-0 ${isPartyMode ? 'party-dancer' : ''
          }`}>
          <div className="flex justify-between items-center gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Puntos Totales
                </span>
                {state.globalMult > 1 && (
                  <span className="text-[10px] sm:text-xs font-black bg-cyan-950/90 text-cyan-300 border border-cyan-400 px-1.5 py-0.2 rounded-full flex items-center">
                    x{state.globalMult}
                  </span>
                )}
                {state.comboStreak > 1 && (
                  <span className="text-[10px] sm:text-xs font-black bg-orange-900/80 text-orange-300 border border-orange-500 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" /> x{state.comboStreak}
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-4xl font-pixel text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-wide leading-none mt-0.5">
                {formatNumber(state.points)} pts
              </div>
            </div>

            {/* Action buttons with clickable auto-roller indicator */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <AutoRollIndicator
                rollsPerSec={getAutoRollsPerSec(state.upgrades.auto_roller)}
                isPaused={isAutoRollPaused}
                onToggle={toggleAutoRoll}
              />

              {/* Options button with sleek grey borders */}
              <button
                onClick={() => { playClickSound(); setIsOptionsOpen(true); }}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 border-slate-700 border-b-4 border-b-slate-900 shadow-[0_2px_0_#0f172a] active:translate-y-0.5 active:border-b-2 active:shadow-none transition-all flex items-center justify-center cursor-pointer"
                title="Opciones y Rendimiento"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
              </button>

              {/* Shop Button with Clean Visuals & Spotlight when Tutorial Step 3 */}
              <button
                onClick={handleOpenShop}
                disabled={tutorialStep > 0 && tutorialStep !== 3}
                className={`relative p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition-all flex items-center gap-1.5 font-bold ${tutorialStep === 3
                    ? 'bg-blue-600 text-white border-cyan-300 border-b-4 border-b-blue-800 ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 animate-bounce shadow-[0_0_30px_rgba(6,182,212,0.9)] cursor-pointer'
                    : tutorialStep > 0
                      ? 'bg-blue-600/75 text-white/80 border-blue-500/50 border-b-4 border-b-blue-900 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 border-b-4 border-b-blue-800 shadow-[0_2px_0_#1e40af] active:translate-y-0.5 active:border-b-2 active:shadow-none cursor-pointer'
                  }`}
                title={tutorialStep > 0 && tutorialStep !== 3 ? 'Tienda bloqueada durante el tutorial' : 'Tienda de Mejoras'}
              >
                {tutorialStep > 0 && tutorialStep !== 3 ? (
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
                ) : (
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span className="hidden sm:inline text-sm">Tienda</span>
                {affordableCount > 0 && tutorialStep === 0 && (
                  <span className="absolute -top-2 -right-1.5 bg-rose-500 text-white text-[10px] sm:text-xs font-black w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full border-2 border-slate-950 shadow-xl animate-bounce">
                    {affordableCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Last Roll Feed Strip */}
          <div className="mt-2 sm:mt-3 bg-slate-900/95 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs sm:text-sm min-h-[2.25rem] sm:min-h-[2.75rem]">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 overflow-hidden">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] sm:text-xs whitespace-nowrap">
                Última tirada:
              </span>
              {lastRoll ? (
                <>
                  <span className="text-slate-200 font-mono text-xs sm:text-sm font-bold">[{lastRoll.faces.join(', ')}]</span>
                  {lastRoll.ghosts && lastRoll.ghosts.length > 0 && (
                    <span className="text-cyan-400 font-mono text-xs sm:text-sm font-bold" title="Dado Fantasma">
                      +[{lastRoll.ghosts.join(', ')}]
                    </span>
                  )}
                  {lastRoll.combos.map((c, i) => (
                    <span
                      key={i}
                      className="text-[10px] sm:text-xs font-black bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/30 whitespace-nowrap"
                    >
                      {c.name} (x{c.mult})
                    </span>
                  ))}
                </>
              ) : (
                <span className="text-slate-500 italic text-xs sm:text-sm">Listo para tirar los dados...</span>
              )}
            </div>

            <div className="font-pixel text-base sm:text-lg font-bold text-yellow-300 shrink-0 pl-1.5">
              {lastRoll ? `+${formatNumber(lastRoll.totalEarned)}` : ''}
            </div>
          </div>
        </header>

        {/* Dice Virtual Casino Table with full highlight on Tutorial Step 1 */}
        <main
          className={`flex-1 min-h-0 flex flex-col p-2 sm:p-4 bg-slate-950 relative overflow-hidden transition-all ${tutorialStep === 1 ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 rounded-2xl sm:rounded-3xl shadow-[0_0_35px_rgba(52,211,153,0.4)] z-20' : ''
            } ${tutorialStep === 3 ? 'pointer-events-none opacity-70' : ''}`}
          style={{ touchAction: 'none' }}
          onPointerDown={startHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          <DiceTable
            faces={lastRoll?.faces || []}
            ghosts={lastRoll?.ghosts || []}
            sides={sides}
            materialLevel={materialTier}
            manualCooldown={manualCooldown}
            animationSpeedMult={animSpeedMult}
            onRoll={handleRoll}
            cooldownActive={cooldownActive}
            totalEarned={lastRoll?.totalEarned || null}
            combos={lastRoll?.combos || []}
            comboStreak={state.comboStreak}
            streakBonus={lastRoll?.streakBonus || 1}
            showFloatingTexts={graphics.showFloatingTexts}
            enableConfetti={graphics.enableConfetti}
            enableTumbleAnimation={graphics.enableDiceRotationAnimation}
          />
        </main>

        {/* Physical Roll Action Bar */}
        <footer className={`p-2.5 sm:p-4 bg-slate-950 border-t border-slate-800 z-10 pb-3 sm:pb-4 shadow-[0_-8px_25px_rgba(0,0,0,0.6)] flex items-center gap-2 sm:gap-3 shrink-0 ${isPartyMode ? 'party-dancer' : ''
          } ${tutorialStep === 3 ? 'pointer-events-none opacity-70' : ''}`}>
          {/* Mini-table Preview Box with full D-sides and Dado label */}
          <div className="flex items-center bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-900 rounded-xl sm:rounded-2xl px-2.5 sm:px-3.5 py-1 border-2 sm:border-4 border-amber-950 shadow-[inset_0_3px_8px_rgba(0,0,0,0.6),0_3px_0_#451a03] shrink-0 h-[58px] sm:h-[72px] gap-1.5 sm:gap-2.5">
            {graphics.showSpinningPreview ? (
              <SpinningDiePreview sides={sides} materialLevel={materialTier} />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                <PolyhedronDie
                  sides={sides}
                  size={42}
                  rotX={22}
                  rotY={35}
                  rotZ={0}
                  materialLevel={materialTier}
                />
              </div>
            )}
            <div className="flex flex-col justify-center font-pixel pr-0.5 select-none leading-tight">
              <span className="text-xs sm:text-base font-bold text-emerald-100 tracking-wide drop-shadow-sm whitespace-nowrap">
                {getMaterialTierName(materialTier)} (D{sides})
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg font-bold whitespace-nowrap">
                <span className="text-emerald-200/90 text-xs sm:text-base font-pixel">Dado</span>
                <span className="text-yellow-300 font-pixel drop-shadow-sm">
                  +{getFlatBonus(state.upgrades.flat_bonus)}
                </span>
                <span className="text-fuchsia-300 font-pixel drop-shadow-sm">
                  x{getMaterialMult(materialTier)}
                </span>
              </div>
            </div>
          </div>

          {/* Giant Launch Button with Pure Smooth Cooldown Animation & Spotlight */}
          <button
            onClick={() => handleRoll(false)}
            disabled={cooldownActive}
            onPointerDown={startHold}
            style={{ touchAction: 'none' }}
            className={`relative flex-1 h-[58px] sm:h-[72px] rounded-xl sm:rounded-2xl font-black text-lg sm:text-2xl uppercase tracking-widest overflow-hidden transition-all select-none cursor-pointer border-2 ${tutorialStep === 1 || tutorialStep === 2
                ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_25px_rgba(52,211,153,0.7)]'
                : ''
              } ${cooldownActive
                ? 'bg-slate-800 text-slate-300 border-slate-700 border-b-4 border-b-slate-900 shadow-inner translate-y-0.5'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400 border-b-4 border-b-emerald-800 shadow-[0_4px_0_#065f46] active:translate-y-1 active:border-b-2 active:shadow-none'
              }`}
          >
            {/* Recharge Energy Bar */}
            {cooldownActive && (
              <div
                className="absolute inset-0 bg-gradient-to-r from-emerald-600/40 via-teal-500/50 to-emerald-400/40 pointer-events-none"
                style={{
                  width: `${(1 - cooldownFraction) * 100}%`,
                }}
              />
            )}

            {/* Dark Mask on Uncharged Portion */}
            {cooldownActive && (
              <div
                className="absolute top-0 bottom-0 right-0 bg-black/45 pointer-events-none"
                style={{
                  width: `${cooldownFraction * 100}%`,
                }}
              />
            )}

            <span className="relative z-10 font-pixel drop-shadow-md flex items-center justify-center">
              ¡TIRAR DADOS!
            </span>
          </button>
        </footer>

        {/* Shop Modal Drawer with Locked Tabs during Tutorial */}
        <AnimatePresence>
          {isShopOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="absolute inset-0 z-50 bg-slate-900 flex flex-col shadow-[-4px_0_30px_rgba(0,0,0,0.8)]"
            >
              <div className="flex justify-between items-center p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950 shrink-0">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-400" /> Tienda de Mejoras
                  </h2>
                  <div className="text-yellow-400 font-pixel text-sm sm:text-base mt-0.5">
                    {formatNumber(state.points)} pts disponibles
                  </div>
                </div>
                <button
                  onClick={handleCloseShop}
                  className={`p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 border-b-4 border-b-slate-950 rounded-xl shadow-[0_2px_0_#0f172a] active:translate-y-0.5 active:shadow-none transition-all text-slate-300 cursor-pointer ${tutorialStep === 5 ? 'ring-4 ring-purple-400 ring-offset-2 ring-offset-slate-950 animate-bounce' : ''
                    }`}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <Shop
                  state={state}
                  onBuy={handleBuyShopUpgrade}
                  onToggleAutoRoll={toggleAutoRoll}
                  onUnlockCheats={unlockCheats}
                  isAutoRollPaused={isAutoRollPaused}
                  tutorialStep={tutorialStep}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Guided Tutorial Overlay (Rendered above Shop Drawer) */}
        <TutorialOverlay
          step={tutorialStep}
          onSkip={skipTutorial}
          onDismissOkPrompt={() => setTutorialStep(2)}
          onDismissShopIntro={handleDismissShopIntro}
          onFinishTutorial={handleFinishTutorial}
        />

        {/* Options & Stats Modal with Tutorial (?) Replay Button */}
        <AnimatePresence>
          {isOptionsOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { playClickSound(); setIsOptionsOpen(false); }}
              className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-3 sm:p-4 backdrop-blur-md cursor-pointer"
            >
              {/* Pulsing "JUEGO PAUSADO" Banner outside popup */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="mb-3 sm:mb-4 bg-amber-500/20 border-2 border-amber-400/80 text-amber-300 px-4 sm:px-6 py-1 sm:py-1.5 rounded-full font-pixel font-bold text-base sm:text-xl uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center gap-2 animate-pulse shrink-0"
              >
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> JUEGO PAUSADO
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border-2 border-slate-700 w-full max-w-sm rounded-2xl sm:rounded-3xl shadow-2xl relative cursor-default max-h-[78vh] sm:max-h-[82vh] flex flex-col overflow-hidden"
              >
                {/* Fixed Header with Tutorial Replay Button */}
                <div className="flex justify-between items-center p-4 sm:p-5 pb-3 border-b border-slate-800 shrink-0 bg-slate-950/70">
                  <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                    Opciones & Rendimiento
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={startTutorial}
                      className="px-2.5 py-1 bg-yellow-950/80 hover:bg-yellow-900 border border-yellow-500/60 rounded-xl text-yellow-300 text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer transition-all"
                      title="Repetir Tutorial Guiado"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Tutorial</span>
                    </button>
                    <button
                      onClick={() => { playClickSound(); setIsOptionsOpen(false); }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-750 border-2 border-slate-700 border-b-4 border-b-slate-950 rounded-xl shadow-[0_2px_0_#0f172a] text-slate-300 cursor-pointer active:translate-y-0.5 active:shadow-none"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content inside Popup */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 pt-3 space-y-3 sm:space-y-4">
                  {/* Audio Volume Slider */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <div className="flex justify-between text-slate-300 font-bold mb-1.5 text-xs sm:text-sm">
                      <span className="flex items-center gap-1.5">
                        {volume > 0 ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                        Volumen General
                      </span>
                      <span className="font-mono text-xs">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0" max="1" step="0.05"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Graphics & Performance Section */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold pb-1.5 border-b border-slate-850 text-xs sm:text-sm">
                      <Monitor className="w-4 h-4 text-cyan-400" /> Gráficos & Rendimiento
                    </div>

                    {/* Toggle Floating Text Particles */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-yellow-400" /> Textos Flotantes
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          Puntos y combos flotantes en mesa
                        </span>
                      </div>
                      <button
                        onClick={() => updateGraphics('showFloatingTexts', !graphics.showFloatingTexts)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border shrink-0 ${graphics.showFloatingTexts
                            ? 'bg-blue-600 border-blue-400'
                            : 'bg-slate-800 border-slate-700'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${graphics.showFloatingTexts ? 'right-1' : 'left-1'
                          }`} />
                      </button>
                    </div>

                    {/* Toggle Spinning Die Preview */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <RotateCw className="w-3.5 h-3.5 text-emerald-400" /> Dado 3D Giratorio
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          Giro 3D continuo inferior izquierdo
                        </span>
                      </div>
                      <button
                        onClick={() => updateGraphics('showSpinningPreview', !graphics.showSpinningPreview)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border shrink-0 ${graphics.showSpinningPreview
                            ? 'bg-emerald-600 border-emerald-400'
                            : 'bg-slate-800 border-slate-700'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${graphics.showSpinningPreview ? 'right-1' : 'left-1'
                          }`} />
                      </button>
                    </div>

                    {/* Toggle Confetti Effects */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-fuchsia-400" /> Efectos de Confeti
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          Lluvia en combos legendarios y cósmicos
                        </span>
                      </div>
                      <button
                        onClick={() => updateGraphics('enableConfetti', !graphics.enableConfetti)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border shrink-0 ${graphics.enableConfetti
                            ? 'bg-fuchsia-600 border-fuchsia-400'
                            : 'bg-slate-800 border-slate-700'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${graphics.enableConfetti ? 'right-1' : 'left-1'
                          }`} />
                      </button>
                    </div>

                    {/* Toggle Dice Tumble/Rotation Animation */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Dices className="w-3.5 h-3.5 text-blue-400" /> Animación de Giro 3D
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">
                          Rotación de dados al tirar en la mesa
                        </span>
                      </div>
                      <button
                        onClick={() => updateGraphics('enableDiceRotationAnimation', !graphics.enableDiceRotationAnimation)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border shrink-0 ${graphics.enableDiceRotationAnimation
                            ? 'bg-blue-600 border-blue-400'
                            : 'bg-slate-800 border-slate-700'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${graphics.enableDiceRotationAnimation ? 'right-1' : 'left-1'
                          }`} />
                      </button>
                    </div>
                  </div>

                  {/* Career Stats */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center gap-1 text-slate-400 font-bold mb-1 pb-1 border-b border-slate-850">
                      <BarChart2 className="w-4 h-4 text-emerald-400" /> Estadísticas de Carrera
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Acumulado:</span>
                      <span className="text-yellow-400 font-bold font-pixel text-sm">{formatNumber(state.totalPointsEarned)} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tiradas Realizadas:</span>
                      <span className="text-slate-200">{state.totalRolls.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Racha Más Alta:</span>
                      <span className="text-orange-400 font-bold">{state.highestStreak} combos</span>
                    </div>
                  </div>

                  {/* Cheats Section ("Trucos") */}
                  {state.cheatsUnlocked && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-950 p-3 sm:p-3.5 rounded-2xl border-2 border-purple-500/70 space-y-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    >
                      <div className="flex justify-between items-center pb-1 border-b border-purple-900/60">
                        <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs sm:text-sm font-pixel">
                          <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300 animate-spin" /> Trucos
                        </div>
                        <button
                          onClick={() => {
                            playClickSound();
                            disableCheats();
                          }}
                          className="px-2 py-0.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-600/50 rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          title="Ocultar menú de trucos"
                        >
                          <EyeOff className="w-3 h-3" /> Desactivar Trucos
                        </button>
                      </div>

                      {/* Points Cheats */}
                      <div>
                        <div className="text-[10px] text-purple-300/80 font-mono mb-1">Añadir Puntos:</div>
                        <div className="grid grid-cols-4 gap-1">
                          <button
                            onClick={() => { playBuySound(); addPoints(150000); }}
                            className="py-1 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/60 border-b-2 border-b-purple-900 text-purple-200 rounded-lg text-[11px] font-pixel font-bold active:translate-y-0.5 cursor-pointer transition-all"
                            title="Añadir 150,000 pts"
                          >
                            +150K
                          </button>
                          <button
                            onClick={() => { playBuySound(); addPoints(10000000); }}
                            className="py-1 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/60 border-b-2 border-b-purple-900 text-purple-200 rounded-lg text-[11px] font-pixel font-bold active:translate-y-0.5 cursor-pointer transition-all"
                            title="Añadir 10,000,000 pts"
                          >
                            +10M
                          </button>
                          <button
                            onClick={() => { playBuySound(); addPoints(100000000); }}
                            className="py-1 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/60 border-b-2 border-b-purple-900 text-purple-200 rounded-lg text-[11px] font-pixel font-bold active:translate-y-0.5 cursor-pointer transition-all"
                            title="Añadir 100,000,000 pts"
                          >
                            +100M
                          </button>
                          <button
                            onClick={() => { playBuySound(); addPoints(1000000000); }}
                            className="py-1 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/60 border-b-2 border-b-purple-900 text-purple-200 rounded-lg text-[11px] font-pixel font-bold active:translate-y-0.5 cursor-pointer transition-all"
                            title="Añadir 1,000,000,000 pts (1B)"
                          >
                            +1B
                          </button>
                        </div>
                      </div>

                      {/* Power Cheats: Max Upgrades and Party Mode */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-purple-900/40">
                        <button
                          onClick={() => {
                            playBuySound();
                            maxAllUpgrades();
                          }}
                          className="py-2 px-1.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border border-yellow-300 border-b-2 border-b-amber-900 text-white rounded-lg text-[11px] font-pixel font-bold flex items-center justify-center gap-1 active:translate-y-0.5 cursor-pointer transition-all"
                          title="Mejorar todo al nivel máximo"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-yellow-200" /> Max Mejoras
                        </button>

                        <button
                          onClick={() => {
                            playClickSound();
                            triggerPartyMode();
                            setIsOptionsOpen(false);
                          }}
                          className="py-2 px-1.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:opacity-90 border border-pink-300 border-b-2 border-b-purple-950 text-white rounded-lg text-[11px] font-pixel font-bold flex items-center justify-center gap-1 active:translate-y-0.5 cursor-pointer transition-all animate-pulse"
                          title="Activar Modo Fiesta por 8 segundos"
                        >
                          <PartyPopper className="w-3.5 h-3.5 text-yellow-300" /> Fiesta (8s)
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Reset Button with Large Readable Typography */}
                  <div className="pt-1">
                    <button
                      onClick={() => { playClickSound(); setShowResetModal(true); }}
                      className="w-full py-2.5 sm:py-3 bg-red-950/50 hover:bg-red-900/70 text-red-300 border-2 border-red-800/70 border-b-4 border-b-red-950 shadow-[0_2px_0_#450a0a] rounded-xl font-bold font-pixel text-xs sm:text-sm uppercase tracking-wider transition-all active:translate-y-0.5 active:shadow-none cursor-pointer"
                    >
                      Reiniciar Todo el Progreso
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <ResetModal
            onClose={() => setShowResetModal(false)}
            onConfirm={() => {
              hardReset();
              try {
                localStorage.removeItem('pal_tutorial_completed');
              } catch (e) { }
              tutorialRollsCountRef.current = 0;
              setTutorialStep(1);
              setShowResetModal(false);
              setIsOptionsOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
