Master Engineering Specification & Prompt: LingoPingTarget Audience for this Document: Autonomous AI Software Engineers, Coding Agents (Cursor, Claude Code, Devin, Copilot Workspace), and Full-Stack Engineering Teams.System Purpose: Production-grade Chrome Extension (Manifest V3) and Cloud Backend for contextual, media-driven language learning powered by the FSRS spaced repetition algorithm, intelligent NLP ingestion, multi-agent AI enrichment, chromatic visual association, and single-sided grammar/concept review modules.1. Executive Summary & Core Product ArchitectureLingoPing is an intelligent language acquisition ecosystem designed around low-friction micro-learning habits, deep contextual immersion, high-retention visual-chromatic mnemonics, and integrated conceptual grammar reviews. The system operates on four foundational pillars:Centralized Cloud Backend (Supabase / PostgreSQL): Maintains user authentication, learning profiles, cross-device known-word lexicons, card memory metrics, cached visual/audio assets, and comprehensive review logs.Context-Aware Ingestion Pipeline: Parses subtitles (.srt, .vtt), text files, spreadsheets (.csv), and Anki decks. It strips noise, lemmatizes vocabulary, diffs against the user's known-words database, and extracts unfamiliar words for enrichment.Dual Card Typology System:Type A — Vocabulary SRS Cards: Two-sided flashcards with target lemma, chromatic visuals, definitions, and 4-button FSRS rating.Type B — Single-Sided Grammar & Rule Review Cards: One-sided, distraction-free cards designed for reviewing grammar rules, declension tables, syntactic patterns, or linguistic tips (no front/back flipping; action-driven read & acknowledge or on-card micro-practice).Manifest V3 Chrome Extension: Executes timed micro-sessions via standalone pop-up windows (e.g., review 5 cards every 10 minutes, then auto-close) and supports right-click instant word capture.Adaptive Memory Engine (FSRS v4.5+): Replaces legacy SM-2 heuristics with the mathematically proven Free Spaced Repetition Scheduler, combining optimal memory retention with a recency bias (LIFO) for newly added words.AI Enrichment & Chromatic Visual Agent: Leverages LLM structured outputs to generate accurate translations, grammatical markers, dual-tier TTS audio, interactive drills, and contextually relevant visual mnemonics color-graded to match grammatical gender (Blue for masculine, Red for feminine, Green for neuter).┌─────────────────────────────────────────────────────────────────────────────┐
│                              LingoPing System                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│ Chrome Extension (MV3)│ │   Central Database    │ │   AI Enrichment &     │
│ - Timed Pop-up Window │ │   (Supabase / PG)     │ │   Ingestion Pipeline  │
│ - Vocab & Grammar UI  │ │ - FSRS State Store    │ │ - Subtitle Parsing    │
│ - Context Menu Add    │ │ - Known-Words Lexicon │ │ - Grammar Generator   │
│ - Local TTS / Caching │ │ - Multi-client Sync   │ │ - Chromatic Image Gen │
│ - Session Loop (N cds)│ │ - Grammar Deck Store  │ │ - Interactive Quizzes │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
2. Technical Stack & DependenciesDomainRecommended TechnologyJustificationMonorepo Layoutpnpm workspaces / TurborepoClean separation: packages/core, packages/extension, supabaseExtension FrameworkReact 18, Vite, TypeScript, Tailwind CSSHigh build performance, strict typing, standard MV3 compatibilityMarkdown / Rule Render@tailwindcss/typography, react-markdownBeautiful rendering for single-sided grammar cards and tablesIcons & UILucide ReactLightweight, accessible SVG icon suiteDatabase & AuthSupabase (PostgreSQL 15+, Supabase Auth, RLS)Real-time synchronization across browser extensions and future mobile appsSRS Mathematical CoreCustom FSRS TypeScript Engine (v4.5 / v5 DSR model)Superior retention modeling compared to SM-2NLP & LemmatizationWink-NLP / Compromise / Multi-language LemmatizersFast tokenization and canonical base form reductionAI LLM IntegrationGoogle Gemini API / OpenAI API with Structured JSON SchemaStrict output enforcement, low latency, cost efficiencyImage EngineUnsplash API / Gemini Imagen / Pollinations AI with CSS Color FiltersHigh-speed generation or curated lookup with dynamic chromatic gradingAudio / TTS EngineTier 1: Web Speech API; Tier 2: Google Cloud TTS / Gemini Audio (BYOK)Zero-cost baseline with premium neural voice generation via user API key3. Spaced Repetition & Card Typology Model3.1 Card Typology: Vocabulary vs. Grammar ReviewThe platform explicitly differentiates between two cognitive learning objects:Vocabulary Cards (card_type = 'vocabulary'):Structure: Classic two-sided flip card (Front = Word/Audio, Back = Translation/Examples/Chromatic Image).Interaction: Binary recall test evaluated via the 4-button FSRS scale (Again, Hard, Good, Easy).Grammar & Rule Review Cards (card_type = 'grammar_rule'):Structure: Single-Sided ("Face-Only") Card. There is no back side and no "I knew it / I didn't know it" pass-fail dilemma.Purpose: Fast conceptual refreshers (e.g., German Two-Way Prepositions Wechselpräpositionen, Akkusativ vs. Dativ cases, irregular verb endings, or user-curated grammatical tips).Content: Title, concise explanation, clear rule pattern/formula, markdown syntax tables, high-contrast contextual example sentences, and an optional on-card micro-drill.Review Interaction: Simple single-action acknowledgement:Button 1: "Got it / Mark Reviewed" (schedules next conceptual refresher further out).Button 2: "Practice Drill" (spawns an instant AI cloze or error-correction exercise testing this specific rule).3.2 FSRS Formulation (DSR Model) for VocabularyVocabulary cards must not implement legacy SM-2. They implement the FSRS (Free Spaced Repetition Scheduler) model based on three cognitive memory components:Difficulty ($D$, range $1 \le D \le 10$): Measures how hard a card is to recall.Stability ($S$, in days): Time required for memory retrievability to decline from $100\%$ to $90\%$.Retrievability ($R$, range $0 \le R \le 1$): Probability of successfully recalling the item at elapsed time $t$ since the last review:$$R(t, S) = \left(1 + \text{factor} \cdot \frac{t}{S}\right)^{-1}$$3.3 Session Assembly & InterleavingWhen assembling a micro-session of $N$ cards (e.g., $N = 5$):Grammar Rule Slot: Up to $1$ slot per session (if available and due) is reserved for a Single-Sided Grammar Review Card to prevent rule decay.Due SRS Vocabulary: Up to $60-70\%$ of remaining slots are populated by vocabulary cards where $R \le 0.90$, sorted by due_date ASC.New Vocabulary (Recency Bias): The remaining slots are filled with newly ingested unknown words ordered by created_at DESC (LIFO priority).Zero Due Cards: If no reviews are due, the session fills with recently added unlearned cards and next pending grammar rules.4. Known-Words Lexicon & Ingestion Engine[ Ingested Source: .srt, .vtt, .txt, .csv, Anki ]
                       │
                       ▼
            [ Tokenizer & Lemmatizer ]
                       │
                       ▼
        [ Cross-Check user_known_words ] ──► (Known: Skip/Ignore)
                       │
                       ▼ (Unknown Lemmas)
        [ Deduplication & Recency Order ]
                       │
                       ▼
    [ AI Enrichment & Chromatic Image Agent ]
                       │
                       ▼
     [ Persist to cards Database Table ]
