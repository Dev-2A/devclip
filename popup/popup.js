// DevClip - Popup Script
(async function () {
  "use strict";

  // DOM 요소
  const snippetList = document.getElementById("snippet-list");
  const emptyState = document.getElementById("empty-state");
  const noResults = document.getElementById("no-results");
  const snippetCount = document.getElementById("snippet-count");
  const searchInput = document.getElementById("search-input");
  const tagFilterArea = document.getElementById("tag-filter-area");
  const tagList = document.getElementById("tag-list");
  const btnExport = document.getElementById("btn-export");
  const btnClear = document.getElementById("btn-clear");

  let currentFilter = ""; // 현재 검색어
  let activeTag = null; // 현재 선택된 태그

  /**
   * 스니펫 목록 렌더링
   */
  async function render() {
    let snippets;

    if (currentFilter) {
      snippets = await DevClipStorage.search(currentFilter);
    } else {
      snippets = await DevClipStorage.getAll();
    }

    // 태그 필터 적용
    if (activeTag) {
      snippets = snippets.filter((s) => s.tags && s.tags.includes(activeTag));
    }

    const total = (await DevClipStorage.getAll()).length;
    snippetCount.textContent = total;

    // 상태 표시 전환
    snippetList.classList.add("hidden");
    emptyState.classList.add("hidden");
    noResults.classList.add("hidden");

    if (total === 0) {
      emptyState.classList.remove("hidden");
      tagFilterArea.classList.add("hidden");
      return;
    }

    if (snippets.length === 0) {
      noResults.classList.remove("hidden");
      return;
    }

    snippetList.classList.remove("hidden");
    snippetList.innerHTML = "";

    snippets.forEach((snippet) => {
      const card = createSnippetCard(snippet);
      snippetList.appendChild(card);
    });

    // 태그 영역 업데이트
    await renderTags();
  }

  /**
   * 스니펫 카드 HTML 생성
   */
  function createSnippetCard(snippet) {
    const card = document.createElement("div");
    card.className =
      "px-4 py-3 border-b border-gray-100 hover:bg-white transition-colors cursor-default";

    // 코드 미리보기 (최대 3줄)
    const preview = snippet.code.split("\n").slice(0, 3).join("\n");
    const timeAgo = getTimeAgo(snippet.createdAt);

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2 mb-1.5">
        <span class="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">${escapeHtml(snippet.language)}</span>
        <div class="flex items-center gap-1 shrink-0">
          <button class="devclip-popup-btn copy-btn p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="복사">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>
          <button class="devclip-popup-btn delete-btn p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="삭제">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <pre class="text-xs font-mono bg-gray-900 text-gray-100 rounded-lg p-2.5 overflow-x-auto mb-2 leading-relaxed">${escapeHtml(preview)}</pre>
      <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-1">
          ${
            snippet.tags && snippet.tags.length > 0
              ? snippet.tags
                  .map(
                    (t) =>
                      `<span class="tag-chip text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100">${escapeHtml(t)}</span>`,
                  )
                  .join("")
              : ""
          }
        </div>
        <span class="text-xs text-gray-400 shrink-0">${timeAgo}</span>
      </div>
      ${
        snippet.url
          ? `<a href="${escapeHtml(snippet.url)}" target="_blank" rel="noopener"
              class="block text-xs text-gray-400 hover:text-blue-500 truncate mt-1" title="${escapeHtml(snippet.url)}">
              🔗 ${escapeHtml(new URL(snippet.url).hostname)}
            </a>`
          : ""
      }
    `;

    // 복사 버튼
    card.querySelector(".copy-btn").addEventListener("click", async () => {
      await navigator.clipboard.writeText(snippet.code);
      const btn = card.querySelector(".copy-btn");
      btn.innerHTML = `<svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>`;
      setTimeout(() => {
        btn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>`;
      }, 1500);
    });

    // 삭제 버튼
    card.querySelector(".delete-btn").addEventListener("click", async () => {
      await DevClipStorage.remove(snippet.id);
      render();
    });

    // 태그 클릭 → 태그 필터
    card.querySelectorAll(".tag-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        activeTag = chip.textContent;
        render();
      });
    });

    return card;
  }

  /**
   * 태그 필터 영역 렌더링
   */
  async function renderTags() {
    const tags = await DevClipStorage.getAllTags();

    if (tags.length === 0) {
      tagFilterArea.classList.add("hidden");
      return;
    }

    tagFilterArea.classList.remove("hidden");
    tagList.innerHTML = "";

    // "전체" 버튼
    const allBtn = document.createElement("button");
    allBtn.className = `text-xs px-2 py-1 rounded-full font-medium transition-colors ${
      activeTag === null
        ? "bg-blue-500 text-white"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;
    allBtn.textContent = "전체";
    allBtn.addEventListener("click", () => {
      activeTag = null;
      render();
    });
    tagList.appendChild(allBtn);

    // 각 태그 버튼
    tags.forEach((tag) => {
      const btn = document.createElement("button");
      btn.className = `text-xs px-2 py-1 rounded-full font-medium transition-colors ${
        activeTag === tag
          ? "bg-blue-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`;
      btn.textContent = tag;
      btn.addEventListener("click", () => {
        activeTag = tag;
        render();
      });
      tagList.appendChild(btn);
    });
  }

  /**
   * 상대 시간 표시
   */
  function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return date.toLocaleDateString("ko-KR");
  }

  /**
   * HTML 이스케이프
   */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // --- 이벤트 바인딩 ---

  // 검색
  searchInput.addEventListener("input", (e) => {
    currentFilter = e.target.value;
    render();
  });

  // JSON 내보내기
  btnExport.addEventListener("click", async () => {
    const json = await DevClipStorage.exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devclip-snippets-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 전체 삭제
  btnClear.addEventListener("click", async () => {
    const total = (await DevClipStorage.getAll()).length;
    if (total === 0) return;
    if (confirm(`저장된 스니펫 ${total}개를 모두 삭제하시겠습니까?`)) {
      await DevClipStorage.clear();
      activeTag = null;
      currentFilter = "";
      searchInput.value = "";
      render();
    }
  });

  // 초기 렌더링
  render();
})();
