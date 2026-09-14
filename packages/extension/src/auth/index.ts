import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
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
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string; user?: User }> {
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

    if (error) {
      if (
        error.message?.toLowerCase().includes('not enabled') ||
        error.message?.toLowerCase().includes('validation_failed')
      ) {
        return {
          success: false,
          error:
            'Google Sign-In is not enabled yet in your Supabase project. Please enable the Google provider under Supabase Dashboard > Authentication > Providers > Google, or use Email Sign-In below.',
        };
      }
      throw error;
    }

    // In Chrome extension, handle auth flow popup via chrome.identity
    if (data?.url && typeof chrome !== 'undefined' && chrome.identity?.launchWebAuthFlow) {
      let responseUrl: string | undefined;
      try {
        responseUrl = await chrome.identity.launchWebAuthFlow({
          url: data.url,
          interactive: true,
        });
      } catch (flowErr: any) {
        return {
          success: false,
          error: flowErr?.message || 'Google sign-in popup was closed or blocked.',
        };
      }

      if (!responseUrl) {
        return { success: false, error: 'Authentication was cancelled.' };
      }

      // Extract tokens from response URL hash/query
      const url = new URL(responseUrl);
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionErr) throw sessionErr;

        const authUser = sessionData?.user;
        if (authUser) {
          await StorageManager.setCurrentUserId(authUser.id);
          await syncDeckWithCloud(authUser.id);
          return { success: true, user: authUser };
        }
      }
    }

    const current = await getCurrentUser();
    return { success: !!current, user: current || undefined };
  } catch (err: any) {
    console.error('[LingoPing Auth] Sign in with Google error:', err);
    return { success: false, error: err?.message || 'Failed to authenticate with Google' };
  }
}

/**
 * Signs in with email and password
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const profile = await StorageManager.getProfile();
    const key = getClientKey(profile);
    const supabase = getSupabase(profile.supabase_url, key);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user) {
      await StorageManager.setCurrentUserId(data.user.id);
      await syncDeckWithCloud(data.user.id);
      return { success: true, user: data.user };
    }

    return { success: false, error: 'User not returned after sign in' };
  } catch (err: any) {
    console.error('[LingoPing Auth] Email sign-in error:', err);
    return { success: false, error: err?.message || 'Failed to sign in' };
  }
}

/**
 * Creates a new user account with email, password, and optional full name
 */
export async function signUpWithPassword(
  email: string,
  password: string,
  fullName?: string
): Promise<{
  success: boolean;
  error?: string;
  user?: User;
  confirmationRequired?: boolean;
}> {
  try {
    const profile = await StorageManager.getProfile();
    const key = getClientKey(profile);
    const supabase = getSupabase(profile.supabase_url, key);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName?.trim() || undefined,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user) {
      if (data.session) {
        // Auto-confirmed session
        await StorageManager.setCurrentUserId(data.user.id);
        await syncDeckWithCloud(data.user.id);
        return { success: true, user: data.user, confirmationRequired: false };
      } else {
        // Email confirmation link sent
        return { success: true, user: data.user, confirmationRequired: true };
      }
    }

    return { success: false, error: 'Sign up failed' };
  } catch (err: any) {
    console.error('[LingoPing Auth] Sign up error:', err);
    return { success: false, error: err?.message || 'Failed to create account' };
  }
}

/**
 * Signs out the current user and clears local user cache
 */
export async function signOutUser(): Promise<void> {
  try {
    const profile = await StorageManager.getProfile();
    const key = getClientKey(profile);
    const supabase = getSupabase(profile.supabase_url, key);
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[LingoPing Auth] Sign out warning:', err);
  } finally {
    await StorageManager.onUserLoggedOut();
  }
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
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return null;
    }
    await StorageManager.setCurrentUserId(data.user.id);
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Subscribes to Supabase authentication state changes
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const supabase = getSupabase();
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Synchronizes cards, known words, and reviews between local storage and Supabase.
 * If user has 0 cards in cloud, seeds their starter German deck in cloud.
 */
export async function syncDeckWithCloud(userId: string): Promise<void> {
  const profile = await StorageManager.getProfile();
  const key = getClientKey(profile);
  const supabase = getSupabase(profile.supabase_url, key);

  if (!isSupabaseConfigured(profile.supabase_url, key) || !userId) {
    return;
  }

  try {
    // 1. Fetch remote cards
    const { data: remoteCards, error: remoteCardsErr } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId);

    if (remoteCardsErr) {
      console.warn('[LingoPing] Error fetching remote cards:', remoteCardsErr.message);
      return;
    }

    let localCards = await StorageManager.getCards();

    // If both remote and local are empty, provision starter deck for user
    if ((!remoteCards || remoteCards.length === 0) && localCards.length === 0) {
      console.log('[LingoPing] Provisioning starter German deck for user in cloud...');
      localCards = await StorageManager.initStarterDeckForUser(userId);
      await supabase.from('cards').upsert(localCards, { onConflict: 'id' });
      return;
    }

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
