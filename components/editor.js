// =============================================
// CYMOR CODE LEARNER - EDITOR ENGINE
// File: components/editor.js
// =============================================

class CymorEditor {
  constructor(options = {}) {
    this.editor = document.getElementById(options.editorId || "codeEditor");
    this.preview = document.getElementById(options.previewId || "live-preview");
    this.runButton = document.getElementById(options.runBtnId || "runCodeBtn");
    
    // Optional UI elements
    this.resetButton = document.getElementById(options.resetBtnId || "reset-code-btn");
    this.copyButton = document.getElementById(options.copyBtnId || "copy-code-btn");
    this.consoleBox = document.getElementById(options.consoleId || "consoleOutput");
    this.wordCount = document.getElementById(options.wordCountId || "editor-word-count");
    this.lineCount = document.getElementById(options.lineCountId || "editor-line-count");

    this.defaultCode = "";
    this.autoSaveKey = "cymor_editor_autosave";

    this.initialize();
  }

  initialize() {
    if (!this.editor) return;

    this.defaultCode = this.editor.value;

    this.loadAutoSavedCode();
    this.updatePreview(); // Initial run on load
    this.updateEditorStats();
    this.attachEvents();

    console.log("🎛️ Cymor Code Editor Module Linked");
  }

  attachEvents() {
    // Live typing updates & Auto-save
    this.editor.addEventListener("input", () => {
      this.updateEditorStats();
      this.autoSave();
    });

    // Tab key support (inserts 2 spaces instead of changing focus)
    this.editor.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        this.editor.value = this.editor.value.substring(0, start) + "  " + this.editor.value.substring(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + 2;
      }
    });

    // Run code event listener
    if (this.runButton) {
      this.runButton.addEventListener("click", () => this.updatePreview());
    }

    // Reset code
    if (this.resetButton) {
      this.resetButton.addEventListener("click", () => this.resetCode());
    }

    // Copy code
    if (this.copyButton) {
      this.copyButton.addEventListener("click", () => this.copyCode());
    }
  }

  // =============================================
  // CORE PREVIEW ENGINE (The fix you requested)
  // =============================================
  updatePreview() {
    if (!this.preview || !this.editor) return;

    const content = this.editor.value;
    
    try {
      // Method 1: Using document.write for high compatibility with injected scripts
      const doc = this.preview.contentDocument || this.preview.contentWindow.document;
      doc.open();
      doc.write(content);
      doc.close();
      
      this.animatePreview();
    } catch (err) {
      console.error("Preview Update Failed:", err);
      // Fallback: Using srcdoc
      this.preview.srcdoc = content;
    }
  }

  // =============================================
  // UTILITIES
  // =============================================
  resetCode() {
    if (confirm("Reset your editor back to the starter code?")) {
      this.editor.value = this.defaultCode;
      this.updatePreview();
      this.updateEditorStats();
      localStorage.removeItem(this.autoSaveKey);
    }
  }

  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.editor.value);
      alert("📋 Code copied to clipboard!");
    } catch (err) {
      console.error("Copy failed", err);
    }
  }

  autoSave() {
    localStorage.setItem(this.autoSaveKey, this.editor.value);
  }

  loadAutoSavedCode() {
    const saved = localStorage.getItem(this.autoSaveKey);
    if (saved) this.editor.value = saved;
  }

  updateEditorStats() {
    const text = this.editor.value;
    const lines = text.split("\n").length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;

    if (this.wordCount) this.wordCount.textContent = `${words} Words`;
    if (this.lineCount) this.lineCount.textContent = `${lines} Lines`;
  }

  animatePreview() {
    this.preview.style.opacity = "0.5";
    setTimeout(() => this.preview.style.opacity = "1", 100);
  }
}

// =============================================
// INITIALIZATION EXPORT
// =============================================
export function initEditor() {
  const editorEl = document.getElementById("codeEditor");
  if (!editorEl) return;

  // Attaches the class instance to the window for global access
  window.cymorEditor = new CymorEditor({
    editorId: "codeEditor",
    previewId: "live-preview",
    runBtnId: "runCodeBtn",
    resetBtnId: "reset-code-btn",
    copyBtnId: "copy-code-btn",
    wordCountId: "editor-word-count",
    lineCountId: "editor-line-count"
  });
}
