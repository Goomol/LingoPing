import { describe, it, expect } from 'vitest';
import { FSRSEngine } from '../src/fsrs.js';
import { Card } from '../src/types.js';

describe('FSRS v4.5 Algorithm Implementation', () => {
  const engine = new FSRSEngine();

  const createDummyCard = (overrides: Partial<Card> = {}): Card => ({
    id: 'test-card-1',
    user_id: 'user-123',
    card_type: 'vocabulary',
    target_language: 'de',
    lemma: 'Hund',
    front_text: 'Hund',
    back_text: 'dog',
    fsrs_state: 'New',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
    due_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  it('calculates retrievability correctly over elapsed time', () => {
    const stability = 10; // 10 days
    // At t = 0, R should be 1.0 (100%)
    expect(engine.calculateRetrievability(0, stability)).toBe(1.0);

    // At t = 10, R should decrease according to formula
    const rAt10 = engine.calculateRetrievability(10, stability);
    expect(rAt10).toBeLessThan(1.0);
    expect(rAt10).toBeGreaterThan(0.7);

    // As t increases further, R should monotonically decline towards 0
    const rAt30 = engine.calculateRetrievability(30, stability);
    expect(rAt30).toBeLessThan(rAt10);
    expect(rAt30).toBeGreaterThan(0);
  });

  it('initializes stability and difficulty properly on first review', () => {
    const card = createDummyCard();
    const resultGood = engine.schedule(card, 3); // Good

    expect(resultGood.card.fsrs_state).toBe('Review');
    expect(resultGood.card.reps).toBe(1);
    expect(resultGood.card.lapses).toBe(0);
    expect(resultGood.card.stability).toBeGreaterThan(0);
    expect(resultGood.card.difficulty).toBeGreaterThanOrEqual(1.0);
    expect(resultGood.card.difficulty).toBeLessThanOrEqual(10.0);
    expect(resultGood.card.last_review).not.toBeNull();
    expect(new Date(resultGood.card.due_date).getTime()).toBeGreaterThan(
      new Date().getTime()
    );
  });

  it('handles lapse (rating 1: Again) correctly', () => {
    const card = createDummyCard({
      fsrs_state: 'Review',
      stability: 14.5,
      difficulty: 4.2,
      reps: 4,
      lapses: 0,
      last_review: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const result = engine.schedule(card, 1); // Again

    expect(result.card.fsrs_state).toBe('Relearning');
    expect(result.card.lapses).toBe(1);
    expect(result.card.stability).toBeLessThan(card.stability);
    expect(result.reviewLog.rating).toBe(1);
  });

  it('grows stability on consecutive successful reviews', () => {
    let currentCard = createDummyCard();
    let currentDate = new Date('2026-01-01T12:00:00Z');

    // First review: Good (3)
    let res = engine.schedule(currentCard, 3, currentDate);
    currentCard = res.card;
    const initialStability = currentCard.stability;
    expect(initialStability).toBeGreaterThan(0);

    // Advance time to due date and review Good again
    currentDate = new Date(currentCard.due_date);
    res = engine.schedule(currentCard, 3, currentDate);
    currentCard = res.card;

    expect(currentCard.stability).toBeGreaterThan(initialStability);
    expect(currentCard.reps).toBe(2);
  });

  it('keeps difficulty bounded between 1.0 and 10.0', () => {
    let hardCard = createDummyCard({ difficulty: 9.8, fsrs_state: 'Review', stability: 2 });
    for (let i = 0; i < 5; i++) {
      const res = engine.schedule(hardCard, 1);
      hardCard = res.card;
      expect(hardCard.difficulty).toBeLessThanOrEqual(10.0);
      expect(hardCard.difficulty).toBeGreaterThanOrEqual(1.0);
    }

    let easyCard = createDummyCard({ difficulty: 1.2, fsrs_state: 'Review', stability: 10 });
    for (let i = 0; i < 5; i++) {
      const res = engine.schedule(easyCard, 4);
      easyCard = res.card;
      expect(easyCard.difficulty).toBeLessThanOrEqual(10.0);
      expect(easyCard.difficulty).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('assembles session interleaving grammar and LIFO new words', () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();

    const cards: Card[] = [
      createDummyCard({
        id: 'grammar-1',
        card_type: 'grammar_rule',
        front_text: 'Wechselpräpositionen',
        due_date: pastDate,
      }),
      createDummyCard({
        id: 'vocab-due-1',
        card_type: 'vocabulary',
        fsrs_state: 'Review',
        front_text: 'Buch',
        due_date: pastDate,
      }),
      createDummyCard({
        id: 'vocab-due-2',
        card_type: 'vocabulary',
        fsrs_state: 'Review',
        front_text: 'Tisch',
        due_date: pastDate,
      }),
      createDummyCard({
        id: 'vocab-new-old',
        card_type: 'vocabulary',
        fsrs_state: 'New',
        front_text: 'Stuhl',
        created_at: new Date('2026-01-01').toISOString(),
      }),
      createDummyCard({
        id: 'vocab-new-recent',
        card_type: 'vocabulary',
        fsrs_state: 'New',
        front_text: 'Fenster',
        created_at: new Date('2026-02-01').toISOString(),
      }),
      createDummyCard({
        id: 'vocab-future',
        card_type: 'vocabulary',
        fsrs_state: 'Review',
        front_text: 'Lampe',
        due_date: futureDate,
      }),
    ];

    const session = engine.assembleSession(cards, 4, true);

    expect(session.length).toBe(4);
    // Should include 1 grammar card
    expect(session.some((c) => c.card_type === 'grammar_rule')).toBe(true);
    // Due cards should be included
    expect(session.some((c) => c.id === 'vocab-due-1')).toBe(true);
    // Recent new card (Fenster) should have LIFO priority over older new card
    expect(session.some((c) => c.id === 'vocab-new-recent')).toBe(true);
  });
});
