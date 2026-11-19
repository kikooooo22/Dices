import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Coins, Equal, Sparkles } from 'lucide-react';
import { VectorTrue3DDie } from '../../components/Polyhedron3D';
import { useGameStore } from '../../core/store';
import { CurrencyId } from '../../game/currencies';
import { getDiceSides } from '../../game/engine';
import { playBuySound, playClickSound, playErrorSound, playRollSound } from '../../utils/audio';
import { formatNumber } from '../../utils/format';

type GuessType = 'higher' | 'lower' | 'equal';

export const HighLowGame: React.FC = () => {
  const points = useGameStore((s) => s.state.points);
  const chips = useGameStore((s) => s.state.currencies.chips);
  const diceSidesLvl = useGameStore((s) => s.state.upgrades.dice_sides);
  const materialTier = useGameStore((s) => s.state.upgrades.material_tier);
  const spendCurrency = useGameStore((s) => s.spendCurrency);
  const addCurrency = useGameStore((s) => s.addCurrency);
  const recordMinigameResult = useGameStore((s) => s.recordMinigameResult);

  const sides = getDiceSides(diceSidesLvl);
  const [betCurrency, setBetCurrency] = useState<CurrencyId>(chips >= 1 ? 'chips' : 'points');
  const [betAmount, setBetAmount] = useState<number>(betCurrency === 'chips' ? 2 : 100);

  const [inRound, setInRound] = useState(false);
  const [currentFace, setCurrentFace] = useState<number>(() => Math.ceil(sides / 2));
  const [rollId, setRollId] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pot, setPot] = useState(0);
  const [statusMsg, setStatusMsg] = useState<string>('Elige tu apuesta e inicia la ronda.');
  const [statusTone, setStatusTone] = useState<'neutral' | 'win' | 'lose'>('neutral');

  const availableBalance = betCurrency === 'chips' ? chips : points;
  const presets =
    betCurrency === 'chips'
      ? [1, 5, 10, 25]
      : [100, 1000, 10000, 100000];

  const switchCurrency = (cur: CurrencyId) => {
    if (inRound) return;
    playClickSound();
    setBetCurrency(cur);
    setBetAmount(cur === 'chips' ? 2 : 100);
  };

  const startRound = () => {
    if (inRound) return;
    if (betAmount <= 0 || availableBalance < betAmount) {
      playErrorSound();
      setStatusMsg('Saldo insuficiente para esta apuesta.');
      setStatusTone('lose');
      return;
    }

    if (!spendCurrency(betCurrency, betAmount, 'minigame:high_low:bet')) {
      playErrorSound();
      return;
    }

    const firstFace = Math.floor(Math.random() * sides) + 1;
    playRollSound(materialTier);
    setCurrentFace(firstFace);
    setRollId((r) => r + 1);
    setInRound(true);
    setStreak(0);
    setPot(betAmount);
    setStatusMsg(`Salió ${firstFace} (D${sides}). ¿El siguiente será Mayor, Menor o Exacto?`);
    setStatusTone('neutral');
  };

  const makeGuess = (guess: GuessType) => {
    if (!inRound) return;

    const nextFace = Math.floor(Math.random() * sides) + 1;
    playRollSound(materialTier);
    setRollId((r) => r + 1);

    const won =
      (guess === 'higher' && nextFace > currentFace) ||
      (guess === 'lower' && nextFace < currentFace) ||
      (guess === 'equal' && nextFace === currentFace);

    setCurrentFace(nextFace);

    if (won) {
      const mult = guess === 'equal' ? 4.0 : 1.65;
      const nextPot = Math.round(pot * mult);
      const nextStreak = streak + 1;
      playBuySound();
      setPot(nextPot);
      setStreak(nextStreak);
      setStatusMsg(
        `¡Acierto! Salió ${nextFace}. Bote actual: ${formatNumber(nextPot)} ${betCurrency === 'chips' ? 'fichas' : 'pts'} (Racha ${nextStreak})`
      );
      setStatusTone('win');
    } else {
      playErrorSound();
      setInRound(false);
      setPot(0);
      setStreak(0);
      recordMinigameResult('high_low', false, 0);
      setStatusMsg(`¡Fallaste! Salió ${nextFace}. Perdiste la apuesta.`);
      setStatusTone('lose');
    }
  };

  const cashOut = () => {
    if (!inRound || streak === 0 || pot <= 0) return;
    playBuySound();
    addCurrency(betCurrency, pot, 'minigame:high_low:win');
    recordMinigameResult('high_low', true, pot);
    setStatusMsg(
      `¡Cobraste ${formatNumber(pot)} ${betCurrency === 'chips' ? 'fichas' : 'pts'}!`
    );
    setStatusTone('win');
    setInRound(false);
    setPot(0);
    setStreak(0);
  };

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 bg-slate-950/70 rounded-2xl border border-slate-800">
      {/* Bet Currency & Amount Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => switchCurrency('chips')}
            disabled={inRound}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
              betCurrency === 'chips'
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            Fichas ({formatNumber(chips)})
          </button>
          <button
            onClick={() => switchCurrency('points')}
            disabled={inRound}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
              betCurrency === 'points'
                ? 'bg-yellow-600 border-yellow-400 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            Puntos ({formatNumber(points)})
          </button>
        </div>

        <div className="flex items-center gap-1">
          {presets.map((val) => (
            <button
              key={val}
              disabled={inRound}
              onClick={() => {
                playClickSound();
                setBetAmount(val);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer disabled:opacity-50 ${
                betAmount === val
                  ? 'bg-cyan-600 border-cyan-300 text-white'
                  : 'bg-slate-850 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {formatNumber(val)}
            </button>
          ))}
        </div>
      </div>

      {/* Die Stage */}
      <div className="flex flex-col items-center justify-center py-4 bg-gradient-to-b from-emerald-900/50 to-slate-900 rounded-2xl border-2 border-amber-900/60 relative">
        <div className="text-[11px] font-mono text-emerald-300/80 mb-2">
          Dado activo: D{sides} (1 - {sides})
        </div>

        <VectorTrue3DDie
          finalFace={currentFace}
          sides={sides}
          materialLevel={materialTier}
          rollId={rollId}
          manualCooldown={0.25}
          size={92}
          comboColor={
            statusTone === 'win' ? '#4ade80' : statusTone === 'lose' ? '#f87171' : undefined
          }
        />

        {inRound && (
          <div className="mt-3 flex items-center gap-2 text-xs font-bold bg-slate-950/80 px-3 py-1 rounded-full border border-yellow-500/40 text-yellow-300">
            <Coins className="w-3.5 h-3.5" />
            <span>
              Bote: {formatNumber(pot)} {betCurrency === 'chips' ? 'fichas' : 'pts'}
            </span>
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div
        className={`text-center text-xs sm:text-sm font-bold px-3 py-2 rounded-xl border ${
          statusTone === 'win'
            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
            : statusTone === 'lose'
              ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
              : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}
      >
        {statusMsg}
      </div>

      {/* Action Controls */}
      {!inRound ? (
        <button
          onClick={startRound}
          disabled={availableBalance < betAmount}
          className="w-full py-3 rounded-xl font-black text-base uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-2 border-emerald-400 border-b-4 border-b-emerald-800 active:translate-y-0.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
        >
          Apostar {formatNumber(betAmount)} {betCurrency === 'chips' ? 'Fichas' : 'Pts'}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => makeGuess('lower')}
              disabled={currentFace <= 1}
              className="py-2.5 px-2 rounded-xl bg-rose-700 hover:bg-rose-600 border-2 border-rose-400 border-b-4 border-b-rose-950 text-white font-bold text-xs sm:text-sm flex flex-col items-center gap-0.5 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ArrowDown className="w-4 h-4" />
              <span>Menor (x1.65)</span>
            </button>
            <button
              onClick={() => makeGuess('equal')}
              className="py-2.5 px-2 rounded-xl bg-purple-700 hover:bg-purple-600 border-2 border-purple-400 border-b-4 border-b-purple-950 text-white font-bold text-xs sm:text-sm flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <Equal className="w-4 h-4" />
              <span>Exacto (x4.0)</span>
            </button>
            <button
              onClick={() => makeGuess('higher')}
              disabled={currentFace >= sides}
              className="py-2.5 px-2 rounded-xl bg-sky-700 hover:bg-sky-600 border-2 border-sky-400 border-b-4 border-b-sky-950 text-white font-bold text-xs sm:text-sm flex flex-col items-center gap-0.5 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4" />
              <span>Mayor (x1.65)</span>
            </button>
          </div>

          {streak > 0 && (
            <button
              onClick={cashOut}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider border-2 border-yellow-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Cobrar {formatNumber(pot)} {betCurrency === 'chips' ? 'Fichas' : 'Pts'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
