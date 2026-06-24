// =============================================
// CYMOR CODE LEARNER — LESSON ENGINE v3.2
// Syntax highlight: CSS-only for inline <code>
//                   JS only for <pre><code> blocks
// =============================================

let auth, db, docFn, getDoc, updateDoc, setDoc, arrayUnion, increment, onAuthStateChanged;

async function loadFirebase() {
  try {
    const fb = await import("./firebase/firebase-config.js");
    auth = fb.auth; db = fb.db;
    const A = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const F = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    onAuthStateChanged = A.onAuthStateChanged;
    docFn = F.doc; getDoc = F.getDoc; updateDoc = F.updateDoc;
    setDoc = F.setDoc; arrayUnion = F.arrayUnion; increment = F.increment;

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await syncUserSidebar(user.uid);
        await saveCurrentLesson(user.uid);
        await enforceCheckpointGate(user.uid);
      } else {
        const el = $("userName");
        if (el) el.textContent = "Guest Developer";
      }
    });
  } catch (e) {
    console.warn("Firebase offline.");
  }
}

// ---- State ----
let currentLessonData = null;
let currentStep = 1;
const urlParams    = new URLSearchParams(window.location.search);
const lessonId     = parseInt(urlParams.get("id")) || 1;
const TOTAL        = 31;
const CHECKPOINTS  = [10, 20, 30, 31];
const isCheckpoint = CHECKPOINTS.includes(lessonId);
const $ = id => document.getElementById(id);

function showToast(msg, type = "success") {
  const t = $("authMessage");
  if (!t) return;
  t.textContent = msg; t.className = `auth-message ${type}`; t.style.display = "flex";
  setTimeout(() => { t.style.display = "none"; }, 3500);
}

// ---- Boot ----
document.addEventListener("DOMContentLoaded", () => {
  loadFirebase();
  loadLessonData(lessonId);
  setupNavigation();
  if (isCheckpoint) document.body.classList.add("is-checkpoint");
});

// ---- Load lesson ----
async function loadLessonData(id) {
  try {
    const res = await fetch(`./lessons/lesson-${id}.json`);
    if (!res.ok) throw new Error("Not found");
    currentLessonData = await res.json();
    renderTheoryStep();
    updateProgressUI();
    updateStepRail(1);
  } catch (err) {
    console.error(err);
    if ($("lessonTitle")) $("lessonTitle").textContent = "Lesson not found";
    showToast("Could not load lesson.", "error");
  }
}

// ---- Save resume point ----
async function saveCurrentLesson(uid) {
  if (!db || !docFn) return;
  try { await setDoc(docFn(db, "users", uid), { currentLesson: lessonId }, { merge: true }); }
  catch (e) {}
}

// ---- Navigation ----
function setupNavigation() {
  const masterBtn = $("masterNextBtn");
  const prevBtn   = $("prevLessonBtn");
  if (masterBtn) masterBtn.addEventListener("click", () => {
    if (currentStep === 1)      renderChallengeStep();
    else if (currentStep === 2) renderQuizStep();
    else if (currentStep === 3) finishLesson();
  });
  if (prevBtn) prevBtn.addEventListener("click", () => {
    if (currentStep === 2)      renderTheoryStep();
    else if (currentStep === 3) renderChallengeStep();
  });
}