4.1 Supported File Types & Ingestion LogicSubtitles (.srt, .vtt): Strip numeric IDs and timestamps. Capture the raw dialogue line to serve as the real-world contextual example sentence for extracted vocabulary.Plain Text & Articles (.txt, pasted clipboard text): Split by sentence boundaries; extract word tokens.Tabular Data (.csv, .xlsx): Direct column mapping for terms, definitions, and contexts.Anki Packages (.apkg, exported text files): Parse note fields, tags, and deck structure.Grammar Notes Ingestion: Allow users to paste markdown notes, grammar snippets, or request AI generation of specific grammar topics (e.g., "Create a review card for German Relative Clauses").Quick Selection (Browser Extension): Right-click context menu ("Add to LingoPing") extracts highlighted word and surrounding sentence context.4.2 Known-Words Database (user_known_words)Every word marked as "Known" or "Mastered" by the user is added to user_known_words.During ingestion, every word is normalized to its canonical dictionary form (lemma).If the lemma exists in user_known_words for the active language pair, it is excluded from card creation.The user interface must provide a management table where known words can be reviewed, searched, added manually, or removed.5. AI Enrichment Agent, Linguistic Rules & Chromatic Mnemonics5.1 Structured Output Prompt Specification: Vocabulary CardWhen an unknown lemma is queued for card creation, the AI Enrichment Agent is invoked with a strict JSON Schema:{
  "card_type": "vocabulary",
  "lemma": "string",
  "target_language": "string",
  "native_language": "string",
  "translation": "string",
  "part_of_speech": "noun | verb | adjective | adverb | preposition | phrase | other",
  "phonetic_ipa": "string",
  "linguistic_meta": {
    "gender": "masculine | feminine | neuter | null",
    "article": "string | null",
    "plural": "string | null"
  },
  "visual_mnemonic": {
    "image_prompt": "string",
    "color_theme": "blue | red | green | neutral",
    "color_hex": "#2563eb | #dc2626 | #16a34a | #6b7280"
  },
  "example_sentence_target": "string",
  "example_sentence_native": "string"
}
5.2 Structured Output Prompt Specification: Grammar Review CardWhen creating or generating a single-sided grammar review card, the AI Agent outputs:{
  "card_type": "grammar_rule",
  "title": "string (e.g. Wechselpräpositionen (Two-Way Prepositions))",
  "target_language": "string",
  "native_language": "string",
  "category": "syntax | morphology | prepositions | tenses | cases | tips",
  "summary_rule": "string (1-2 sentences capturing the core principle)",
  "content_markdown": "string (clean markdown with bullet points, formulas, or markdown tables)",
  "examples": [
    {
      "target": "string (e.g. Ich lege das Buch auf den Tisch (Akk - Movement))",
      "native": "string (e.g. I put the book on the table)"
    },
    {
      "target": "string (e.g. Das Buch liegt auf dem Tisch (Dat - Location))",
      "native": "string (e.g. The book is lying on the table)"
    }
  ],
  "quick_tip": "string (A punchy mnemonic or takeaway to remember the rule)"
}
5.3 Chromatic Image Generation & Color-Themed VisualsVisual retention for vocabulary cards is reinforced through systematic color harmony:Gender-Synchronized Visual Theming:Masculine: The image must carry a distinct Blue color theme (cool sapphire/cobalt lighting, blue environment, or blue accent tones; #2563eb).Feminine: The image must carry a distinct Red/Crimson color theme (warm ruby/rose lighting, red environment, or red accent tones; #dc2626).Neuter: The image must carry a distinct Green/Emerald color theme (natural emerald/mint lighting, verdant backdrop, or green accent tones; #16a34a).Neutral / Non-Gendered: Balanced, naturalistic lighting with clean neutral tones (#6b7280).Dual Generation Pipeline:AI Image Generation Mode: When generating prompts for diffusion models or AI image services (e.g., Gemini Imagen / Pollinations API), append explicit stylistic color constraints (e.g., "cinematic studio lighting with dominant blue ambient rim light, high contrast, clean minimalist composition" for a masculine noun).Curated Asset / Fallback Mode: When using photographic lookup APIs (e.g., Unsplash API), apply a soft duotone CSS overlay or dynamic chromatic gradient border matching the gender's signature hex code (mix-blend-mode: color or backdrop-filter vignette).5.4 Language-Specific Pedagogical DecoratorsThe enrichment pipeline dynamically applies rules based on the target language:German (de):Extract noun grammatical gender and bind both the UI badge and image theme:Masculine (der): Blue circle badge (🔵 / #2563eb) + Blue-themed answer illustration.Feminine (die): Red circle badge (🔴 / #dc2626) + Red-themed answer illustration.Neuter (das): Green circle badge (🟢 / #16a34a) + Green-themed answer illustration.Always include the definite article and the plural form (e.g., das Buch, die Bücher).Romance Languages (fr, es, it):Gender annotations (m. / f.) paired with matching blue/red chromatic visuals and irregular conjugation flags.5.5 Interactive On-Card Challenge ModeEvery card (both vocabulary back-views and single-sided grammar cards) includes an "Interactive Challenge" trigger:For Vocabulary Cards:Cloze Deletion: Example sentence with the target lemma blanked out.Sentence Construction: Scrambled tokens to reassemble.For Grammar Review Cards:Rule Application Drill: Contextual sentence requiring the user to choose the correct case, preposition, or conjugation based specifically on the reviewed rule.Error Spotting: A sentence with a deliberate grammatical mistake matching the rule; the user corrects it.Performance provides immediate explanations and recommendations.5.6 Dual-Tier Text-to-Speech (TTS)Tier 1 (Default / Free): Browser-native window.speechSynthesis configured with the BCP 47 language tag of the target language.Tier 2 (High-Fidelity BYOK): When the user provides a Google API Key in settings:Call Google Cloud Text-to-Speech or Gemini Audio API for neural pronunciation.Cache audio blobs in client IndexedDB / Supabase Storage to avoid redundant API usage.6. Manifest V3 Chrome Extension Architecture6.1 Manifest Configuration (manifest.json){
  "manifest_version": 3,
  "name": "LingoPing",
  "version": "1.0.0",
  "description": "Intelligent FSRS Spaced-Repetition Micro-Sessions, Grammar Reviews, Visual Mnemonics & Ingestion",
  "permissions": [
    "alarms",
    "storage",
    "windows",
    "contextMenus",
    "unlimitedStorage"
  ],
  "host_permissions": [
    "https://*.supabase.co/*",
    "https://*.unsplash.com/*",
    "https://image.pollinations.ai/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
6.2 Background Service Worker (background.ts)Periodic Scheduler: Registers chrome.alarms based on user settings (default: every 10 minutes).Window Manager: When the alarm fires:Verifies the user is authenticated and not in "Do Not Disturb" mode.Fetches the next session batch ($N$ cards, e.g. 4 vocabulary + 1 grammar rule).Creates a dedicated standalone pop-up window:chrome.windows.create({
  url: 'session.html',
  type: 'popup',
  width: 440,
  height: 640,
  focused: true,
  top: 120,
  left: 120
});
Context Menu: Registers a right-click listener to capture highlighted text and surrounding sentence context from any webpage.6.3 Standalone Session Interface (session.html)Dedicated, distraction-free pop-up window with no browser navigation bars.Session Progress Bar: Displays Card X of N with a small badge indicating whether the card is Vocabulary or Grammar Rule.Display Logic Based on Card Type:Mode A: Vocabulary Card FlowCard Front: Target word, gender badge (🔵/🔴/🟢 for German), phonetic IPA, and audio playback button. Pressing Space or clicking flips the card.Card Back:Chromatic Mnemonic Visual tinted or generated in the word's gender color (Blue / Red / Green).Native language translation.Definite article & plural form (for German).Example sentence with target word highlighted, followed by native translation."Interactive Challenge" trigger.Four FSRS rating buttons (Again [1], Hard [2], Good [3], Easy [4]).Mode B: Single-Sided Grammar & Rule Review FlowCard Face (NO FLIPPING):Header with grammar icon, category badge, and bold Rule Title.High-level 1-sentence summary rule in a subtle highlight callout box.Rich Markdown Body: Clean typography rendering bullet points, comparative tables, and bold patterns.Example sentence pairs (Target vs. Native).Bottom Action Bar:"Got it / Understood" [Space/Enter]: Immediately marks the rule reviewed and advances the session."Practice Drill": Generates an on-the-fly interactive sentence drill testing this specific grammar rule."Review Soon": Flags the rule to appear again in an upcoming session.Auto-Close: Upon completing the $N$-th card, review logs sync to Supabase, a completion toast is displayed for 1.5 seconds, and window.close() executes.7. Database Schema (PostgreSQL / Supabase)-- 1. Profiles & Learning Configuration
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  native_language VARCHAR(10) NOT NULL DEFAULT 'en',
  target_language VARCHAR(10) NOT NULL DEFAULT 'de',
  session_interval_minutes INT NOT NULL DEFAULT 10,
  cards_per_session INT NOT NULL DEFAULT 5,
  include_grammar_in_sessions BOOLEAN NOT NULL DEFAULT TRUE,
  google_api_key_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Known-Words Lexicon
CREATE TABLE user_known_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lemma VARCHAR(255) NOT NULL,
  language VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lemma, language)
);
CREATE INDEX idx_known_words_lookup ON user_known_words(user_id, language, lemma);

