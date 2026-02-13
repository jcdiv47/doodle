/* global chrome */

const $ = (sel) => document.querySelector(sel);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

// State
let pageInfo = { url: "", title: "", description: "", favicon: "" };
let tags = [];
let allTags = []; // all existing tags fetched from API
let config = { deployUrl: "", apiToken: "" };

// Tag suggestion state
let suggestions = [];
let activeIndex = -1;

// DOM refs
const mainPanel = $("#main-panel");
const settingsPanel = $("#settings-panel");
const states = {
  loading: $("#state-loading"),
  noconfig: $("#state-noconfig"),
  ready: $("#state-ready"),
  saving: $("#state-saving"),
  saved: $("#state-saved"),
  error: $("#state-error"),
};

// --- State management ---

function showState(name) {
  Object.values(states).forEach(hide);
  show(states[name]);
}

// --- Settings ---

function openSettings() {
  hide(mainPanel);
  show(settingsPanel);
  $("#deploy-url").value = config.deployUrl;
  $("#api-token").value = config.apiToken;
  hideSettingsStatus();
}

function closeSettings() {
  hide(settingsPanel);
  show(mainPanel);
  init();
}

function showSettingsStatus(msg, ok) {
  const el = $("#settings-status");
  el.textContent = msg;
  el.className = "status-text " + (ok ? "success" : "fail");
  show(el);
}

function hideSettingsStatus() {
  hide($("#settings-status"));
}

async function saveSettings() {
  const deployUrl = $("#deploy-url").value.trim().replace(/\/+$/, "");
  const apiToken = $("#api-token").value.trim();
  if (!deployUrl || !apiToken) {
    showSettingsStatus("both fields are required", false);
    return;
  }
  config = { deployUrl, apiToken };
  await chrome.storage.local.set({ doodleConfig: config });
  showSettingsStatus("settings saved", true);
}

async function testConnection() {
  if (!config.deployUrl || !config.apiToken) {
    showSettingsStatus("save settings first", false);
    return;
  }
  showSettingsStatus("testing...", true);
  try {
    const res = await fetch(config.deployUrl + "/api/bookmark", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.apiToken,
      },
      body: JSON.stringify({}),
    });
    if (res.status === 400) {
      showSettingsStatus("connection ok \u2014 token valid", true);
    } else if (res.status === 401) {
      showSettingsStatus("invalid api token", false);
    } else {
      showSettingsStatus("unexpected response: " + res.status, false);
    }
  } catch (e) {
    showSettingsStatus("connection failed: " + e.message, false);
  }
}

// --- Fetch existing tags from API ---

async function fetchAllTags() {
  if (!config.deployUrl || !config.apiToken) return;
  try {
    const res = await fetch(config.deployUrl + "/api/tags", {
      method: "GET",
      headers: { Authorization: "Bearer " + config.apiToken },
    });
    if (res.ok) {
      allTags = await res.json();
    }
  } catch {
    // Silently fail — suggestions just won't appear
  }
}

// --- Tags ---

function renderTags() {
  const list = $("#tags-list");
  list.innerHTML = "";
  tags.forEach((tag, i) => {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    pill.innerHTML =
      "<span>" + escapeHtml(tag) + '</span><button data-idx="' + i + '">\u00d7</button>';
    list.appendChild(pill);
  });
}

function addTag(text) {
  const tag = text.trim().toLowerCase();
  if (!tag || tags.includes(tag)) return;
  tags.push(tag);
  renderTags();
}

function removeTag(idx) {
  tags.splice(idx, 1);
  renderTags();
}

// --- Tag suggestions ---

function updateSuggestions() {
  const input = $("#tag-input");
  const query = input.value.trim().toLowerCase();
  const dropdown = $("#tag-suggestions");

  if (!query) {
    suggestions = [];
    activeIndex = -1;
    hide(dropdown);
    return;
  }

  suggestions = allTags.filter(
    (t) => !tags.includes(t) && t.includes(query) && t !== query
  );
  activeIndex = -1;

  if (suggestions.length === 0) {
    hide(dropdown);
    return;
  }

  renderSuggestions(query);
  show(dropdown);
}

function renderSuggestions(query) {
  const dropdown = $("#tag-suggestions");
  dropdown.innerHTML = "";
  suggestions.forEach((tag, i) => {
    const btn = document.createElement("button");
    btn.className = "suggestion-item" + (i === activeIndex ? " active" : "");
    btn.dataset.idx = i;

    // Highlight matching substring
    const matchStart = tag.indexOf(query);
    if (matchStart >= 0) {
      const before = escapeHtml(tag.slice(0, matchStart));
      const match = escapeHtml(tag.slice(matchStart, matchStart + query.length));
      const after = escapeHtml(tag.slice(matchStart + query.length));
      btn.innerHTML = before + '<span class="match">' + match + "</span>" + after;
    } else {
      btn.textContent = tag;
    }

    dropdown.appendChild(btn);
  });
}

function selectSuggestion(idx) {
  if (idx >= 0 && idx < suggestions.length) {
    addTag(suggestions[idx]);
  }
  const input = $("#tag-input");
  input.value = "";
  suggestions = [];
  activeIndex = -1;
  hide($("#tag-suggestions"));
  input.focus();
}

function updateActiveItem() {
  const dropdown = $("#tag-suggestions");
  const items = dropdown.querySelectorAll(".suggestion-item");
  items.forEach((item, i) => {
    item.classList.toggle("active", i === activeIndex);
  });
  // Scroll active item into view
  if (activeIndex >= 0 && items[activeIndex]) {
    items[activeIndex].scrollIntoView({ block: "nearest" });
  }
}

