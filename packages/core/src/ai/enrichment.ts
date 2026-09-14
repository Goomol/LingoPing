import {
  Card,
  GrammarMeta,
  GrammaticalGender,
  LinguisticMeta,
  VisualMeta,
} from '../types.js';
import { inferGermanGender } from '../nlp/lemmatizer.js';
import { buildVisualMnemonic, getPollinationsImageUrl } from './chromatics.js';

export interface VocabularyEnrichmentPayload {
  card_type: 'vocabulary';
  lemma: string;
  target_language: string;
  native_language: string;
  translation: string;
  part_of_speech: string;
  phonetic_ipa: string;
  linguistic_meta: {
    gender: GrammaticalGender | null;
    article: string | null;
    plural: string | null;
  };
  visual_mnemonic: {
    image_prompt: string;
    color_theme: 'blue' | 'red' | 'green' | 'neutral';
    color_hex: string;
  };
  example_sentence_target: string;
  example_sentence_native: string;
}

export interface GrammarEnrichmentPayload {
  card_type: 'grammar_rule';
  title: string;
  target_language: string;
  native_language: string;
  category: string;
  summary_rule: string;
  content_markdown: string;
  examples: Array<{ target: string; native: string }>;
  quick_tip: string;
}

// Built-in starter lexicon for offline / instant enrichment of common German vocabulary
const OFFLINE_GERMAN_LEXICON: Record<
  string,
  {
    translation: string;
    gender: GrammaticalGender;
    article: string;
    plural: string;
    pos: string;
    ipa: string;
    exampleDe: string;
    exampleEn: string;
  }
> = {
  Buch: {
    translation: 'book',
    gender: 'neuter',
    article: 'das',
    plural: 'die Bücher',
    pos: 'noun',
    ipa: '/buːx/',
    exampleDe: 'Das Buch liegt auf dem Schreibtisch.',
    exampleEn: 'The book is lying on the desk.',
  },
  Tisch: {
    translation: 'table',
    gender: 'masculine',
    article: 'der',
    plural: 'die Tische',
    pos: 'noun',
    ipa: '/tɪʃ/',
    exampleDe: 'Er stellt die Tasse auf den Tisch.',
    exampleEn: 'He places the cup on the table.',
  },
  Katze: {
    translation: 'cat',
    gender: 'feminine',
    article: 'die',
    plural: 'die Katzen',
    pos: 'noun',
    ipa: '/ˈkat͡sə/',
    exampleDe: 'Die Katze schläft auf dem gemütlichen Sofa.',
    exampleEn: 'The cat is sleeping on the comfortable sofa.',
  },
  Hund: {
    translation: 'dog',
    gender: 'masculine',
    article: 'der',
    plural: 'die Hunde',
    pos: 'noun',
    ipa: '/hʊnt/',
    exampleDe: 'Der treue Hund wartet an der Tür.',
    exampleEn: 'The loyal dog is waiting at the door.',
  },
  Apfel: {
    translation: 'apple',
    gender: 'masculine',
    article: 'der',
    plural: 'die Äpfel',
    pos: 'noun',
    ipa: '/ˈapfl̩/',
    exampleDe: 'Ein roter Apfel liegt im Korb.',
    exampleEn: 'A red apple is lying in the basket.',
  },
  Zeitung: {
    translation: 'newspaper',
    gender: 'feminine',
    article: 'die',
    plural: 'die Zeitungen',
    pos: 'noun',
    ipa: '/ˈt͡saɪ̯tʊŋ/',
    exampleDe: 'Sie liest morgens die aktuelle Zeitung.',
    exampleEn: 'She reads the latest newspaper in the morning.',
  },
  Fenster: {
    translation: 'window',
    gender: 'neuter',
    article: 'das',
    plural: 'die Fenster',
    pos: 'noun',
    ipa: '/ˈfɛnstɐ/',
    exampleDe: 'Bitte öffne das Fenster für frische Luft.',
    exampleEn: 'Please open the window for fresh air.',
  },
  Mädchen: {
    translation: 'girl',
    gender: 'neuter',
    article: 'das',
    plural: 'die Mädchen',
    pos: 'noun',
    ipa: '/ˈmɛːtçən/',
    exampleDe: 'Das Mädchen spielt im grünen Park.',
    exampleEn: 'The girl is playing in the green park.',
  },
  Freiheit: {
    translation: 'freedom',
    gender: 'feminine',
    article: 'die',
    plural: 'die Freiheiten',
    pos: 'noun',
    ipa: '/ˈfʁaɪ̯haɪ̯t/',
    exampleDe: 'Die Freiheit ist ein kostbares Gut.',
    exampleEn: 'Freedom is a precious good.',
  },
  Bahnhof: {
    translation: 'train station',
    gender: 'masculine',
    article: 'der',
    plural: 'die Bahnhöfe',
    pos: 'noun',
    ipa: '/ˈbaːnˌhoːf/',
    exampleDe: 'Wir treffen uns direkt am Hauptbahnhof.',
    exampleEn: 'We will meet directly at the central train station.',
  },
};

