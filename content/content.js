// DevClip - Content Script
// 웹 페이지의 코드 블록을 감지하고 복사/저장 버튼을 주입

(function () {
  "use strict";

  // 이미 처리한 코드 블록 표시용
  const PROCESSED_ATTR = "data-devclip-processed";

  /**
   * 코드 블록에서 텍스트 추출
   */
  function extractCode(codeBlock) {
    // <pre><code> 구조이면 <code>에서 추출
    const codeEl = codeBlock.querySelector("code") || codeBlock;
    return codeEl.innerText || codeEl.textContent || "";
  }

  /**
   * 코드 블록의 언어 감지 (클래스명 기반)
   */
  function detectLanguage(codeBlock) {
    const codeEl = codeBlock.querySelector("code") || codeBlock;
    const classes = [...codeEl.classList, ...codeBlock.classList];

    for (const cls of classes) {
      // language-xxx, lang-xxx, highlight-xxx 패턴
      const match = cls.match(/^(?:language-|lang-|highlight-)(.+)$/);
      if (match) return match[1].toLowerCase();

      // hljs 등 특정 라이브러리 클래스
      if (cls.startsWith("hljs") && cls !== "hljs") {
        return cls.replace("hljs-", "").toLowerCase();
      }
    }

    return "plaintext";
  }

  /**
   * 클립보드에 복사
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback: execCommand
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    }
  }

  /**
   * 버튼 클릭 후 일시적으로 성공 상태 표시
   */
  function flashSuccess(btn, originalText) {
    btn.textContent = "✓";
    btn.classList.add("devclip-btn-success");
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove("devclip-btn-success");
    }, 1500);
  }

  /**
   * 코드 블록 하나에 DevClip 버튼 바를 주입
   */
  function injectButtons(preBlock) {
    if (preBlock.hasAttribute(PROCESSED_ATTR)) return;
    preBlock.setAttribute(PROCESSED_ATTR, "true");

    // wrapper로 감싸기 (position: relative 적용)
    const wrapper = document.createElement("div");
    wrapper.className = "devclip-wrapper";
    preBlock.parentNode.insertBefore(wrapper, preBlock);
    wrapper.appendChild(preBlock);

    // 버튼 바 생성
    const bar = document.createElement("div");
    bar.className = "devclip-bar";

    // 📋 복사 버튼
    const copyBtn = document.createElement("button");
    copyBtn.className = "devclip-btn devclip-btn-copy";
    copyBtn.textContent = "📋 복사";
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const code = extractCode(preBlock);
      const success = await copyToClipboard(code);
      if (success) flashSuccess(copyBtn, "📋 복사");
    });

    // 💾 저장 버튼
    const saveBtn = document.createElement("button");
    saveBtn.className = "devclip-btn devclip-btn-save";
    saveBtn.textContent = "💾 저장";
    saveBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const code = extractCode(preBlock);
      const language = detectLanguage(preBlock);
      const pageTitle = document.title;
      const pageUrl = window.location.href;

      const snippet = {
        code: code.trim(),
        language,
        title: `${pageTitle} - ${language}`,
        url: pageUrl,
        tags: [],
      };

      try {
        await DevClipStorage.save(snippet);
        flashSuccess(saveBtn, "💾 저장");
      } catch (err) {
        console.error("DevClip 저장 실패:", err);
        saveBtn.textContent = "❌ 실패";
        setTimeout(() => {
          saveBtn.textContent = "💾 저장";
        }, 1500);
      }
    });

    bar.appendChild(copyBtn);
    bar.appendChild(saveBtn);
    wrapper.appendChild(bar);
  }

  /**
   * 페이지 내 모든 <pre> 블록을 스캔하여 버튼 주입
   */
  function scanAndInject() {
    const preBlocks = document.querySelectorAll("pre");
    preBlocks.forEach((pre) => {
      // 코드가 포함된 <pre>만 대상 (빈 <pre>는 스킵)
      const text = (pre.innerText || "").trim();
      if (text.length > 0) {
        injectButtons(pre);
      }
    });
  }

  // 초기 스캔
  scanAndInject();

  // SPA 대응: DOM 변경 감지하여 새로 추가된 코드 블록에도 주입
  const observer = new MutationObserver((mutations) => {
    let hasNewNodes = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true;
        break;
      }
    }
    if (hasNewNodes) {
      // 약간의 딜레이를 줘서 렌더링 완료 후 스캔
      setTimeout(scanAndInject, 300);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
