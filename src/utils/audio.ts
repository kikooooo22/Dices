let masterVolume = 0.5;

export const setMasterVolume = (vol: number) => {
  masterVolume = Math.max(0, Math.min(1, vol));
};

export const getMasterVolume = () => masterVolume;

let sharedAudioCtx: AudioContext | null = null;

const getAudioCtx = () => {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
};

// Play simple tone
const playTone = (type: OscillatorType, freq: number, dur: number, vol: number, freqEnd?: number) => {
  if (masterVolume <= 0) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
    }

    gainNode.gain.setValueAtTime(vol * masterVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) { }
};

let lastRollSoundTime = 0;
export const playRollSound = (materialLevel: number = 0) => {
  if (masterVolume <= 0) return;
  const now = performance.now();
  if (now - lastRollSoundTime < 65) return; // Prevent audio stack overflow during high auto-roll speed
  lastRollSoundTime = now;

  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    // Different audio flavors per material
    if (materialLevel === 2) {
      // Metallic clank
      playTone('triangle', 900, 0.08, 0.15, 300);
      playTone('sine', 1400, 0.12, 0.1, 700);
    } else if (materialLevel === 3) {
      // Crystal glass ping
      playTone('sine', 1600, 0.15, 0.2, 2200);
    } else if (materialLevel === 4) {
      // Neon pulse
      playTone('sawtooth', 350, 0.08, 0.15, 900);
    } else if (materialLevel === 5) {
      // Cosmic shimmer
      playTone('sine', 523.25, 0.2, 0.2, 1046.5);
      playTone('triangle', 659.25, 0.25, 0.15, 1318.5);
    } else {
      // Wood / Plastic rattle
      playTone('square', 600, 0.04, 0.06, 180);
    }
  } catch (e) { }
};

export const playBuySound = () => {
  if (masterVolume <= 0) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.15 * masterVolume, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.15);
    });
  } catch (e) { }
};

export const playErrorSound = () => {
  playTone('sawtooth', 160, 0.18, 0.25, 90);
};

export const playClickSound = () => {
  playTone('sine', 1100, 0.03, 0.08, 600);
};

// Musical Notes for Shop Tabs (Ode to Joy / Himno de la Alegría)
export const NOTE_FREQUENCIES = {
  Sol: 392.00, // G4 (Dados)
  La: 440.00,  // A4 (Auto)
  Si: 493.88,  // B4 (Trucos)
  Do: 523.25,  // C5 (Combos)
  Re: 587.33,  // D5 (Especial)
};

export const playTabNote = (note: keyof typeof NOTE_FREQUENCIES) => {
  if (masterVolume <= 0) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freq = NOTE_FREQUENCIES[note] || 440;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.09 * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch (e) { }
};

export const playKonamiSuccessSound = () => {
  if (masterVolume <= 0) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.28 * masterVolume, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  } catch (e) { }
};

// 8-second Disco / Party Mode Music
export const playPartyModeMusic = () => {
  if (masterVolume <= 0) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const startTime = ctx.currentTime;

    const bpm = 132;
    const beatSec = 60 / bpm; // ~0.45s per beat
    const totalBeats = 18; // ~8 seconds

    const chordRoots = [261.63, 329.63, 392.00, 440.00, 392.00, 329.63]; // C, E, G, A, G, E

    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = startTime + beat * beatSec;

      // Bass Kick/Pluck
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sawtooth';
      const rootFreq = chordRoots[beat % chordRoots.length] / 2;
      bassOsc.frequency.setValueAtTime(rootFreq, beatTime);
      bassOsc.frequency.exponentialRampToValueAtTime(rootFreq * 0.5, beatTime + 0.2);
      bassGain.gain.setValueAtTime(0.35 * masterVolume, beatTime);
      bassGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.22);
      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(beatTime);
      bassOsc.stop(beatTime + 0.22);

      // Fast arpeggiated synth melody (4 notes per beat)
      [0, 1, 2, 3].forEach((sub) => {
        const subTime = beatTime + sub * (beatSec / 4);
        const melodyOsc = ctx.createOscillator();
        const melodyGain = ctx.createGain();
        melodyOsc.type = sub % 2 === 0 ? 'triangle' : 'sine';
        const noteFreq = chordRoots[(beat + sub) % chordRoots.length] * (1 + (sub % 3) * 0.5);
        melodyOsc.frequency.setValueAtTime(noteFreq, subTime);
        melodyGain.gain.setValueAtTime(0.18 * masterVolume, subTime);
        melodyGain.gain.exponentialRampToValueAtTime(0.001, subTime + 0.1);
        melodyOsc.connect(melodyGain);
        melodyGain.connect(ctx.destination);
        melodyOsc.start(subTime);
        melodyOsc.stop(subTime + 0.1);
      });
    }
  } catch (e) { }
};

