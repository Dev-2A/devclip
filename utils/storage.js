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
    return snippet;
  },

  // 스니펫 삭제
  async remove(id) {
    const snippets = await this.getAll();
    const filtered = snippets.filter((s) => s.id !== id);
    await chrome.storage.local.set({ snippets: filtered });
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
  },
};