// --- Save ---

function commitPendingTag() {
  const input = $("#tag-input");
  if (input && input.value.trim()) {
    addTag(input.value);
    input.value = "";
  }
}

async function saveBookmark() {
  commitPendingTag();
  hide($("#tag-suggestions"));
  showState("saving");
  const notes = $("#notes-input").value.trim();
  try {
    const res = await fetch(config.deployUrl + "/api/bookmark", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.apiToken,
      },
      body: JSON.stringify({
        url: pageInfo.url,
        tags: tags.length > 0 ? tags : undefined,
        notes: notes || undefined,
      }),
    });
    if (res.ok) {
      // Notify background service worker to update icon cache
      chrome.runtime.sendMessage({ type: "bookmark-saved", url: pageInfo.url });
      showState("saved");
      setTimeout(() => window.close(), 1200);
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = data.error || "request failed (" + res.status + ")";
      showError(msg);
    }
  } catch (e) {
    showError("network error: " + e.message);
  }
}

function showError(msg) {
  $("#error-message").textContent = msg;
  showState("error");
}

// --- Page info extraction ---

async function extractPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return null;

    const info = { url: tab.url || "", title: tab.title || "", description: "", favicon: tab.favIconUrl || "" };

    // Don't try to inject into chrome:// or extension pages
    if (info.url.startsWith("chrome") || info.url.startsWith("about:") || info.url.startsWith("edge:")) {
      return info;
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const meta =
            document.querySelector('meta[name="description"]') ||
            document.querySelector('meta[property="og:description"]');
          return meta ? meta.getAttribute("content") || "" : "";
        },
      });
      if (results && results[0] && results[0].result) {
        info.description = results[0].result;
      }
    } catch {
      // Injection may fail on restricted pages — that's ok
    }

    return info;
  } catch {
    return null;
  }
}

// --- Init ---

async function init() {
  showState("loading");

  // Load config
  const stored = await chrome.storage.local.get("doodleConfig");
  if (stored.doodleConfig) {
    config = stored.doodleConfig;
  }

  if (!config.deployUrl || !config.apiToken) {
    showState("noconfig");
    return;
  }

  // Fetch page info and existing tags in parallel
  const [info] = await Promise.all([extractPageInfo(), fetchAllTags()]);
  if (info) {
    pageInfo = info;
  }

  // Populate preview
  if (pageInfo.favicon) {
    $("#preview-favicon").src = pageInfo.favicon;
    show($("#preview-favicon"));
  } else {
    hide($("#preview-favicon"));
  }
  $("#preview-title").textContent = pageInfo.title || pageInfo.url;
  $("#preview-url").textContent = pageInfo.url;
  if (pageInfo.description) {
    $("#preview-description").textContent = pageInfo.description;
    show($("#preview-description"));
  } else {
    hide($("#preview-description"));
  }

  tags = [];
  renderTags();
  $("#notes-input").value = "";
  $("#tag-input").value = "";
  hide($("#tag-suggestions"));

  showState("ready");
}

// --- Helpers ---

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// --- Event listeners ---

document.addEventListener("DOMContentLoaded", () => {
  // Navigation
  $("#settings-btn").addEventListener("click", openSettings);
  $("#back-btn").addEventListener("click", closeSettings);
  $("#goto-settings").addEventListener("click", openSettings);

  // Settings
  $("#save-settings-btn").addEventListener("click", saveSettings);
  $("#test-btn").addEventListener("click", testConnection);

  // Tag input
  $("#tag-input").addEventListener("input", updateSuggestions);

  $("#tag-input").addEventListener("keydown", (e) => {
    const hasDropdown = suggestions.length > 0;

    if (e.key === "ArrowDown" && hasDropdown) {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
      updateActiveItem();
    } else if (e.key === "ArrowUp" && hasDropdown) {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      updateActiveItem();
    } else if (e.key === "Tab" && hasDropdown) {
      e.preventDefault();
      const pick = activeIndex >= 0 ? activeIndex : 0;
      selectSuggestion(pick);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && hasDropdown) {
        selectSuggestion(activeIndex);
      } else {
        addTag(e.target.value);
        e.target.value = "";
        suggestions = [];
        activeIndex = -1;
        hide($("#tag-suggestions"));
      }
    } else if (e.key === "Escape") {
      if (hasDropdown) {
        e.preventDefault();
        suggestions = [];
        activeIndex = -1;
        hide($("#tag-suggestions"));
      }
    } else if (e.key === "Backspace" && !e.target.value && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  });

  // Click on suggestion (mousedown to prevent blur)
  $("#tag-suggestions").addEventListener("mousedown", (e) => {
    e.preventDefault();
    const btn = e.target.closest(".suggestion-item");
    if (btn) selectSuggestion(parseInt(btn.dataset.idx, 10));
  });

  // Hover on suggestion
  $("#tag-suggestions").addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".suggestion-item");
    if (btn) {
      activeIndex = parseInt(btn.dataset.idx, 10);
      updateActiveItem();
    }
  });

  // Remove tag pill
  $("#tags-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-idx]");
    if (btn) removeTag(parseInt(btn.dataset.idx, 10));
  });

  // Save
  $("#save-btn").addEventListener("click", saveBookmark);
  $("#retry-btn").addEventListener("click", saveBookmark);

  // Ctrl/Cmd+Enter to save
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      if (!states.ready.classList.contains("hidden")) {
        saveBookmark();
      }
    }
  });

  init();
});
