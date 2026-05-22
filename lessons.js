// =============================================
// CYMOR CODE LEARNER - EMERGENCY BYPASS ENGINE
// =============================================

// 1. Alert immediately to verify the file is linked and loading
alert("Engine is starting...");

// Firebase Global Variables
let auth, db, doc, getDoc, updateDoc, arrayUnion, increment, onAuthStateChanged;

async function loadFirebase() {
  try {
    // Dynamic import of your local config
    const fb = await import("./firebase/firebase-config.js");
    auth = fb.auth;
    db = fb.db;
    
    // Dynamic import of Firebase SDKs to prevent blocking
    const authSDK = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const firestoreSDK = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    
    onAuthStateChanged = authSDK.onAuthStateChanged;
    doc = firestoreSDK.doc;
    getDoc = firestoreSDK.getDoc;
    updateDoc = firestoreSDK.updateDoc;
    arrayUnion = firestoreSDK.arrayUnion;
    increment = firestoreSDK.increment;
    
    console.log("🔥 Firebase Connected");
    
    // Once Firebase is ready, check auth state
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await syncUserSidebar(user.uid);
      } else {
        if ($("userName")) $("userName").textContent = "Guest Developer";
      }
    });
  } catch (e) {
    console.error("Firebase connection failed, but lesson will still function.", e);
  }
}

// =============================================
// GLOBAL STATE & DOM
// =============================================
let currentLessonData = null;
let currentStep = 1;
const urlParams = new URLSearchParams(window.location.search);
const lessonId = urlParams.get("id") || "1";
const $ = (id) => document.getElementById(id);

const masterNextBtn = $("masterNextBtn");
const stepIndicator = $("stepIndicator");
const lessonTitle = $("lessonTitle");
const heroLessonTitle = $("heroLessonTitle");
const heroLessonDescription = $("heroLessonDescription");

// =============================================
// INIT (ENTRY POINT)
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  // Load lesson data immediately - do not wait for Firebase
  loadLessonData(lessonId);
  
  // Connect to Firebase in the background
  loadFirebase();
  
  // Set up UI listeners
  setupNavigation();
  setupLivePreview();
  setupHintSystem();
});

// =============================================
// DATA LOADING
// =============================================
async function loadLessonData(id) {
  try {
    const path = `./lessons/lesson-${id}.json`;
    console.log("📂 Fetching:", path);

    const response = await fetch(path);
    
    if (!response.ok) {
      alert("404: Lesson file not found at " + path);
      throw new Error("File not found");
    }

    const data = await response.json();
    currentLessonData = data;
    
    renderTheoryStep();
    updateProgressUI();
    alert("✅ Success! Lesson content loaded.");
    
  } catch (error) {
    console.error("LOAD ERROR:", error);
    showFatalError(error.message);
  }
}

// =============================================
// THEORY STEP
// =============================================
function renderTheoryStep() {
  if (!currentLessonData) return;
  currentStep = 1;
  toggleStepVisibility();

  const { explanation, syntax_breakdown } = currentLessonData.content;

  if (lessonTitle) lessonTitle.textContent = currentLessonData.title;
  if (heroLessonTitle) heroLessonTitle.textContent = currentLessonData.title;
  
  if (heroLessonDescription) {
    heroLessonDescription.textContent = explanation.replace(/<[^>]*>/g, "").substring(0, 160) + "...";
  }

  const contentArea = $("lessonContent");
  if (contentArea) {
    contentArea.innerHTML = `
      <div class="card">${explanation}</div>
      <div class="card">${syntax_breakdown}</div>
    `;
  }

  const takeawaysList = $("takeawaysList");
  if (takeawaysList && currentLessonData.summary?.takeaways) {
    takeawaysList.innerHTML = currentLessonData.summary.takeaways
      .map(item => `<li>${item}</li>`).join("");
  }

  const cheatSheetList = $("cheatSheetList");
  if (cheatSheetList && currentLessonData.summary?.cheat_sheet) {
    cheatSheetList.innerHTML = Object.entries(currentLessonData.summary.cheat_sheet)
      .map(([key, value]) => `
        <div class="card" style="margin-bottom:10px;">
          <h4 style="color:#00d9ff">${key}</h4>
          <p>${value}</p>
        </div>
      `).join("");
  }

  if (stepIndicator) stepIndicator.textContent = "STEP 1: THEORY";
  if (masterNextBtn) {
    masterNextBtn.textContent = "Start Practice ➡";
    masterNextBtn.disabled = false;
  }
}

// =============================================
// CHALLENGE & QUIZ LOGIC
// =============================================
function renderChallengeStep() {
  currentStep = 2;
  toggleStepVisibility();
  const sandbox = currentLessonData?.editor_sandbox;
  
  if ($("challengeInstruction")) {
    $("challengeInstruction").textContent = sandbox?.mini_challenge?.instruction || "Complete the task.";
  }

  const editor = $("codeEditor");
  if (editor && editor.value.trim() === "") {
    editor.value = sandbox.starter_code || "";
    updateLivePreview();
  }

  if (stepIndicator) stepIndicator.textContent = "STEP 2: CHALLENGE";
  if (masterNextBtn) {
    masterNextBtn.textContent = "Check Code ➡";
    masterNextBtn.disabled = true;
  }

  setupChallengeVerification(sandbox?.mini_challenge?.validation_keyword || "");
}

