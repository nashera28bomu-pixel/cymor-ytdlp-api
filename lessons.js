// =============================================
// CYMOR CODE LEARNER — LESSON ENGINE v3.0
// Matches lesson.html + lesson-1.json through lesson-31.json
// Features:
//   - 3-step rail (Theory → Challenge → Quiz)
//   - Checkpoint detection (lessons 10, 20, 30, 31)
//   - Keyword-gated challenge validation
//   - Live preview iframe
//   - Firebase progress sync
//   - URL-skip protection for checkpoints
// =============================================

// ---- Firebase (lazy-loaded to survive offline) ----
let auth, db, doc, getDoc, updateDoc, arrayUnion, increment, onAuthStateChanged;

async function loadFirebase() {
  try {
    const fb          = await import("./firebase/firebase-config.js");
    auth = fb.auth;
    db   = fb.db;

    const authSDK      = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const firestoreSDK = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

    onAuthStateChanged = authSDK.onAuthStateChanged;
    doc        = firestoreSDK.doc;
    getDoc     = firestoreSDK.getDoc;
    updateDoc  = firestoreSDK.updateDoc;
    arrayUnion = firestoreSDK.arrayUnion;
    increment  = firestoreSDK.increment;

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await syncUserSidebar(user.uid);
        await enforceCheckpointGate(user.uid);
      } else {
        const el = $("userName");
        if (el) el.textContent = "Guest Developer";
      }
    });
  } catch (e) {
    console.warn("Firebase offline — progress will not be saved.");
  }
}

// ---- State ----
let currentLessonData = null;
let currentStep       = 1;

const urlParams = new URLSearchParams(window.location.search);
const lessonId  = parseInt(urlParams.get("id")) || 1;

const TOTAL_LESSONS  = 31;
const CHECKPOINTS    = [10, 20, 30, 31];
const isCheckpoint   = CHECKPOINTS.includes(lessonId);

// ---- Helpers ----
const $ = (id) => document.getElementById(id);

function showToast(msg, type = "success") {
  const toast = $("authMessage");
  if (!toast) return;
  toast.textContent  = msg;
  toast.className    = `auth-message ${type}`;
  toast.style.display = "flex";
  setTimeout(() => { toast.style.display = "none"; }, 3500);
}

// ---- Boot ----
document.addEventListener("DOMContentLoaded", () => {
  loadFirebase();
  loadLessonData(lessonId);
  setupNavigation();

  if (isCheckpoint) document.body.classList.add("is-checkpoint");
});

// ---- Data loading ----
async function loadLessonData(id) {
  try {
    const res = await fetch(`./lessons/lesson-${id}.json`);
    if (!res.ok) throw new Error(`Lesson ${id} not found`);

    currentLessonData = await res.json();
    renderTheoryStep();
    updateProgressUI();
    updateStepRail(1);
  } catch (err) {
    console.error("Load error:", err);
    if ($("lessonTitle")) $("lessonTitle").textContent = "Lesson not found";
    showToast("Could not load this lesson.", "error");
  }
}

// ---- Navigation wiring ----
function setupNavigation() {
  const masterBtn = $("masterNextBtn");
  const prevBtn   = $("prevLessonBtn");

  if (masterBtn) {
    masterBtn.addEventListener("click", () => {
      if (currentStep === 1) renderChallengeStep();
      else if (currentStep === 2) renderQuizStep();
      else if (currentStep === 3) finishLesson();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentStep === 2) renderTheoryStep();
      else if (currentStep === 3) renderChallengeStep();
    });
  }
}

