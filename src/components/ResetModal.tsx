import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { startResetChargeSound, stopResetChargeSound, playResetBoomSound, playClickSound } from '../utils/audio';

interface ResetModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

export const ResetModal: React.FC<ResetModalProps> = ({ onConfirm, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0, rot: 0 });
  const reqRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);

  const startHold = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}

    isHoldingRef.current = true;
    startResetChargeSound();
    const start = Date.now();
    const duration = 1800; // 1.8s hold
    
    const update = () => {
      if (!isHoldingRef.current) return;
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);

      // Increasing intense shake as progress grows
      const intensity = (p / 100) * 10; // up to 10px shake
      setShakeOffset({
        x: (Math.random() - 0.5) * intensity * 2,
        y: (Math.random() - 0.5) * intensity * 2,
        rot: (Math.random() - 0.5) * intensity,
      });

      if (p >= 100) {
        setProgress(100);
        stopResetChargeSound();
        playResetBoomSound();
        isHoldingRef.current = false;
        
        // Give 120ms to see the full 100% bar and feel the impact before unmounting
        setTimeout(() => {
          onConfirm();
          onClose();
        }, 120);
      } else {
        reqRef.current = requestAnimationFrame(update);
      }
    };
    reqRef.current = requestAnimationFrame(update);
  };
  
  const stopHold = () => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    stopResetChargeSound();
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    setProgress(0);
    setShakeOffset({ x: 0, y: 0, rot: 0 });
  };

  useEffect(() => {
    return () => {
      stopResetChargeSound();
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 px-4 backdrop-blur-md font-pixel select-none cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border-2 border-red-600/80 p-5 sm:p-6 rounded-3xl max-w-sm w-full shadow-[0_0_50px_rgba(220,38,38,0.5)] cursor-default relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Badge */}
        <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
          <h3 className="text-xl sm:text-2xl font-black text-red-400 tracking-wide">
            ¿BORRAR PROGRESO?
          </h3>
        </div>

        <p className="text-slate-300 text-xs sm:text-sm mb-5 leading-relaxed">
          Mantén presionado el botón rojo para confirmar. <strong className="text-red-300">Se eliminarán todos tus puntos, dados, multiplicadores y mejoras de la tienda.</strong> El tutorial volverá a comenzar.
        </p>

        {/* Shaking Hold-to-Reset Button */}
        <button 
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            transform: `translate3d(${shakeOffset.x}px, ${shakeOffset.y}px, 0) rotate(${shakeOffset.rot}deg)`,
            touchAction: 'none'
          }}
          className={`relative w-full py-4 rounded-2xl overflow-hidden font-black text-base sm:text-lg uppercase tracking-wider transition-all select-none border-2 ${
            progress >= 100
              ? 'bg-red-500 border-white shadow-[0_0_40px_rgba(255,255,255,0.9)]'
              : progress > 0 
                ? 'bg-red-950 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.7)]' 
                : 'bg-red-900 hover:bg-red-850 border-red-600 border-b-4 border-b-red-950 shadow-[0_3px_0_#450a0a] active:translate-y-0.5'
          }`}
        >
          {/* Progress fill bar with pulsating fire gradient */}
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 pointer-events-none"
            style={{ width: `${progress}%` }} 
          />
          
          <span className="relative z-10 flex items-center justify-center gap-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <Trash2 className="w-5 h-5" />
            MANTÉN PARA BORRAR
          </span>
        </button>

        <button 
          onClick={() => {
            playClickSound();
            onClose();
          }} 
          className="w-full mt-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs sm:text-sm border border-slate-700 transition-colors cursor-pointer"
        >
          Cancelar y Volver
        </button>
      </div>
    </div>
  );
};
