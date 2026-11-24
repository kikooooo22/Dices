import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Coins, Gamepad2, Lock, Sparkles, Trophy, X } from 'lucide-react';
import { useGameStore } from '../../core/store';
import { playClickSound } from '../../utils/audio';
import { formatNumber } from '../../utils/format';
import { MINIGAME_REGISTRY } from './registry';

interface MinigamesModalProps {
  onClose: () => void;
}

export const MinigamesModal: React.FC<MinigamesModalProps> = ({ onClose }) => {
  const state = useGameStore((s) => s.state);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeMinigame = MINIGAME_REGISTRY.find((m) => m.id === selectedId) || null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}
      className="absolute inset-0 z-50 bg-slate-900 flex flex-col shadow-[-4px_0_30px_rgba(0,0,0,0.8)]"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950 shrink-0">
        <div className="flex items-center gap-2">
          {activeMinigame && (
            <button
              onClick={() => {
                playClickSound();
                setSelectedId(null);
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 cursor-pointer"
              title="Volver a Minijuegos"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              {activeMinigame ? activeMinigame.name : 'Salón de Minijuegos'}
            </h2>
            <div className="flex items-center gap-3 text-xs sm:text-sm font-bold mt-0.5">
              <span className="text-emerald-300 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" /> {formatNumber(state.currencies.chips)} fichas
              </span>
              {state.currencies.shards > 0 && (
                <span className="text-fuchsia-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> {formatNumber(state.currencies.shards)} frag
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 border-b-4 border-b-slate-950 rounded-xl shadow-[0_2px_0_#0f172a] active:translate-y-0.5 active:shadow-none transition-all text-slate-300 cursor-pointer"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 overscroll-contain">
        {activeMinigame ? (
          <activeMinigame.Component />
        ) : (
          <>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 font-sans">
              Consigue <strong className="text-emerald-300">Fichas de Casino</strong> logrando combos y rachas en la mesa principal para apostar y activar potenciadores temporales.
            </div>

            {MINIGAME_REGISTRY.map((mg) => {
              const unlocked = mg.isUnlocked(state);
              const stats = state.minigameStats[mg.id];

              return (
                <div
                  key={mg.id}
                  className={`rounded-2xl border-2 p-3.5 sm:p-4 transition-all ${
                    unlocked
                      ? `bg-gradient-to-br ${mg.accentGradient} ${mg.borderClass}`
                      : 'bg-slate-950/80 border-slate-800 opacity-75'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-white">{mg.name}</h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-slate-300">
                          {mg.badge}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{mg.subtitle}</div>
                    </div>

                    {unlocked ? (
                      <button
                        onClick={() => {
                          playClickSound();
                          setSelectedId(mg.id);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm border border-emerald-300 border-b-4 border-b-emerald-900 active:translate-y-0.5 cursor-pointer shrink-0"
                      >
                        Jugar
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 text-xs font-bold flex items-center gap-1 shrink-0">
                        <Lock className="w-3.5 h-3.5" /> Bloqueado
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mt-2 font-sans leading-snug">
                    {unlocked ? mg.desc : mg.unlockHint(state)}
                  </p>

                  {unlocked && stats && stats.played > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/70 flex items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-400" />
                        {stats.wins}/{stats.played} victorias
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </motion.div>
  );
};
