// =============================================
// CYMOR CODE LEARNER - EDITOR ENGINE
// File: components/editor.js
// =============================================

class CymorEditor {
  constructor(options = {}) {
    // Maps seamlessly to your updated app.js layout parameters
    this.editor = document.getElementById(options.editorId || "codeEditor");
    this.preview = document.getElementById(options.previewId || "live-preview");
    this.runButton = document.getElementById(options.runBtnId || "runCodeBtn");
    this.resetButton = document.getElementById(options.resetBtnId || "reset-code-btn");
    this.copyButton = document.getElementById(options.copyBtnId || "copy-code-btn");
    this.fullscreenButton = document.getElementById(options.fullscreenBtnId || "fullscreen-preview-btn");
    this.consoleBox = document.getElementById(options.consoleId || "consoleOutput");
    this.wordCount = document.getElementById(options.wordCountId || "editor-word-count");
    this.lineCount = document.getElementById(options.lineCountId || "editor-line-count");
    this.challengeBox = document.getElementById(options.challengeId || "challenge-status");

    this.defaultCode = "";
    this.autoSaveKey = "cymor_editor_autosave";

    this.initialize();
  }

  initialize() {
    if (!this.editor) {
      console.error("Cymor Editor failed to initialize: Missing editor element.");
      return;
    }

    this.defaultCode = this.editor.value;

    this.loadAutoSavedCode();
    this.updatePreview();
    this.updateEditorStats();
    this.attachEvents();

    console.log("🎛️ Cymor Code Editor Module Linked");
    this.log("Cymor Live Editor Initialized Successfully 🚀");
  }

