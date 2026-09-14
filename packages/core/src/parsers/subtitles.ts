export interface SubtitleCue {
  id?: string;
  startTime?: string;
  endTime?: string;
  text: string;
}

export interface ParsedSubtitles {
  cues: SubtitleCue[];
  fullText: string;
  sentences: string[];
}

/**
 * Parses .srt and .vtt subtitle files, removing timestamps, cues,
 * tags, and speaker markers while extracting clean contextual sentences.
 */
export function parseSubtitles(rawContent: string): ParsedSubtitles {
  if (!rawContent || !rawContent.trim()) {
    return { cues: [], fullText: '', sentences: [] };
  }

  // Normalize line endings
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into blocks by double newlines
  const blocks = normalized.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];
  const textLines: string[] = [];

  // Timestamp regex matching both SRT (00:00:20,000) and VTT (00:00:20.000)
  const timestampRegex =
    /(?:(\d{2}:)?\d{2}:\d{2}[,.]\d{3})\s*-->\s*(?:(\d{2}:)?\d{2}:\d{2}[,.]\d{3})(?:[^\n]*)?/;

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    // Skip WEBVTT header and NOTE blocks
    if (lines[0].startsWith('WEBVTT') || lines[0].startsWith('NOTE')) {
      continue;
    }

    let timestampIndex = -1;
    let cueId: string | undefined = undefined;

    for (let i = 0; i < lines.length; i++) {
      if (timestampRegex.test(lines[i])) {
        timestampIndex = i;
        break;
      }
    }

    if (timestampIndex !== -1) {
      if (timestampIndex > 0) {
        cueId = lines[0];
      }
      const timeMatch = lines[timestampIndex].match(
        /((?:(\d{2}:)?\d{2}:\d{2}[,.]\d{3}))\s*-->\s*((?:(\d{2}:)?\d{2}:\d{2}[,.]\d{3}))/
      );

      const dialogueLines = lines.slice(timestampIndex + 1);
      const cleanedDialogue = dialogueLines
        .join(' ')
        // Strip HTML/formatting tags like <i>, <b>, <font color="...">, <c.color>
        .replace(/<[^>]+>/g, '')
        // Strip speaker prefixes like "JOHN: ", ">> "
        .replace(/^[A-Z0-9_\s.-]+:\s*/, '')
        .replace(/^>>\s*/, '')
        .replace(/^-\s*/, '')
        .trim();

      if (cleanedDialogue) {
        cues.push({
          id: cueId,
          startTime: timeMatch ? timeMatch[1] : undefined,
          endTime: timeMatch ? timeMatch[3] : undefined,
          text: cleanedDialogue,
        });
        textLines.push(cleanedDialogue);
      }
    } else {
      // Plain lines without explicit timestamp in this block
      const clean = lines
        .join(' ')
        .replace(/<[^>]+>/g, '')
        .trim();
      if (clean && !clean.match(/^\d+$/)) {
        textLines.push(clean);
      }
    }
  }

  const fullText = textLines.join(' ');
  const sentences = extractSentences(fullText);

  return {
    cues,
    fullText,
    sentences,
  };
}

/**
 * Splits text into complete sentences based on punctuation boundaries (. ! ?)
 */
export function extractSentences(text: string): string[] {
  if (!text) return [];

  // Match sentence ending punctuation followed by space or end of string
  // Handles abbreviations like 'z.B.', 'etc.', 'Mr.', 'Dr.' gracefully
  const rawSentences = text
    .replace(/([.?!])\s*(?=[A-ZÄÖÜ"'])/g, '$1|SPLIT|')
    .split('|SPLIT|')
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  return rawSentences;
}
