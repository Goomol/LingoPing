import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default project configuration (can be populated via .env or updated in Settings)
export const DEFAULT_SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://lingoping.supabase.co';

export const DEFAULT_SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const DEFAULT_SUPABASE_ANON_KEY = DEFAULT_SUPABASE_KEY;

let supabaseInstance: SupabaseClient | null = null;

/**
 * Storage adapter that persists Supabase auth session in chrome.storage.local
 */
const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(key);
      return (res[key] as string) || null;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [key]: value });
      return;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.remove(key);
      return;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
};

/**
 * Returns or initializes the global Supabase client
 */
export function getSupabase(url?: string, anonKey?: string): SupabaseClient {
  const targetUrl = url || DEFAULT_SUPABASE_URL;
  const targetKey = anonKey || DEFAULT_SUPABASE_ANON_KEY;

  if (
    supabaseInstance &&
    (!url || url === DEFAULT_SUPABASE_URL) &&
    (!anonKey || anonKey === DEFAULT_SUPABASE_ANON_KEY)
  ) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(targetUrl, targetKey, {
    auth: {
      storage: chromeStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseInstance;
}

/**
 * Checks whether valid Supabase credentials have been configured
 */
export function isSupabaseConfigured(url?: string, anonKey?: string): boolean {
  const targetUrl = url || DEFAULT_SUPABASE_URL;
  const targetKey = anonKey || DEFAULT_SUPABASE_ANON_KEY;
  return (
    Boolean(targetUrl) &&
    !targetUrl.includes('placeholder') &&
    Boolean(targetKey) &&
    !targetKey.includes('placeholder')
  );
}
