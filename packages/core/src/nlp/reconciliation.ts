import { ExtractedLemma, IngestionResult, UserKnownWord } from '../types.js';
import { GERMAN_STOP_WORDS, tokenizeText } from './lemmatizer.js';

export interface ReconciliationOptions {
  language?: string;
  excludeStopWords?: boolean;
  minFrequency?: number;
  knownWords?: Set<string> | UserKnownWord[] | string[];
}

/**
 * Reconciles extracted lemmas against the user's known words database:
 * Unknown Lemmas = Extracted Lemmas \ User Known Words
 */
export function reconcileLemmas(
  sentences: string[],
  options: ReconciliationOptions = {}
): IngestionResult {
  const language = options.language ?? 'de';
  const excludeStopWords = options.excludeStopWords ?? true;
  const minFrequency = options.minFrequency ?? 1;

  // Build known words set (lowercased canonical check)
  const knownSet = new Set<string>();
  if (options.knownWords) {
    if (Array.isArray(options.knownWords)) {
      for (const item of options.knownWords) {
        if (typeof item === 'string') {
          knownSet.add(item.toLowerCase());
        } else if (item && typeof item === 'object' && 'lemma' in item) {
          knownSet.add(item.lemma.toLowerCase());
        }
      }
    } else if (options.knownWords instanceof Set) {
      for (const item of options.knownWords) {
        knownSet.add(item.toLowerCase());
      }
    }
  }

  const lemmaMap = new Map<
    string,
    {
      lemma: string;
      rawForms: Set<string>;
      frequency: number;
      bestSentence: string;
    }
  >();

  let totalTokens = 0;
  const ignoredLemmas: string[] = [];

  for (const sentence of sentences) {
    const tokens = tokenizeText(sentence, language);
    totalTokens += tokens.length;

    for (const token of tokens) {
      const canonicalKey = token.normalized;
      const lower = canonicalKey.toLowerCase();

      // Check stop words
      if (excludeStopWords && language === 'de' && GERMAN_STOP_WORDS.has(lower)) {
        ignoredLemmas.push(token.raw);
        continue;
      }

      // Check single character noise
      if (token.raw.length <= 1) {
        continue;
      }

      // Check if user already knows this word
      if (knownSet.has(lower)) {
        continue;
      }

      let entry = lemmaMap.get(canonicalKey);
      if (!entry) {
        entry = {
          lemma: canonicalKey,
          rawForms: new Set<string>(),
          frequency: 0,
          bestSentence: sentence,
        };
        lemmaMap.set(canonicalKey, entry);
      }

      entry.rawForms.add(token.raw);
      entry.frequency += 1;

      // Keep the most representative sentence (prefer medium-length sentence with proper punctuation)
      if (
        sentence.length >= 20 &&
        sentence.length <= 120 &&
        (entry.bestSentence.length < 20 || entry.bestSentence.length > 120)
      ) {
        entry.bestSentence = sentence;
      }
    }
  }

  const unknownLemmas: ExtractedLemma[] = [];

  for (const entry of lemmaMap.values()) {
    if (entry.frequency >= minFrequency) {
      unknownLemmas.push({
        lemma: entry.lemma,
        rawForms: Array.from(entry.rawForms),
        frequency: entry.frequency,
        contextSentence: entry.bestSentence,
      });
    }
  }

  // Sort by frequency DESC, then alphabetical
  unknownLemmas.sort((a, b) => b.frequency - a.frequency || a.lemma.localeCompare(b.lemma));

  return {
    totalTokens,
    uniqueLemmasCount: lemmaMap.size,
    knownLemmasCount: knownSet.size,
    unknownLemmas,
    ignoredLemmas,
  };
}