let lastComboSoundTime = 0;
export const playComboSound = (mult: number) => {
  if (masterVolume <= 0) return;
  const now = performance.now();
  if (now - lastComboSoundTime < 220) return; // Prevent overlapping combo fanfares
  lastComboSoundTime = now;

  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const audioTime = ctx.currentTime;

    const chords = mult >= 50
      ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98] // Cosmic fanfare
      : mult >= 15
        ? [440, 554.37, 659.25, 880, 1108.73] // Epic
        : mult >= 5
          ? [392, 493.88, 587.33, 783.99] // Rare
          : [349.23, 440, 523.25]; // Common

    chords.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = mult >= 15 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, audioTime + i * 0.06);
      gain.gain.setValueAtTime((0.12 + Math.min(0.18, mult * 0.005)) * masterVolume, audioTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, audioTime + i * 0.06 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(audioTime + i * 0.06);
      osc.stop(audioTime + i * 0.06 + 0.22);
    });
  } catch (e) { }
};

// High-pitched bell chimes for Milestone 1 ("feliz cumpleaños we") as requested in PDF
export const playMilestone1Bells = () => {
  if (masterVolume <= 0) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Disney Channel / Birthday bell glissando
    const bellNotes = [
      1046.5, 1174.66, 1318.51, 1396.91, 1567.98, 1760.0, 1975.53, 2093.0,
      1567.98, 2093.0, 2637.02
    ];

    bellNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      gain.gain.setValueAtTime(0.3 * masterVolume, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.4);
    });
  } catch (e) { }
};

export const playMilestone2Ambiance = () => {
  if (masterVolume <= 0) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Mysterious low chord & slow fade
    [110, 164.81, 220].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.18 * masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 3.0);
    });
  } catch (e) { }
};

let resetChargeOsc: OscillatorNode | null = null;
let resetChargeGain: GainNode | null = null;

export const startResetChargeSound = () => {
  if (masterVolume <= 0) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    stopResetChargeSound();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 1.8);

    gain.gain.setValueAtTime(0.02 * masterVolume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.65 * masterVolume, ctx.currentTime + 1.8);

    // Deep sub-bass lowpass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(480, ctx.currentTime + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    resetChargeOsc = osc;
    resetChargeGain = gain;
  } catch (e) { }
};

export const stopResetChargeSound = () => {
  try {
    if (resetChargeGain) {
      const ctx = getAudioCtx();
      if (ctx) {
        resetChargeGain.gain.cancelScheduledValues(ctx.currentTime);
        resetChargeGain.gain.setValueAtTime(0, ctx.currentTime);
      }
    }
    if (resetChargeOsc) {
      resetChargeOsc.stop();
      resetChargeOsc.disconnect();
      resetChargeOsc = null;
    }
  } catch (e) { }
};

export const playResetBoomSound = () => {
  if (masterVolume <= 0) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sub-bass heavy drop (+50% louder)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.6);
    gain.gain.setValueAtTime(0.9 * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);

    // Mid-frequency punch/impact for full speaker presence
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(220, now);
    punchOsc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    punchGain.gain.setValueAtTime(0.45 * masterVolume, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    punchOsc.connect(punchGain);
    punchGain.connect(ctx.destination);
    punchOsc.start(now);
    punchOsc.stop(now + 0.25);
  } catch (e) { }
};

