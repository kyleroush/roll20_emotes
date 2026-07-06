const DB_URL = "https://rem-apple-default-rtdb.firebaseio.com";
const tabsMap = new Map(); // tabId -> campaignKey
const activeConnections = new Map(); // campaignKey -> { eventSource: EventSource, refCount: number }

function sanitizePathKey(str) {
  if (!str) return "default_campaign";
  return str.replace(/[\.\#\$\/\[\]]/g, "_").trim();
}

function connectToCampaign(campaignKey, tabId) {
  // Check if this tab is already registered in tabsMap
  const oldCampaignKey = tabsMap.get(tabId);
  if (oldCampaignKey === campaignKey) {
    // Already registered to the same campaign, nothing to do
    return;
  }

  // Clean up old association if it exists
  if (oldCampaignKey) {
    disconnectTabFromCampaign(tabId, oldCampaignKey);
  }

  // Register new association
  tabsMap.set(tabId, campaignKey);

  // Check if we already have an active EventSource connection for this campaign
  let conn = activeConnections.get(campaignKey);
  if (conn) {
    conn.refCount += 1;
    console.log(`Reused connection for campaign '${campaignKey}', refCount = ${conn.refCount}`);
    return;
  }

  // Create new connection
  const url = `${DB_URL}/campaigns/${campaignKey}/emotes.json`;
  console.log(`Opening EventSource to ${url}`);
  const source = new EventSource(url);
  
  let isInitialized = false;

  source.addEventListener('put', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.path === "/") {
        // Initial dump of all existing data under the path
        isInitialized = true;
      } else {
        // A single child was added
        if (isInitialized && data.data) {
          broadcastToCampaign(campaignKey, {
            action: "emoteReceived",
            emote: data.data.emote,
            sender: data.data.sender
          });
        }
      }
    } catch (e) {
      console.error("Error parsing SSE put data:", e);
    }
  });

  source.onerror = (err) => {
    console.error(`Firebase SSE error for ${campaignKey}:`, err);
    // If it fails, close and schedule a reconnect if still needed
    source.close();
    activeConnections.delete(campaignKey);
    
    // Check if there are still tabs in this campaign
    setTimeout(() => {
      // Re-evaluate if we need to reconnect
      let hasTabs = false;
      for (const key of tabsMap.values()) {
        if (key === campaignKey) {
          hasTabs = true;
          break;
        }
      }
      if (hasTabs) {
        console.log(`Reconnecting to campaign '${campaignKey}'...`);
        // Force recreation
        connectToCampaign(campaignKey, tabId);
      }
    }, 5000);
  };

  activeConnections.set(campaignKey, {
    eventSource: source,
    refCount: 1
  });
  console.log(`Opened new connection for campaign '${campaignKey}'`);
}

function disconnectTabFromCampaign(tabId, campaignKey) {
  const conn = activeConnections.get(campaignKey);
  if (conn) {
    conn.refCount -= 1;
    console.log(`Tab ${tabId} left campaign '${campaignKey}', refCount = ${conn.refCount}`);
    if (conn.refCount <= 0) {
      conn.eventSource.close();
      activeConnections.delete(campaignKey);
      console.log(`Closed EventSource connection for campaign '${campaignKey}' as no active tabs remain`);
    }
  }
}

function broadcastToCampaign(campaignKey, message) {
  for (const [tabId, key] of tabsMap.entries()) {
    if (key === campaignKey) {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        // Check for error indicating the tab has been closed
        if (chrome.runtime.lastError) {
          console.log(`Tab ${tabId} is no longer accessible. Cleaning up.`);
          tabsMap.delete(tabId);
          disconnectTabFromCampaign(tabId, campaignKey);
        }
      });
    }
  }
}

// Clean up disconnected tabs when service worker detects tab closing
chrome.tabs.onRemoved.addListener((tabId) => {
  const campaignKey = tabsMap.get(tabId);
  if (campaignKey) {
    tabsMap.delete(tabId);
    disconnectTabFromCampaign(tabId, campaignKey);
  }
});

// Listener for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.action === "joinCampaign" || message.action === "heartbeat") {
    if (!tabId) return; // Enforce tab constraint only for tab-specific actions
    const campaignKey = sanitizePathKey(message.campaignName);
    connectToCampaign(campaignKey, tabId);
    sendResponse({ status: "connected", campaignKey });
  } else if (message.action === "sendEmote") {
    const campaignKey = sanitizePathKey(message.campaignName);
    const url = `${DB_URL}/campaigns/${campaignKey}/emotes.json`;
    
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sender: message.sender,
        emote: message.emote,
        timestamp: Date.now()
      })
    })
    .then(res => res.json())
    .then(data => {
      sendResponse({ status: "success", id: data.name });
    })
    .catch(err => {
      console.error("Error sending emote:", err);
      sendResponse({ status: "error", error: err.message });
    });
    
    return true; // Keep message channel open for async response
  }
});
