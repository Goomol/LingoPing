import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StorageManager } from '../src/storage/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, '..');
const distRoot = path.resolve(extensionRoot, 'dist');

describe('Chrome Extension Manifest V3 Compliance', () => {
  const manifestPath = path.join(distRoot, 'manifest.json');

  beforeAll(async () => {
    if (!fs.existsSync(manifestPath)) {
      const { execSync } = await import('node:child_process');
      execSync('npm run build', { cwd: extensionRoot, stdio: 'pipe' });
    }
  });

  it('generates a valid Manifest V3 json in dist/', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('LingoPing');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.background?.service_worker).toBe('background.js');
    expect(manifest.background?.type).toBe('module');
    expect(manifest.action?.default_popup).toBe('popup.html');
    expect(manifest.options_ui?.page).toBe('options.html');
  });

  it('ensures all declared icons exist as real image files on disk with non-zero size', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.icons).toBeDefined();

    for (const [size, iconPath] of Object.entries(manifest.icons)) {
      const fullPath = path.join(distRoot, iconPath as string);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stats = fs.statSync(fullPath);
      expect(stats.size).toBeGreaterThan(50);
    }
  });

  it('ensures background service worker and HTML pages exist in dist/', () => {
    expect(fs.existsSync(path.join(distRoot, 'background.js'))).toBe(true);
    expect(fs.existsSync(path.join(distRoot, 'session.html'))).toBe(true);
    expect(fs.existsSync(path.join(distRoot, 'popup.html'))).toBe(true);
    expect(fs.existsSync(path.join(distRoot, 'options.html'))).toBe(true);
  });

  it('ensures no inline scripts exist in HTML files (CSP compliance)', () => {
    for (const htmlFile of ['session.html', 'popup.html', 'options.html']) {
      const content = fs.readFileSync(path.join(distRoot, htmlFile), 'utf8');
      // Match inline scripts that have code between <script> and </script> without src=
      const inlineScriptRegex = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
      const match = inlineScriptRegex.exec(content);
      expect(match).toBeNull();
    }
  });
});

describe('Extension Storage Manager & Deck Initialization', () => {
  beforeAll(async () => {
    // Clear localStorage for clean test state
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    await StorageManager.onUserLoggedOut();
    await StorageManager.initSeedData();
  });

  beforeEach(async () => {
    await StorageManager.onUserLoggedOut();
  });

  it('initializes seed cards including German der/die/das and grammar cards', async () => {
    const cards = await StorageManager.getCards();
    expect(cards.length).toBeGreaterThanOrEqual(6);

    // Verify presence of single-sided grammar rule
    const grammarCards = cards.filter((c) => c.card_type === 'grammar_rule');
    expect(grammarCards.length).toBeGreaterThanOrEqual(1);
    expect(grammarCards[0].front_text).toContain('Wechselpräpositionen');
    expect(grammarCards[0].grammar_meta?.summary_rule).toBeTruthy();
    expect(grammarCards[0].grammar_meta?.content_markdown).toContain('Akkusativ');

    // Verify presence of chromatic German vocabulary
    const vocabCards = cards.filter((c) => c.card_type === 'vocabulary');
    const masculine = vocabCards.find((c) => c.linguistic_meta?.gender === 'masculine');
    const feminine = vocabCards.find((c) => c.linguistic_meta?.gender === 'feminine');
    const neuter = vocabCards.find((c) => c.linguistic_meta?.gender === 'neuter');

    expect(masculine?.visual_meta?.theme_color).toBe('blue');
    expect(feminine?.visual_meta?.theme_color).toBe('red');
    expect(neuter?.visual_meta?.theme_color).toBe('green');
  });

  it('allows adding, updating, and removing known words', async () => {
    await StorageManager.addKnownWord('Schreibtisch', 'de');
    let known = await StorageManager.getKnownWords();
    expect(known.some((k) => k.lemma === 'Schreibtisch')).toBe(true);

    const target = known.find((k) => k.lemma === 'Schreibtisch')!;
    await StorageManager.removeKnownWord(target.id);
    known = await StorageManager.getKnownWords();
    expect(known.some((k) => k.lemma === 'Schreibtisch')).toBe(false);
  });

  it('stores and retrieves items from the centralized visual cache', async () => {
    const testVisual = {
      imageUrl: 'https://image.pollinations.ai/prompt/blue%20table',
      visualMeta: {
        theme_color: 'blue' as const,
        hex: '#1677ff',
        label: 'der (Masculine) - Sapphire Blue',
        image_prompt: 'blue wooden table in studio lighting',
      },
    };

    await StorageManager.saveCachedVisual('tisch', 'de', testVisual.imageUrl, testVisual.visualMeta);
    const cached = await StorageManager.getCachedVisual('Tisch', 'de');

    expect(cached).toBeDefined();
    expect(cached?.imageUrl).toBe(testVisual.imageUrl);
    expect(cached?.visualMeta.theme_color).toBe('blue');
    expect(cached?.visualMeta.hex).toBe('#1677ff');
  });
});

