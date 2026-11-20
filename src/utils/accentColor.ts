/**
 * Local-first accent colour system.
 *
 * The accent drives every interactive surface in the UI and the celebration
 * confetti. It is stored in localStorage so the choice survives restarts and
 * APK upgrades. Everything is computed locally — no network, no accounts.
 */

export const DEFAULT_ACCENT = '#a855f7';
export const ACCENT_STORAGE_KEY = 'midnightledger_accent_color';

export interface PresetColor {
  name: string;
  hex: string;
}

/** A small, curated set of colours that all read well on the near-black UI. */
export const PRESET_COLORS: PresetColor[] = [
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Gold', hex: '#c8a24b' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Orange', hex: '#f97316' },
];

interface RGB {
  r: number;
  g: number;
  b: number;
}

function toRGB(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function channelToHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

/** Accepts #RGB, RGB, #RRGGBB or RRGGBB and returns a normalised #rrggbb. */
export function normalizeHex(input: string): string | null {
  if (typeof input !== 'string') return null;
  let h = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return `#${h.toLowerCase()}`;
}

export function isValidHex(input: string): boolean {
  return normalizeHex(input) !== null;
}

function mix(hex: string, target: string, amount: number): string {
  const a = toRGB(hex);
  const b = toRGB(target);
  const t = Math.max(0, Math.min(1, amount));
  return `#${channelToHex(a.r + (b.r - a.r) * t)}${channelToHex(
    a.g + (b.g - a.g) * t,
  )}${channelToHex(a.b + (b.b - a.b) * t)}`;
}

export function lighten(hex: string, amount = 0.16): string {
  return mix(hex, '#ffffff', amount);
}

export function darken(hex: string, amount = 0.16): string {
  return mix(hex, '#000000', amount);
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = toRGB(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Chooses readable text colour for content placed on the accent. */
export function getContrastText(hex: string): string {
  const DARK_TEXT = '#0B0B0D';
  const LIGHT_TEXT = '#FFFFFF';

  // WCAG sRGB relative luminance.
  const relativeLuminance = (color: string): number => {
    const { r, g, b } = toRGB(color);
    const linearize = (value: number): number => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  };

  const contrastRatio = (a: number, b: number): number => {
    const lighter = Math.max(a, b);
    const darker = Math.min(a, b);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const backgroundLuminance = relativeLuminance(hex);
  const darkContrast = contrastRatio(backgroundLuminance, relativeLuminance(DARK_TEXT));
  const lightContrast = contrastRatio(backgroundLuminance, relativeLuminance(LIGHT_TEXT));
  return darkContrast >= lightContrast ? DARK_TEXT : LIGHT_TEXT;
}

export function getAccentColor(): string {
  try {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
    const normalized = saved ? normalizeHex(saved) : null;
    return normalized || DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

/**
 * Applies the colour to the live document and persists it.
 * Call once at startup (before render) and again whenever the user changes it.
 */
export function applyAccentColor(input: string): string | null {
  const hex = normalizeHex(input);
  if (!hex) return null;

  const root = document.documentElement;
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-hover', lighten(hex, 0.16));
  root.style.setProperty('--accent-press', darken(hex, 0.16));
  root.style.setProperty('--accent-soft', withAlpha(hex, 0.14));
  root.style.setProperty('--accent-ring', withAlpha(hex, 0.45));
  root.style.setProperty('--on-accent', getContrastText(hex));

  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, hex);
  } catch {
    /* storage may be unavailable — the colour still applies for this session */
  }

  return hex;
}

/** Confetti colours are plain hex — canvas fillStyle cannot resolve CSS vars. */
export function getConfettiColors(): string[] {
  const hex = getAccentColor();
  return [
    hex,
    lighten(hex, 0.28),
    lighten(hex, 0.48),
    darken(hex, 0.12),
    '#ececf0',
  ];
}
