// Background script for the Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Gemini Subtitles extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup (this is handled automatically by manifest.json)
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          url: tabs[0].url,
          title: tabs[0].title
        });
      }
    });
    return true; // Keep message channel open for async response
  }
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes);
});