function setupChallengeVerification(keyword) {
  const checkBtn = $("checkChallengeBtn");
  if (!checkBtn) return;
  checkBtn.onclick = () => {
    const code = $("codeEditor").value.toLowerCase();
    if (!keyword || code.includes(keyword.toLowerCase())) {
      masterNextBtn.disabled = false;
      masterNextBtn.textContent = "Go To Quiz ➡";
      alert("🎉 Challenge Completed!");
    } else {
      alert(`❌ Missing keyword: ${keyword}`);
    }
  };
}

function renderQuizStep() {
  currentStep = 3;
  toggleStepVisibility();
  const quiz = currentLessonData?.quiz_engine;
  if ($("quizQuestion")) $("quizQuestion").textContent = quiz.question;

  const optionsWrapper = $("quizOptions");
  if (optionsWrapper) {
    optionsWrapper.innerHTML = quiz.options.map((opt, i) => `
      <button class="quiz-option" data-index="${i}">${opt}</button>
    `).join("");
  }

  if (stepIndicator) stepIndicator.textContent = "STEP 3: QUIZ";
  if (masterNextBtn) {
    masterNextBtn.textContent = "Complete Lesson 🏆";
    masterNextBtn.disabled = true;
  }

  document.querySelectorAll(".quiz-option").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      if (Number(btn.dataset.index) === quiz.correct_index) {
        masterNextBtn.disabled = false;
      }
    };
  });
}

// =============================================
// UTILITIES
// =============================================
function setupLivePreview() {
  const editor = $("codeEditor");
  if (editor) editor.addEventListener("input", updateLivePreview);
}

function updateLivePreview() {
  const preview = $("live-preview");
  if (preview) preview.srcdoc = $("codeEditor").value;
}

function setupHintSystem() {
  const hintBtn = $("showHintBtn");
  const hintBox = $("challengeHint");
  if (hintBtn && hintBox) {
    hintBtn.onclick = () => {
      const hint = currentLessonData?.editor_sandbox?.mini_challenge?.hint;
      if (hint) {
        hintBox.innerHTML = hint.replace(/\n/g, "<br>");
        hintBox.classList.toggle("hidden");
      }
    };
  }
}

function setupNavigation() {
  if (masterNextBtn) {
    masterNextBtn.onclick = () => {
      if (currentStep === 1) renderChallengeStep();
      else if (currentStep === 2) renderQuizStep();
      else if (currentStep === 3) finishLesson();
    };
  }
  if ($("prevLessonBtn")) {
    $("prevLessonBtn").onclick = () => {
      if (currentStep === 2) renderTheoryStep();
      else if (currentStep === 3) renderChallengeStep();
    };
  }
}

function toggleStepVisibility() {
  document.querySelectorAll(".lesson-step").forEach(s => s.classList.remove("active"));
  const steps = ["step-theory", "step-challenge", "step-quiz"];
  if ($(steps[currentStep - 1])) $(steps[currentStep - 1]).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgressUI() {
  const percent = Math.round((parseInt(lessonId) / 30) * 100);
  if ($("progressPercent")) $("progressPercent").textContent = percent + "%";
  if ($("progressFill")) $("progressFill").style.width = percent + "%";
}

async function syncUserSidebar(uid) {
  if (!getDoc) return;
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
    const data = snap.data();
    if ($("userName")) $("userName").textContent = data.username || "Developer";
  }
}

// =============================================
// FINISH LESSON (UPDATED WITH NEXT NAVIGATION)
// =============================================
async function finishLesson() {
  try {
    // 1. Sync Progress to Firebase
    if (auth?.currentUser && updateDoc) {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        completedLessons: arrayUnion(parseInt(lessonId)),
        totalXP: increment(currentLessonData?.meta?.xp_reward || 10)
      });
    }

    // 2. Show Modal and Handle Navigation
    const modal = $("successModal");
    if (modal) {
      modal.classList.remove("hidden");
      
      // Update the button inside the modal to point to the next lesson
      const nextId = parseInt(lessonId) + 1;
      const nextBtn = modal.querySelector(".primary-btn");
      if (nextBtn) {
        nextBtn.onclick = () => {
            // Refreshes the page with the next lesson ID
            window.location.href = `lesson.html?id=${nextId}`;
        };
        nextBtn.textContent = `Start Lesson ${nextId} 🚀`;
      }
    }
    
    console.log("🏆 Lesson Completed");
  } catch (e) {
    console.error("Finish Error:", e);
    alert("Lesson complete! (Syncing error, but you can continue)");
    if ($("successModal")) $("successModal").classList.remove("hidden");
  }
}

function showFatalError(msg) {
  if (heroLessonTitle) heroLessonTitle.textContent = "Error";
  if (heroLessonDescription) heroLessonDescription.textContent = msg;
}