// ---- Step visibility ----
function toggleStepVisibility(stepNum) {
  currentStep = stepNum;
  document.querySelectorAll(".lesson-step").forEach(s => s.classList.remove("active"));
  const stepIds = ["step-theory", "step-challenge", "step-quiz"];
  const target  = $(stepIds[stepNum - 1]);
  if (target) target.classList.add("active");
  updateStepRail(stepNum);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---- Step rail update ----
function updateStepRail(activeStep) {
  const labels = ["Theory", "Challenge", "Quiz"];

  for (let i = 1; i <= 3; i++) {
    const node      = document.querySelector(`.step-node[data-step="${i}"]`);
    const connector = document.querySelector(`.step-connector[data-connector="${i}"]`);
    if (!node) continue;

    node.classList.remove("current", "done");
    if (i < activeStep)       node.classList.add("done");
    else if (i === activeStep) node.classList.add("current");

    const dot = node.querySelector(".dot");
    if (dot) dot.textContent = i < activeStep ? "✓" : i;

    if (connector) {
      connector.classList.toggle("done", i < activeStep);
    }
  }

  const stepLabels = ["STEP 1 · THEORY", "STEP 2 · CHALLENGE", "STEP 3 · QUIZ"];
  const ind = $("stepIndicator");
  if (ind) ind.textContent = stepLabels[activeStep - 1];
}

// ---- STEP 1: Theory ----
function renderTheoryStep() {
  toggleStepVisibility(1);
  if (!currentLessonData) return;

  const { title, content, summary, meta } = currentLessonData;

  // Titles
  if ($("lessonTitle"))          $("lessonTitle").textContent  = title;
  if ($("heroLessonTitle"))      $("heroLessonTitle").textContent = title;
  if ($("heroLessonDescription")) $("heroLessonDescription").innerHTML = content.explanation;

  // Syntax breakdown card (injected after heroLessonDescription)
  const lessonContent = $("lessonContent");
  if (lessonContent) {
    lessonContent.innerHTML = "";

    if (content.syntax_breakdown) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = content.syntax_breakdown;
      lessonContent.appendChild(card);
    }

    if (content.common_mistakes) {
      const card = document.createElement("div");
      card.className = "card";
      card.style.borderLeft = "3px solid var(--coral)";
      card.innerHTML = content.common_mistakes;
      lessonContent.appendChild(card);
    }
  }

  // Takeaways
  if ($("takeawaysList") && summary.takeaways) {
    $("takeawaysList").innerHTML = summary.takeaways
      .map(t => `<li>${t}</li>`)
      .join("");
  }

  // Cheat sheet
  if ($("cheatSheetList") && summary.cheat_sheet) {
    $("cheatSheetList").innerHTML = Object.entries(summary.cheat_sheet)
      .map(([key, value]) => `
        <div class="card" style="margin-bottom:10px;">
          <h4 style="color:var(--cyan); font-size:0.85rem; font-family:'Fira Code',monospace; margin-bottom:5px;">${key}</h4>
          <p style="font-size:0.88rem; color:var(--text-dim);">${value}</p>
        </div>
      `)
      .join("");
  }

  // Nav
  const btn = $("masterNextBtn");
  if (btn) {
    btn.textContent = isCheckpoint ? "Start Challenge 🛠️" : "Start Practice ➡";
    btn.disabled    = false;
  }
}

// ---- STEP 2: Challenge ----
function renderChallengeStep() {
  toggleStepVisibility(2);
  if (!currentLessonData) return;

  const sandbox = currentLessonData.editor_sandbox;
  const mc      = sandbox.mini_challenge;

  // Instruction (plain text — your real app uses textContent, not innerHTML)
  if ($("challengeInstruction")) {
    $("challengeInstruction").textContent = mc.instruction;
  }

  // Load starter code only on first visit to this step
  const editor = $("codeEditor");
  if (editor && !editor.dataset.touched) {
    editor.value = sandbox.starter_code;
    editor.dataset.touched = "true";
  }

  updateLivePreview();
  wireEditor();

  // Nav state
  const masterBtn = $("masterNextBtn");
  if (masterBtn) {
    masterBtn.textContent = "Go to Quiz ➡";
    masterBtn.disabled    = true;
  }

  // Hint button
  const hintBtn = $("showHintBtn");
  if (hintBtn) {
    // Clone to remove any old listeners
    const fresh = hintBtn.cloneNode(true);
    hintBtn.parentNode.replaceChild(fresh, hintBtn);

    fresh.addEventListener("click", () => {
      const hintBox = $("challengeHint");
      if (!hintBox) return;
      hintBox.textContent = mc.hint || "Try reviewing the lesson above.";
      hintBox.classList.toggle("hidden");
    });
  }

  // Check button
  const checkBtn = $("checkChallengeBtn");
  if (checkBtn) {
    const fresh = checkBtn.cloneNode(true);
    checkBtn.parentNode.replaceChild(fresh, checkBtn);

    fresh.addEventListener("click", () => {
      const userCode = ($("codeEditor")?.value || "").toLowerCase();
      const keyword  = mc.validation_keyword.toLowerCase();

      if (userCode.includes(keyword)) {
        masterBtn.disabled    = false;
        masterBtn.textContent = "Go to Quiz ➡";
        showToast("✅ Challenge complete — well done!", "success");
      } else {
        showToast(`Not quite. Make sure your code includes: "${mc.validation_keyword}"`, "error");
      }
    });
  }
}

// ---- Live preview ----
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
    const iDoc = preview.contentDocument || preview.contentWindow?.document;
    if (iDoc) {
      iDoc.open();
      iDoc.write(`<html><head><style>body{font-family:sans-serif;padding:16px;color:#111;line-height:1.6;}code{background:#f1f3f7;padding:2px 6px;border-radius:4px;font-family:monospace;}pre{background:#f1f3f7;padding:12px;border-radius:8px;overflow-x:auto;}</style></head><body>${code}</body></html>`);
      iDoc.close();
    }
  } catch (_) {
    // Fallback for sandboxed iframes
    preview.srcdoc = `<html><body style="font-family:sans-serif;padding:16px;color:#111;line-height:1.6;">${code}</body></html>`;
  }
}

