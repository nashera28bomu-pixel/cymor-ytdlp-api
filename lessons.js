// =============================================
// CYMOR CODE LEARNER - CORE ENGINE v2.2
// =============================================

// Firebase Variables
let auth, db, doc, getDoc, updateDoc, arrayUnion, increment, onAuthStateChanged;

// 1. Initialize Firebase Connection
async function loadFirebase() {
  try {
    const fb = await import("./firebase/firebase-config.js");
    auth = fb.auth;
    db = fb.db;
    
    const authSDK = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const firestoreSDK = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    
    onAuthStateChanged = authSDK.onAuthStateChanged;
    doc = firestoreSDK.doc;
    getDoc = firestoreSDK.getDoc;
    updateDoc = firestoreSDK.updateDoc;
    arrayUnion = firestoreSDK.arrayUnion;
    increment = firestoreSDK.increment;
    
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await syncUserSidebar(user.uid);
      } else {
        if (document.getElementById("userName")) 
            document.getElementById("userName").textContent = "Guest Developer";
      }
    });
  } catch (e) {
    console.warn("Firebase offline mode active.");
  }
}

// 2. State Management
let currentLessonData = null;
let currentStep = 1; // 1: Theory, 2: Challenge, 3: Quiz
const urlParams = new URLSearchParams(window.location.search);
const lessonId = urlParams.get("id") || "1";

// Helper for selecting elements
const $ = (id) => document.getElementById(id);

// 3. Page Initialization
document.addEventListener("DOMContentLoaded", () => {
    loadFirebase();
    loadLessonData(lessonId);
    setupNavigation();
    setupLivePreview();
});

// 4. Data Fetching
async function loadLessonData(id) {
    try {
        const response = await fetch(`./lessons/lesson-${id}.json`);
        if (!response.ok) throw new Error("Lesson not found");
        
        currentLessonData = await response.json();
        renderTheoryStep();
        updateProgressUI();
    } catch (error) {
        console.error("Load Error:", error);
        if ($("lessonTitle")) $("lessonTitle").textContent = "Content Missing";
    }
}

// 5. Navigation & Step Control
function setupNavigation() {
    const masterBtn = $("masterNextBtn");
    const prevBtn = $("prevLessonBtn");

    if (masterBtn) {
        masterBtn.onclick = () => {
            if (currentStep === 1) renderChallengeStep();
            else if (currentStep === 2) renderQuizStep();
            else if (currentStep === 3) finishLesson();
        };
    }

    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentStep === 2) renderTheoryStep();
            else if (currentStep === 3) renderChallengeStep();
        };
    }
}

