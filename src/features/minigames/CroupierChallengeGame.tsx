import React, { useState } from 'react';
import { Lock, RotateCw, ShieldCheck, Trophy } from 'lucide-react';
import { VectorTrue3DDie } from '../../components/Polyhedron3D';
import { useGameStore } from '../../core/store';
import {
  analyzeDiceRoll,
  ComboResult,
  getDiceSides,
  getFlatBonus,
  getMaterialMult,
} from '../../game/engine';
import { playBuySound, playClickSound, playComboSound, playErrorSound, playRollSound } from '../../utils/audio';
import { formatNumber } from '../../utils/format';

const ENTRY_COST_CHIPS = 3;
const DICE_PER_HAND = 5;
const MAX_THROWS = 3;

export const CroupierChallengeGame: React.FC = () => {
  const chips = useGameStore((s) => s.state.currencies.chips);
  const diceSidesLvl = useGameStore((s) => s.state.upgrades.dice_sides);
  const materialTier = useGameStore((s) => s.state.upgrades.material_tier);
  const flatBonusLvl = useGameStore((s) => s.state.upgrades.flat_bonus);
  const globalMult = useGameStore((s) => s.state.globalMult);
  const spendCurrency = useGameStore((s) => s.spendCurrency);
  const addCurrency = useGameStore((s) => s.addCurrency);
  const recordMinigameResult = useGameStore((s) => s.recordMinigameResult);

  const sides = getDiceSides(diceSidesLvl);
  const [faces, setFaces] = useState<number[]>(() => Array(DICE_PER_HAND).fill(sides));
  const [held, setHeld] = useState<boolean[]>(() => Array(DICE_PER_HAND).fill(false));
  const [dieRollIds, setDieRollIds] = useState<number[]>(() => Array(DICE_PER_HAND).fill(0));
  const [throwsLeft, setThrowsLeft] = useState(0);
  const [isRanked, setIsRanked] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    combos: ComboResult[];
    pointsReward: number;
    chipsReward: number;
    shardsReward: number;
  } | null>(null);

  const { combos: liveCombos, colorMap } = analyzeDiceRoll(faces, sides);

  const evaluateAndPayout = (finalFaces: number[], ranked: boolean) => {
    const { combos } = analyzeDiceRoll(finalFaces, sides);
    const sum = finalFaces.reduce((acc, f) => acc + f + getFlatBonus(flatBonusLvl), 0);
    const matMult = getMaterialMult(materialTier);

    const bestMult = combos.reduce((m, c) => Math.max(m, c.mult), 1);
    const scale = ranked ? 1 : 0.3;
    const pointsReward = Math.round(sum * matMult * bestMult * globalMult * 4 * scale);

    let chipsReward = 0;
    let shardsReward = 0;
    if (combos.length > 0) {
      const hasCosmic = combos.some((c) => c.tier === 'cosmic');
      const hasLegendary = combos.some((c) => c.tier === 'legendary');
      const hasEpic = combos.some((c) => c.tier === 'epic');
      const hasRare = combos.some((c) => c.tier === 'rare');

      if (ranked) {
        chipsReward = hasCosmic ? 20 : hasLegendary ? 12 : hasEpic ? 7 : hasRare ? 4 : 2;
        shardsReward = hasCosmic ? 4 : hasLegendary ? 2 : hasEpic ? 1 : 0;
      } else {
        chipsReward = hasEpic || hasLegendary || hasCosmic ? 1 : 0;
      }
      playComboSound(bestMult);
    }

    if (pointsReward > 0) {
      addCurrency('points', pointsReward, 'minigame:croupier:points');
    }
    if (chipsReward > 0) {
      addCurrency('chips', chipsReward, 'minigame:croupier:chips');
    }
    if (shardsReward > 0) {
      addCurrency('shards', shardsReward, 'minigame:croupier:shards');
    }

    const won = combos.length > 0;
    if (won) playBuySound();
    recordMinigameResult('croupier_challenge', won, pointsReward);
    setResultSummary({ combos, pointsReward, chipsReward, shardsReward });
    setThrowsLeft(0);
  };

  const startRound = (ranked: boolean) => {
    if (throwsLeft > 0) return;
    if (ranked) {
      if (chips < ENTRY_COST_CHIPS || !spendCurrency('chips', ENTRY_COST_CHIPS, 'minigame:croupier:entry')) {
        playErrorSound();
        return;
      }
    }

    const initialFaces = Array.from({ length: DICE_PER_HAND }, () => Math.floor(Math.random() * sides) + 1);
    playRollSound(materialTier);
    setIsRanked(ranked);
    setFaces(initialFaces);
    setHeld(Array(DICE_PER_HAND).fill(false));
    setDieRollIds((prev) => prev.map((id) => id + 1));
    setResultSummary(null);
    setThrowsLeft(MAX_THROWS - 1);
  };

  const rerollUnheld = () => {
    if (throwsLeft <= 0) return;

    const nextFaces = faces.map((f, idx) =>
      held[idx] ? f : Math.floor(Math.random() * sides) + 1
    );
    playRollSound(materialTier);
    setFaces(nextFaces);
    setDieRollIds((prev) => prev.map((id, idx) => (held[idx] ? id : id + 1)));

    const nextThrows = throwsLeft - 1;
    if (nextThrows <= 0) {
      evaluateAndPayout(nextFaces, isRanked);
    } else {
      setThrowsLeft(nextThrows);
    }
  };

  const toggleHold = (idx: number) => {
    if (throwsLeft <= 0) return;
    playClickSound();
    setHeld((prev) => prev.map((h, i) => (i === idx ? !h : h)));
  };

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 bg-slate-950/70 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
        <span className="text-slate-300 font-bold">
          {throwsLeft > 0
            ? `Tiradas restantes: ${throwsLeft} (Toca dados para fijar)`
            : 'Arma tu mejor mano de póker en 3 tiradas'}
        </span>
        <span className="font-mono text-emerald-300 font-bold">D{sides}</span>
      </div>

      {/* 5 Tactical Dice Row */}
      <div className="flex flex-wrap items-center justify-center gap-2 py-3 px-2 bg-gradient-to-b from-emerald-900/50 to-slate-900 rounded-2xl border-2 border-amber-900/60">
        {faces.map((face, idx) => {
          const isHeld = held[idx];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleHold(idx)}
              disabled={throwsLeft <= 0}
              className={`relative p-1.5 rounded-xl border-2 transition-all flex flex-col items-center cursor-pointer disabled:cursor-default ${
                isHeld
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)] -translate-y-1'
                  : 'bg-slate-950/40 border-transparent hover:border-slate-600'
              }`}
            >
              <VectorTrue3DDie
                finalFace={face}
                sides={sides}
                materialLevel={materialTier}
                rollId={dieRollIds[idx]}
                manualCooldown={0.22}
                size={58}
                comboColor={colorMap[idx]}
              />
              {throwsLeft > 0 && (
                <span
                  className={`mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                    isHeld ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isHeld && <Lock className="w-2.5 h-2.5" />}
                  {isHeld ? 'FIJO' : 'LIBRE'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Live Combos Preview */}
      {liveCombos.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {liveCombos.map((c, i) => (
            <span
              key={i}
              className="text-xs font-black bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-lg border border-yellow-500/40"
            >
              {c.name} (x{c.mult})
            </span>
          ))}
        </div>
      )}

      {/* Result Banner */}
      {resultSummary && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 rounded-xl p-2.5 text-center text-xs sm:text-sm font-bold flex flex-col gap-1">
          <div className="flex items-center justify-center gap-1.5 text-yellow-300">
            <Trophy className="w-4 h-4" />
            <span>
              Recompensa ({isRanked ? 'Apuesta' : 'Práctica'}): +{formatNumber(resultSummary.pointsReward)} pts
              {resultSummary.chipsReward > 0 ? ` · +${resultSummary.chipsReward} fichas` : ''}
              {resultSummary.shardsReward > 0 ? ` · +${resultSummary.shardsReward} frag` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      {throwsLeft > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={rerollUnheld}
            className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm uppercase border-2 border-blue-400 border-b-4 border-b-blue-900 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" /> Relanzar Libres
          </button>
          <button
            onClick={() => evaluateAndPayout(faces, isRanked)}
            className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm uppercase border-2 border-yellow-200 border-b-4 border-b-amber-700 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" /> Plantarse
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => startRound(true)}
            disabled={chips < ENTRY_COST_CHIPS}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm uppercase border-2 border-emerald-400 border-b-4 border-b-emerald-900 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            Jugar ({ENTRY_COST_CHIPS} Fichas)
          </button>
          <button
            onClick={() => startRound(false)}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm uppercase border-2 border-slate-600 border-b-4 border-b-slate-950 cursor-pointer"
          >
            Práctica Gratis (30%)
          </button>
        </div>
      )}
    </div>
  );
};
