// =============================================
// CYMOR CODE LEARNER - LESSON ENGINE V11
// =============================================
alert("Script is running!");

import {
  auth,
  db
} from "./firebase/firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =============================================
// GLOBAL STATE
// =============================================

let currentLessonData = null;
let currentStep = 1;

const urlParams = new URLSearchParams(window.location.search);
const lessonId = urlParams.get("id") || "1";

// =============================================
// DOM ELEMENTS
// =============================================

const $ = (id) => document.getElementById(id);

const masterNextBtn = $("masterNextBtn");
const stepIndicator = $("stepIndicator");

const lessonTitle = $("lessonTitle");
const heroLessonTitle = $("heroLessonTitle");
const heroLessonDescription = $("heroLessonDescription");

const progressPercent = $("progressPercent");
const progressFill = $("progressFill");

const userName = $("userName");
const userLevel = $("userLevel");

// =============================================
// INIT
// =============================================

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  try {
    console.log("🚀 Engine Started");  
    console.log("📘 Lesson:", lessonId);  

    await loadLessonData(lessonId);  

    setupNavigation();  
    setupLivePreview();  
    setupHintSystem();  

    onAuthStateChanged(auth, async (user) => {  
      try {  
        if (user) {  
          console.log("👤 Logged In:", user.email);  
          await syncUserSidebar(user.uid);  
        } else {  
          console.log("🔓 Guest Mode");  

          if (userName)  
            userName.textContent = "Guest Developer";  

          if (userLevel)  
            userLevel.textContent = "1";  
        }  
      } catch (err) {  
        console.error("Auth Error:", err);  
      }  
    });
  } catch (err) {
    console.error("INIT ERROR:", err);  
    showFatalError(err.message);
  }
}

// =============================================
// LOAD LESSON (REWRITTEN FOR MOBILE DEBUGGING)
// =============================================

