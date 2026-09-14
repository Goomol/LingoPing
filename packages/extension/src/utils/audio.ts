/**
 * Audio / Text-To-Speech (TTS) Utility for LingoPing
 * Ensures proper native German (de-DE) voice selection with asynchronous voice preloading
 * and fallback support for neural Cloud TTS.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];

/**
 * Preloads voices and listens to voiceschanged event
 */
export function preloadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const available = window.speechSynthesis.getVoices();
    if (available.length > 0) {
      cachedVoices = available;
      resolve(available);
      return;
    }

    // Chrome loads voices asynchronously
    const handler = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        cachedVoices = voices;
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(voices);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', handler);

    // Timeout fallback in case voiceschanged does not fire
    setTimeout(() => {
      const fallbackVoices = window.speechSynthesis.getVoices();
      if (fallbackVoices.length > 0) {
        cachedVoices = fallbackVoices;
      }
      resolve(cachedVoices);
    }, 1000);
  });
}

// Automatically trigger voice preloading on module load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  preloadVoices();
}

/**
 * Finds the best native voice for the given language (prioritizing German for 'de')
 */
export function getBestVoice(language: string = 'de'): SpeechSynthesisVoice | null {
  const voices =
    cachedVoices.length > 0
      ? cachedVoices
      : typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis.getVoices()
      : [];

  if (voices.length === 0) return null;

  let targetPrefix = 'de';
  if (language === 'de') targetPrefix = 'de';
  else if (language === 'fr') targetPrefix = 'fr';
  else if (language === 'es') targetPrefix = 'es';
  else if (language === 'it') targetPrefix = 'it';
  else if (language === 'en') targetPrefix = 'en';

  const matching = voices.filter((v) => {
    const langClean = v.lang.toLowerCase().replace('_', '-');
    return langClean.startsWith(targetPrefix);
  });

  if (matching.length === 0) return null;

  // For German, prioritize natural/neural voices
  if (targetPrefix === 'de') {
    // 1. Prioritize Google Deutsch
    const googleVoice = matching.find((v) =>
      v.name.toLowerCase().includes('google deutsch')
    );
    if (googleVoice) return googleVoice;

    // 2. Prioritize natural / neural / premium voices (Anna, Markus, Petra, Yannick)
    const naturalVoice = matching.find(
      (v) =>
        v.name.toLowerCase().includes('natural') ||
        v.name.toLowerCase().includes('anna') ||
        v.name.toLowerCase().includes('markus') ||
        v.name.toLowerCase().includes('petra') ||
        v.name.toLowerCase().includes('yannick')
    );
    if (naturalVoice) return naturalVoice;

    // 3. Any de-DE voice
    const deDE = matching.find((v) =>
      v.lang.toLowerCase().replace('_', '-').includes('de-de')
    );
    if (deDE) return deDE;
  }

  return matching[0];
}

/**
 * Speaks text using the best native voice for the target language
 */
export async function speakText(
  text: string,
  language: string = 'de'
): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser environment.');
    return;
  }

  // Ensure text is trimmed and clean of markdown symbols
  const cleanText = text
    .replace(/[*_~`#|]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();

  if (!cleanText) return;

  // Make sure voices are loaded
  if (cachedVoices.length === 0) {
    await preloadVoices();
  }

  // Cancel any ongoing speech to avoid overlapping
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanText);

  let langCode = 'de-DE';
  if (language === 'de') langCode = 'de-DE';
  else if (language === 'fr') langCode = 'fr-FR';
  else if (language === 'es') langCode = 'es-ES';
  else if (language === 'it') langCode = 'it-IT';
  else if (language === 'en') langCode = 'en-US';

  utterance.lang = langCode;
  utterance.rate = 0.92; // Slightly slower for clear language learning comprehension
  utterance.pitch = 1.0;

  const voice = getBestVoice(language);
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}