function toggleStepVisibility(n) {
  currentStep = n;
  document.querySelectorAll(".lesson-step").forEach(s => s.classList.remove("active"));
  const ids = ["step-theory", "step-challenge", "step-quiz"];
  const t = $(ids[n - 1]);
  if (t) t.classList.add("active");
  updateStepRail(n);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateStepRail(active) {
  for (let i = 1; i <= 3; i++) {
    const node = document.querySelector(`.step-node[data-step="${i}"]`);
    const conn = document.querySelector(`.step-connector[data-connector="${i}"]`);
    if (!node) continue;
    node.classList.remove("current", "done");
    if (i < active) node.classList.add("done");
    else if (i === active) node.classList.add("current");
    const dot = node.querySelector(".dot");
    if (dot) dot.textContent = i < active ? "✓" : i;
    if (conn) conn.classList.toggle("done", i < active);
  }
  const labels = ["STEP 1 · THEORY", "STEP 2 · CHALLENGE", "STEP 3 · QUIZ"];
  const ind = $("stepIndicator");
  if (ind) ind.textContent = labels[active - 1];
}

// ================================================================
// RENDER CONTENT — no custom highlighter on inline <code> at all.
//
// How it works:
//   1. Set innerHTML directly from JSON (the JSON already has
//      &lt; &gt; etc. properly escaped in <code> tags)
//   2. The browser renders inline <code> correctly as visible text
//   3. CSS in lesson.html colours ALL inline code cyan via:
//        .lesson-body code { color: var(--syn-tag) }
//   4. For <pre><code> blocks ONLY we add span colours via JS
//      because those are multi-line and benefit from richer colouring
// ================================================================

function renderContent(htmlString, targetEl) {
  // Step 1: inject HTML — browser handles entity decoding correctly
  targetEl.innerHTML = htmlString;
  targetEl.classList.add("lesson-body");

  // Step 2: colour ONLY <pre><code> blocks — never inline <code>
  targetEl.querySelectorAll("pre > code").forEach(block => {
    colorPreBlock(block);
  });
}

function colorPreBlock(block) {
  // Get the innerHTML — already escaped by browser (&lt; not <)
  // We ONLY wrap these safe escaped sequences in spans — never decode them
  let s = block.innerHTML;

  // HTML/XML comments
  s = s.replace(
    /(&lt;!--)([\s\S]*?)(--&gt;)/g,
    '<span class="syn-cmt">$1$2$3</span>'
  );

  // HTML tags — matches &lt;tagname ...&gt; or &lt;/tagname&gt;
  s = s.replace(
    /(&lt;\/?)([\w-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"<]*"|'[^'<]*'|[\w-]+))?)*)\s*(\/?)(&gt;)/g,
    function(_, open, tag, attrs, self, close) {
      // colour attribute=value pairs inside the matched attrs string
      var cAttrs = attrs.replace(
        /([\w:-]+)(\s*=\s*)("([^"<]*)"|'([^'<]*)')/g,
        '<span class="syn-attr">$1</span>' +
        '<span class="syn-punct">$2</span>' +
        '<span class="syn-val">$3</span>'
      );
      return (
        '<span class="syn-punct">' + open  + '</span>' +
        '<span class="syn-tag">'   + tag   + '</span>' +
        cAttrs +
        '<span class="syn-punct">' + self + close + '</span>'
      );
    }
  );

  // CSS property: value;
  s = s.replace(
    /([\w-]+)(\s*:\s*)([^;{}&\n]+)(;)/g,
    '<span class="syn-prop">$1</span>' +
    '<span class="syn-punct">$2</span>' +
    '<span class="syn-val">$3</span>'  +
    '<span class="syn-punct">$4</span>'
  );

  // JS keywords
  ["const","let","var","function","return","if","else","for","while",
   "class","new","this","import","export","async","await","try","catch",
   "document","window","console","addEventListener","querySelector",
   "getElementById","null","true","false","undefined"].forEach(function(kw) {
    s = s.replace(new RegExp("\\b(" + kw + ")\\b", "g"),
      '<span class="syn-kw">$1</span>');
  });

  // Quoted strings (browser-escaped quotes show as &quot; or &#039;)
  s = s.replace(
    /(&quot;[^&\n]*?&quot;|&#039;[^&\n]*?&#039;)/g,
    '<span class="syn-str">$1</span>'
  );

  // Numbers + units
  s = s.replace(
    /\b(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|ms|s)?)\b/g,
    '<span class="syn-num">$1</span>'
  );

  block.innerHTML = s;
}

// ================================================================
// STEP 1: THEORY
// ================================================================
function renderTheoryStep() {
  toggleStepVisibility(1);
  if (!currentLessonData) return;
  const { title, content, summary } = currentLessonData;

  if ($("lessonTitle"))     $("lessonTitle").textContent = title;
  if ($("heroLessonTitle")) $("heroLessonTitle").textContent = title;

  const heroDesc = $("heroLessonDescription");
  if (heroDesc) renderContent(content.explanation, heroDesc);

  const lc = $("lessonContent");
  if (lc) {
    lc.innerHTML = "";
    if (content.syntax_breakdown) {
      const c = document.createElement("div");
      c.className = "card";
      renderContent(content.syntax_breakdown, c);
      lc.appendChild(c);
    }
    if (content.common_mistakes) {
      const c = document.createElement("div");
      c.className = "card";
      c.style.cssText = "border-left:3px solid var(--coral)";
      renderContent(content.common_mistakes, c);
      lc.appendChild(c);
    }
  }

  if ($("takeawaysList") && summary.takeaways) {
    $("takeawaysList").innerHTML = summary.takeaways.map(t => `<li>${t}</li>`).join("");
  }
  if ($("cheatSheetList") && summary.cheat_sheet) {
    $("cheatSheetList").innerHTML = Object.entries(summary.cheat_sheet)
      .map(([k, v]) => `<div class="cheat-item"><h4>${k}</h4><p>${v}</p></div>`)
      .join("");
  }

  const btn = $("masterNextBtn");
  if (btn) {
    btn.textContent = isCheckpoint ? "Start Challenge 🛠️" : "Start Practice ➡";
    btn.disabled    = false;
  }
}

// ================================================================
// STEP 2: CHALLENGE
// ================================================================
function renderChallengeStep() {
  toggleStepVisibility(2);
  if (!currentLessonData) return;
  const { starter_code, mini_challenge: mc } = currentLessonData.editor_sandbox;

  if ($("challengeInstruction")) $("challengeInstruction").textContent = mc.instruction;

  const editor = $("codeEditor");
  if (editor && !editor.dataset.touched) {
    editor.value = starter_code;
    editor.dataset.touched = "true";
  }
  updateLivePreview();
  wireEditor();

  const masterBtn = $("masterNextBtn");
  if (masterBtn) { masterBtn.textContent = "Go to Quiz ➡"; masterBtn.disabled = true; }

  const hintBtn = $("showHintBtn");
  if (hintBtn) {
    const f = hintBtn.cloneNode(true);
    hintBtn.parentNode.replaceChild(f, hintBtn);
    f.addEventListener("click", () => {
      const box = $("challengeHint");
      if (!box) return;
      box.textContent = mc.hint || "Review the lesson above.";
      box.classList.toggle("hidden");
    });
  }

  const checkBtn = $("checkChallengeBtn");
  if (checkBtn) {
    const f = checkBtn.cloneNode(true);
    checkBtn.parentNode.replaceChild(f, checkBtn);
    f.addEventListener("click", () => {
      const code    = ($("codeEditor")?.value || "").toLowerCase();
      const keyword = mc.validation_keyword.toLowerCase();
      if (code.includes(keyword)) {
        masterBtn.disabled    = false;
        masterBtn.textContent = "Go to Quiz ➡";
        showToast("✅ Challenge complete — well done!", "success");
      } else {
        showToast(`Not quite. Include: "${mc.validation_keyword}"`, "error");
      }
    });
  }
}

function wireEditor() {
  const editor = $("codeEditor");
  if (!editor || editor.dataset.wired) return;
  editor.dataset.wired = "true";
  editor.addEventListener("input", updateLivePreview);
}

function updateLivePreview() {
  const preview = $("live-preview");
  const code    = $("codeEditor")?.value || "";
  if (!preview) return;
  try {
    const d = preview.contentDocument || preview.contentWindow?.document;
    if (d) {
      d.open();
      d.write(`<!DOCTYPE html><html><head><style>body{font-family:sans-serif;padding:14px;color:#111;line-height:1.6}code{background:#f1f3f7;padding:2px 5px;border-radius:4px}pre{background:#f1f3f7;padding:12px;border-radius:8px;overflow-x:auto}</style></head><body>${code}</body></html>`);
      d.close();
    }
  } catch (_) {
    preview.srcdoc = `<body style="font-family:sans-serif;padding:14px;color:#111">${code}</body>`;
  }
}

// ================================================================
// STEP 3: QUIZ
// ================================================================
function renderQuizStep() {
  toggleStepVisibility(3);
  if (!currentLessonData) return;
  const quiz = currentLessonData.quiz_engine;
  if ($("quizQuestion")) $("quizQuestion").textContent = quiz.question;
  const wrap = $("quizOptions");
  if (!wrap) return;
  wrap.innerHTML = quiz.options.map((opt, i) =>
    `<button class="quiz-option" onclick="handleQuizSelection(${i},${quiz.correct_index})">${opt}</button>`
  ).join("");
  const btn = $("masterNextBtn");
  if (btn) {
    btn.textContent = isCheckpoint ? "Complete Checkpoint 🏆" : "Complete Lesson 🏆";
    btn.disabled    = true;
  }
}

window.handleQuizSelection = (sel, correct) => {
  document.querySelectorAll(".quiz-option").forEach(o => o.classList.remove("selected","correct","wrong"));
  const picked = document.querySelectorAll(".quiz-option")[sel];
  picked.classList.add("selected");
  const btn = $("masterNextBtn");
  if (sel === correct) {
    picked.classList.add("correct");
    if (btn) btn.disabled = false;
    showToast(`✅ ${currentLessonData?.quiz_engine?.explanation_feedback || "Correct!"}`, "success");
  } else {
    picked.classList.add("wrong");
    if (btn) btn.disabled = true;
    showToast("Not quite — try another option.", "error");
  }
};

// ================================================================
// FINISH + SAVE
// ================================================================
async function finishLesson() {
  const modal = $("successModal");
  const btn   = $("masterNextBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }
  try {
    if (auth?.currentUser && db) {
      const xp = currentLessonData?.quiz_engine?.points || 10;
      await updateDoc(docFn(db, "users", auth.currentUser.uid), {
        completedLessons: arrayUnion(lessonId),
        totalXP: increment(xp),
      });
    }
  } catch (e) { console.warn("Save failed:", e); }
  if (!modal) return;
  modal.classList.remove("hidden");
  const isLast   = lessonId >= TOTAL;
  const nextId   = lessonId + 1;
  const modalBtn = $("modalNextBtn");
  if (!modalBtn) return;
  modalBtn.textContent = isLast ? "🎓 View Certificate" : `Start Lesson ${nextId} 🚀`;
  const fresh = modalBtn.cloneNode(true);
  modalBtn.parentNode.replaceChild(fresh, modalBtn);
  fresh.addEventListener("click", e => {
    e.preventDefault();
    if (isLast) { window.location.href = "./dashboard.html"; return; }
    const next = new URL(window.location.href);
    next.searchParams.set("id", nextId);
    window.location.href = next.pathname + next.search;
  });
}

function updateProgressUI() {
  const pct = Math.min(Math.round((lessonId / TOTAL) * 100), 100);
  if ($("progressPercent")) $("progressPercent").textContent = `${pct}%`;
  if ($("progressFill"))    $("progressFill").style.width   = `${pct}%`;
}

async function syncUserSidebar(uid) {
  try {
    const snap = await getDoc(docFn(db, "users", uid));
    if (snap.exists()) {
      const d = snap.data();
      if ($("userName"))  $("userName").textContent  = d.username || "Developer";
      if ($("userLevel")) $("userLevel").textContent = d.level ? `Level ${d.level}` : "Level 1";
    }
  } catch (e) {}
}

async function enforceCheckpointGate(uid) {
  const gates = { 11: 10, 21: 20, 31: 30 };
  const req   = gates[lessonId];
  if (!req) return;
  try {
    const snap = await getDoc(docFn(db, "users", uid));
    const done = snap.exists() ? (snap.data().completedLessons || []) : [];
    if (!done.includes(req)) {
      showToast(`Complete Lesson ${req} first!`, "error");
      setTimeout(() => {
        const r = new URL(window.location.href);
        r.searchParams.set("id", req);
        window.location.href = r.pathname + r.search;
      }, 2500);
    }
  } catch (e) {}
}