/**
 * Offline heuristic enrichment for when no LLM API key is supplied
 */
export function enrichVocabularyOffline(
  lemma: string,
  targetLang: string = 'de',
  nativeLang: string = 'en',
  contextSentence?: string
): VocabularyEnrichmentPayload {
  const canonical = lemma.trim();
  const knownData = OFFLINE_GERMAN_LEXICON[canonical];

  let gender: GrammaticalGender = 'neutral';
  let article: string | null = null;
  let plural: string | null = null;
  let translation = canonical;
  let pos = 'noun';
  let ipa = `/${canonical.toLowerCase()}/`;
  let exTarget = contextSentence || `Hier ist ein Beispielsatz mit ${canonical}.`;
  let exNative = `Here is an example sentence with ${canonical}.`;

  if (knownData) {
    gender = knownData.gender;
    article = knownData.article;
    plural = knownData.plural;
    translation = knownData.translation;
    pos = knownData.pos;
    ipa = knownData.ipa;
    if (!contextSentence) {
      exTarget = knownData.exampleDe;
      exNative = knownData.exampleEn;
    }
  } else if (targetLang === 'de') {
    const inferred = inferGermanGender(canonical);
    gender = inferred.gender;
    article = inferred.article || (gender === 'masculine' ? 'der' : gender === 'feminine' ? 'die' : gender === 'neuter' ? 'das' : null);
    if (/^[A-Z]/.test(canonical)) {
      pos = 'noun';
      plural = `${canonical}s`;
    }
  }

  const visual = buildVisualMnemonic(canonical, translation, gender);

  return {
    card_type: 'vocabulary',
    lemma: canonical,
    target_language: targetLang,
    native_language: nativeLang,
    translation,
    part_of_speech: pos,
    phonetic_ipa: ipa,
    linguistic_meta: {
      gender,
      article,
      plural,
    },
    visual_mnemonic: {
      image_prompt: visual.image_prompt || '',
      color_theme: visual.theme_color,
      color_hex: visual.hex,
    },
    example_sentence_target: exTarget,
    example_sentence_native: exNative,
  };
}

/**
 * Calls the Google Gemini API with structured JSON Schema for vocabulary enrichment
 */
