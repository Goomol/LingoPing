import {
  Card,
  CardRating,
  FSRSParameters,
  FSRSState,
  ReviewLog,
  FSRSItemResult,
} from './types.js';

/**
 * Standard default parameters for FSRS v4.5
 */
export const DEFAULT_FSRS_PARAMETERS: FSRSParameters = {
  request_retention: 0.9,
  maximum_interval: 36500,
  w: [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
    1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 0.22695, 0.5698,
    2.8544,
  ],
};

export const FACTOR = 19 / 81; // FSRS retention factor

export class FSRSEngine {
  private params: FSRSParameters;

  constructor(params?: Partial<FSRSParameters>) {
    this.params = {
      ...DEFAULT_FSRS_PARAMETERS,
      ...params,
      w: params?.w ?? DEFAULT_FSRS_PARAMETERS.w,
    };
  }

  /**
   * Calculates Retrievability R at elapsed days t given Stability S
   * R(t, S) = (1 + factor * t / S)^-1
   */
  public calculateRetrievability(elapsedDays: number, stability: number): number {
    if (stability <= 0) return 0;
    if (elapsedDays <= 0) return 1.0;
    return Math.pow(1 + (FACTOR * elapsedDays) / stability, -1);
  }

  /**
   * Calculates interval in days required to reach the target retention
   */
  public nextInterval(stability: number): number {
    const r = this.params.request_retention;
    const interval = (stability / FACTOR) * (Math.pow(r, -1) - 1);
    const clampedInterval = Math.min(
      Math.max(1, Math.round(interval)),
      this.params.maximum_interval
    );
    return clampedInterval;
  }

  /**
   * Initial Stability S0(G) for first review of a card
   */
  private initStability(rating: CardRating): number {
    const w = this.params.w;
    return Math.max(0.1, w[rating - 1]);
  }

  /**
   * Initial Difficulty D0(G) for first review
   * D0(G) = w[4] - e^(w[5] * (G - 1)) + 1
   */
  private initDifficulty(rating: CardRating): number {
    const w = this.params.w;
    const d = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
    return this.constrainDifficulty(d);
  }

  /**
   * Constrains difficulty to [1.0, 10.0]
   */
  private constrainDifficulty(d: number): number {
    return Math.min(10.0, Math.max(1.0, Number(d.toFixed(2))));
  }

  /**
   * Next difficulty D' given previous difficulty and rating
   */
  private nextDifficulty(currentD: number, rating: CardRating): number {
    const w = this.params.w;
    const deltaD = -w[6] * (rating - 3);
    const meanD = this.initDifficulty(3); // Mean reversion towards Good (3)
    const nextD = w[7] * meanD + (1 - w[7]) * (currentD + deltaD);
    return this.constrainDifficulty(nextD);
  }

