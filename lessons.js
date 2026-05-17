// =============================================
// CYMOR CODE LEARNER - INTERACTIVE ENGINE
// File: lessons.js
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
    // 1. Monitor Auth to populate user levels/stats
    onAuthStateChanged(auth, (user) => {
        if (user) {
            syncUserSidebar(user.uid);
            loadLessonData(lessonId);
        } else {
            window.location.href = "login.html";
        }
    });
    
    setupNavigation();
});

// Load the JSON from the /lessons/ folder
async function loadLessonData(id) {
    try {
        const response = await fetch(`./lessons/lesson-${id}.json`);
        if (!response.ok) throw new Error("Lesson file missing in /lessons/ folder");
        
        currentLessonData = await response.json();
        renderTheoryStep();
        updateProgressUI();
    } catch (error) {
        console.error("Critical Error:", error);
        document.getElementById("lessonTitle").textContent = "Error Loading Lesson";
        alert("Make sure lesson-" + id + ".json exists in your lessons folder!");
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
    
    // Auto-inject starter code into your editor
    const editor = document.getElementById("codeEditor");
    if(editor && !editor.value) {
        editor.value = sandbox.starter_code;
        // Trigger your live-preview logic if it exists in editor.js
        editor.dispatchEvent(new Event('input')); 
    }

    stepIndicator.textContent = "STEP 2: CODING CHALLENGE";
    masterNextBtn.textContent = "Check Code ➡";
    masterNextBtn.disabled = true; // Lock until passed
    
    setupChallengeVerification(sandbox.mini_challenge.validation_keyword);
}

function setupChallengeVerification(keyword) {
    const checkBtn = document.getElementById("checkChallengeBtn");
    const editor = document.getElementById("codeEditor");

    checkBtn.onclick = () => {
        if (editor.value.toLowerCase().includes(keyword.toLowerCase())) {
            masterNextBtn.disabled = false;
            masterNextBtn.textContent = "Go to Quiz ➡";
            alert("🎯 Challenge Complete! Click Continue.");
        } else {
            alert("❌ Keyword '" + keyword + "' not found in your code!");
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
        <button class="quiz-option card glass-effect" data-index="${i}">${opt}</button>
    `).join("");

    stepIndicator.textContent = "STEP 3: FINAL QUIZ";
    masterNextBtn.textContent = "Finish Lesson 🏆";
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
// CORE NAVIGATION & SYNC
// =============================================
function setupNavigation() {
    masterNextBtn.addEventListener("click", () => {
        if (currentStep === 1) renderChallengeStep();
        else if (currentStep === 2) renderQuizStep();
        else if (currentStep === 3) finishLesson();
    });

    document.getElementById("prevLessonBtn").addEventListener("click", () => {
        if (currentStep === 2) renderTheoryStep();
        else if (currentStep === 3) renderChallengeStep();
    });
}

function toggleStepVisibility() {
    // Hide all, then show current
    document.querySelectorAll(".lesson-step").forEach(s => s.classList.remove("active"));
    const steps = ["step-theory", "step-challenge", "step-quiz"];
    document.getElementById(steps[currentStep-1]).classList.add("active");
    window.scrollTo(0,0);
}

async function syncUserSidebar(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    if(snap.exists()) {
        const data = snap.data();
        document.getElementById("userLevel").textContent = data.level || "1";
        document.getElementById("userName").textContent = data.username || "Developer";
    }
}

function updateProgressUI() {
    const percent = Math.round((lessonId / 30) * 100);
    document.getElementById("progressPercent").textContent = percent + "%";
    document.getElementById("progressFill").style.width = percent + "%";
}

async function finishLesson() {
    const user = auth.currentUser;
    if (user) {
        await updateDoc(doc(db, "users", user.uid), {
            completedLessons: arrayUnion(parseInt(lessonId)),
            totalXP: increment(currentLessonData.meta.xp_reward || 10)
        });
    }
    document.getElementById("successModal").classList.remove("hidden");
}
