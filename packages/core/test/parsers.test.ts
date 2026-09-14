import { describe, it, expect } from 'vitest';
import { parseSubtitles } from '../src/parsers/subtitles.js';
import { parseTabularData } from '../src/parsers/text.js';
import { inferGermanGender, tokenizeText } from '../src/nlp/lemmatizer.js';
import { reconcileLemmas } from '../src/nlp/reconciliation.js';

describe('Subtitle & Text Parsers', () => {
  const sampleSrt = `
1
00:00:01,200 --> 00:00:04,500
Hallo, wie geht es dir?

2
00:00:05,000 --> 00:00:08,100
<i>Ich gehe heute in die Bibliothek.</i>
Das Buch ist sehr spannend.
`;

  it('parses SRT subtitles and strips timestamps and HTML tags', () => {
    const result = parseSubtitles(sampleSrt);
    expect(result.cues.length).toBe(2);
    expect(result.cues[0].text).toBe('Hallo, wie geht es dir?');
    expect(result.cues[1].text).toContain('Ich gehe heute in die Bibliothek.');
    expect(result.cues[1].text).not.toContain('<i>');
    expect(result.cues[1].text).not.toContain('</i>');
    expect(result.sentences.length).toBeGreaterThanOrEqual(2);
  });

  it('parses CSV tabular data properly with header mapping', () => {
    const sampleCsv = `Term,Translation,Context
Apfel,Apple,Der Apfel ist rot.
Katze,Cat,Die Katze schläft auf dem Sofa.`;

    const entries = parseTabularData(sampleCsv);
    expect(entries.length).toBe(2);
    expect(entries[0].term).toBe('Apfel');
    expect(entries[0].translation).toBe('Apple');
    expect(entries[0].contextSentence).toBe('Der Apfel ist rot.');
  });
});

describe('NLP Lemmatizer & German Gender Detection', () => {
  it('detects German noun gender by suffixes and articles', () => {
    expect(inferGermanGender('Freiheit').gender).toBe('feminine');
    expect(inferGermanGender('Zeitung').gender).toBe('feminine');
    expect(inferGermanGender('Mädchen').gender).toBe('neuter');
    expect(inferGermanGender('Optimismus').gender).toBe('masculine');

    // Context article check
    expect(inferGermanGender('Tisch', 'der').gender).toBe('masculine');
    expect(inferGermanGender('Tür', 'die').gender).toBe('feminine');
    expect(inferGermanGender('Fenster', 'das').gender).toBe('neuter');
  });

  it('tokenizes text and retains noun capitalization for German', () => {
    const tokens = tokenizeText('Der Hund bellt laut im Garten.', 'de');
    const nouns = tokens.filter((t) => t.isCapitalized);
    expect(nouns.some((n) => n.normalized === 'Hund')).toBe(true);
    expect(nouns.some((n) => n.normalized === 'Garten')).toBe(true);
  });
});

describe('Lexicon Reconciliation Engine', () => {
  it('extracts unfamiliar lemmas and subtracts known words', () => {
    const sentences = [
      'Der Hund bellt laut im Garten.',
      'Die Katze schläft friedlich.',
      'Der Hund rennt schnell.',
    ];

    // Suppose user already knows 'Katze'
    const knownWords = ['Katze'];

    const result = reconcileLemmas(sentences, {
      language: 'de',
      excludeStopWords: true,
      knownWords,
    });

    const unknownLemmaNames = result.unknownLemmas.map((l) => l.lemma.toLowerCase());

    // 'hund' should be unknown
    expect(unknownLemmaNames).toContain('hund');
    // 'katze' was known, so it MUST NOT be in unknownLemmas
    expect(unknownLemmaNames).not.toContain('katze');

    // Frequency of 'Hund' should be 2
    const hundEntry = result.unknownLemmas.find((l) => l.lemma === 'Hund');
    expect(hundEntry?.frequency).toBe(2);
    expect(hundEntry?.contextSentence).toBeTruthy();
  });
});
