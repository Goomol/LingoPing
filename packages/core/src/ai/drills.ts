import { Card, InteractiveDrill } from '../types.js';

// Semantic distractors by category for smart cloze tests
const SEMANTIC_DISTRACTORS: Record<string, string[]> = {
  // Animals / Pets
  Hund: ['Katze', 'Vogel', 'Pferd', 'Nachbar'],
  Katze: ['Hund', 'Maus', 'Ente', 'Eule'],
  // Furniture / Home
  Tisch: ['Stuhl', 'Schrank', 'Bett', 'Sofa'],
  Stuhl: ['Tisch', 'Bank', 'Sessel', 'Hocker'],
  Fenster: ['Tür', 'Spiegel', 'Wand', 'Vorhang'],
  Tür: ['Fenster', 'Tor', 'Pforte', 'Wand'],
  // Objects / Reading / Food
  Buch: ['Heft', 'Brief', 'Zeitung', 'Bild'],
  Zeitung: ['Buch', 'Magazin', 'Nachricht', 'Postkarte'],
  Apfel: ['Banane', 'Birne', 'Orange', 'Brot'],
  Brot: ['Käse', 'Apfel', 'Butter', 'Fleisch'],
  // People / Places
  Mädchen: ['Junge', 'Frau', 'Kind', 'Lehrer'],
  Bahnhof: ['Flughafen', 'Marktplatz', 'Parkplatz', 'Hotel'],
  Freiheit: ['Geduld', 'Hoffnung', 'Wahrheit', 'Zukunft'],
};

// Common German case article matrices
const ARTICLE_CASE_MATRIX = {
  masculine: {
    nominativ: 'der',
    akkusativ: 'den',
    dativ: 'dem',
    genitiv: 'des',
  },
  feminine: {
    nominativ: 'die',
    akkusativ: 'die',
    dativ: 'der',
    genitiv: 'der',
  },
  neuter: {
    nominativ: 'das',
    akkusativ: 'das',
    dativ: 'dem',
    genitiv: 'des',
  },
};

/**
 * Generates an intelligent, diverse on-card interactive drill for vocabulary or grammar cards.
 * Randomizes between 4 educational challenge modes so the answer is never predictable.
 */