async function loadLessonData(id) {
  try {
    // 1. Try a relative path that works on most web servers
    const path = `./lessons/lesson-${id}.json`;  
    
    console.log("📂 Fetching:", path);  

    const response = await fetch(path);  

    // 2. If the fetch fails, tell us exactly where it looked
    if (!response.ok) {  
      alert(`404 Error: I looked for ${path} but couldn't find it. Check if the 'lessons' folder is in the same directory as this HTML file.`);
      throw new Error(`Lesson ${id} not found`);  
    }  

    const data = await response.json();  

    // 3. Validation
    if (!data.title || !data.content) {  
      throw new Error("Invalid lesson structure inside the JSON file");  
    }  

    currentLessonData = data;  
    console.log("✅ Lesson Loaded");  

    renderTheoryStep();  
    updateProgressUI();

  } catch (error) {
    console.error("LESSON LOAD ERROR:", error);
    // This is vital for phone users!
    alert("CRITICAL ERROR: " + error.message);
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

  const explanation =
    currentLessonData?.content?.explanation || "";

  const syntax =
    currentLessonData?.content?.syntax_breakdown || "";

  if (lessonTitle)
    lessonTitle.textContent =
      currentLessonData.title;

  if (heroLessonTitle)
    heroLessonTitle.textContent =
      currentLessonData.title;

  if (heroLessonDescription) {
    const plainText =  
      explanation  
      .replace(/<[^>]*>/g, "")  
      .substring(0, 160);  

    heroLessonDescription.textContent =  
      plainText + "...";
  }

  const contentArea = $("lessonContent");

  if (contentArea) {
    contentArea.innerHTML = `  
      <div class="card">  
        ${explanation}  
      </div>  
    
      <div class="card">  
        ${syntax}  
      </div>  
    `;
  }

  const takeawaysList = $("takeawaysList");

  if (
    takeawaysList &&
    currentLessonData.summary?.takeaways
  ) {
    takeawaysList.innerHTML =  
      currentLessonData.summary.takeaways  
      .map(item => `<li>${item}</li>`)  
      .join("");
  }

  // --- CHEAT SHEET ENGINE LOGIC ---
  const cheatSheetList = $("cheatSheetList");

  if (
    cheatSheetList &&
    currentLessonData.summary?.cheat_sheet
  ) {
    cheatSheetList.innerHTML =
      Object.entries(currentLessonData.summary.cheat_sheet)
      .map(([key, value]) => `
        <div class="card">
          <h3>${key}</h3>
          <p>${value}</p>
        </div>
      `)
      .join("");
  }

  if (stepIndicator)
    stepIndicator.textContent = "STEP 1: THEORY";

  if (masterNextBtn) {
    masterNextBtn.textContent = "Start Practice ➡";  
    masterNextBtn.disabled = false;
  }
}

// =============================================
// CHALLENGE STEP
// =============================================

function renderChallengeStep() {
  currentStep = 2;

  toggleStepVisibility();

  const sandbox =
    currentLessonData?.editor_sandbox;

  if (!sandbox) {
    showFatalError("Missing challenge data");
    return;
  }

  const instruction = $("challengeInstruction");

  if (instruction) {
    instruction.textContent =  
      sandbox?.mini_challenge?.instruction ||  
      "Complete the coding task.";
  }

  const editor = $("codeEditor");

  if (editor && editor.value.trim() === "") {
    editor.value =  
      sandbox.starter_code || "";  

    updateLivePreview();
  }

  if (stepIndicator)
    stepIndicator.textContent =
      "STEP 2: CHALLENGE";

  if (masterNextBtn) {
    masterNextBtn.textContent = "Check Code ➡";  
    masterNextBtn.disabled = true;
  }

  setupChallengeVerification(
    sandbox?.mini_challenge?.validation_keyword || ""
  );
}

// =============================================
// CHALLENGE VERIFY
// =============================================

function setupChallengeVerification(keyword) {
  const checkBtn = $("checkChallengeBtn");
  const editor = $("codeEditor");

  if (!checkBtn || !editor) return;

  checkBtn.onclick = () => {
    const code =  
      editor.value.toLowerCase();  

    if (!keyword) {  
      masterNextBtn.disabled = false;  
      return;  
    }  

    if (code.includes(keyword.toLowerCase())) {  
      masterNextBtn.disabled = false;  
      masterNextBtn.textContent = "Go To Quiz ➡";  
      alert("🎉 Challenge Completed!");  
    } else {  
      alert(`❌ Missing keyword: ${keyword}`);  
    }
  };
}

// =============================================
// QUIZ STEP
// =============================================

function renderQuizStep() {
  currentStep = 3;

  toggleStepVisibility();

  const quiz =
    currentLessonData?.quiz_engine;

  if (!quiz) {
    showFatalError("Quiz data missing");
    return;
  }

  const question = $("quizQuestion");

  if (question)
    question.textContent =
      quiz.question || "Quiz";

  const xp = $("quiz-xp");

  if (xp)
    xp.textContent = quiz.points || 10;

  const optionsWrapper = $("quizOptions");

  if (optionsWrapper) {
    optionsWrapper.innerHTML =  
      quiz.options.map((opt, i) => `  
        <button  
          class="quiz-option"  
          data-index="${i}">  
          ${opt}  
        </button>  
      `).join("");
  }

  if (stepIndicator)
    stepIndicator.textContent =
      "STEP 3: QUIZ";

  if (masterNextBtn) {
    masterNextBtn.textContent =  
      "Complete Lesson 🏆";  
    masterNextBtn.disabled = true;
  }

  document
    .querySelectorAll(".quiz-option")
    .forEach(btn => {
      btn.onclick = () => {  
        document  
          .querySelectorAll(".quiz-option")  
          .forEach(b =>  
            b.classList.remove("selected")  
          );  

        btn.classList.add("selected");  

        const selected =  
          Number(btn.dataset.index);  

        if (selected === quiz.correct_index) {  
          masterNextBtn.disabled = false;  
        }  
      };  
    });
}

// =============================================
// LIVE PREVIEW
// =============================================

function setupLivePreview() {
  const editor = $("codeEditor");

  if (!editor) return;

  editor.addEventListener(
    "input",
    updateLivePreview
  );
}

function updateLivePreview() {
  const editor = $("codeEditor");
  const preview = $("live-preview");

  if (!editor || !preview) return;

  preview.srcdoc = editor.value;
}

// =============================================
// HINT SYSTEM
// =============================================

function setupHintSystem() {
  const hintBtn = $("showHintBtn");
  const hintBox = $("challengeHint");

  if (!hintBtn || !hintBox) return;

  hintBtn.onclick = () => {
    const hint =  
      currentLessonData  
      ?.editor_sandbox  
      ?.mini_challenge  
      ?.hint;  

    if (!hint) return;  

    hintBox.innerHTML =  
      hint.replace(/\n/g, "<br>");  

    hintBox.classList.toggle("hidden");
  };
}

// =============================================
// NAVIGATION
// =============================================

function setupNavigation() {
  if (masterNextBtn) {
    masterNextBtn.onclick = () => {  
      if (currentStep === 1)  
        renderChallengeStep();  
      else if (currentStep === 2)  
        renderQuizStep();  
      else if (currentStep === 3)  
        finishLesson();  
    };
  }

  const prevBtn = $("prevLessonBtn");

  if (prevBtn) {
    prevBtn.onclick = () => {  
      if (currentStep === 2)  
        renderTheoryStep();  
      else if (currentStep === 3)  
        renderChallengeStep();  
    };
  }
}

// =============================================
// STEP VISIBILITY
// =============================================

function toggleStepVisibility() {
  document
    .querySelectorAll(".lesson-step")
    .forEach(step => {
      step.classList.remove("active");
    });

  const steps = [
    "step-theory",
    "step-challenge",
    "step-quiz"
  ];

  const current =
    $(steps[currentStep - 1]);

  if (current)
    current.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// =============================================
// PROGRESS
// =============================================

function updateProgressUI() {
  const totalLessons = 30;

  const percent = Math.round(
    (parseInt(lessonId) / totalLessons) * 100
  );

  if (progressPercent)
    progressPercent.textContent =
      percent + "%";

  if (progressFill)
    progressFill.style.width =
      percent + "%";
}

// =============================================
// USER DATA
// =============================================

async function syncUserSidebar(uid) {
  try {
    const snap =  
      await getDoc(doc(db, "users", uid));  

    if (!snap.exists()) return;  

    const data = snap.data();  

    if (userLevel)  
      userLevel.textContent =  
        data.level || "1";  

    if (userName)  
      userName.textContent =  
        data.username || "Developer";
  } catch (error) {
    console.error("Sidebar Error:", error);
  }
}

// =============================================
// FINISH LESSON
// =============================================

async function finishLesson() {
  try {
    const user = auth.currentUser;  

    if (user) {  
      await updateDoc(  
        doc(db, "users", user.uid),  
        {  
          completedLessons: arrayUnion(  
            parseInt(lessonId)  
          ),  

          totalXP: increment(  
            currentLessonData?.meta?.xp_reward || 10  
          )  
        }  
      );  
    }  

    const modal = $("successModal");  

    if (modal)  
      modal.classList.remove("hidden");  

    console.log("🏆 Lesson Completed");
  } catch (error) {
    console.error("Finish Error:", error);  
    alert("Failed to save progress.");
  }
}

// =============================================
// ERROR UI
// =============================================

function showFatalError(message) {
  console.error("💥 Fatal:", message);

  if (lessonTitle)
    lessonTitle.textContent =
      "Lesson Failed To Load";

  if (heroLessonTitle)
    heroLessonTitle.textContent =
      "Engine Error";

  if (heroLessonDescription)
    heroLessonDescription.textContent =
      message;
}
