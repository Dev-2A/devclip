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
  const btnImport = document.getElementById("btn-import");
  const importFile = document.getElementById("import-file");
  const btnClear = document.getElementById("btn-clear");

  let currentFilter = "";
  let activeTag = null;
  let expandedId = null; // 현재 펼쳐진 스니펫 ID

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

    if (activeTag) {
      snippets = snippets.filter((s) => s.tags && s.tags.includes(activeTag));
    }

    const total = (await DevClipStorage.getAll()).length;
    snippetCount.textContent = total;

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

    await renderTags();
  }

  /**
   * 스니펫 카드 생성
   */
  function createSnippetCard(snippet) {
    const card = document.createElement("div");
    card.className =
      "border-b border-gray-100 hover:bg-white transition-colors";

    const isExpanded = expandedId === snippet.id;
    const lines = snippet.code.split("\n");
    const preview = lines.slice(0, 3).join("\n");
    const hasMore = lines.length > 3;
    const displayCode = isExpanded ? snippet.code : preview;
    const timeAgo = getTimeAgo(snippet.createdAt);

    card.innerHTML = `
      <div class="px-4 py-3">
        <!-- 상단: 제목 편집 + 액션 버튼 -->
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <span class="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">${escapeHtml(snippet.language)}</span>
            <span class="snippet-title text-xs text-gray-700 truncate cursor-pointer hover:text-blue-600"
              title="클릭하여 제목 편집">${escapeHtml(snippet.title)}</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button class="copy-btn p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="복사">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
            <button class="delete-btn p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="삭제">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 코드 미리보기 / 전체 보기 -->
        <div class="code-area cursor-pointer" title="클릭하여 ${isExpanded ? "접기" : "펼치기"}">
          <pre class="text-xs font-mono bg-gray-900 text-gray-100 rounded-lg p-2.5 overflow-x-auto mb-2 leading-relaxed ${
            isExpanded ? "max-h-64 overflow-y-auto" : "max-h-20 overflow-hidden"
          }">${escapeHtml(displayCode)}</pre>
          ${
            hasMore && !isExpanded
              ? `<p class="text-xs text-blue-500 -mt-1 mb-1.5 font-medium">▼ ${lines.length}줄 전체 보기</p>`
              : ""
          }
          ${
            isExpanded
              ? `<p class="text-xs text-gray-400 -mt-1 mb-1.5 font-medium">▲ 접기</p>`
              : ""
          }
        </div>

        <!-- 태그 + 시간 -->
        <div class="flex items-center justify-between">
          <div class="flex flex-wrap items-center gap-1">
            ${
              snippet.tags && snippet.tags.length > 0
                ? snippet.tags
                    .map(
                      (t) =>
                        `<span class="tag-chip text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100 transition-colors">${escapeHtml(t)}</span>`,
                    )
                    .join("")
                : ""
            }
            <button class="add-tag-btn text-xs text-gray-400 hover:text-blue-500 px-1 transition-colors" title="태그 추가">+</button>
          </div>
          <span class="text-xs text-gray-400 shrink-0">${timeAgo}</span>
        </div>

        <!-- 출처 URL -->
        ${
          snippet.url
            ? `<a href="${escapeHtml(snippet.url)}" target="_blank" rel="noopener"
                class="block text-xs text-gray-400 hover:text-blue-500 truncate mt-1 transition-colors"
                title="${escapeHtml(snippet.url)}">
                🔗 ${escapeHtml(new URL(snippet.url).hostname)}
              </a>`
            : ""
        }
      </div>
    `;

    // --- 이벤트 바인딩 ---

    // 코드 영역 클릭 → 펼치기/접기
    card.querySelector(".code-area").addEventListener("click", () => {
      expandedId = expandedId === snippet.id ? null : snippet.id;
      render();
    });

    // 복사 버튼
    card.querySelector(".copy-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
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
    card.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await DevClipStorage.remove(snippet.id);
      if (expandedId === snippet.id) expandedId = null;
      render();
    });

    // 제목 클릭 → 인라인 편집
    card.querySelector(".snippet-title").addEventListener("click", (e) => {
      e.stopPropagation();
      const titleEl = card.querySelector(".snippet-title");
      const currentTitle = snippet.title;

      const input = document.createElement("input");
      input.type = "text";
      input.value = currentTitle;
      input.className =
        "text-xs text-gray-700 border border-blue-300 rounded px-1.5 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-500";

      titleEl.replaceWith(input);
      input.focus();
      input.select();

      const saveTitle = async () => {
        const newTitle = input.value.trim() || currentTitle;
        await DevClipStorage.update(snippet.id, { title: newTitle });
        render();
      };

      input.addEventListener("blur", saveTitle);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") input.blur();
        if (ev.key === "Escape") {
          input.value = currentTitle;
          input.blur();
        }
      });
    });

    // 태그 추가 버튼
    card.querySelector(".add-tag-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const addBtn = card.querySelector(".add-tag-btn");

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "태그 입력 후 Enter";
      input.className =
        "text-xs border border-blue-300 rounded px-1.5 py-0.5 w-20 focus:outline-none focus:ring-1 focus:ring-blue-500";

      addBtn.replaceWith(input);
      input.focus();

      const saveTag = async () => {
        const tag = input.value.trim();
        if (tag && !(snippet.tags || []).includes(tag)) {
          const newTags = [...(snippet.tags || []), tag];
          await DevClipStorage.update(snippet.id, { tags: newTags });
        }
        render();
      };

      input.addEventListener("blur", saveTag);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") input.blur();
        if (ev.key === "Escape") {
          input.value = "";
          input.blur();
        }
      });
    });

    // 태그 칩 클릭 → 태그 필터
    card.querySelectorAll(".tag-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
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

  // JSON 가져오기
  btnImport.addEventListener("click", () => {
    importFile.click();
  });

  importFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await DevClipStorage.importJSON(text);
      alert(`${count}개 스니펫을 가져왔습니다.`);
      render();
    } catch (err) {
      alert("가져오기 실패: 올바른 JSON 파일인지 확인해주세요.");
    }

    importFile.value = "";
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
      expandedId = null;
      render();
    }
  });

  // 초기 렌더링
  render();
})();
