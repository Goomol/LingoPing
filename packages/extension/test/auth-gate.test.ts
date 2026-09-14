import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../src/storage/index.js';
import { getCurrentUser, signOutUser } from '../src/auth/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.resolve(__dirname, '../public/manifest.json');

describe('User Isolation & Storage Scoping', () => {
  beforeEach(async () => {
    await StorageManager.onUserLoggedOut();
  });

  it('provisions unique starter deck for a newly registered user', async () => {
    const userA = 'user_uuid_1111';
    await StorageManager.setCurrentUserId(userA);

    const cardsA = await StorageManager.initStarterDeckForUser(userA);
    expect(cardsA.length).toBeGreaterThanOrEqual(6);
    expect(cardsA.every((c) => c.user_id === userA)).toBe(true);

    const retrievedA = await StorageManager.getCards();
    expect(retrievedA.length).toBe(cardsA.length);
    expect(retrievedA.every((c) => c.user_id === userA)).toBe(true);
  });

  it('strictly isolates card decks between different users', async () => {
    const userAlpha = 'user_alpha_2222';
    const userBeta = 'user_beta_3333';

    // 1. User Alpha gets starter deck
    await StorageManager.setCurrentUserId(userAlpha);
    const alphaCards = await StorageManager.initStarterDeckForUser(userAlpha);
    expect(alphaCards.length).toBeGreaterThanOrEqual(6);

    // 2. User Beta logs in
    await StorageManager.setCurrentUserId(userBeta);
    let betaCards = await StorageManager.getCards();
    expect(betaCards.length).toBe(0); // Beta starts with 0 cards before provision

    // 3. User Beta adds their own custom card
    await StorageManager.addCard({
      id: 'beta-card-1',
      user_id: userBeta,
      card_type: 'vocabulary',
      target_language: 'de',
      lemma: 'Wanderlust',
      front_text: 'Wanderlust',
      back_text: 'strong desire to travel',
      fsrs_state: 'New',
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      last_review: null,
      due_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    betaCards = await StorageManager.getCards();
    expect(betaCards.length).toBe(1);
    expect(betaCards[0].lemma).toBe('Wanderlust');

    // 4. Switch back to User Alpha - must not see Beta's card
    await StorageManager.setCurrentUserId(userAlpha);
    const retrievedAlpha = await StorageManager.getCards();
    expect(retrievedAlpha.length).toBe(alphaCards.length);
    expect(retrievedAlpha.some((c) => c.lemma === 'Wanderlust')).toBe(false);

    // 5. Logout - active user reset
    await StorageManager.onUserLoggedOut();
    const currentId = await StorageManager.getCurrentUserId();
    expect(currentId).toBeNull();
  });

  it('scopes known words per user account', async () => {
    const userX = 'user_x_4444';
    const userY = 'user_y_5555';

    await StorageManager.setCurrentUserId(userX);
    await StorageManager.addKnownWord('Freundschaft', 'de');
    const knownX = await StorageManager.getKnownWords();
    expect(knownX.some((k) => k.lemma === 'Freundschaft')).toBe(true);

    await StorageManager.setCurrentUserId(userY);
    const knownY = await StorageManager.getKnownWords();
    expect(knownY.some((k) => k.lemma === 'Freundschaft')).toBe(false);
  });
});

describe('Manifest V3 Identity & Host Permissions', () => {
  it('includes identity and security permissions required for Google OAuth', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(manifest.permissions).toContain('identity');
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('alarms');
    expect(manifest.permissions).toContain('contextMenus');
    expect(manifest.permissions).toContain('notifications');

    expect(manifest.host_permissions).toContain('https://*.supabase.co/*');
    expect(manifest.host_permissions).toContain('https://accounts.google.com/*');
  });
});
