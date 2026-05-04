function getAudioContextConstructor():
  | (new () => AudioContext)
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  if (typeof window.AudioContext !== "undefined") {
    return window.AudioContext;
  }
  const legacy = (
    window as unknown as { webkitAudioContext?: new () => AudioContext }
  ).webkitAudioContext;
  return legacy;
}

let cachedBeepObjectUrl: string | null = null;

/** Short PCM WAV for `<audio>` fallback when Web Audio is blocked in a background tab. */
function buildBeepWavBlob(): Blob {
  const sampleRate = 22050;
  const durationSec = 0.22;
  const frequency = 880;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  let offset = 0;
  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset++, s.charCodeAt(i));
    }
  }

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * 2, true);
  offset += 4;
  view.setUint16(offset, 2, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fade = 1 - i / numSamples;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.35 * fade;
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      offset,
      Math.max(-32768, Math.min(32767, Math.round(clipped * 32767))),
      true,
    );
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function playHtmlAudioBeep(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!cachedBeepObjectUrl) {
      cachedBeepObjectUrl = URL.createObjectURL(buildBeepWavBlob());
    }
    const audio = new Audio(cachedBeepObjectUrl);
    audio.volume = 0.45;
    void audio.play().catch(() => {});
  } catch {
    // Ignore playback failures (autoplay policy, etc.).
  }
}

/**
 * Owns Web Audio context + repeating alert loop for posture reminders.
 * Instantiate once per app (e.g. `useRef(new AlertSoundSession()).current`).
 */
export class AlertSoundSession {
  private context: AudioContext | null = null;
  private repeatingInterval: ReturnType<typeof setInterval> | null = null;

  async unlock(): Promise<void> {
    const AudioContextClass = getAudioContextConstructor();
    if (!AudioContextClass) {
      return;
    }
    if (!this.context) {
      this.context = new AudioContextClass();
    }
    const ctx = this.context;
    await ctx.resume().catch(() => {});
    if (ctx.state !== "running") {
      return;
    }
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.00001;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.015);
  }

  resumeFromUserGesture(): void {
    void this.context?.resume().catch(() => {});
  }

  async playAlertSound(): Promise<void> {
    const AudioContextClass = getAudioContextConstructor();
    if (!AudioContextClass) {
      playHtmlAudioBeep();
      return;
    }

    if (!this.context) {
      this.context = new AudioContextClass();
    }

    const audioContext = this.context;
    await audioContext.resume().catch(() => {});

    if (audioContext.state !== "running") {
      playHtmlAudioBeep();
      return;
    }

    try {
      const tones = [
        { frequency: 880, offset: 0 },
        { frequency: 660, offset: 0.2 },
      ];

      for (const { frequency, offset } of tones) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = audioContext.currentTime + offset;
        const end = start + 0.14;

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(end);
      }
    } catch {
      playHtmlAudioBeep();
    }
  }

  stopRepeating(): void {
    if (this.repeatingInterval !== null) {
      clearInterval(this.repeatingInterval);
      this.repeatingInterval = null;
    }
  }

  startRepeating(): void {
    this.stopRepeating();
    void this.playAlertSound();
    this.repeatingInterval = setInterval(() => {
      void this.playAlertSound();
    }, 1200);
  }

  dispose(): void {
    this.stopRepeating();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }
}