function toggleStepVisibility(stepNum) {
    currentStep = stepNum;
    document.querySelectorAll(".lesson-step").forEach(s => s.classList.remove("active"));
    
    const stepIds = ["step-theory", "step-challenge", "step-quiz"];
    const target = $(stepIds[stepNum - 1]);
    if (target) target.classList.add("active");
    
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// 6. Step Renderers
function renderTheoryStep() {
    toggleStepVisibility(1);
    const { title, content, summary } = currentLessonData;

    if ($("lessonTitle")) $("lessonTitle").textContent = title;
    if ($("heroLessonTitle")) $("heroLessonTitle").textContent = title;
    if ($("heroLessonDescription")) $("heroLessonDescription").innerHTML = content.explanation;

    // Fill Takeaways
    if ($("takeawaysList") && summary.takeaways) {
        $("takeawaysList").innerHTML = summary.takeaways.map(t => `<li>${t}</li>`).join("");
    }

    // Update Button
    $("masterNextBtn").textContent = "Start Practice ➡";
    $("masterNextBtn").disabled = false;
    $("stepIndicator").textContent = "STEP 1: THEORY";
}

function renderChallengeStep() {
    toggleStepVisibility(2);
    const sandbox = currentLessonData.editor_sandbox;

    if ($("challengeInstruction")) $("challengeInstruction").textContent = sandbox.mini_challenge.instruction;
    if ($("codeEditor") && !$("codeEditor").value) $("codeEditor").value = sandbox.starter_code;
    
    updateLivePreview();
    
    $("masterNextBtn").textContent = "Check Code ➡";
    $("masterNextBtn").disabled = true; // Disabled until challenge is verified
    $("stepIndicator").textContent = "STEP 2: CHALLENGE";

    // Setup Challenge Verification
    const checkBtn = $("checkChallengeBtn");
    const keyword = sandbox.mini_challenge.validation_keyword;

    checkBtn.onclick = () => {
        const userCode = $("codeEditor").value.toLowerCase();
        if (userCode.includes(keyword.toLowerCase())) {
            $("masterNextBtn").disabled = false;
            $("masterNextBtn").textContent = "Go to Quiz ➡";
            showToast("Success! Challenge completed.", "success");
        } else {
            showToast(`Keep trying! Hint: Use the ${keyword} tag.`, "error");
        }
    };
}

function renderQuizStep() {
    toggleStepVisibility(3);
    const quiz = currentLessonData.quiz_engine;

    if ($("quizQuestion")) $("quizQuestion").textContent = quiz.question;
    
    const optionsWrapper = $("quizOptions");
    optionsWrapper.innerHTML = quiz.options.map((opt, i) => `
        <button class="quiz-option" onclick="handleQuizSelection(${i}, ${quiz.correct_index})">
            ${opt}
        </button>
    `).join("");

    $("masterNextBtn").textContent = "Complete Lesson 🏆";
    $("masterNextBtn").disabled = true;
    $("stepIndicator").textContent = "STEP 3: QUIZ";
}

// 7. Interaction Handlers
window.handleQuizSelection = (selectedIndex, correctIndex) => {
    const options = document.querySelectorAll(".quiz-option");
    options.forEach(opt => opt.classList.remove("selected", "correct", "wrong"));
    
    const selectedBtn = options[selectedIndex];
    selectedBtn.classList.add("selected");

    if (selectedIndex === correctIndex) {
        selectedBtn.classList.add("correct");
        $("masterNextBtn").disabled = false;
    } else {
        selectedBtn.classList.add("wrong");
        $("masterNextBtn").disabled = true;
    }
};

function setupLivePreview() {
    if ($("codeEditor")) {
        $("codeEditor").addEventListener("input", updateLivePreview);
    }
}

function updateLivePreview() {
    const preview = $("live-preview");
    const code = $("codeEditor").value;
    if (preview) preview.srcdoc = `<html><style>body{color:black; font-family:sans-serif;}</style><body>${code}</body></html>`;
}

// 8. Completion & Progress
async function finishLesson() {
    const modal = $("successModal");
    const masterBtn = $("masterNextBtn");

    // Prevent double clicking
    masterBtn.disabled = true;
    masterBtn.textContent = "Saving...";

    try {
        if (auth?.currentUser) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                completedLessons: arrayUnion(parseInt(lessonId)),
                totalXP: increment(10)
            });
        }

        if (modal) {
            modal.classList.remove("hidden");
            const nextId = parseInt(lessonId) + 1;
            const modalBtn = modal.querySelector(".primary-btn");
            if (modalBtn) {
                modalBtn.onclick = () => window.location.href = `lesson.html?id=${nextId}`;
                modalBtn.textContent = `Start Lesson ${nextId} 🚀`;
            }
        }
    } catch (error) {
        console.error("Save Error:", error);
        if (modal) modal.classList.remove("hidden"); // Show anyway so they aren't stuck
    }
}

// 9. UI Helpers
function showToast(msg, type) {
    const toast = $("authMessage");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `auth-message ${type}`;
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 3000);
}

function updateProgressUI() {
    const totalLessons = 30;
    const progress = Math.min((parseInt(lessonId) / totalLessons) * 100, 100);
    if ($("progressPercent")) $("progressPercent").textContent = `${Math.round(progress)}%`;
    if ($("progressFill")) $("progressFill").style.width = `${progress}%`;
}

async function syncUserSidebar(uid) {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists() && $("userName")) {
            $("userName").textContent = snap.data().username || "Developer";
        }
    } catch (e) { console.error(e); }
}
