// =============================================
// CYMOR CODE LEARNER - INTERACTIVE ENGINE (TEST MODE)
// =============================================
import { auth, db } from "./firebase/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- State Management ---
let currentLessonData = null;
let currentStep = 1; 
const urlParams = new URLSearchParams(window.location.search);
const lessonId = urlParams.get("id") || "1";

// --- DOM Elements ---
const masterNextBtn = document.getElementById("masterNextBtn");
const stepIndicator = document.getElementById("stepIndicator");

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Test Mode: Loading Lesson", lessonId);
    
    // 1. Load data IMMEDIATELY without waiting for Auth
    loadLessonData(lessonId);

    // 2. Auth is now OPTIONAL for testing
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("👤 Logged in as:", user.email);
            syncUserSidebar(user.uid);
        } else {
            console.log("🔓 Running in Guest/Test Mode");
            // Set guest defaults
            document.getElementById("userName").textContent = "Guest Developer";
            document.getElementById("userLevel").textContent = "Test";
        }
    });
    
    setupNavigation();
});

// Load JSON from /lessons/ folder
async function loadLessonData(id) {
    try {
        const path = `./lessons/lesson-${id}.json`;
        const response = await fetch(path);
        
        if (!response.ok) throw new Error(`File not found: ${path}`);
        
        currentLessonData = await response.json();
        renderTheoryStep();
        updateProgressUI();
        console.log("✅ Lesson Data Loaded");
    } catch (error) {
        console.error("❌ Fetch Error:", error);
        document.getElementById("lessonTitle").textContent = "JSON Load Error";
        alert("Check Console! Is the file in /lessons/lesson-" + id + ".json?");
    }
}

// =============================================
// STEP 1: THEORY
// =============================================
function renderTheoryStep() {
    currentStep = 1;
    toggleStepVisibility();
    
    document.getElementById("lessonTitle").textContent = currentLessonData.title;
    document.getElementById("heroLessonTitle").textContent = currentLessonData.title;
    
    const contentArea = document.getElementById("lessonContent");
    contentArea.innerHTML = `
        <div class="card glass-effect">${currentLessonData.content.explanation}</div>
        <div class="card glass-effect">${currentLessonData.content.syntax_breakdown}</div>
    `;

    const list = document.getElementById("takeawaysList");
    list.innerHTML = currentLessonData.summary.takeaways.map(t => `<li>${t}</li>`).join("");

    stepIndicator.textContent = "STEP 1: THEORY";
    masterNextBtn.textContent = "Start Practice ➡";
    masterNextBtn.disabled = false;
}

// =============================================
// STEP 2: CHALLENGE
// =============================================
function renderChallengeStep() {
    currentStep = 2;
    toggleStepVisibility();

    const sandbox = currentLessonData.editor_sandbox;
    document.getElementById("challengeInstruction").textContent = sandbox.mini_challenge.instruction;
    
    const editor = document.getElementById("codeEditor");
    if(editor && !editor.value) {
        editor.value = sandbox.starter_code;
        // This triggers the preview refresh
        editor.dispatchEvent(new Event('input')); 
    }

    stepIndicator.textContent = "STEP 2: CHALLENGE";
    masterNextBtn.textContent = "Check Code ➡";
    masterNextBtn.disabled = true; 
    
    setupChallengeVerification(sandbox.mini_challenge.validation_keyword);
}

function setupChallengeVerification(keyword) {
    const checkBtn = document.getElementById("checkChallengeBtn");
    const editor = document.getElementById("codeEditor");

    checkBtn.onclick = () => {
        if (editor.value.toLowerCase().includes(keyword.toLowerCase())) {
            masterNextBtn.disabled = false;
            masterNextBtn.textContent = "Go to Quiz ➡";
            alert("🎯 Success! You unlocked the next step.");
        } else {
            alert(`❌ Missing keyword: "${keyword}"`);
        }
    };
}

// =============================================
// STEP 3: QUIZ
// =============================================
function renderQuizStep() {
    currentStep = 3;
    toggleStepVisibility();

    const quiz = currentLessonData.quiz_engine;
    document.getElementById("quizQuestion").textContent = quiz.question;
    
    const optionsWrapper = document.getElementById("quizOptions");
    optionsWrapper.innerHTML = quiz.options.map((opt, i) => `
        <button class="quiz-option card" data-index="${i}">${opt}</button>
    `).join("");

    stepIndicator.textContent = "STEP 3: QUIZ";
    masterNextBtn.textContent = "Complete Lesson 🏆";
    masterNextBtn.disabled = true;

    document.querySelectorAll(".quiz-option").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            if (parseInt(btn.dataset.index) === quiz.correct_index) {
                masterNextBtn.disabled = false;
            }
        };
    });
}

// =============================================
// ENGINE UTILS
// =============================================
function setupNavigation() {
    masterNextBtn.addEventListener("click", () => {
        if (currentStep === 1) renderChallengeStep();
        else if (currentStep === 2) renderQuizStep();
        else if (currentStep === 3) finishLesson();
    });

    document.getElementById("prevLessonBtn").onclick = () => {
        if (currentStep === 2) renderTheoryStep();
        else if (currentStep === 3) renderChallengeStep();
    };
}

function toggleStepVisibility() {
    document.querySelectorAll(".lesson-step").forEach(s => s.classList.remove("active"));
    const steps = ["step-theory", "step-challenge", "step-quiz"];
    document.getElementById(steps[currentStep-1]).classList.add("active");
    window.scrollTo(0,0);
}

function updateProgressUI() {
    const percent = Math.round((lessonId / 30) * 100);
    document.getElementById("progressPercent").textContent = percent + "%";
    document.getElementById("progressFill").style.width = percent + "%";
}

async function syncUserSidebar(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    if(snap.exists()) {
        const data = snap.data();
        document.getElementById("userLevel").textContent = data.level || "1";
        document.getElementById("userName").textContent = data.username || "Developer";
    }
}

async function finishLesson() {
    const user = auth.currentUser;
    if (user) {
        // Only try to update DB if someone is logged in
        await updateDoc(doc(db, "users", user.uid), {
            completedLessons: arrayUnion(parseInt(lessonId)),
            totalXP: increment(currentLessonData.meta.xp_reward || 10)
        });
    }
    document.getElementById("successModal").classList.remove("hidden");
}
