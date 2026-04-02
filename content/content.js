// DevClip - Content Script
// 웹 페이지의 코드 블록을 감지하고 복사/저장 버튼을 주입

(function () {
  "use strict";

  const PROCESSED_ATTR = "data-devclip-processed";

  // ===== 언어 감지 =====

  /**
   * 클래스명 기반 언어 감지
   */
  function detectLanguageFromClass(codeBlock) {
    const codeEl = codeBlock.querySelector("code") || codeBlock;
    const classes = [...codeEl.classList, ...codeBlock.classList];

    for (const cls of classes) {
      const match = cls.match(/^(?:language-|lang-|highlight-|brush:\s*)(.+)$/);
      if (match) return match[1].toLowerCase().trim();

      if (cls.startsWith("hljs") && cls !== "hljs") {
        return cls.replace("hljs-", "").toLowerCase();
      }
    }

    // GitHub 등에서 data-lang 속성 사용
    const dataLang =
      codeEl.getAttribute("data-lang") ||
      codeBlock.getAttribute("data-lang") ||
      codeEl.getAttribute("data-language") ||
      codeBlock.getAttribute("data-language");
    if (dataLang) return dataLang.toLowerCase();

    return null;
  }

  /**
   * 코드 내용 기반 언어 추론 (휴리스틱)
   */
  function detectLanguageFromContent(code) {
    const lines = code.trim().split("\n");
    const firstLine = lines[0] || "";
    const text = code.toLowerCase();

    // Shebang 라인
    if (firstLine.startsWith("#!/")) {
      if (firstLine.includes("python")) return "python";
      if (firstLine.includes("node")) return "javascript";
      if (firstLine.includes("bash") || firstLine.includes("sh")) return "bash";
      if (firstLine.includes("ruby")) return "ruby";
      if (firstLine.includes("perl")) return "perl";
    }

    // HTML
    if (
      /^\s*<!doctype\s+html/i.test(firstLine) ||
      /^\s*<html/i.test(firstLine) ||
      (text.includes("<div") && text.includes("</div>"))
    ) {
      return "html";
    }

    // CSS
    if (
      /^\s*[.#@][\w-]+\s*\{/.test(code) ||
      (text.includes("{") &&
        /:\s*[\w#]+;/.test(code) &&
        !text.includes("function"))
    ) {
      return "css";
    }

    // JSON
    if (/^\s*[\[{]/.test(code) && /[\]}]\s*$/.test(code)) {
      try {
        JSON.parse(code);
        return "json";
      } catch {}
    }

    // YAML
    if (
      /^\s*[\w-]+:\s*.+/m.test(code) &&
      !text.includes("function") &&
      !text.includes("{") &&
      lines.length > 1
    ) {
      return "yaml";
    }

    // Python
    if (
      /^\s*(def |class |import |from |if __name__|print\(|async def )/.test(
        code,
      ) ||
      (text.includes("self.") && text.includes("def "))
    ) {
      return "python";
    }

    // TypeScript (TS 고유 패턴 먼저 체크)
    if (
      /:\s*(string|number|boolean|void|any|never)\b/.test(code) ||
      text.includes("interface ") ||
      /:\s*React\.FC/.test(code) ||
      text.includes(": observable") ||
      /as\s+(string|number|any)\b/.test(code)
    ) {
      return "typescript";
    }

    // JavaScript / JSX
    if (
      /^\s*(const |let |var |function |import |export |=>|async )/.test(code) ||
      text.includes("console.log") ||
      text.includes("document.") ||
      text.includes("require(")
    ) {
      if (text.includes("jsx") || /<[A-Z][\w]*/.test(code)) return "jsx";
      return "javascript";
    }

    // Java
    if (
      /^\s*(public |private |protected |package |import java\.)/.test(code) ||
      text.includes("system.out.println") ||
      /\bclass\s+\w+\s*(extends|implements)/.test(code)
    ) {
      return "java";
    }

    // C/C++
    if (
      /^\s*#include\s*[<"]/.test(code) ||
      text.includes("int main(") ||
      text.includes("std::") ||
      text.includes("printf(")
    ) {
      if (
        text.includes("std::") ||
        text.includes("cout") ||
        text.includes("iostream")
      ) {
        return "cpp";
      }
      return "c";
    }

    // C#
    if (
      /^\s*using\s+System/.test(code) ||
      text.includes("console.writeline") ||
      /\bnamespace\s+\w+/.test(code)
    ) {
      return "csharp";
    }

    // Go
    if (
      /^\s*package\s+\w+/.test(code) ||
      text.includes("func main()") ||
      text.includes("fmt.println") ||
      text.includes(":= ")
    ) {
      return "go";
    }

    // Rust
    if (
      /^\s*(fn |use |mod |let mut |impl |pub fn )/.test(code) ||
      text.includes("println!(") ||
      text.includes("-> Result")
    ) {
      return "rust";
    }

    // SQL
    if (
      /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i.test(
        firstLine,
      ) ||
      /\b(FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b/i.test(code)
    ) {
      return "sql";
    }

    // Shell/Bash
    if (
      /^\s*(echo |cd |ls |mkdir |chmod |curl |wget |apt |npm |git |docker )/.test(
        code,
      ) ||
      /^\s*\$\s/.test(firstLine)
    ) {
      return "bash";
    }

    // Dockerfile
    if (
      /^\s*(FROM|RUN|CMD|COPY|EXPOSE|ENTRYPOINT|WORKDIR)\s/i.test(firstLine)
    ) {
      return "dockerfile";
    }

    // Markdown
    if (
      /^#{1,6}\s/.test(firstLine) ||
      (text.includes("```") && /^\s*[-*]\s/.test(code))
    ) {
      return "markdown";
    }

    return "plaintext";
  }

  /**
   * 통합 언어 감지
   */
  function detectLanguage(codeBlock) {
    // 1순위: 클래스명/속성 기반
    const fromClass = detectLanguageFromClass(codeBlock);
    if (fromClass) return fromClass;

    // 2순위: 코드 내용 기반 추론
    const code = extractCode(codeBlock);
    return detectLanguageFromContent(code);
  }

  // ===== 코드 추출 =====

  function extractCode(codeBlock) {
    const codeEl = codeBlock.querySelector("code") || codeBlock;
    return codeEl.innerText || codeEl.textContent || "";
  }

  // ===== 클립보드 =====

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
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

  // ===== 토스트 알림 =====

  function showToast(message, type = "success") {
    // 기존 토스트 제거
    const existing = document.querySelector(".devclip-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "devclip-toast";

    const colors = {
      success: { bg: "#10B981", icon: "✓" },
      error: { bg: "#EF4444", icon: "✗" },
      info: { bg: "#3B82F6", icon: "ℹ" },
    };
    const { bg, icon } = colors[type] || colors.success;

    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: ${bg};
      color: white;
      border-radius: 8px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      opacity: 0;
      transform: translateY(12px);
      transition: all 0.25s ease;
    `;

    toast.innerHTML = `
      <span style="font-size: 15px; line-height: 1;">${icon}</span>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // 애니메이션: 등장
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    // 2초 후 퇴장
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px)";
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ===== 버튼 상태 =====

  function flashSuccess(btn, originalHTML) {
    const originalContent = btn.innerHTML;
    btn.textContent = "✓";
    btn.classList.add("devclip-btn-success");
    setTimeout(() => {
      btn.innerHTML = originalContent;
      btn.classList.remove("devclip-btn-success");
    }, 1500);
  }

  // ===== 스마트 제목 생성 =====

  function generateTitle(language, pageTitle) {
    // 페이지 제목이 너무 길면 앞 50자만
    const title =
      pageTitle.length > 50 ? pageTitle.substring(0, 50) + "..." : pageTitle;

    return `${title} — ${language}`;
  }

  // ===== 버튼 주입 =====

  function injectButtons(preBlock) {
    if (preBlock.hasAttribute(PROCESSED_ATTR)) return;
    preBlock.setAttribute(PROCESSED_ATTR, "true");

    // wrapper로 감싸기
    const wrapper = document.createElement("div");
    wrapper.className = "devclip-wrapper";
    preBlock.parentNode.insertBefore(wrapper, preBlock);
    wrapper.appendChild(preBlock);

    // 버튼 바
    const bar = document.createElement("div");
    bar.className = "devclip-bar";

    // 📋 복사 버튼
    const copyBtn = document.createElement("button");
    copyBtn.className = "devclip-btn devclip-btn-copy";
    copyBtn.innerHTML = "📋 복사";
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const code = extractCode(preBlock);
      const success = await copyToClipboard(code);
      if (success) {
        flashSuccess(copyBtn, copyBtn.innerHTML);
        showToast("클립보드에 복사되었습니다!");
      }
    });

    // 💾 저장 버튼
    const saveBtn = document.createElement("button");
    saveBtn.className = "devclip-btn devclip-btn-save";
    saveBtn.innerHTML = "💾 저장";
    saveBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const code = extractCode(preBlock);
      const language = detectLanguage(preBlock);
      const pageTitle = document.title;
      const pageUrl = window.location.href;

      const snippet = {
        code: code.trim(),
        language,
        title: generateTitle(language, pageTitle),
        url: pageUrl,
        tags: [],
      };

      try {
        await DevClipStorage.save(snippet);
        flashSuccess(saveBtn, saveBtn.innerHTML);
        showToast(`스니펫 저장 완료! (${language})`, "success");
      } catch (err) {
        console.error("DevClip 저장 실패:", err);
        saveBtn.textContent = "❌ 실패";
        showToast("저장에 실패했습니다", "error");
        setTimeout(() => {
          saveBtn.innerHTML = "💾 저장";
        }, 1500);
      }
    });

    bar.appendChild(copyBtn);
    bar.appendChild(saveBtn);
    wrapper.appendChild(bar);
  }

  // ===== 스캔 =====

  function scanAndInject() {
    const preBlocks = document.querySelectorAll("pre");
    preBlocks.forEach((pre) => {
      const text = (pre.innerText || "").trim();
      if (text.length > 0) {
        injectButtons(pre);
      }
    });
  }

  // 초기 스캔
  scanAndInject();

  // SPA 대응: DOM 변경 감지
  const observer = new MutationObserver((mutations) => {
    let hasNewNodes = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true;
        break;
      }
    }
    if (hasNewNodes) {
      setTimeout(scanAndInject, 300);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
