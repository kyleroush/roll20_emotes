let campaignName = "Default Campaign";

// Helper to safely send messages to the background script
function safeSendMessage(message, callback) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          // Context is likely invalidated, ignore silently
          return;
        }
        if (callback) callback(response);
      });
    } catch (e) {
      // Catch context invalidation errors silently
    }
  }
}

function getCampaignName() {
  let title = document.title || "";
  // Clean up Roll20 title formats
  if (title.includes(" | ")) {
    title = title.split(" | ")[0];
  }
  title = title.replace("Roll20", "").trim();
  if (!title || title === "Online virtual tabletop" || title === "Roll20: Online virtual tabletop") {
    return "Default Campaign";
  }
  return title;
}

function getSenderName() {
  const speakingAs = document.getElementById("speakingas");
  if (speakingAs && speakingAs.options && speakingAs.options.length > 0) {
    const selectedOption = speakingAs.options[speakingAs.selectedIndex];
    if (selectedOption) {
      return selectedOption.textContent.trim();
    }
  }
  return "Player";
}

function renderEmote(sender, emote) {
  const container = document.getElementById("r20-emote-container");
  if (!container) return;

  const bubble = document.createElement("div");
  bubble.className = "r20-emote-bubble";

  const senderEl = document.createElement("div");
  senderEl.className = "r20-emote-bubble-sender";
  senderEl.textContent = sender;

  const emoteEl = document.createElement("div");
  emoteEl.className = "r20-emote-bubble-char";
  emoteEl.textContent = emote;

  bubble.appendChild(senderEl);
  bubble.appendChild(emoteEl);

  // Randomize initial horizontal offset, sway scale, and rotation
  const randomX = Math.random() * 80 - 40; // -40px to +40px
  const randomRotate = Math.random() * 24 - 12; // -12deg to +12deg
  const scale = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  
  bubble.style.setProperty('--r20-random-x', `${randomX}px`);
  bubble.style.setProperty('--r20-random-rotate', `${randomRotate}deg`);
  bubble.style.transform = `scale(${scale})`;
  
  // Custom duration for float animation
  const duration = 3.5 + Math.random() * 1.5; // 3.5s to 5.0s
  bubble.style.animation = `r20FloatUp ${duration}s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`;

  container.appendChild(bubble);

  // Auto-remove bubble when animation ends
  bubble.addEventListener("animationend", () => {
    bubble.remove();
  });
}

function init() {
  campaignName = getCampaignName();
  console.log("Roll20 Emote Share active for campaign:", campaignName);
  
  // Inject the floating emote rendering container
  if (!document.getElementById("r20-emote-container")) {
    const container = document.createElement("div");
    container.id = "r20-emote-container";
    document.body.appendChild(container);
  }

  // Notify background script that we joined the campaign
  safeSendMessage({
    action: "joinCampaign",
    campaignName: campaignName
  });
}

// Poll for DOM readiness of the chat container or layout.
const pollInterval = setInterval(() => {
  const sidebar = document.getElementById("rightsidebar") || document.getElementById("speakingas") || document.getElementById("textchat-input");
  if (sidebar) {
    clearInterval(pollInterval);
    init();
  }
}, 1000);

// Observe title mutations to adapt if campaign loads asynchronously
const titleObserver = new MutationObserver(() => {
  const currentTitle = getCampaignName();
  if (currentTitle && currentTitle !== campaignName && currentTitle !== "Online virtual tabletop" && currentTitle !== "Default Campaign") {
    campaignName = currentTitle;
    console.log("Campaign name updated dynamically to:", campaignName);
    safeSendMessage({
      action: "joinCampaign",
      campaignName: campaignName
    });
  }
});

const titleNode = document.querySelector('title');
if (titleNode) {
  titleObserver.observe(titleNode, { subtree: true, characterData: true, childList: true });
}

// Heartbeat to keep service worker alive
setInterval(() => {
  if (campaignName) {
    safeSendMessage({
      action: "heartbeat",
      campaignName: campaignName
    });
  }
}, 20000);

// Listen for messages from popup or background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "emoteReceived") {
    renderEmote(message.sender, message.emote);
  } else if (message.action === "getCampaignDetails") {
    sendResponse({
      campaignName: campaignName,
      sender: getSenderName()
    });
  }
});