export function generateInteractiveDrill(card: Card): InteractiveDrill {
  const drillId = `drill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // ==========================================
  // GRAMMAR RULE CARDS
  // ==========================================
  if (card.card_type === 'grammar_rule' && card.grammar_meta) {
    const meta = card.grammar_meta;

    // Wechselpräpositionen Drill
    if (
      meta.title.toLowerCase().includes('wechselpräposition') ||
      meta.category === 'prepositions'
    ) {
      const isWohin = Math.random() > 0.5;
      if (isWohin) {
        return {
          id: drillId,
          cardId: card.id,
          drillType: 'rule_drill',
          title: 'Case Challenge: Two-Way Preposition (Wechselpräposition)',
          prompt:
            'Identify the correct article case for dynamic movement (Wohin? Action towards destination):',
          context: 'Ich stelle die Blumenvase auf ___ Tisch.',
          options: [
            'den (Akkusativ - Wohin?)',
            'dem (Dativ - Wo?)',
            'des (Genitiv)',
            'der (Feminin/Plural)',
          ],
          correctAnswer: 'den (Akkusativ - Wohin?)',
          explanation:
            'Movement/placing onto a surface (stellen + auf) asks "Wohin?" and strictly demands the Akkusativ case (den Tisch).',
        };
      } else {
        return {
          id: drillId,
          cardId: card.id,
          drillType: 'rule_drill',
          title: 'Case Challenge: Two-Way Preposition (Wechselpräposition)',
          prompt:
            'Identify the correct article case for a static location (Wo? Position/State):',
          context: 'Die Blumenvase steht bereits auf ___ Tisch.',
          options: [
            'dem (Dativ - Wo?)',
            'den (Akkusativ - Wohin?)',
            'das (Neuter)',
            'des (Genitiv)',
          ],
          correctAnswer: 'dem (Dativ - Wo?)',
          explanation:
            'A stationary position (stehen + auf) answers "Wo?" and strictly requires the Dativ case (dem Tisch).',
        };
      }
    }

    // General grammar drill using rule examples
    const firstExample = meta.examples?.[0];
    if (firstExample) {
      return {
        id: drillId,
        cardId: card.id,
        drillType: 'rule_drill',
        title: `Rule Check: ${meta.title}`,
        prompt: `According to the rule "${meta.summary_rule}", which of the following is correct?`,
        context: `Context: "${firstExample.target}" (${firstExample.native})`,
        options: [
          firstExample.target,
          firstExample.target.replace(/\b(auf|in|an|unter)\s+(den|dem|die|das)\b/i, 'mit des'),
          'Incorrect word order or inverted clause',
        ].filter(Boolean),
        correctAnswer: firstExample.target,
        explanation: meta.quick_tip || meta.summary_rule,
      };
    }
  }

  // ==========================================
  // VOCABULARY CARDS: DYNAMIC 3-WAY CHALLENGE
  // ==========================================
  const lemma = card.lemma || card.front_text;
  const gender = card.linguistic_meta?.gender;
  const article = card.linguistic_meta?.article;
  const plural = card.linguistic_meta?.plural;
  const targetSentence = card.example_target || `${article || ''} ${lemma} ist wichtig.`;

  // Randomly select one of 3 innovative drill types:
  // 0 = Case / Declension Selector (Akkusativ vs Dativ in context)
  // 1 = Plural Formation Mastery
  // 2 = Semantic Context Cloze (with realistic category distractors)
  const modesAvailable = [2]; // Always include semantic cloze
  if (gender && article && (gender === 'masculine' || gender === 'feminine' || gender === 'neuter')) {
    modesAvailable.push(0); // Case declension challenge
  }
  if (plural && plural.trim().length > 0) {
    modesAvailable.push(1); // Plural formation challenge
  }

  const selectedMode = modesAvailable[Math.floor(Math.random() * modesAvailable.length)];

  // ----------------------------------------------------
  // MODE 0: Case & Article Declension Selector
  // ----------------------------------------------------
  if (selectedMode === 0 && gender && (gender === 'masculine' || gender === 'feminine' || gender === 'neuter')) {
    const matrix = ARTICLE_CASE_MATRIX[gender];
    const isMasculine = gender === 'masculine';

    let promptContext = '';
    let correctAnswer = '';
    let promptQuestion = '';
    let explanationText = '';

    if (isMasculine) {
      // Masculine shows the clearest declension contrast (der / den / dem)
      promptContext = `Ich sehe ___ ${lemma} im Garten. (Direct Object / Akkusativ)`;
      correctAnswer = `${matrix.akkusativ} (Akkusativ)`;
      promptQuestion = `Select the correct definite article for '${lemma}' in the Akkusativ case:`;
      explanationText = `Masculine nouns change their definite article from 'der' (Nominativ) to 'den' in the Akkusativ case.`;
    } else if (gender === 'feminine') {
      promptContext = `Ich helfe ___ ${lemma}. (Dativ Object)`;
      correctAnswer = `${matrix.dativ} (Dativ)`;
      promptQuestion = `Select the correct definite article for '${lemma}' in the Dativ case:`;
      explanationText = `Feminine nouns change their definite article from 'die' (Nominativ/Akkusativ) to 'der' in the Dativ case.`;
    } else {
      // Neuter
      promptContext = `Ich spiele mit ___ ${lemma}. (Preposition 'mit' + Dativ)`;
      correctAnswer = `${matrix.dativ} (Dativ)`;
      promptQuestion = `Select the correct definite article for '${lemma}' in the Dativ case:`;
      explanationText = `Neuter nouns take 'dem' in the Dativ case (mit dem ${lemma}).`;
    }

    const options = Array.from(
      new Set([
        correctAnswer,
        `${matrix.nominativ} (Nominativ)`,
        `${isMasculine ? 'dem (Dativ)' : 'den (Akkusativ)'}`,
        'des (Genitiv)',
      ])
    ).sort(() => Math.random() - 0.5);

    return {
      id: drillId,
      cardId: card.id,
      drillType: 'rule_drill',
      title: `Declension Challenge: ${article || ''} ${lemma}`,
      prompt: promptQuestion,
      context: promptContext,
      options,
      correctAnswer,
      explanation: explanationText,
    };
  }

  // ----------------------------------------------------
  // MODE 1: Plural Formation Mastery
  // ----------------------------------------------------
  if (selectedMode === 1 && plural) {
    const cleanPlural = plural.replace(/^(die\s+)/i, '').trim();

    // Create plausible plural distractors
    const distractor1 = cleanPlural.endsWith('e') ? `${cleanPlural}n` : `${lemma}e`;
    const distractor2 = cleanPlural.endsWith('en') ? `${lemma}er` : `${lemma}s`;
    const distractor3 = `${lemma}en`;

    const options = Array.from(
      new Set([plural, `die ${distractor1}`, `die ${distractor2}`, `die ${distractor3}`])
    )
      .filter((opt) => opt !== `die ${cleanPlural}`)
      .slice(0, 4);

    if (!options.includes(plural)) {
      options[0] = plural;
    }
    options.sort(() => Math.random() - 0.5);

    return {
      id: drillId,
      cardId: card.id,
      drillType: 'rule_drill',
      title: `Plural Mastery: ${article || ''} ${lemma}`,
      prompt: `What is the correct plural form of '${article || ''} ${lemma}'?`,
      context: `Singular: ${article || ''} ${lemma} (${card.back_text || ''})`,
      options,
      correctAnswer: plural,
      explanation: `The correct plural form is '${plural}'. Remember German noun plurals often involve umlauts, -er, -e, or -(e)n endings.`,
    };
  }

  // ----------------------------------------------------
  // MODE 2: Semantic Category Cloze with Real Distractors
  // ----------------------------------------------------
  const escaped = lemma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matchRegex = new RegExp(`\\b${escaped}[a-zäöüß]*\\b`, 'i');
  const match = targetSentence.match(matchRegex);

  let clozeSentence = targetSentence;
  let wordInSentence = lemma;

  if (match && match.index !== undefined) {
    wordInSentence = match[0];
    clozeSentence =
      targetSentence.slice(0, match.index) +
      '______' +
      targetSentence.slice(match.index + match[0].length);
  } else {
    clozeSentence = `Hier ist ein(e) ______ auf dem Tisch.`;
  }

  // Lookup smart semantic category distractors
  const categoryDistractors =
    SEMANTIC_DISTRACTORS[lemma] ||
    (gender === 'masculine'
      ? ['Schreibtisch', 'Hund', 'Apfel', 'Bahnhof']
      : gender === 'feminine'
      ? ['Zeitung', 'Katze', 'Freiheit', 'Tür']
      : ['Buch', 'Fenster', 'Mädchen', 'Brot']);

  const filteredDistractors = categoryDistractors.filter(
    (d) => d.toLowerCase() !== lemma.toLowerCase()
  );

  const options = Array.from(new Set([wordInSentence, ...filteredDistractors.slice(0, 3)])).sort(
    () => Math.random() - 0.5
  );

  return {
    id: drillId,
    cardId: card.id,
    drillType: 'cloze',
    title: `Context Cloze: Meaning in Context`,
    prompt: `Complete the sentence with the semantically and grammatically correct German word:`,
    context: clozeSentence,
    options,
    correctAnswer: wordInSentence,
    explanation: `"${targetSentence}" translates to "${card.example_native || card.back_text || ''}". The word '${wordInSentence}' matches both the sentence meaning and the grammatical context.`,
  };
}
