/* global chrome */

const DEFAULT_ICON = {
  16: "icons/icon16.png",
  32: "icons/icon32.png",
  48: "icons/icon48.png",
  128: "icons/icon128.png",
};

const SAVED_ICON = {
  16: "icons/icon16-saved.png",
  32: "icons/icon32-saved.png",
  48: "icons/icon48-saved.png",
  128: "icons/icon128-saved.png",
};

const REFRESH_INTERVAL_MINUTES = 10;

// --- URL cache ---

async function getCachedUrls() {
  const data = await chrome.storage.local.get("doodleUrls");
  return data.doodleUrls || [];
}

async function setCachedUrls(urls) {
  await chrome.storage.local.set({ doodleUrls: urls });
}

async function fetchAndCacheUrls() {
  const data = await chrome.storage.local.get("doodleConfig");
  const config = data.doodleConfig;
  if (!config || !config.deployUrl || !config.apiToken) return;

  try {
    const res = await fetch(config.deployUrl + "/api/urls", {
      method: "GET",
      headers: { Authorization: "Bearer " + config.apiToken },
    });
    if (res.ok) {
      const urls = await res.json();
      await setCachedUrls(urls);
    }
  } catch {
    // Network error — keep existing cache
  }
}

// --- Icon update ---

async function updateIconForTab(tabId, url) {
  if (!url || url.startsWith("chrome") || url.startsWith("about:") || url.startsWith("edge:")) {
    await chrome.action.setIcon({ tabId, path: DEFAULT_ICON });
    return;
  }

  const urls = await getCachedUrls();
  const isSaved = urls.includes(url);
  await chrome.action.setIcon({ tabId, path: isSaved ? SAVED_ICON : DEFAULT_ICON });
}

async function updateIconForActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await updateIconForTab(tab.id, tab.url);
    }
  } catch {
    // Tab may not exist anymore
  }
}

// --- Event listeners ---

// Tab activated (switched to)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await updateIconForTab(tab.id, tab.url);
  } catch {
    // Tab may not exist
  }
});

// Tab URL changed
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.url) {
    await updateIconForTab(tabId, changeInfo.url);
  }
});

// Message from popup after saving a bookmark
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "bookmark-saved" && message.url) {
    (async () => {
      // Add URL to local cache immediately
      const urls = await getCachedUrls();
      if (!urls.includes(message.url)) {
        urls.push(message.url);
        await setCachedUrls(urls);
      }
      await updateIconForActiveTab();
      sendResponse({ ok: true });
    })();
    return true; // keep message channel open for async response
  }

  if (message.type === "refresh-cache") {
    (async () => {
      await fetchAndCacheUrls();
      await updateIconForActiveTab();
      sendResponse({ ok: true });
    })();
    return true;
  }
});

// Config changed — refetch URLs
chrome.storage.onChanged.addListener((changes) => {
  if (changes.doodleConfig) {
    fetchAndCacheUrls().then(updateIconForActiveTab);
  }
});

// Periodic refresh
chrome.alarms.create("refresh-urls", { periodInMinutes: REFRESH_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refresh-urls") {
    fetchAndCacheUrls().then(updateIconForActiveTab);
  }
});

// Initial fetch on service worker startup
fetchAndCacheUrls().then(updateIconForActiveTab);
