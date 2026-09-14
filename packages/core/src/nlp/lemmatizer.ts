import { GrammaticalGender } from '../types.js';

export interface TokenMetadata {
  raw: string;
  normalized: string;
  isCapitalized: boolean;
  possibleGender?: GrammaticalGender;
  article?: string;
}

// Common German suffixes indicative of gender
const FEMININE_SUFFIXES = [
  'ung',
  'heit',
  'keit',
  'schaft',
  'tion',
  'sion',
  'tät',
  'ik',
  'ei',
  'ie',
  'ur',
  'enz',
  'anz',
];

const NEUTER_SUFFIXES = [
  'chen',
  'lein',
  'ment',
  'um',
  'tum',
  'ma',
];

const MASCULINE_SUFFIXES = [
  'ling',
  'ismus',
  'ist',
  'ant',
  'or',
];

// Common stop words in German that shouldn't be added as vocab cards unless explicitly requested
export const GERMAN_STOP_WORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'und', 'in', 'zu', 'von', 'mit', 'auf', 'für', 'an', 'im', 'am', 'aus', 'um', 'über', 'unter',
  'vor', 'nach', 'bei', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mich', 'dich', 'ihn', 'uns',
  'euch', 'ist', 'sind', 'war', 'waren', 'haben', 'hat', 'hatte', 'hatten', 'werden', 'wird', 'wurde',
  'wurden', 'kann', 'können', 'muss', 'müssen', 'soll', 'sollen', 'will', 'wollen', 'nicht', 'auch',
  'noch', 'wie', 'so', 'dass', 'daß', 'aber', 'oder', 'wenn', 'als', 'schon', 'nur', 'sehr', 'hier',
  'da', 'dann', 'doch', 'ja', 'nein', 'mal', 'was', 'wer', 'wo', 'warum', 'wie'
]);

/**
 * Detects possible grammatical gender of a German noun based on morphological suffixes or articles
 */
export function inferGermanGender(word: string, precedingWord?: string): {
  gender: GrammaticalGender;
  article: string;
} {
  const lower = word.toLowerCase();

  // 1. Check preceding article if available
  if (precedingWord) {
    const prec = precedingWord.toLowerCase();
    if (prec === 'der') return { gender: 'masculine', article: 'der' };
    if (prec === 'die') return { gender: 'feminine', article: 'die' };
    if (prec === 'das') return { gender: 'neuter', article: 'das' };
  }

  // 2. Check morphological suffixes
  for (const suf of FEMININE_SUFFIXES) {
    if (lower.endsWith(suf)) return { gender: 'feminine', article: 'die' };
  }

  for (const suf of NEUTER_SUFFIXES) {
    if (lower.endsWith(suf)) return { gender: 'neuter', article: 'das' };
  }

  for (const suf of MASCULINE_SUFFIXES) {
    if (lower.endsWith(suf)) return { gender: 'masculine', article: 'der' };
  }

  // Default neutral if ambiguous
  return { gender: 'neutral', article: '' };
}

/**
 * Tokenizes a sentence into clean word tokens while preserving metadata
 */
export function tokenizeText(text: string, language: string = 'de'): TokenMetadata[] {
  if (!text) return [];

  // Match words including accented/umlaut characters
  const wordRegex = /[A-Za-zÄÖÜäöüßéèêàâôûîçñáíóú]+/g;
  const matches: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = wordRegex.exec(text)) !== null) {
    matches.push(m[0]);
  }

  const tokens: TokenMetadata[] = [];

  for (let i = 0; i < matches.length; i++) {
    const raw = matches[i];
    const isCapitalized = /^[A-ZÄÖÜ]/.test(raw);
    const normalized = isCapitalized && language === 'de' ? raw : raw.toLowerCase();

    const prev = i > 0 ? matches[i - 1] : undefined;
    let genderInfo: { gender: GrammaticalGender; article: string } | undefined;

    if (language === 'de' && isCapitalized) {
      genderInfo = inferGermanGender(raw, prev);
    }

    tokens.push({
      raw,
      normalized,
      isCapitalized,
      possibleGender: genderInfo?.gender,
      article: genderInfo?.article,
    });
  }

  return tokens;
}
