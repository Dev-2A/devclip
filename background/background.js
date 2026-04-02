// DevClip - Background Service Worker (Manifest V3)

// 설치 시 초기화
chrome.runtime.onInstalled.addListener(async () => {
  console.log("DevClip 익스텐션이 설치되었습니다.");

  // 기존 저장된 스니펫 수로 뱃지 업데이트
  const result = await chrome.storage.local.get("snippets");
  const count = (result.snippets || []).length;
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: "#3B82F6" });
  }
});

// Storage 변경 감지 → 뱃지 자동 업데이트
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.snippets) {
    const count = (changes.snippets.newValue || []).length;
    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: "#3B82F6" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  }
});
