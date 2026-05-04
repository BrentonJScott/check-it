import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

export type LiquidFillProps = {
  /** Fill height as percentage of the outer container (0–100). */
  fill?: number;
  /** Base liquid colour (hex). */
  color?: string;
  /** Scales wave amplitude. */
  waveIntensity?: number;
  /** Global animation speed multiplier. */
  speed?: number;
  /** When true, horizontal pointer position adds tilt / extra slosh. */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
};

type Rgb = { r: number; g: number; b: number };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): Rgb | null {
  const m = hex
    .trim()
    .match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) {
    return null;
  }
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function parseColor(color: string): Rgb {
  const fromHex = hexToRgb(color);
  if (fromHex) {
    return fromHex;
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    return { r: +m[1], g: +m[2], b: +m[3] };
  }
  return { r: 56, g: 189, b: 248 };
}

type WaveLayer = {
  /** Peak amplitude in CSS pixels (not scaled by fill height). */
  ampPx: number;
  /** Spatial frequency (rad / px). */
  k: number;
  /** Angular drift (rad / s). */
  omega: number;
  phase: number;
  opacity: number;
  /** Stroke highlight on top edge (front layer only). */
  highlight?: boolean;
};

const WAVE_LAYERS: WaveLayer[] = [
  {
    ampPx: 10,
    k: 0.014,
    omega: 0.95,
    phase: 0.3,
    opacity: 0.22,
  },
  {
    ampPx: 6.5,
    k: 0.021,
    omega: 1.47,
    phase: 2.17,
    opacity: 0.42,
  },
  {
    ampPx: 4.5,
    k: 0.031,
    omega: 2.03,
    phase: 4.31,
    opacity: 0.88,
    highlight: true,
  },
];

/**
 * Realistic liquid fill with layered sine waves on a canvas surface,
 * anchored to the bottom of the container.
 */
export function LiquidFill({
  fill = 60,
  color = "#38bdf8",
  waveIntensity = 1,
  speed = 1,
  interactive = false,
  className = "",
  style,
}: LiquidFillProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fillTargetRef = useRef(clamp(fill, 0, 100));
  const waveFillTargetRef = useRef(Math.max(0, fill));
  const displayFillRef = useRef(clamp(fill, 0, 100));
  const mouseXRef = useRef(0);
  const rafRef = useRef<number>(0);
  const timeOriginRef = useRef(0);

  useLayoutEffect(() => {
    fillTargetRef.current = clamp(fill, 0, 100);
    waveFillTargetRef.current = Math.max(0, fill);
  }, [fill]);

  const applyBodyHeight = useCallback(() => {
    const el = bodyRef.current;
    if (!el) {
      return;
    }
    el.style.height = `${displayFillRef.current}%`;
  }, []);

  useLayoutEffect(() => {
    applyBodyHeight();
  }, [applyBodyHeight]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const body = bodyRef.current;
    if (!canvas || !body) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(body.clientWidth * dpr));
    const h = Math.max(1, Math.floor(body.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.style.width = `${body.clientWidth}px`;
    canvas.style.height = `${body.clientHeight}px`;
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }
    const ro = new ResizeObserver(() => {
      resizeCanvas();
    });
    ro.observe(body);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    const node = bodyRef.current;
    if (!(node && interactive)) {
      return;
    }
    const surface: HTMLDivElement = node;
    function onMove(e: PointerEvent) {
      const r = surface.getBoundingClientRect();
      const nx = r.width > 0 ? (e.clientX - r.left) / r.width - 0.5 : 0;
      mouseXRef.current = clamp(nx * 2, -1, 1);
    }
    function onLeave() {
      mouseXRef.current = 0;
    }
    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerleave", onLeave);
    surface.addEventListener("pointercancel", onLeave);
    return () => {
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerleave", onLeave);
      surface.removeEventListener("pointercancel", onLeave);
    };
  }, [interactive]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) {
      return;
    }
    const ctx = el.getContext("2d");
    if (!ctx) {
      return;
    }

    const surface = el;
    const draw = ctx;

    const rgb = parseColor(color);
    let last = performance.now();
    timeOriginRef.current = last;

    function waveY(
      x: number,
      t: number,
      layer: WaveLayer,
      h: number,
      tilt: number,
      fillLevel: number,
    ): number {
      const amp = layer.ampPx * waveIntensity;
      const fillForFull = Math.max(fillLevel, fillTargetRef.current, waveFillTargetRef.current);
      const full = fillForFull >= 99.5;
      /** Fixed mean height; motion is only horizontal (phase in x / t). */
      const crestMargin = full
        ? 3
        : Math.min(26, Math.max(amp + 12, h * 0.34));
      const base = crestMargin - amp;
      const phase =
        layer.k * x +
        layer.omega * speed * t +
        layer.phase +
        tilt * 0.85;
      return base + amp * Math.sin(phase);
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const target = fillTargetRef.current;
      const disp = displayFillRef.current;
      displayFillRef.current += (target - disp) * Math.min(1, 10 * dt);
      if (Math.abs(target - displayFillRef.current) < 0.04) {
        displayFillRef.current = target;
      }
      applyBodyHeight();

      const body = bodyRef.current;
      if (!body || body.clientHeight < 2) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      resizeCanvas();
      const dpr = surface.width / Math.max(1, body.clientWidth);
      const w = surface.width / dpr;
      const h = surface.height / dpr;
      const t = (now - timeOriginRef.current) / 1000;
      const fillLevel = displayFillRef.current;

      draw.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw.clearRect(0, 0, w, h);

      const tilt = interactive ? mouseXRef.current : 0;

      const step = Math.max(2, Math.floor(w / 120));

      for (let li = 0; li < WAVE_LAYERS.length; li++) {
        const layer = WAVE_LAYERS[li];
        draw.beginPath();
        draw.moveTo(0, h);
        for (let x = 0; x <= w + step; x += step) {
          const yRaw = waveY(x, t, layer, h, tilt, fillLevel);
          const y = Math.max(0, yRaw);
          draw.lineTo(x, y);
        }
        draw.lineTo(w, h);
        draw.closePath();
        draw.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${layer.opacity})`;
        draw.fill();

        if (layer.highlight) {
          draw.beginPath();
          for (let x = 0; x <= w + step; x += step) {
            const yRaw = waveY(x, t, layer, h, tilt, fillLevel);
            const y = Math.max(0, yRaw);
            if (x === 0) {
              draw.moveTo(x, y);
            } else {
              draw.lineTo(x, y);
            }
          }
          draw.strokeStyle = "rgba(255,255,255,0.32)";
          draw.lineWidth = 1.25;
          draw.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    applyBodyHeight,
    color,
    interactive,
    resizeCanvas,
    speed,
    waveIntensity,
  ]);

  const rootClass = ["liquid-fill", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass} style={style} aria-hidden={true}>
      <div
        ref={bodyRef}
        className="liquid-fill__body"
        data-interactive={interactive ? "true" : undefined}>
        <canvas ref={canvasRef} className="liquid-fill__canvas" />
      </div>
    </div>
  );
}