// ---- STEP 3: Quiz ----
function renderQuizStep() {
  toggleStepVisibility(3);
  if (!currentLessonData) return;

  const quiz = currentLessonData.quiz_engine;

  if ($("quizQuestion")) $("quizQuestion").textContent = quiz.question;

  const optionsWrapper = $("quizOptions");
  if (!optionsWrapper) return;

  optionsWrapper.innerHTML = quiz.options
    .map((opt, i) => `
      <button
        class="quiz-option"
        data-index="${i}"
        onclick="handleQuizSelection(${i}, ${quiz.correct_index})"
      >${opt}</button>
    `)
    .join("");

  const btn = $("masterNextBtn");
  if (btn) {
    btn.textContent = isCheckpoint ? "Complete Checkpoint 🏆" : "Complete Lesson 🏆";
    btn.disabled    = true;
  }
}

// ---- Quiz selection (global, called from inline onclick) ----
window.handleQuizSelection = (selectedIndex, correctIndex) => {
  const options = document.querySelectorAll(".quiz-option");
  options.forEach(opt => opt.classList.remove("selected", "correct", "wrong"));

  const picked = options[selectedIndex];
  picked.classList.add("selected");

  const masterBtn = $("masterNextBtn");

  if (selectedIndex === correctIndex) {
    picked.classList.add("correct");
    if (masterBtn) masterBtn.disabled = false;

    const feedback = currentLessonData?.quiz_engine?.explanation_feedback || "Correct! Well done.";
    showToast(`✅ ${feedback}`, "success");
  } else {
    picked.classList.add("wrong");
    if (masterBtn) masterBtn.disabled = true;
    showToast("Not quite — try another option.", "error");
  }
};

// ---- Finish & save ----
async function finishLesson() {
  const modal     = $("successModal");
  const masterBtn = $("masterNextBtn");

  if (masterBtn) {
    masterBtn.disabled    = true;
    masterBtn.textContent = "Saving...";
  }

  // Save to Firebase
  try {
    if (auth?.currentUser && db) {
      const xp = currentLessonData?.quiz_engine?.points || 10;
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        completedLessons: arrayUnion(lessonId),
        totalXP: increment(xp),
      });
    }
  } catch (e) {
    console.warn("Could not save progress:", e);
    // Don't block the modal — still show success
  }

  // Show success modal
  if (!modal) return;
  modal.classList.remove("hidden");

  const nextId    = lessonId + 1;
  const isLastLesson = lessonId >= TOTAL_LESSONS;

  const modalBtn = modal.querySelector(".primary-btn");
  if (!modalBtn) return;

  modalBtn.textContent = isLastLesson ? "🎓 View My Certificate" : `Start Lesson ${nextId} 🚀`;

  // Clone to wipe any stale onclick="location.reload()" from HTML
  const freshBtn = modalBtn.cloneNode(true);
  modalBtn.parentNode.replaceChild(freshBtn, modalBtn);

  freshBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (isLastLesson) {
      window.location.href = "./dashboard.html";
    } else {
      const next = new URL(window.location.href);
      next.searchParams.set("id", nextId);
      window.location.href = next.pathname + next.search;
    }
  });
}

// ---- Progress bar ----
function updateProgressUI() {
  const progress = Math.min((lessonId / TOTAL_LESSONS) * 100, 100);
  const pct = Math.round(progress);
  if ($("progressPercent")) $("progressPercent").textContent = `${pct}%`;
  if ($("progressFill"))    $("progressFill").style.width   = `${pct}%`;
}

// ---- Sidebar user info ----
async function syncUserSidebar(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      if ($("userName"))  $("userName").textContent  = data.username  || "Developer";
      if ($("userLevel")) $("userLevel").textContent = data.level     ? `Level ${data.level}` : `Level 1`;
    }
  } catch (e) {
    console.error("Sidebar sync failed:", e);
  }
}

// ---- Checkpoint gate: prevent URL-skipping ----
async function enforceCheckpointGate(uid) {
  // Only enforce if we're attempting a lesson AFTER a checkpoint
  const gateMap = { 11: 10, 21: 20, 31: 30 };
  const requiredCheckpoint = gateMap[lessonId];
  if (!requiredCheckpoint) return;

  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const completed = snap.data().completedLessons || [];
    if (!completed.includes(requiredCheckpoint)) {
      showToast(`Complete Lesson ${requiredCheckpoint} first before continuing.`, "error");
      setTimeout(() => {
        const redirect = new URL(window.location.href);
        redirect.searchParams.set("id", requiredCheckpoint);
        window.location.href = redirect.pathname + redirect.search;
      }, 2500);
    }
  } catch (e) {
    console.warn("Gate check failed:", e);
  }
}
