import { ColorTheme, GrammaticalGender, VisualMeta } from '../types.js';

export const GENDER_COLOR_MAP: Record<
  GrammaticalGender,
  { theme: ColorTheme; hex: string; name: string; badge: string }
> = {
  masculine: {
    theme: 'blue',
    hex: '#2563eb', // Cobalt Blue
    name: 'Sapphire Blue',
    badge: '🔵 der',
  },
  feminine: {
    theme: 'red',
    hex: '#dc2626', // Crimson Red
    name: 'Ruby Red',
    badge: '🔴 die',
  },
  neuter: {
    theme: 'green',
    hex: '#16a34a', // Emerald Green
    name: 'Emerald Green',
    badge: '🟢 das',
  },
  neutral: {
    theme: 'neutral',
    hex: '#6b7280', // Slate Gray
    name: 'Neutral Slate',
    badge: '⚪',
  },
};

/**
 * Builds chromatic visual metadata and color-constrained AI diffusion prompts
 */
export function buildVisualMnemonic(
  lemma: string,
  translation: string,
  gender: GrammaticalGender = 'neutral'
): VisualMeta {
  const colorInfo = GENDER_COLOR_MAP[gender] || GENDER_COLOR_MAP.neutral;

  let colorDescription = '';
  switch (colorInfo.theme) {
    case 'blue':
      colorDescription =
        'cinematic studio lighting with dominant cool blue ambient rim light, sapphire and cobalt accents, clean high-contrast composition';
      break;
    case 'red':
      colorDescription =
        'warm ruby and rose lighting, vibrant crimson environment accents, clean high-contrast composition';
      break;
    case 'green':
      colorDescription =
        'natural emerald and mint lighting, verdant organic backdrop, green accent tones, clean high-contrast composition';
      break;
    default:
      colorDescription =
        'balanced naturalistic daylight, clean minimalist composition, neutral modern styling';
      break;
  }

  const prompt = `A clear, high quality iconic illustration of ${translation} (${lemma}), ${colorDescription}, 4k, digital art, sharp focus, vibrant, clean background, no text, no typography, no letters.`;

  return {
    theme_color: colorInfo.theme,
    hex: colorInfo.hex,
    image_prompt: prompt,
  };
}

/**
 * Generates a direct URL for instant zero-key AI image generation via Pollinations AI
 */
export function getPollinationsImageUrl(
  prompt: string,
  width: number = 400,
  height: number = 260
): string {
  const seed = Math.floor(Math.random() * 100000);
  const cleanPrompt = encodeURIComponent(prompt.slice(0, 300));
  return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
}

/**
 * Returns CSS styles for dynamic chromatic overlay and gradient borders
 */
export function getChromaticStyles(theme: ColorTheme, hex: string) {
  return {
    borderColor: hex,
    badgeBg: hex,
    glowStyle: `0 0 16px ${hex}33`,
    gradientOverlay: `linear-gradient(180deg, transparent 60%, ${hex}22 100%)`,
    duotoneFilter: `drop-shadow(0 4px 12px ${hex}40)`,
  };
}
