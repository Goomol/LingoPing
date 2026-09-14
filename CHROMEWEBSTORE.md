# Chrome Web Store Listing: LingoPing

**Extension Name**: LingoPing  
**Summary**: Contextual Spaced-Repetition Micro-Sessions, Visual Mnemonics & Single-Sided Grammar Reviews  
**Version**: 1.0.0  
**Manifest Version**: 3  
**Category**: Education / Productivity  

---

## 1. Store Description

### Short Description (Max 132 chars)
Master vocabulary and grammar with automated FSRS spaced repetition micro-sessions, visual mnemonics, and subtitle ingestion.

### Detailed Description
LingoPing is an intelligent language acquisition companion designed for high retention and low-friction learning habits. Instead of long, exhausting study marathons, LingoPing prompts you with quick 2-minute micro-sessions throughout the day right inside your browser.

**Core Highlights**:
- **Adaptive FSRS Memory Engine**: Powered by the proven Free Spaced Repetition Scheduler (v4.5 DSR model), calculating optimal review intervals based on difficulty, stability, and retrievability.
- **Dual Card Typology**:
  - *Vocabulary SRS Cards*: Two-sided flashcards featuring grammatical gender color-coding (Blue for masculine, Red for feminine, Green for neuter), phonetic IPA, audio pronunciation, and interactive cloze deletion drills.
  - *Single-Sided Grammar & Rule Cards*: Distraction-free conceptual refreshers for complex patterns like German Two-Way Prepositions (*Wechselpräpositionen*) and case declensions. No flip needed—read the rule and acknowledge or launch an interactive drill.
- **Context-Aware Subtitle & Media Ingestion**: Paste or upload subtitles (.srt, .vtt) or text excerpts from shows you watch. LingoPing filters out words you already know, extracts unfamiliar terms in their real-world sentence context, and enriches them into learning cards.
- **Right-Click Word Capture**: Highlight any word on any webpage, right-click, and instantly add it to your learning deck.
- **Visual Chromatic Mnemonics**: Associates colors with grammatical gender to build instant cognitive recall.
- **Zero-Distraction Standalone Window**: Timed micro-sessions appear in an unobtrusive, standalone popup and automatically close upon completion.

---

## 2. Permissions Justifications

| Permission | Justification |
| :--- | :--- |
| `alarms` | Used to schedule periodic micro-session reminders at user-defined intervals (e.g., every 10 minutes). |
| `storage` | Stores user learning preferences, active SRS cards, review logs, and the known-words lexicon locally. |
| `windows` | Creates dedicated standalone, distraction-free micro-session review windows with custom dimensions (440x640). |
| `contextMenus` | Adds an "Add to LingoPing" right-click menu item allowing learners to capture words and sentence contexts while browsing. |
| `unlimitedStorage` | Prevents quota exhaustion when storing cached offline deck data, review histories, and vocabulary lexicons. |

---

## 3. Host Permissions Justifications

| Host Pattern | Justification |
| :--- | :--- |
| `https://*.supabase.co/*` | Enables optional cloud synchronization of learning cards, known-words database, and review logs to Supabase PostgreSQL. |
| `https://*.unsplash.com/*` | Fetches illustrative photographs for vocabulary mnemonics. |
| `https://image.pollinations.ai/*` | Generates chromatic, gender-tinted mnemonic visual illustrations for new vocabulary cards with zero user API key needed. |
| `https://generativelanguage.googleapis.com/*` | Enables optional BYOK Google Gemini API calls for neural text-to-speech audio and linguistic enrichment. |

---

## 4. Privacy & Data Disclosures

- **Data Collection**: No personal information, browsing history, or user identity is tracked or transmitted to third-party ad networks.
- **Local Storage**: All learning progress, cards, and known words are stored locally on your device via `chrome.storage.local`.
- **Optional Cloud Sync**: Cloud synchronization only occurs if the user explicitly configures their own Supabase database credentials.
- **Third-Party AI Services**: Pollinations AI and Gemini API requests only transmit the isolated word and sentence context needed to generate definitions and mnemonic artwork.

---

## 5. Version History

- **v1.0.0 (Initial Release)**:
  - FSRS v4.5 spaced repetition scheduler with DSR retrievability calculations.
  - Vocabulary cards with gender-synchronized chromatic visual mnemonics.
  - Single-sided grammar and rule review cards with markdown tables.
  - Media ingestion studio supporting `.srt`, `.vtt`, `.txt`, `.csv`.
  - Right-click context menu word capture.
  - Standalone timed 440x640 micro-session window with auto-close.
  - Ant Design 5 unified UI.