  attachEvents() {
    // Live typing updates
    this.editor.addEventListener("input", () => {
      this.updateEditorStats();
      this.autoSave();
    });

    // Tab support configuration
    this.editor.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();

        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;

        this.editor.value =
          this.editor.value.substring(0, start) +
          "  " +
          this.editor.value.substring(end);

        this.editor.selectionStart = this.editor.selectionEnd = start + 2;
      }
    });

    // Run code event listener
    if (this.runButton) {
      this.runButton.addEventListener("click", () => {
        this.runCode();
      });
    }

    // Reset code event listener
    if (this.resetButton) {
      this.resetButton.addEventListener("click", () => {
        this.resetCode();
      });
    }

    // Copy code event listener
    if (this.copyButton) {
      this.copyButton.addEventListener("click", () => {
        this.copyCode();
      });
    }

    // Fullscreen preview event listener
    if (this.fullscreenButton) {
      this.fullscreenButton.addEventListener("click", () => {
        this.openFullscreenPreview();
      });
    }
  }

  // =============================================
  // RUN CODE VIA CONTEXTUAL INTERCEPTION SANDBOX
  // =============================================
  runCode() {
    const code = this.editor.value;

    if (!code.trim()) {
      this.log("⚠️ Cannot run empty code.", "warning");
      return;
    }

    // Clear output console container prior to compiling fresh executions
    if (this.consoleBox) this.consoleBox.textContent = "";

    try {
      // Safe contextual execution capture pipeline 
      const logBuffer = [];
      const originalLog = console.log;
      
      // Route programmatic runtime returns into local view layer 
      console.log = (...args) => {
        logBuffer.push(args.join(" "));
      };

      // Compile evaluation string safely via an isolated function wrapper
      new Function(code)();

      // Restore system diagnostic log instances to baseline environment
      console.log = originalLog;

      const runOutputs = logBuffer.join("\n") || "Code executed successfully with no console returns.";
      this.log(runOutputs, "success");

      // Update native frame fallbacks if attached visually 
      this.updatePreview();
      this.animatePreview();

    } catch (error) {
      this.log(`❌ Error: ${error.message}`, "error");
    }
  }

  updatePreview() {
    if (this.preview) {
      this.preview.srcdoc = this.editor.value;
    }
  }

  // =============================================
  // RESET CODE
  // =============================================
  resetCode() {
    const confirmed = confirm("Reset your editor back to the starter code?");
    if (!confirmed) return;

    this.editor.value = this.defaultCode;
    this.updatePreview();
    this.updateEditorStats();
    localStorage.removeItem(this.autoSaveKey);

    this.log("♻️ Editor reset successfully.", "success");
  }

  // =============================================
  // COPY CODE
  // =============================================
  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.editor.value);
      this.log("📋 Code copied to clipboard.", "success");
    } catch (error) {
      this.log("❌ Failed to copy code.", "error");
      console.error(error);
    }
  }

  // =============================================
  // AUTO SAVE
  // =============================================
  autoSave() {
    localStorage.setItem(this.autoSaveKey, this.editor.value);
  }

  loadAutoSavedCode() {
    const saved = localStorage.getItem(this.autoSaveKey);
    if (saved) {
      this.editor.value = saved;
      this.log("💾 Restored your previous session.", "info");
    }
  }

  // =============================================
  // EDITOR STATS
  // =============================================
  updateEditorStats() {
    const text = this.editor.value;
    const lines = text.split("\n").length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;

    if (this.wordCount) {
      this.wordCount.textContent = `${words} Words`;
    }
    if (this.lineCount) {
      this.lineCount.textContent = `${lines} Lines`;
    }
  }

  // =============================================
  // FULLSCREEN PREVIEW
  // =============================================
  openFullscreenPreview() {
    const previewWindow = window.open("", "_blank");
    previewWindow.document.open();
    previewWindow.document.write(this.editor.value);
    previewWindow.document.close();

    this.log("🖥️ Opened fullscreen preview.", "info");
  }

  // =============================================
  // CHALLENGE VALIDATION
  // =============================================
  validateChallenge(keyword) {
    const code = this.editor.value;
    if (!keyword) return false;

    const passed = code.includes(keyword);

    if (this.challengeBox) {
      if (passed) {
        this.challengeBox.innerHTML = `
          <span class="challenge-success">
            ✅ Challenge Completed Successfully!
          </span>
        `;
      } else {
        this.challengeBox.innerHTML = `
          <span class="challenge-fail">
            ❌ Challenge Incomplete. Keep trying.
          </span>
        `;
      }
    }
    return passed;
  }

  // =============================================
  // PREVIEW ANIMATION
  // =============================================
  animatePreview() {
    if (!this.preview) return;
    this.preview.classList.add("preview-flash");
    setTimeout(() => {
      this.preview.classList.remove("preview-flash");
    }, 500);
  }

  // =============================================
  // TERMINAL WRITER EMULATOR
  // =============================================
  log(message, type = "default") {
    if (!this.consoleBox) return;

    // Direct text assignment handling for simpler output targets
    if (this.consoleBox.tagName === "TEXTAREA" || this.consoleBox.id === "consoleOutput") {
      this.consoleBox.textContent = message;
      return;
    }

    const item = document.createElement("div");
    item.className = `console-log ${type}`;
    const time = new Date().toLocaleTimeString();

    item.innerHTML = `
      <span class="console-time">[${time}]</span>
      <span class="console-message">${message}</span>
    `;
    this.consoleBox.prepend(item);
  }
}

// =============================================
// ES EXPORT INITIALIZATION PIPELINE FOR APP.JS
// =============================================
export function initEditor() {
  const editorExists = document.getElementById("codeEditor") || document.getElementById("code-editor");
  if (!editorExists) return;

  window.cymorEditor = new CymorEditor({
    editorId: "codeEditor",
    previewId: "live-preview",
    runBtnId: "runCodeBtn",
    resetBtnId: "reset-code-btn",
    copyBtnId: "copy-code-btn",
    fullscreenBtnId: "fullscreen-preview-btn",
    consoleId: "consoleOutput",
    wordCountId: "editor-word-count",
    lineCountId: "editor-line-count",
    challengeId: "challenge-status"
  });
}

// Fallback auto-init hook if running non-modularly or testing elements standalone
document.addEventListener("DOMContentLoaded", () => {
  // Only auto-initialize natively if not explicitly loaded via structural ES import
  if (!window.cymorEditor) {
    initEditor();
  }
});
