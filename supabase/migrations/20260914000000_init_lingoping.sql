-- ============================================================================
-- LingoPing: Supabase Database Migration & Schema
-- Tables: profiles, user_known_words, cards, review_logs
-- Includes Indexes, Row Level Security (RLS) policies, and seed data.
-- ============================================================================

-- 1. Profiles & Learning Configuration
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  native_language VARCHAR(10) NOT NULL DEFAULT 'en',
  target_language VARCHAR(10) NOT NULL DEFAULT 'de',
  session_interval_minutes INT NOT NULL DEFAULT 10,
  cards_per_session INT NOT NULL DEFAULT 5,
  include_grammar_in_sessions BOOLEAN NOT NULL DEFAULT TRUE,
  google_api_key_encrypted TEXT,
  openai_api_key_encrypted TEXT,
  anthropic_api_key_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Known-Words Lexicon
CREATE TABLE IF NOT EXISTS user_known_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lemma VARCHAR(255) NOT NULL,
  language VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lemma, language)
);

CREATE INDEX IF NOT EXISTS idx_known_words_lookup ON user_known_words(user_id, language, lemma);

-- 3. Universal Cards Table (Vocabulary & Grammar Rules)
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL DEFAULT 'vocabulary', -- 'vocabulary' | 'grammar_rule'
  target_language VARCHAR(10) NOT NULL,
  
  -- Vocabulary Specific Fields
  lemma VARCHAR(255),
  front_text TEXT NOT NULL,       -- Lemma for vocab, Rule Title for grammar
  back_text TEXT,                -- Translation for vocab (NULL for single-sided grammar cards)
  part_of_speech VARCHAR(50),
  linguistic_meta JSONB DEFAULT '{}'::jsonb, -- e.g. {"gender": "masculine", "article": "der", "plural": "Bücher"}
  visual_meta JSONB DEFAULT '{}'::jsonb,     -- e.g. {"theme_color": "blue", "hex": "#2563eb", "prompt": "..."}
  image_url TEXT,
  example_target TEXT,
  example_native TEXT,
  audio_url TEXT,
  
  -- Grammar Rule Specific Fields
  grammar_meta JSONB DEFAULT '{}'::jsonb, -- e.g. {"category": "prepositions", "summary": "...", "markdown": "...", "tip": "..."}

  -- FSRS & Scheduling State Parameters
  fsrs_state VARCHAR(20) NOT NULL DEFAULT 'New', -- 'New', 'Learning', 'Review', 'Relearning'
  stability FLOAT NOT NULL DEFAULT 0.0,
  difficulty FLOAT NOT NULL DEFAULT 0.0,
  reps INT NOT NULL DEFAULT 0,
  lapses INT NOT NULL DEFAULT 0,
  last_review TIMESTAMPTZ,
  due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_due_queue ON cards(user_id, target_language, card_type, due_date ASC, created_at DESC);

-- 4. Review History Logs
CREATE TABLE IF NOT EXISTS review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL DEFAULT 'vocabulary',
  rating INT NOT NULL, -- 1: Again, 2: Hard, 3: Good, 4: Easy
  state_before VARCHAR(20) NOT NULL,
  stability_after FLOAT NOT NULL,
  difficulty_after FLOAT NOT NULL,
  elapsed_days FLOAT NOT NULL,
  scheduled_days FLOAT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Centralized Word Visual Cache (Cross-user image deduplication)
CREATE TABLE IF NOT EXISTS word_visual_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lemma VARCHAR(255) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'de',
  image_url TEXT NOT NULL,
  visual_meta JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lemma, language)
);

CREATE INDEX IF NOT EXISTS idx_word_visual_cache_lookup ON word_visual_cache(language, lemma);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_known_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can select and update their own profile
CREATE POLICY "Users can manage their own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id);

-- User Known Words: users can manage their own known words
CREATE POLICY "Users can manage their own known words"
  ON user_known_words FOR ALL
  USING (auth.uid() = user_id);

-- Cards: users can manage their own cards
CREATE POLICY "Users can manage their own cards"
  ON cards FOR ALL
  USING (auth.uid() = user_id);

-- Review Logs: users can manage their own review logs
CREATE POLICY "Users can manage their own review logs"
  ON review_logs FOR ALL
  USING (auth.uid() = user_id);

-- Word Visual Cache: Anyone can read, authenticated users can insert
ALTER TABLE word_visual_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on word visual cache"
  ON word_visual_cache FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert to word visual cache"
  ON word_visual_cache FOR INSERT
  WITH CHECK (true);

-- Automatically create profile on new user signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, native_language, target_language)
  VALUES (NEW.id, 'en', 'de');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
