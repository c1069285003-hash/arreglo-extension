// 点击Extension图标 → 打开Side Panel
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// 在my.uscis.gov上自动启用side panel
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url?.includes('my.uscis.gov')) {
    chrome.sidePanel.setOptions({
      tabId,
      path: 'popup.html',
      enabled: true,
    });
  }
});
