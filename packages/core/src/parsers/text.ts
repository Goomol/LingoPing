import { extractSentences } from './subtitles.js';

export interface TabularEntry {
  term: string;
  translation?: string;
  contextSentence?: string;
  partOfSpeech?: string;
  gender?: string;
  notes?: string;
}

/**
 * Parses free-form text, dialogue, or pasted articles into clean sentences.
 */
export function parsePlainText(content: string): { fullText: string; sentences: string[] } {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const sentences = extractSentences(normalized);
  return { fullText: normalized, sentences };
}

/**
 * Parses CSV or TSV data, auto-detecting delimiters and common column headers.
 */
export function parseTabularData(content: string): TabularEntry[] {
  if (!content || !content.trim()) return [];

  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Detect delimiter (, \t ;)
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  }

  // Helper to split row respecting quotes
  const splitRow = (row: string): string[] => {
    const pattern = new RegExp(
      `(?:^|${delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}]*))`,
      'g'
    );
    const cells: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(row)) !== null) {
      // If cell was in quotes, replace double quotes with single
      const val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      cells.push((val || '').trim());
    }
    return cells;
  };

  const headerCells = splitRow(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = headerCells.some((h) =>
    ['term', 'word', 'front', 'lemma', 'vokabel', 'deutsch', 'target'].includes(h)
  );

  let termIdx = 0;
  let transIdx = 1;
  let contextIdx = -1;
  let posIdx = -1;
  let genderIdx = -1;
  let notesIdx = -1;

  let startIndex = 0;

  if (hasHeader) {
    startIndex = 1;
    termIdx = headerCells.findIndex((h) =>
      ['term', 'word', 'front', 'lemma', 'vokabel', 'deutsch', 'target'].includes(h)
    );
    transIdx = headerCells.findIndex((h) =>
      ['translation', 'back', 'meaning', 'definition', 'bedeutung', 'native', 'english'].includes(h)
    );
    contextIdx = headerCells.findIndex((h) =>
      ['context', 'example', 'sentence', 'satz', 'beispiel'].includes(h)
    );
    posIdx = headerCells.findIndex((h) => ['pos', 'part_of_speech', 'wortart'].includes(h));
    genderIdx = headerCells.findIndex((h) => ['gender', 'genus', 'geschlecht', 'article'].includes(h));
    notesIdx = headerCells.findIndex((h) => ['notes', 'notizen', 'tip'].includes(h));

    if (termIdx === -1) termIdx = 0;
    if (transIdx === -1) transIdx = 1;
  }

  const entries: TabularEntry[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    if (cells.length === 0) continue;

    const term = cells[termIdx]?.trim();
    if (!term) continue;

    entries.push({
      term,
      translation: transIdx >= 0 ? cells[transIdx]?.trim() : undefined,
      contextSentence: contextIdx >= 0 ? cells[contextIdx]?.trim() : undefined,
      partOfSpeech: posIdx >= 0 ? cells[posIdx]?.trim() : undefined,
      gender: genderIdx >= 0 ? cells[genderIdx]?.trim() : undefined,
      notes: notesIdx >= 0 ? cells[notesIdx]?.trim() : undefined,
    });
  }

  return entries;
}

/**
 * Parses Anki exported text decks (tab-separated note export)
 */
export function parseAnkiExport(content: string): TabularEntry[] {
  // Anki deck text files often have comments starting with #
  const cleaned = content
    .split('\n')
    .filter((l) => !l.startsWith('#'))
    .join('\n');
  return parseTabularData(cleaned);
}
