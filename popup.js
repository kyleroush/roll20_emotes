let currentCampaign = "";
let currentSender = "";
let isActive = false;

const campaignVal = document.getElementById("campaign-val");
const senderVal = document.getElementById("sender-val");
const statusDot = document.getElementById("status-dot");
const emojiButtons = document.querySelectorAll(".emoji-btn");

// Disable buttons by default until connected
function setInteractionState(active) {
  isActive = active;
  emojiButtons.forEach(btn => {
    if (active) {
      btn.classList.remove("disabled");
    } else {
      btn.classList.add("disabled");
    }
  });
}

setInteractionState(false);

// Query active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const activeTab = tabs[0];
  if (!activeTab || !activeTab.id) {
    campaignVal.textContent = "No active tab";
    senderVal.textContent = "N/A";
    return;
  }

  // Check if it's Roll20 editor or our mock page
  const url = activeTab.url || "";
  const isTarget = url.includes("roll20.net/editor") || url.includes("mock_roll20.html") || url.startsWith("file://") && url.includes("mock_roll20.html");
  if (!isTarget) {
    campaignVal.textContent = "Not on Roll20 editor";
    senderVal.textContent = "N/A";
    return;
  }

  // Ask content script for details
  chrome.tabs.sendMessage(activeTab.id, { action: "getCampaignDetails" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      campaignVal.textContent = "Roll20 loading...";
      senderVal.textContent = "N/A";
      console.warn("Could not communicate with content script. It might still be loading.");
      return;
    }

    currentCampaign = response.campaignName || "Default Campaign";
    currentSender = response.sender || "Player";
    
    campaignVal.textContent = currentCampaign;
    senderVal.textContent = currentSender;
    
    statusDot.classList.add("connected");
    setInteractionState(true);
  });
});

// Setup click listeners on emoji buttons
emojiButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (!isActive) return;
    const emoji = btn.textContent;
    
    chrome.runtime.sendMessage({
      action: "sendEmote",
      campaignName: currentCampaign,
      sender: currentSender,
      emote: emoji
    }, (response) => {
      console.log("Emote send response:", response);
      // Close popup
      window.close();
    });
  });
});
