import {
  Card,
  Profile,
  ReviewLog,
  UserKnownWord,
} from '@lingoping/core';

const STORAGE_KEYS = {
  PROFILE: 'lingoping_profile',
  CARDS: 'lingoping_cards',
  KNOWN_WORDS: 'lingoping_known_words',
  REVIEW_LOGS: 'lingoping_review_logs',
  VISUAL_CACHE: 'lingoping_visual_cache',
  INITIALIZED: 'lingoping_initialized',
  CURRENT_USER_ID: 'lingoping_current_user_id',
};

const DEFAULT_PROFILE: Profile = {
  id: 'local-user-1',
  native_language: 'en',
  target_language: 'de',
  session_interval_minutes: 10,
  cards_per_session: 5,
  include_grammar_in_sessions: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SEED_CARDS: Card[] = [
  {
    id: 'seed-card-1',
    user_id: 'local-user-1',
    card_type: 'grammar_rule',
    target_language: 'de',
    front_text: 'Wechselpräpositionen (Two-Way Prepositions)',
    grammar_meta: {
      title: 'Wechselpräpositionen (Two-Way Prepositions)',
      category: 'prepositions',
      summary_rule:
        'Two-way prepositions take Akkusativ for movement towards a target (Wohin?), and Dativ for static location (Wo?).',
      content_markdown: `### The 9 Two-Way Prepositions
**an, auf, hinter, in, neben, über, unter, vor, zwischen**

| Case | Question | Meaning | Typical Verbs | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Akkusativ** | *Wohin?* | Motion / Action | *legen, stellen, setzen* | *Ich lege das Buch **auf den Tisch**.* |
| **Dativ** | *Wo?* | Static Position | *liegen, stehen, sitzen* | *Das Buch liegt **auf dem Tisch**.* |

> **Mnemonic Formula:**
> - **A**kkusativ = **A**ction & Arrival (Direction)
> - **D**ativ = **D**ead-still & Destination reached (Location)`,
      examples: [
        {
          target: 'Ich lege das Buch auf den Tisch. (Akkusativ - Wohin?)',
          native: 'I put the book on the table.',
        },
        {
          target: 'Das Buch liegt auf dem Tisch. (Dativ - Wo?)',
          native: 'The book is lying on the table.',
        },
      ],
      quick_tip: 'Legen/stellen/setzen require Akkusativ; liegen/stehen/sitzen require Dativ.',
    },
    fsrs_state: 'New',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
    due_date: new Date(Date.now() - 1000).toISOString(), // Due now
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seed-card-2',
    user_id: 'local-user-1',
    card_type: 'vocabulary',
    target_language: 'de',
    lemma: 'Tisch',
    front_text: 'Tisch',
    back_text: 'table',
    part_of_speech: 'noun',
    phonetic_ipa: '/tɪʃ/',
    linguistic_meta: {
      gender: 'masculine',
      article: 'der',
      plural: 'die Tische',
    },
    visual_meta: {
      theme_color: 'blue',
      hex: '#2563eb',
      image_prompt:
        'A sleek wooden dining table in a modern room with cinematic cobalt blue rim lighting',
    },
    image_url:
      'https://image.pollinations.ai/prompt/A%20sleek%20wooden%20dining%20table%20in%20a%20modern%20room%20with%20cinematic%20cobalt%20blue%20rim%20lighting%2C%204k%20digital%20art%20no%20text?width=400&height=260&nologo=true',
    example_target: 'Er stellt die Kaffeetasse auf den Tisch.',
    example_native: 'He places the coffee cup onto the table.',
    fsrs_state: 'New',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
    due_date: new Date(Date.now() - 1000).toISOString(),
    created_at: new Date(Date.now() - 50000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seed-card-3',
    user_id: 'local-user-1',
    card_type: 'vocabulary',
    target_language: 'de',
    lemma: 'Katze',
    front_text: 'Katze',
    back_text: 'cat',
    part_of_speech: 'noun',
    phonetic_ipa: '/ˈkat͡sə/',
    linguistic_meta: {
      gender: 'feminine',
      article: 'die',
      plural: 'die Katzen',
    },
    visual_meta: {
      theme_color: 'red',
      hex: '#dc2626',
      image_prompt:
        'A cute cat resting on a velvet cushion with warm ruby red ambient lighting',
    },
    image_url:
      'https://image.pollinations.ai/prompt/A%20cute%20cat%20resting%20on%20a%20velvet%20cushion%20with%20warm%20ruby%20red%20ambient%20lighting%2C%204k%20digital%20art%20no%20text?width=400&height=260&nologo=true',
    example_target: 'Die Katze schläft friedlich auf dem gemütlichen Sofa.',
    example_native: 'The cat is sleeping peacefully on the cozy sofa.',
    fsrs_state: 'New',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
    due_date: new Date(Date.now() - 1000).toISOString(),
    created_at: new Date(Date.now() - 40000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seed-card-4',
    user_id: 'local-user-1',
    card_type: 'vocabulary',
    target_language: 'de',
    lemma: 'Buch',
    front_text: 'Buch',
    back_text: 'book',
    part_of_speech: 'noun',
    phonetic_ipa: '/buːx/',
    linguistic_meta: {
      gender: 'neuter',
      article: 'das',
      plural: 'die Bücher',
    },
    visual_meta: {
      theme_color: 'green',
      hex: '#16a34a',
      image_prompt:
        'An open vintage book surrounded by glowing emerald green leaves and botanical lighting',
    },
    image_url:
      'https://image.pollinations.ai/prompt/An%20open%20vintage%20book%20surrounded%20by%20glowing%20emerald%20green%20leaves%20and%20botanical%20lighting%2C%204k%20digital%20art%20no%20text?width=400&height=260&nologo=true',
    example_target: 'Das Buch liegt aufgeschlagen auf dem Schreibtisch.',
    example_native: 'The book is lying open on the desk.',
    fsrs_state: 'New',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
    due_date: new Date(Date.now() - 1000).toISOString(),
    created_at: new Date(Date.now() - 30000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seed-card-5',
    user_id: 'local-user-1',
    card_type: 'vocabulary',
    target_language: 'de',
    lemma: 'Hund',
    front_text: 'Hund',
    back_text: 'dog',
    part_of_speech: 'noun',
    phonetic_ipa: '/hʊnt/',
    linguistic_meta: {
      gender: 'masculine',
      article: 'der',
      plural: 'die Hunde',
    },
    visual_meta: {
      theme_color: 'blue',
      hex: '#2563eb',
      image_prompt:
        'A loyal dog looking forward with sharp focus and cool sapphire blue atmospheric backlight',
    },
    image_url:
      'https://image.pollinations.ai/prompt/A%20loyal%20dog%20looking%20forward%20with%20sharp%20focus%20and%20cool%20sapphire%20blue%20atmospheric%20backlight%2C%204k%20digital%20art%20no%20text?width=400&height=260&nologo=true',
    example_target: 'Der treue Hund wartet geduldig vor der Tür.',
    example_native: 'The loyal dog is waiting patiently in front of the door.',
    fsrs_state: 'New',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
    due_date: new Date(Date.now() - 1000).toISOString(),
    created_at: new Date(Date.now() - 20000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'seed-card-6',
    user_id: 'local-user-1',
    card_type: 'vocabulary',
    target_language: 'de',
    lemma: 'Zeitung',
    front_text: 'Zeitung',
    back_text: 'newspaper',
    part_of_speech: 'noun',
    phonetic_ipa: '/ˈt͡saɪ̯tʊŋ/',
    linguistic_meta: {
      gender: 'feminine',
      article: 'die',
      plural: 'die Zeitungen',
    },
    visual_meta: {
      theme_color: 'red',
      hex: '#dc2626',
      image_prompt:
        'A freshly printed newspaper on a café table with warm crimson ambient highlights',
    },
    image_url:
      'https://image.pollinations.ai/prompt/A%20freshly%20printed%20newspaper%20on%20a%20caf%C3%A9%20table%20with%20warm%20crimson%20ambient%20highlights%2C%204k%20digital%20art%20no%20text?width=400&height=260&nologo=true',
    example_target: 'Sie liest morgens gerne die neueste Zeitung.',
    example_native: 'She likes reading the latest newspaper in the morning.',
    fsrs_state: 'New',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
    due_date: new Date(Date.now() - 1000).toISOString(),
    created_at: new Date(Date.now() - 10000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_KNOWN_WORDS: UserKnownWord[] = [
  {
    id: 'known-1',
    user_id: 'local-user-1',
    lemma: 'hallo',
    language: 'de',
    created_at: new Date().toISOString(),
  },
  {
    id: 'known-2',
    user_id: 'local-user-1',
    lemma: 'danke',
    language: 'de',
    created_at: new Date().toISOString(),
  },
  {
    id: 'known-3',
    user_id: 'local-user-1',
    lemma: 'bitte',
    language: 'de',
    created_at: new Date().toISOString(),
  },
];

/**
 * Robust Cross-Environment Storage Wrapper
 * Works seamlessly in Chrome Extension MV3 (chrome.storage.local)
 * and in standard browser dev environments (localStorage).
 */
export class StorageManager {
  private static memoryStore = new Map<string, any>();

  private static isChromeStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.storage &&
      !!chrome.storage.local
    );
  }

  private static async getRaw<T>(key: string): Promise<T | null> {
    if (this.isChromeStorageAvailable()) {
      const res = await chrome.storage.local.get(key);
      return (res[key] as T) || null;
    }

    if (
      typeof window !== 'undefined' &&
      window.localStorage &&
      typeof window.localStorage.getItem === 'function'
    ) {
      try {
        const item = window.localStorage.getItem(key);
        return item ? (JSON.parse(item) as T) : null;
      } catch {
        // Fallback to memoryStore
      }
    }

    return this.memoryStore.has(key) ? (this.memoryStore.get(key) as T) : null;
  }

  private static async setRaw<T>(key: string, value: T): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }

    if (
      typeof window !== 'undefined' &&
      window.localStorage &&
      typeof window.localStorage.setItem === 'function'
    ) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return;
      } catch {
        // Fallback to memoryStore
      }
    }

    this.memoryStore.set(key, value);
  }

  private static activeUserId: string | null = null;

  public static async getCurrentUserId(): Promise<string | null> {
    if (this.activeUserId) return this.activeUserId;
    const stored = await this.getRaw<string>(STORAGE_KEYS.CURRENT_USER_ID);
    this.activeUserId = stored || null;
    return this.activeUserId;
  }

  public static async setCurrentUserId(userId: string | null): Promise<void> {
    this.activeUserId = userId;
    if (userId) {
      await this.setRaw(STORAGE_KEYS.CURRENT_USER_ID, userId);
    } else {
      await this.setRaw(STORAGE_KEYS.CURRENT_USER_ID, null);
    }
  }

  public static async onUserLoggedOut(): Promise<void> {
    await this.setCurrentUserId(null);
  }

  public static async initSeedData(): Promise<void> {
    const initialized = await this.getRaw<boolean>(STORAGE_KEYS.INITIALIZED);
    if (!initialized) {
      await this.setRaw(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
      await this.setRaw(STORAGE_KEYS.CARDS, SEED_CARDS);
      await this.setRaw(STORAGE_KEYS.KNOWN_WORDS, SEED_KNOWN_WORDS);
      await this.setRaw(STORAGE_KEYS.REVIEW_LOGS, []);
      await this.setRaw(STORAGE_KEYS.INITIALIZED, true);
    }
  }

  public static async initStarterDeckForUser(userId: string): Promise<Card[]> {
    const userCards: Card[] = SEED_CARDS.map((card, idx) => ({
      ...card,
      id: `seed_${userId.slice(0, 8)}_${idx + 1}`,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      due_date: new Date().toISOString(),
    }));

    await this.saveCards(userCards);
    return userCards;
  }

  public static async getProfile(): Promise<Profile> {
    await this.initSeedData();
    const profile = await this.getRaw<Profile>(STORAGE_KEYS.PROFILE);
    const userId = await this.getCurrentUserId();
    if (userId && profile) {
      return { ...profile, id: userId };
    }
    return profile || DEFAULT_PROFILE;
  }

  public static async saveProfile(profile: Partial<Profile>): Promise<Profile> {
    const current = await this.getProfile();
    const userId = (await this.getCurrentUserId()) || current.id;
    const updated: Profile = {
      ...current,
      ...profile,
      id: userId,
      updated_at: new Date().toISOString(),
    };
    await this.setRaw(STORAGE_KEYS.PROFILE, updated);
    return updated;
  }

  private static getUserCardsKey(userId: string | null): string {
    return userId ? `${STORAGE_KEYS.CARDS}_${userId}` : STORAGE_KEYS.CARDS;
  }

  public static async getCards(): Promise<Card[]> {
    await this.initSeedData();
    const userId = await this.getCurrentUserId();
    if (userId) {
      const userCardsKey = this.getUserCardsKey(userId);
      const userCards = await this.getRaw<Card[]>(userCardsKey);
      if (userCards && userCards.length > 0) {
        return userCards;
      }
      // Fallback to cards matching userId in main store
      const allCards = (await this.getRaw<Card[]>(STORAGE_KEYS.CARDS)) || [];
      const filtered = allCards.filter((c) => c.user_id === userId);
      if (filtered.length > 0) {
        await this.setRaw(userCardsKey, filtered);
        return filtered;
      }
      return [];
    }
    const cards = await this.getRaw<Card[]>(STORAGE_KEYS.CARDS);
    return cards || [];
  }

  public static async saveCards(cards: Card[]): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (userId) {
      const userCardsKey = this.getUserCardsKey(userId);
      await this.setRaw(userCardsKey, cards);
    }
    await this.setRaw(STORAGE_KEYS.CARDS, cards);
  }

  public static async getCachedVisual(
    lemma: string,
    language: string = 'de'
  ): Promise<{ imageUrl: string; visualMeta: any } | null> {
    const cache =
      (await this.getRaw<Record<string, { imageUrl: string; visualMeta: any }>>(
        STORAGE_KEYS.VISUAL_CACHE
      )) || {};
    const key = `${language}_${lemma.toLowerCase().trim()}`;
    return cache[key] || null;
  }

  public static async saveCachedVisual(
    lemma: string,
    language: string = 'de',
    imageUrl: string,
    visualMeta: any
  ): Promise<void> {
    const cache =
      (await this.getRaw<Record<string, { imageUrl: string; visualMeta: any }>>(
        STORAGE_KEYS.VISUAL_CACHE
      )) || {};
    const key = `${language}_${lemma.toLowerCase().trim()}`;
    cache[key] = { imageUrl, visualMeta };
    await this.setRaw(STORAGE_KEYS.VISUAL_CACHE, cache);
  }

  public static async addCard(card: Card): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (userId && !card.user_id) {
      card.user_id = userId;
    }
    const cards = await this.getCards();
    cards.unshift(card);
    await this.saveCards(cards);

    // Auto-cache visual image if present
    if (card.lemma && card.image_url && card.visual_meta) {
      await this.saveCachedVisual(
        card.lemma,
        card.target_language || 'de',
        card.image_url,
        card.visual_meta
      );
    }
  }

  public static async updateCard(card: Card): Promise<void> {
    const cards = await this.getCards();
    const idx = cards.findIndex((c) => c.id === card.id);
    if (idx !== -1) {
      cards[idx] = card;
    } else {
      cards.unshift(card);
    }
    await this.saveCards(cards);
  }

  public static async deleteCard(cardId: string): Promise<void> {
    const cards = await this.getCards();
    const filtered = cards.filter((c) => c.id !== cardId);
    await this.saveCards(filtered);
  }

  public static async getKnownWords(): Promise<UserKnownWord[]> {
    await this.initSeedData();
    const userId = await this.getCurrentUserId();
    const words = (await this.getRaw<UserKnownWord[]>(STORAGE_KEYS.KNOWN_WORDS)) || [];
    if (userId) {
      return words.filter((w) => w.user_id === userId);
    }
    return words;
  }

  public static async addKnownWord(lemma: string, language: string = 'de'): Promise<void> {
    const userId = (await this.getCurrentUserId()) || 'local-user-1';
    const words = (await this.getRaw<UserKnownWord[]>(STORAGE_KEYS.KNOWN_WORDS)) || [];
    const lower = lemma.toLowerCase().trim();
    if (!words.some((w) => w.user_id === userId && w.lemma.toLowerCase() === lower)) {
      words.unshift({
        id: `kw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        lemma,
        language,
        created_at: new Date().toISOString(),
      });
      await this.setRaw(STORAGE_KEYS.KNOWN_WORDS, words);
    }
  }

  public static async removeKnownWord(id: string): Promise<void> {
    const words = (await this.getRaw<UserKnownWord[]>(STORAGE_KEYS.KNOWN_WORDS)) || [];
    const filtered = words.filter((w) => w.id !== id);
    await this.setRaw(STORAGE_KEYS.KNOWN_WORDS, filtered);
  }

  public static async logReview(log: ReviewLog): Promise<void> {
    const userId = (await this.getCurrentUserId()) || 'local-user-1';
    log.user_id = userId;
    const logs = (await this.getRaw<ReviewLog[]>(STORAGE_KEYS.REVIEW_LOGS)) || [];
    logs.unshift(log);
    await this.setRaw(STORAGE_KEYS.REVIEW_LOGS, logs);
  }

  public static async getReviewLogs(): Promise<ReviewLog[]> {
    const userId = await this.getCurrentUserId();
    const logs = (await this.getRaw<ReviewLog[]>(STORAGE_KEYS.REVIEW_LOGS)) || [];
    if (userId) {
      return logs.filter((l) => l.user_id === userId);
    }
    return logs;
  }

  public static async getStats(): Promise<{
    totalCards: number;
    dueCards: number;
    knownWordsCount: number;
    reviewsToday: number;
  }> {
    const cards = await this.getCards();
    const known = await this.getKnownWords();
    const logs = await this.getReviewLogs();

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);

    const dueCards = cards.filter(
      (c) => c.due_date <= nowIso || c.fsrs_state === 'New'
    ).length;

    const reviewsToday = logs.filter((l) =>
      l.reviewed_at.startsWith(todayStr)
    ).length;

    return {
      totalCards: cards.length,
      dueCards,
      knownWordsCount: known.length,
      reviewsToday,
    };
  }
}
