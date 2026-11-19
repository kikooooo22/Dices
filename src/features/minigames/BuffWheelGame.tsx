import React, { useEffect, useRef, useState } from 'react';
import { Flame, Ghost, Magnet, Sparkles, Timer, Zap } from 'lucide-react';
import { useGameStore } from '../../core/store';
import { RollConfig } from '../../core/types';
import { playBuySound, playClickSound, playErrorSound, playKonamiSuccessSound } from '../../utils/audio';

interface WheelReward {
  id: string;
  name: string;
  desc: string;
  durationMs: number;
  color: string;
  badgeClass: string;
  modifiers?: Partial<RollConfig>;
  instantChips?: number;
}

const SPIN_COST_CHIPS = 5;

const WHEEL_REWARDS: WheelReward[] = [
  {
    id: 'buff_gold_rush',
    name: 'Fiebre Dorada',
    desc: 'x2.5 puntos totales durante 30s',
    durationMs: 30_000,
    color: '#facc15',
    badgeClass: 'border-yellow-400/70 bg-yellow-950/60 text-yellow-300',
    modifiers: { pointsMult: 2.5 },
  },
  {
    id: 'buff_turbo_auto',
    name: 'Turbo Mecánico',
    desc: 'x2.5 velocidad de Auto-Roller por 25s',
    durationMs: 25_000,
    color: '#38bdf8',
    badgeClass: 'border-cyan-400/70 bg-cyan-950/60 text-cyan-300',
    modifiers: { autoRollSpeedMult: 2.5 },
  },
  {
    id: 'buff_magnet',
    name: 'Imán Cuántico',
    desc: '+35% probabilidad de pares/combos por 30s',
    durationMs: 30_000,
    color: '#c084fc',
    badgeClass: 'border-purple-400/70 bg-purple-950/60 text-purple-300',
    modifiers: { magnetismProb: 0.35 },
  },
  {
    id: 'buff_ghost_squad',
    name: 'Escuadra Fantasma',
    desc: '+2 Dados Fantasma garantizados por 25s',
    durationMs: 25_000,
    color: '#2dd4bf',
    badgeClass: 'border-teal-400/70 bg-teal-950/60 text-teal-300',
    modifiers: { extraGhostDice: 2 },
  },
  {
    id: 'buff_combo_master',
    name: 'Maestría Combo',
    desc: 'x2.0 multiplicador de combos por 30s',
    durationMs: 30_000,
    color: '#fb923c',
    badgeClass: 'border-orange-400/70 bg-orange-950/60 text-orange-300',
    modifiers: { comboMult: 2.0 },
  },
  {
    id: 'instant_jackpot',
    name: 'Bote de Fichas',
    desc: '+15 Fichas de Casino al instante',
    durationMs: 0,
    color: '#4ade80',
    badgeClass: 'border-emerald-400/70 bg-emerald-950/60 text-emerald-300',
    instantChips: 15,
  },
];

export const BuffWheelGame: React.FC = () => {
  const chips = useGameStore((s) => s.state.currencies.chips);
  const spendCurrency = useGameStore((s) => s.spendCurrency);
  const addCurrency = useGameStore((s) => s.addCurrency);
  const addBuff = useGameStore((s) => s.addBuff);
  const recordMinigameResult = useGameStore((s) => s.recordMinigameResult);

  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [lastWon, setLastWon] = useState<WheelReward | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const spin = () => {
    if (isSpinning) return;
    if (chips < SPIN_COST_CHIPS) {
      playErrorSound();
      return;
    }

    if (!spendCurrency('chips', SPIN_COST_CHIPS, 'minigame:buff_wheel:spin')) {
      playErrorSound();
      return;
    }

    setIsSpinning(true);
    setLastWon(null);

    const targetIdx = Math.floor(Math.random() * WHEEL_REWARDS.length);
    const totalSteps = 18 + targetIdx;
    let step = 0;

    const advance = () => {
      const currentIdx = step % WHEEL_REWARDS.length;
      setHighlightIdx(currentIdx);
      playClickSound();

      if (step >= totalSteps) {
        const reward = WHEEL_REWARDS[targetIdx];
        setIsSpinning(false);
        setLastWon(reward);

        if (reward.instantChips) {
          addCurrency('chips', reward.instantChips, 'minigame:buff_wheel:jackpot');
          playKonamiSuccessSound();
        } else if (reward.modifiers) {
          addBuff({
            id: reward.id,
            name: reward.name,
            desc: reward.desc,
            durationMs: reward.durationMs,
            color: reward.color,
            modifiers: reward.modifiers,
          });
          playBuySound();
        }
        recordMinigameResult('buff_wheel', true, reward.instantChips || 1);
        return;
      }

      step += 1;
      const delay = 55 + Math.pow(step / totalSteps, 2) * 140;
      timerRef.current = setTimeout(advance, delay);
    };

    advance();
  };

  const renderIcon = (id: string) => {
    switch (id) {
      case 'buff_gold_rush':
        return <Sparkles className="w-4 h-4" />;
      case 'buff_turbo_auto':
        return <Zap className="w-4 h-4" />;
      case 'buff_magnet':
        return <Magnet className="w-4 h-4" />;
      case 'buff_ghost_squad':
        return <Ghost className="w-4 h-4" />;
      case 'buff_combo_master':
        return <Flame className="w-4 h-4" />;
      default:
        return <Timer className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 bg-slate-950/70 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
        <span className="text-slate-300 font-bold">
          Coste por giro: <strong className="text-emerald-400">{SPIN_COST_CHIPS} fichas</strong>
        </span>
        <span className="text-slate-300 font-mono">
          Disponibles: <strong className="text-emerald-300">{chips}</strong>
        </span>
      </div>

      {/* 6-slot Arcade Grid */}
      <div className="grid grid-cols-2 gap-2">
        {WHEEL_REWARDS.map((item, idx) => {
          const isHighlighted = highlightIdx === idx;
          return (
            <div
              key={item.id}
              className={`p-2.5 rounded-xl border-2 transition-all flex flex-col gap-1 ${
                isHighlighted
                  ? 'ring-2 ring-white scale-[1.02] shadow-lg ' + item.badgeClass
                  : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                <span style={{ color: item.color }}>{renderIcon(item.id)}</span>
                <span className="truncate">{item.name}</span>
              </div>
              <div className="text-[11px] text-slate-400 leading-tight font-sans">
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>

      {lastWon && (
        <div
          className={`text-center text-xs sm:text-sm font-bold px-3 py-2 rounded-xl border ${lastWon.badgeClass}`}
        >
          ¡Activado: {lastWon.name}! ({lastWon.desc})
        </div>
      )}

      <button
        onClick={spin}
        disabled={isSpinning || chips < SPIN_COST_CHIPS}
        className="w-full py-3 rounded-xl font-black text-base uppercase tracking-wider bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white border-2 border-fuchsia-400 border-b-4 border-b-purple-950 active:translate-y-0.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
      >
        {isSpinning ? 'Girando Ruleta...' : `Girar Ruleta (${SPIN_COST_CHIPS} Fichas)`}
      </button>
    </div>
  );
};
