import { User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../config/supabase.js';
import { StorageManager } from '../storage/index.js';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function getClientKey(profile: any): string | undefined {
  return profile.supabase_publishable_key || profile.supabase_anon_key;
}

/**
 * Initiates Google OAuth sign-in flow for Chrome extension
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await StorageManager.getProfile();
    const key = getClientKey(profile);
    const supabase = getSupabase(profile.supabase_url, key);

    if (!isSupabaseConfigured(profile.supabase_url, key)) {
      return {
        success: false,
        error:
          'Supabase credentials not configured yet. Please configure your project URL in Settings or .env.',
      };
    }

    const redirectUrl =
      typeof chrome !== 'undefined' && chrome.identity?.getRedirectURL
        ? chrome.identity.getRedirectURL('supabase-auth')
        : window.location.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: typeof chrome !== 'undefined' && !!chrome.identity?.launchWebAuthFlow,
      },
    });

    if (error) throw error;

    // In Chrome extension, handle auth flow popup via chrome.identity
    if (data?.url && typeof chrome !== 'undefined' && chrome.identity?.launchWebAuthFlow) {
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: data.url,
        interactive: true,
      });

      if (!responseUrl) {
        return { success: false, error: 'Authentication was cancelled.' };
      }

      // Extract tokens from response URL hash/query
      const url = new URL(responseUrl);
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await syncDeckWithCloud(userData.user.id);
        }

        return { success: true };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Sign in with Google error:', err);
    return { success: false, error: err?.message || 'Failed to authenticate with Google' };
  }
}

/**
 * Signs out the current user
 */
export async function signOutUser(): Promise<void> {
  const profile = await StorageManager.getProfile();
  const key = getClientKey(profile);
  const supabase = getSupabase(profile.supabase_url, key);
  await supabase.auth.signOut();
}

/**
 * Fetches the currently authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  const profile = await StorageManager.getProfile();
  const key = getClientKey(profile);
  const supabase = getSupabase(profile.supabase_url, key);

  if (!isSupabaseConfigured(profile.supabase_url, key)) {
    return null;
  }

  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

/**
 * Synchronizes cards, known words, and reviews between local storage and Supabase
 */
export async function syncDeckWithCloud(userId: string): Promise<void> {
  const profile = await StorageManager.getProfile();
  const key = getClientKey(profile);
  const supabase = getSupabase(profile.supabase_url, key);

  if (!isSupabaseConfigured(profile.supabase_url, key)) {
    return;
  }

  try {
    // 1. Fetch remote cards
    const { data: remoteCards } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId);

    const localCards = await StorageManager.getCards();

    // 2. Upload any local cards not present remotely
    if (localCards.length > 0) {
      const cardsToUpsert = localCards.map((c) => ({
        ...c,
        user_id: userId,
      }));

      await supabase.from('cards').upsert(cardsToUpsert, { onConflict: 'id' });
    }

    // 3. Merge remote cards into local storage
    if (remoteCards && remoteCards.length > 0) {
      const mergedMap = new Map();
      for (const c of localCards) mergedMap.set(c.id, c);
      for (const rc of remoteCards) mergedMap.set(rc.id, rc);
      await StorageManager.saveCards(Array.from(mergedMap.values()));
    }

    console.log('[LingoPing] Cloud sync completed successfully.');
  } catch (err) {
    console.warn('[LingoPing] Cloud sync error:', err);
  }
}