  /**
   * Next stability upon successful recall (rating >= 2: Hard, Good, Easy)
   */
  private nextRecallStability(
    d: number,
    s: number,
    r: number,
    rating: CardRating
  ): number {
    const w = this.params.w;
    const hardPenalty = rating === 2 ? w[15] : 1.0;
    const easyBonus = rating === 4 ? w[16] : 1.0;

    const modifier =
      1 +
      Math.exp(w[8]) *
        (11 - d) *
        Math.pow(s, -w[9]) *
        (Math.exp(w[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus;

    return Math.max(0.1, Number((s * modifier).toFixed(2)));
  }

  /**
   * Next stability upon lapse / forget (rating 1: Again)
   */
  private nextForgetStability(d: number, s: number, r: number): number {
    const w = this.params.w;
    const sForget =
      w[11] *
      Math.pow(d, -w[12]) *
      (Math.pow(s + 1, w[13]) - 1) *
      Math.exp(w[14] * (1 - r));

    return Math.max(0.1, Number(sForget.toFixed(2)));
  }

  /**
   * Rates a card, updates its FSRS parameters and due date, and generates a ReviewLog.
   * Works for both Vocabulary and Single-Sided Grammar cards.
   */
  public schedule(
    card: Card,
    rating: CardRating,
    now: Date = new Date()
  ): FSRSItemResult {
    const nowIso = now.toISOString();
    const stateBefore = card.fsrs_state;
    let elapsedDays = 0;

    if (card.last_review) {
      const lastReviewDate = new Date(card.last_review);
      const diffMs = now.getTime() - lastReviewDate.getTime();
      elapsedDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
    }

    let newStability = card.stability;
    let newDifficulty = card.difficulty;
    let nextState: FSRSState = stateBefore;
    let newReps = card.reps + 1;
    let newLapses = card.lapses;

    if (stateBefore === 'New') {
      // First review
      newStability = this.initStability(rating);
      newDifficulty = this.initDifficulty(rating);
      nextState = rating === 1 ? 'Learning' : 'Review';
      if (rating === 1) newLapses += 1;
    } else {
      // Subsequent review
      const currentR = this.calculateRetrievability(elapsedDays, card.stability);
      newDifficulty = this.nextDifficulty(card.difficulty, rating);

      if (rating === 1) {
        // Lapse
        newStability = this.nextForgetStability(card.difficulty, card.stability, currentR);
        nextState = 'Relearning';
        newLapses += 1;
      } else {
        // Recall success
        newStability = this.nextRecallStability(
          card.difficulty,
          card.stability,
          currentR,
          rating
        );
        nextState = 'Review';
      }
    }

    const scheduledDays = this.nextInterval(newStability);
    const dueDate = new Date(now.getTime() + scheduledDays * 24 * 60 * 60 * 1000);

    const updatedCard: Card = {
      ...card,
      fsrs_state: nextState,
      stability: newStability,
      difficulty: newDifficulty,
      reps: newReps,
      lapses: newLapses,
      last_review: nowIso,
      due_date: dueDate.toISOString(),
      updated_at: nowIso,
    };

    const reviewLog: ReviewLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random()}`,
      card_id: card.id,
      user_id: card.user_id,
      card_type: card.card_type,
      rating,
      state_before: stateBefore,
      stability_after: newStability,
      difficulty_after: newDifficulty,
      elapsed_days: Number(elapsedDays.toFixed(2)),
      scheduled_days: scheduledDays,
      reviewed_at: nowIso,
    };

    return { card: updatedCard, reviewLog };
  }

  /**
   * Assembles an interleaved micro-session batch of N cards:
   * 1. Up to 1 due Grammar Card (if available & enabled)
   * 2. 60-70% due SRS Vocabulary cards (due_date <= now, sorted due_date ASC)
   * 3. Remaining slots filled with newly added unreviewed vocabulary (LIFO: created_at DESC)
   * 4. Zero due cards fallback: next available cards
   */
  public assembleSession(
    allCards: Card[],
    sessionSize: number = 5,
    includeGrammar: boolean = true,
    now: Date = new Date()
  ): Card[] {
    const selected: Card[] = [];
    const usedIds = new Set<string>();

    const nowDateStr = now.toISOString();

    // 1. Reserved Grammar Slot
    if (includeGrammar) {
      const grammarCards = allCards.filter(
        (c) => c.card_type === 'grammar_rule' && !usedIds.has(c.id)
      );

      // Prefer due grammar cards, else unreviewed ones
      const dueGrammar = grammarCards
        .filter((c) => c.due_date <= nowDateStr || c.fsrs_state === 'New')
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      if (dueGrammar.length > 0) {
        selected.push(dueGrammar[0]);
        usedIds.add(dueGrammar[0].id);
      }
    }

    const remainingQuota = sessionSize - selected.length;
    if (remainingQuota <= 0) return selected;

    const vocabCards = allCards.filter(
      (c) => c.card_type === 'vocabulary' && !usedIds.has(c.id)
    );

    // 2. Due SRS Vocabulary (target 60-70% of remaining slots)
    const dueVocab = vocabCards
      .filter((c) => c.fsrs_state !== 'New' && c.due_date <= nowDateStr)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    const dueQuota = Math.max(1, Math.round(remainingQuota * 0.65));
    const dueToTake = dueVocab.slice(0, dueQuota);

    for (const card of dueToTake) {
      selected.push(card);
      usedIds.add(card.id);
    }

    // 3. New Vocabulary (Recency bias: created_at DESC / LIFO)
    const newVocab = vocabCards
      .filter((c) => c.fsrs_state === 'New' && !usedIds.has(c.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    let spotsLeft = sessionSize - selected.length;
    const newToTake = newVocab.slice(0, spotsLeft);

    for (const card of newToTake) {
      selected.push(card);
      usedIds.add(card.id);
    }

    // 4. Fallback if session still not full (e.g. more due cards or next pending cards)
    spotsLeft = sessionSize - selected.length;
    if (spotsLeft > 0) {
      const additionalCards = allCards
        .filter((c) => !usedIds.has(c.id))
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, spotsLeft);

      for (const card of additionalCards) {
        selected.push(card);
        usedIds.add(card.id);
      }
    }

    return selected;
  }
}
