// DevClip - Chrome Storage 래퍼 모듈
const DevClipStorage = {
  // 모든 스니펫 가져오기
  async getAll() {
    const result = await chrome.storage.local.get("snippets");
    return result.snippets || [];
  },

  // 스니펫 저장
  async save(snippet) {
    const snippets = await this.getAll();
    snippet.id = Date.now().toString();
    snippet.createdAt = new Date().toISOString();
    snippets.unshift(snippet); // 최신순으로 맨 앞에 추가
    await chrome.storage.local.set({ snippets });
    this.updateBadge(snippets.length);
    return snippet;
  },

  // 스니펫 삭제
  async remove(id) {
    const snippets = await this.getAll();
    const filtered = snippets.filter((s) => s.id !== id);
    await chrome.storage.local.set({ snippets: filtered });
    this.updateBadge(filtered.length);
  },

  // 스니펫 수정
  async update(id, updates) {
    const snippets = await this.getAll();
    const index = snippets.findIndex((s) => s.id === id);
    if (index !== -1) {
      snippets[index] = { ...snippets[index], ...updates };
      await chrome.storage.local.set({ snippets });
    }
  },

  // 전체 삭제
  async clear() {
    await chrome.storage.local.set({ snippets: [] });
    this.updateBadge(0);
  },

  // 태그 목록 가져오기 (모든 스니펫에서 사용된 태그 수집)
  async getAllTags() {
    const snippets = await this.getAll();
    const tagSet = new Set();
    snippets.forEach((s) => {
      if (s.tags && Array.isArray(s.tags)) {
        s.tags.forEach((t) => tagSet.add(t));
      }
    });
    return [...tagSet].sort();
  },

  // 검색 (제목, 코드, 태그 통합)
  async search(query) {
    const snippets = await this.getAll();
    if (!query || query.trim() === "") return snippets;

    const q = query.toLowerCase().trim();
    return snippets.filter((s) => {
      const inTitle = (s.title || "").toLowerCase().includes(q);
      const inCode = (s.code || "").toLowerCase().includes(q);
      const inTags = s.tags && s.tags.some((t) => t.toLowerCase().includes(q));
      const inLang = (s.language || "").toLowerCase().includes(q);
      return inTitle || inCode || inTags || inLang;
    });
  },

  // JSON 내보내기
  async exportJSON() {
    const snippets = await this.getAll();
    return JSON.stringify(snippets, null, 2);
  },

  // JSON 가져오기
  async importJSON(jsonString) {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported)) throw new Error("잘못된 형식");
    const existing = await this.getAll();
    const merged = [...imported, ...existing];
    await chrome.storage.local.set({ snippets: merged });
    this.updateBadge(merged.length);
    return merged.length;
  },

  // 태그별 스니펫 개수 가져오기
  async getTagCounts() {
    const snippets = await this.getAll();
    const counts = {};
    snippets.forEach((s) => {
      if (s.tags && Array.isArray(s.tags)) {
        s.tags.forEach((t) => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    return counts;
  },

  // 특정 스니펫에서 태그 제거
  async removeTag(id, tag) {
    const snippets = await this.getAll();
    const index = snippets.findIndex((s) => s.id === id);
    if (index !== -1 && snippets[index].tags) {
      snippets[index].tags = snippets[index].tags.filter((t) => t !== tag);
      await chrome.storage.local.set({ snippets });
    }
  },

  // 툴바 아이콘에 뱃지 카운트 표시
  updateBadge(count) {
    try {
      if (chrome.action) {
        if (count > 0) {
          chrome.action.setBadgeText({ text: String(count) });
          chrome.action.setBadgeBackgroundColor({ color: "#3B82F6" });
        } else {
          chrome.action.setBadgeText({ text: "" });
        }
      }
    } catch {
      // Content Script에서 호출 시 chrome.action 접근 불가 → 무시
    }
  },
};
