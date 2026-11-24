import React from 'react';
import { Timer } from 'lucide-react';
import { useGameStore } from '../core/store';

export const ActiveBuffsBar: React.FC = () => {
  const activeBuffs = useGameStore((s) => s.state.activeBuffs);

  if (activeBuffs.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2.5 sm:px-4 pt-1.5 pb-0.5 bg-slate-950/90 border-b border-slate-800/80 shrink-0">
      {activeBuffs.map((buff) => {
        const secLeft = Math.ceil(buff.remainingMs / 1000);
        return (
          <div
            key={buff.id}
            title={buff.desc}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 border text-[10px] sm:text-xs font-mono font-bold shadow-sm"
            style={{
              borderColor: buff.color || '#a855f7',
              color: buff.color || '#e9d5ff',
            }}
          >
            <Timer className="w-3 h-3 shrink-0" />
            <span>{buff.name}</span>
            <span className="text-white/90">{secLeft}s</span>
          </div>
        );
      })}
    </div>
  );
};