export async function enrichVocabularyWithGemini(
  lemma: string,
  apiKey: string,
  targetLang: string = 'de',
  nativeLang: string = 'en',
  contextSentence?: string
): Promise<VocabularyEnrichmentPayload> {
  const prompt = `You are a linguistics expert for language learning. Enrich the target word '${lemma}' for an English native speaker learning ${targetLang}.
Contextual sentence from user: "${contextSentence || ''}".
Provide strict JSON according to this schema:
{
  "card_type": "vocabulary",
  "lemma": "${lemma}",
  "target_language": "${targetLang}",
  "native_language": "${nativeLang}",
  "translation": "accurate English translation",
  "part_of_speech": "noun | verb | adjective | adverb | preposition | phrase",
  "phonetic_ipa": "IPA pronunciation string",
  "linguistic_meta": {
    "gender": "masculine | feminine | neuter | null",
    "article": "der | die | das | le | la | el | null",
    "plural": "plural form with article, e.g. die Bücher, or null"
  },
  "visual_mnemonic": {
    "image_prompt": "descriptive image prompt color-graded for the gender (blue for masculine, red for feminine, green for neuter)",
    "color_theme": "blue | red | green | neutral",
    "color_hex": "#2563eb | #dc2626 | #16a34a | #6b7280"
  },
  "example_sentence_target": "Natural, clear example sentence using the word in ${targetLang}",
  "example_sentence_native": "Natural English translation of the example sentence"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini API');

    return JSON.parse(rawText) as VocabularyEnrichmentPayload;
  } catch (err) {
    console.warn('Gemini API enrichment failed, falling back to offline heuristics:', err);
    return enrichVocabularyOffline(lemma, targetLang, nativeLang, contextSentence);
  }
}

/**
 * Calls OpenAI API with structured JSON output
 */
export async function enrichVocabularyWithOpenAI(
  lemma: string,
  apiKey: string,
  targetLang: string = 'de',
  nativeLang: string = 'en',
  contextSentence?: string
): Promise<VocabularyEnrichmentPayload> {
  const prompt = `You are a linguistics expert for language learning. Enrich the target word '${lemma}' for an English native speaker learning ${targetLang}.
Contextual sentence: "${contextSentence || ''}".
Return ONLY valid JSON matching this schema:
{
  "card_type": "vocabulary",
  "lemma": "${lemma}",
  "target_language": "${targetLang}",
  "native_language": "${nativeLang}",
  "translation": "accurate English translation",
  "part_of_speech": "noun | verb | adjective | adverb | preposition | phrase",
  "phonetic_ipa": "IPA pronunciation string",
  "linguistic_meta": {
    "gender": "masculine | feminine | neuter | null",
    "article": "der | die | das | null",
    "plural": "plural form or null"
  },
  "visual_mnemonic": {
    "image_prompt": "descriptive visual prompt color-graded for gender: blue for masculine, red for feminine, green for neuter",
    "color_theme": "blue | red | green | neutral",
    "color_hex": "#2563eb | #dc2626 | #16a34a | #6b7280"
  },
  "example_sentence_target": "Natural example sentence in ${targetLang}",
  "example_sentence_native": "Natural English translation"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return JSON.parse(content) as VocabularyEnrichmentPayload;
  } catch (err) {
    console.warn('OpenAI enrichment failed, falling back to offline heuristics:', err);
    return enrichVocabularyOffline(lemma, targetLang, nativeLang, contextSentence);
  }
}

/**
 * Calls Anthropic Claude API with JSON output
 */
