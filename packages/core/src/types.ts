/**
 * LingoPing Core Universal Type Definitions
 * Covers FSRS spaced repetition, card typology, NLP ingestion, and AI enrichment schemas.
 */

export type CardType = 'vocabulary' | 'grammar_rule';

export type FSRSState = 'New' | 'Learning' | 'Review' | 'Relearning';

export type CardRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export type GrammaticalGender = 'masculine' | 'feminine' | 'neuter' | 'neutral';

export type ColorTheme = 'blue' | 'red' | 'green' | 'neutral';

export interface LinguisticMeta {
  gender?: GrammaticalGender | null;
  article?: string | null;
  plural?: string | null;
  part_of_speech?: string;
  phonetic_ipa?: string;
}

export interface VisualMeta {
  theme_color: ColorTheme;
  hex: string;
  image_prompt?: string;
}

export interface GrammarExample {
  target: string;
  native: string;
}

export interface GrammarMeta {
  title: string;
  category: 'syntax' | 'morphology' | 'prepositions' | 'tenses' | 'cases' | 'tips' | string;
  summary_rule: string;
  content_markdown: string;
  examples: GrammarExample[];
  quick_tip: string;
}

export interface Card {
  id: string;
  user_id: string;
  card_type: CardType;
  target_language: string;

  // Common and Vocabulary-specific fields
  lemma?: string;
  front_text: string; // Lemma for vocab, Rule Title for grammar
  back_text?: string; // Translation for vocab, null for single-sided grammar cards
  part_of_speech?: string;
  phonetic_ipa?: string;
  linguistic_meta?: LinguisticMeta;
  visual_meta?: VisualMeta;
  image_url?: string;
  example_target?: string;
  example_native?: string;
  audio_url?: string;

  // Grammar-specific fields
  grammar_meta?: GrammarMeta;

  // FSRS & Scheduling parameters
  fsrs_state: FSRSState;
  stability: number; // in days
  difficulty: number; // 1.0 to 10.0
  reps: number;
  lapses: number;
  last_review: string | null; // ISO timestamp
  due_date: string; // ISO timestamp

  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface ReviewLog {
  id: string;
  card_id: string;
  user_id: string;
  card_type: CardType;
  rating: CardRating;
  state_before: FSRSState;
  stability_after: number;
  difficulty_after: number;
  elapsed_days: number;
  scheduled_days: number;
  reviewed_at: string;
}

export interface Profile {
  id: string;
  native_language: string;
  target_language: string;
  session_interval_minutes: number;
  cards_per_session: number;
  include_grammar_in_sessions: boolean;
  google_api_key?: string;
  openai_api_key?: string;
  anthropic_api_key?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_publishable_key?: string;
  created_at: string;
  updated_at: string;
}

export interface UserKnownWord {
  id: string;
  user_id: string;
  lemma: string;
  language: string;
  created_at: string;
}

export interface FSRSParameters {
  request_retention: number; // default 0.90
  maximum_interval: number; // default 36500 days
  w: number[]; // 17 weights for FSRS v4.5
}

export interface FSRSItemResult {
  card: Card;
  reviewLog: ReviewLog;
}

export interface ExtractedLemma {
  lemma: string;
  rawForms: string[];
  frequency: number;
  contextSentence: string;
  partOfSpeech?: string;
}

export interface IngestionResult {
  totalTokens: number;
  uniqueLemmasCount: number;
  knownLemmasCount: number;
  unknownLemmas: ExtractedLemma[];
  ignoredLemmas: string[];
}

export type DrillType = 'cloze' | 'sentence_scramble' | 'rule_drill' | 'error_spotting';

export interface InteractiveDrill {
  id: string;
  cardId?: string;
  drillType: DrillType;
  title: string;
  prompt: string;
  context: string;
  clozeParts?: {
    before: string;
    blank: string;
    after: string;
  };
  scrambleWords?: string[];
  options?: string[];
  correctAnswer: string;
  explanation: string;
}
