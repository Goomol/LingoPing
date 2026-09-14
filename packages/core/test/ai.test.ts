import { describe, it, expect } from 'vitest';
import { buildVisualMnemonic, GENDER_COLOR_MAP } from '../src/ai/chromatics.js';
import { enrichVocabularyOffline, createCardFromEnrichment } from '../src/ai/enrichment.js';
import { generateInteractiveDrill } from '../src/ai/drills.js';

describe('AI Chromatic Engine & Visual Mnemonics', () => {
  it('assigns sapphire blue to masculine German nouns', () => {
    const mnemonic = buildVisualMnemonic('Tisch', 'table', 'masculine');
    expect(mnemonic.theme_color).toBe('blue');
    expect(mnemonic.hex).toBe(GENDER_COLOR_MAP.masculine.hex);
    expect(mnemonic.image_prompt).toContain('blue');
  });

  it('assigns crimson red to feminine German nouns', () => {
    const mnemonic = buildVisualMnemonic('Katze', 'cat', 'feminine');
    expect(mnemonic.theme_color).toBe('red');
    expect(mnemonic.hex).toBe(GENDER_COLOR_MAP.feminine.hex);
    expect(mnemonic.image_prompt).toContain('ruby');
  });

  it('assigns emerald green to neuter German nouns', () => {
    const mnemonic = buildVisualMnemonic('Buch', 'book', 'neuter');
    expect(mnemonic.theme_color).toBe('green');
    expect(mnemonic.hex).toBe(GENDER_COLOR_MAP.neuter.hex);
    expect(mnemonic.image_prompt).toContain('emerald');
  });
});

describe('Offline Enrichment & Card Creation', () => {
  it('enriches common German words with correct articles and forms', () => {
    const enriched = enrichVocabularyOffline('Buch');
    expect(enriched.translation).toBe('book');
    expect(enriched.linguistic_meta.article).toBe('das');
    expect(enriched.linguistic_meta.gender).toBe('neuter');
    expect(enriched.visual_mnemonic.color_theme).toBe('green');

    const card = createCardFromEnrichment(enriched, 'test-user');
    expect(card.front_text).toBe('Buch');
    expect(card.back_text).toBe('book');
    expect(card.image_url).toContain('pollinations.ai');
    expect(card.fsrs_state).toBe('New');
  });
});

describe('Interactive Drills Generator', () => {
  it('generates a smart educational drill for vocabulary card with options and explanation', () => {
    const enriched = enrichVocabularyOffline('Hund');
    const card = createCardFromEnrichment(enriched, 'test-user');
    const drill = generateInteractiveDrill(card);

    expect(['cloze', 'rule_drill']).toContain(drill.drillType);
    expect(drill.options?.length).toBeGreaterThanOrEqual(3);
    expect(drill.correctAnswer).toBeTruthy();
    expect(drill.options).toContain(drill.correctAnswer);
    expect(drill.explanation).toBeTruthy();
  });

  it('generates a case or rule application drill for grammar card', () => {
    const enriched = enrichVocabularyOffline('Buch');
    const card = createCardFromEnrichment({
      card_type: 'grammar_rule',
      title: 'Wechselpräpositionen',
      target_language: 'de',
      native_language: 'en',
      category: 'prepositions',
      summary_rule: 'Two-way prepositions take Akkusativ for movement and Dativ for position.',
      content_markdown: '### Prepositions',
      examples: [{ target: 'Ich lege das Buch auf den Tisch.', native: 'I put the book on the table.' }],
      quick_tip: 'Wohin = Akkusativ, Wo = Dativ',
    }, 'test-user');

    const drill = generateInteractiveDrill(card);
    expect(drill.drillType).toBe('rule_drill');
    expect(drill.options?.length).toBeGreaterThanOrEqual(3);
    expect(drill.correctAnswer).toBeTruthy();
    expect(drill.explanation).toBeTruthy();
  });
});