export async function enrichVocabularyWithAnthropic(
  lemma: string,
  apiKey: string,
  targetLang: string = 'de',
  nativeLang: string = 'en',
  contextSentence?: string
): Promise<VocabularyEnrichmentPayload> {
  const prompt = `You are a linguistics expert for language learning. Enrich the target word '${lemma}' for an English native speaker learning ${targetLang}.
Contextual sentence: "${contextSentence || ''}".
Return ONLY a valid JSON object with no preamble, matching this structure:
{
  "card_type": "vocabulary",
  "lemma": "${lemma}",
  "target_language": "${targetLang}",
  "native_language": "${nativeLang}",
  "translation": "accurate English translation",
  "part_of_speech": "noun | verb | adjective | adverb | preposition | phrase",
  "phonetic_ipa": "IPA pronunciation string",
  "linguistic_meta": {
    "gender": "masculine | feminine | neuter | null",
    "article": "der | die | das | null",
    "plural": "plural form or null"
  },
  "visual_mnemonic": {
    "image_prompt": "descriptive visual prompt color-graded for gender: blue for masculine, red for feminine, green for neuter",
    "color_theme": "blue | red | green | neutral",
    "color_hex": "#2563eb | #dc2626 | #16a34a | #6b7280"
  },
  "example_sentence_target": "Natural example sentence in ${targetLang}",
  "example_sentence_native": "Natural English translation"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text;
    if (!text) throw new Error('Empty response from Anthropic');

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const cleanJson = text.slice(jsonStart, jsonEnd + 1);

    return JSON.parse(cleanJson) as VocabularyEnrichmentPayload;
  } catch (err) {
    console.warn('Anthropic enrichment failed, falling back to offline heuristics:', err);
    return enrichVocabularyOffline(lemma, targetLang, nativeLang, contextSentence);
  }
}

/**
 * Unified enrichment dispatcher checking user BYOK configuration
 */
export async function enrichVocabulary(
  lemma: string,
  options: {
    targetLang?: string;
    nativeLang?: string;
    contextSentence?: string;
    googleApiKey?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
  } = {}
): Promise<VocabularyEnrichmentPayload> {
  const targetLang = options.targetLang || 'de';
  const nativeLang = options.nativeLang || 'en';

  if (options.googleApiKey) {
    return enrichVocabularyWithGemini(
      lemma,
      options.googleApiKey,
      targetLang,
      nativeLang,
      options.contextSentence
    );
  }

  if (options.openaiApiKey) {
    return enrichVocabularyWithOpenAI(
      lemma,
      options.openaiApiKey,
      targetLang,
      nativeLang,
      options.contextSentence
    );
  }

  if (options.anthropicApiKey) {
    return enrichVocabularyWithAnthropic(
      lemma,
      options.anthropicApiKey,
      targetLang,
      nativeLang,
      options.contextSentence
    );
  }

  return enrichVocabularyOffline(
    lemma,
    targetLang,
    nativeLang,
    options.contextSentence
  );
}

/**
 * Creates a complete initial Card object ready for FSRS scheduling
 */
export function createCardFromEnrichment(
  payload: VocabularyEnrichmentPayload | GrammarEnrichmentPayload,
  userId: string = 'default-user'
): Card {
  const nowIso = new Date().toISOString();
  const cardId = crypto.randomUUID ? crypto.randomUUID() : `card_${Date.now()}_${Math.random()}`;

  if (payload.card_type === 'grammar_rule') {
    const grammarMeta: GrammarMeta = {
      title: payload.title,
      category: payload.category,
      summary_rule: payload.summary_rule,
      content_markdown: payload.content_markdown,
      examples: payload.examples,
      quick_tip: payload.quick_tip,
    };

    return {
      id: cardId,
      user_id: userId,
      card_type: 'grammar_rule',
      target_language: payload.target_language,
      front_text: payload.title,
      back_text: undefined,
      grammar_meta: grammarMeta,
      fsrs_state: 'New',
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      last_review: null,
      due_date: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };
  }

  // Vocabulary Card
  const imageUrl = getPollinationsImageUrl(
    payload.visual_mnemonic.image_prompt,
    400,
    260
  );

  const lingMeta: LinguisticMeta = {
    gender: payload.linguistic_meta.gender,
    article: payload.linguistic_meta.article,
    plural: payload.linguistic_meta.plural,
    part_of_speech: payload.part_of_speech,
    phonetic_ipa: payload.phonetic_ipa,
  };

  const visualMeta: VisualMeta = {
    theme_color: payload.visual_mnemonic.color_theme,
    hex: payload.visual_mnemonic.color_hex,
    image_prompt: payload.visual_mnemonic.image_prompt,
  };

  return {
    id: cardId,
    user_id: userId,
    card_type: 'vocabulary',
    target_language: payload.target_language,
    lemma: payload.lemma,
    front_text: payload.lemma,
    back_text: payload.translation,
    part_of_speech: payload.part_of_speech,
    phonetic_ipa: payload.phonetic_ipa,
    linguistic_meta: lingMeta,
    visual_meta: visualMeta,
    image_url: imageUrl,
    example_target: payload.example_sentence_target,
    example_native: payload.example_sentence_native,
    fsrs_state: 'New',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
    due_date: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };
}