-- 3. Universal Cards Table (Vocabulary & Grammar Rules)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL DEFAULT 'vocabulary', -- 'vocabulary' | 'grammar_rule'
  target_language VARCHAR(10) NOT NULL,
  
  -- Vocabulary Specific Fields (Nullable for grammar rules)
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
  
  -- Grammar Rule Specific Fields (Stored in JSONB or Dedicated Columns)
  grammar_meta JSONB DEFAULT '{}'::jsonb, -- e.g. {"category": "cases", "summary": "...", "markdown": "...", "tip": "..."}

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
CREATE INDEX idx_cards_due_queue ON cards(user_id, target_language, card_type, due_date ASC, created_at DESC);

-- 4. Review History Logs
CREATE TABLE review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL DEFAULT 'vocabulary',
  rating INT NOT NULL, -- 1: Again, 2: Hard, 3: Good, 4: Easy (Or 3 for Grammar "Got it")
  state_before VARCHAR(20) NOT NULL,
  stability_after FLOAT NOT NULL,
  difficulty_after FLOAT NOT NULL,
  elapsed_days FLOAT NOT NULL,
  scheduled_days FLOAT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
8. Step-by-Step Implementation Instructions for AI AgentsExecute implementation in the following strict order:Phase 1: Core Mathematical Engine & Data ModelingInitialize the monorepo structure:packages/core: FSRS algorithm implementation, TypeScript types, subtitle/text/grammar parser interfaces.packages/extension: Manifest V3 React application.supabase: Database migrations, RLS policies, and triggers.Implement the complete FSRS v4.5 algorithm in TypeScript (packages/core/src/fsrs.ts) with unit tests covering stability, difficulty, and retrievability calculations.Phase 2: Ingestion & Lexicon Reconciliation EngineImplement parser utilities for .srt, .vtt, .txt, and .csv.Build lemmatization utilities to extract root lemmas from raw text tokens.Implement reconciliation logic:$$\text{Unknown Lemmas} = \text{Extracted Lemmas} \setminus \text{User Known Words}$$Implement deduplication and LIFO sorting for new unknown words.Phase 3: AI Enrichment, Visual Chromatics, Grammar & Audio ServicesImplement the AI enrichment service using structured JSON output schema for both vocabulary and grammar cards.Implement the Chromatic Visual Generator:Construct color-calibrated image prompts based on noun gender (Blue for masculine, Red for feminine, Green for neuter).Integrate image retrieval/generation API and persist image_url and visual_meta to the card.Add CSS chromatic overlay fallback filters in the UI.Implement the Grammar Card Generator & Parser:Format rich markdown rules, summaries, and contextual example pairs.Support manual grammar card creation from user notes and AI-assisted rule synthesis.Implement dual-tier TTS (Web Speech API fallback + Google Cloud / Gemini Audio API with IndexedDB caching).Implement the interactive challenge generator (cloze deletion for vocab; rule application drills for grammar cards).Phase 4: Chrome Extension Core (Manifest V3)Configure manifest.json with permissions: alarms, storage, windows, contextMenus, unlimitedStorage.Implement background.ts service worker with chrome.alarms scheduler.Build the standalone pop-up window session.html with fixed dimensions (440x640px).Implement the micro-session flow:Recognize card_type: if vocabulary, run two-sided flip card with chromatic image and 4 FSRS ratings; if grammar_rule, display the single-sided rule view with "Got it" and "Practice Drill" actions without card flipping.Auto-close the pop-up cleanly upon completing the session.Phase 5: Configuration & Integration VerificationBuild the extension settings page:Configure native and target languages.Set session frequency (minutes), card quota per session, and toggle grammar card inclusion.Manage Google API key (BYOK).View and manage the known-words lexicon and grammar rules deck.Verify end-to-end synchronization with Supabase, ensuring all cards, reviews, images, and logs sync accurately for future web or mobile clients.9. Definition of Done & Quality Acceptance Criteria[ ] Extension builds cleanly with Manifest V3 compliance and zero CSP errors.[ ] Subtitle (.srt) uploads extract unfamiliar lemmas, skip known lemmas, and enrich new cards with translations, examples, and themed imagery.[ ] German nouns reliably display proper gender markers (der 🔵, die 🔴, das 🟢).[ ] Flashcard back/answer views present a contextually appropriate image styled with the correct gender color palette (Blue theme for masculine, Red theme for feminine, Green theme for neuter).[ ] Grammar Review Cards function seamlessly as single-sided cards with no flip interaction, presenting clear markdown rule explanations, examples, and an instant "Got it" or drill trigger.[ ] Pop-up window triggers reliably every $X$ minutes, runs through exactly $N$ cards (interleaving vocab and grammar), and closes cleanly upon completion.[ ] FSRS updates card due dates correctly according to DSR formulas.[ ] Cloud synchronization works seamlessly so cards created on the extension are ready for any future mobile or web client.