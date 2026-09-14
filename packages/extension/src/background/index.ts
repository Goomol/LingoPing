import { StorageManager } from '../storage/index.js';
import { enrichVocabularyOffline, createCardFromEnrichment } from '@lingoping/core';

const ALARM_NAME = 'lingoping_micro_session';
const CONTEXT_MENU_ID = 'lingoping_add_word';

// Initialize extension lifecycle
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[LingoPing] Extension installed.');
  await StorageManager.initSeedData();

  // Create context menu for instant word capture
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Add "%s" to LingoPing',
    contexts: ['selection'],
  });

  // Setup initial alarm schedule
  await setupAlarm();
  await updateBadge();
});

// Setup or update periodic alarm
export async function setupAlarm() {
  const profile = await StorageManager.getProfile();
  const intervalMinutes = Math.max(1, profile.session_interval_minutes || 10);

  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: intervalMinutes,
    delayInMinutes: intervalMinutes,
  });

  console.log(`[LingoPing] Alarm scheduled every ${intervalMinutes} minutes.`);
}

// Alarm listener: opens standalone popup window
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('[LingoPing] Periodic alarm triggered.');
    await openSessionWindow();
    await updateBadge();
  }
});

// Opens dedicated standalone popup window (440x640)
export async function openSessionWindow(): Promise<chrome.windows.Window | null> {
  const stats = await StorageManager.getStats();
  if (stats.totalCards === 0) {
    console.log('[LingoPing] No cards in deck to review.');
    return null;
  }

  // Check if a session window is already open
  const allWindows = await chrome.windows.getAll({ populate: true });
  for (const win of allWindows) {
    if (win.tabs?.some((t) => t.url?.includes('session.html'))) {
      if (win.id !== undefined) {
        await chrome.windows.update(win.id, { focused: true });
        return win;
      }
    }
  }

  // Create new standalone session window
  const sessionWin = await chrome.windows.create({
    url: 'session.html',
    type: 'popup',
    width: 440,
    height: 640,
    focused: true,
    top: 120,
    left: 120,
  });

  return sessionWin;
}

// Context Menu listener: Quick word capture with context extraction and notification
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && info.selectionText) {
    const selectedWord = info.selectionText.trim();
    if (!selectedWord) return;

    console.log(`[LingoPing] Captured word from webpage: "${selectedWord}"`);

    let contextSentence = '';
    if (tab?.id) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const selection = window.getSelection();
            if (!selection || !selection.anchorNode) return '';
            const parentEl = selection.anchorNode.parentElement;
            const text = parentEl ? parentEl.innerText : '';
            const sel = selection.toString().trim();
            const sentences = text.split(/[.?!]\s+/);
            return sentences.find((s) => s.includes(sel)) || '';
          },
        });
        if (results?.[0]?.result) {
          contextSentence = String(results[0].result).trim();
        }
      } catch (e) {
        console.log('[LingoPing] Context extraction fallback:', e);
      }
    }

    const profile = await StorageManager.getProfile();
    const targetLang = profile.target_language || 'de';

    // 1. Check visual cache first
    const cachedVisual = await StorageManager.getCachedVisual(selectedWord, targetLang);

    const enriched = enrichVocabularyOffline(
      selectedWord,
      targetLang,
      profile.native_language || 'en',
      contextSentence
    );

    // Reuse cached visual if present
    if (cachedVisual) {
      enriched.visual_mnemonic = {
        image_prompt: cachedVisual.visualMeta.image_prompt || '',
        color_theme: cachedVisual.visualMeta.theme_color,
        color_hex: cachedVisual.visualMeta.hex,
      };
    }

    const newCard = createCardFromEnrichment(enriched, profile.id);
    if (cachedVisual) {
      newCard.image_url = cachedVisual.imageUrl;
      newCard.visual_meta = cachedVisual.visualMeta;
    }

    await StorageManager.addCard(newCard);
    await updateBadge();

    // Show desktop notification confirmation
    if (chrome.notifications?.create) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'LingoPing: Word Added!',
        message: `Added "${newCard.front_text}" (${newCard.back_text || ''}) to your review deck.`,
      });
    }

    // Flash badge text confirmation
    await chrome.action.setBadgeText({ text: '✓' });
    await chrome.action.setBadgeBackgroundColor({ color: '#52c41a' });
    setTimeout(async () => {
      await updateBadge();
    }, 2000);
  }
});

// Update badge count with due cards
export async function updateBadge() {
  try {
    const stats = await StorageManager.getStats();
    const dueCount = stats.dueCards;
    if (dueCount > 0) {
      await chrome.action.setBadgeText({ text: String(dueCount) });
      await chrome.action.setBadgeBackgroundColor({ color: '#1677ff' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.error('Failed to update badge:', err);
  }
}

// Runtime messaging listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case 'START_SESSION': {
        await openSessionWindow();
        sendResponse({ success: true });
        break;
      }
      case 'UPDATE_ALARM': {
        await setupAlarm();
        sendResponse({ success: true });
        break;
      }
      case 'REFRESH_BADGE': {
        await updateBadge();
        sendResponse({ success: true });
        break;
      }
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // Keep channel open for async response
});
