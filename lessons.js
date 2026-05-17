// =============================================
// CYMOR CODE LEARNER - INTERACTIVE ENGINE
// File: lessons.js
// =============================================
import { auth, db } from "./firebase/firebase-config.js";
import { doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- State Management ---
let currentLessonData = null;
let currentStep = 1; // 1: Theory, 2: Challenge, 3: Quiz
const lessonId = new URLSearchParams(window.location.search).get("id") || "1";

// --- DOM Elements ---
const masterNextBtn = document.getElementById("masterNextBtn");
const stepIndicator = document.getElementById("stepIndicator");

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener("DOMContentLoaded", () => {
    loadLessonData(lessonId);
    setupNavigation();
});

async function loadLessonData(id) {
    try {
        const response = await fetch(`./lessons/lesson-${id}.json`);
        if (!response.ok) throw new Error("Lesson not found");
        currentLessonData = await response.json();
        
        renderTheoryStep();
        updateSidebarProgress();
    } catch (error) {
        console.error("Error loading lesson:", error);
        document.getElementById("lessonTitle").textContent = "Lesson Not Found";
    }
}

// =============================================
// STEP 1: RENDER THEORY
// =============================================
function renderTheoryStep() {
    currentStep = 1;
    toggleStepVisibility();
    
    // Fill Content
    document.getElementById("lessonTitle").textContent = currentLessonData.title;
    document.getElementById("heroLessonTitle").textContent = currentLessonData.title;
    document.getElementById("heroLessonDescription").textContent = currentLessonData.module;
    
    const contentArea = document.getElementById("lessonContent");
    contentArea.innerHTML = `
        <div class="card">${currentLessonData.content.explanation}</div>
        <div class="card">${currentLessonData.content.syntax_breakdown}</div>
    `;

    // Fill Takeaways
    const list = document.getElementById("takeawaysList");
    list.innerHTML = currentLessonData.summary.takeaways.map(t => `<li>${t}</li>`).join("");

    stepIndicator.textContent = "STEP 1: THEORY";
    masterNextBtn.textContent = "Start Practice ➡";
}

// =============================================
// STEP 2: RENDER CHALLENGE (EDITOR)
// =============================================
function renderChallengeStep() {
    currentStep = 2;
    toggleStepVisibility();

    const sandbox = currentLessonData.editor_sandbox;
    document.getElementById("challengeInstruction").textContent = sandbox.mini_challenge.instruction;
    document.getElementById("challengeHint").textContent = sandbox.mini_challenge.hint;
    
    // Initialize Code Editor with starter code
    const editor = document.getElementById("codeEditor");
    if(!editor.value) editor.value = sandbox.starter_code;

    stepIndicator.textContent = "STEP 2: CODING CHALLENGE";
    masterNextBtn.textContent = "Go to Quiz ➡";
    masterNextBtn.disabled = true; // Lock until they pass the challenge
    
    setupChallengeVerification(sandbox.mini_challenge.validation_keyword);
}

function setupChallengeVerification(keyword) {
    const checkBtn = document.getElementById("checkChallengeBtn");
    const editor = document.getElementById("codeEditor");

    checkBtn.onclick = () => {
        const code = editor.value.toLowerCase();
        if (code.includes(keyword.toLowerCase())) {
            showToast("✅ Challenge Passed!", "success");
            masterNextBtn.disabled = false;
            masterNextBtn.classList.add("pulse-animation");
        } else {
            showToast("❌ Not quite! Check the instructions.", "error");
        }
    };
}

// =============================================
// STEP 3: RENDER QUIZ
// =============================================
function renderQuizStep() {
    currentStep = 3;
    toggleStepVisibility();

    const quiz = currentLessonData.quiz_engine;
    document.getElementById("quizQuestion").textContent = quiz.question;
    
    const optionsWrapper = document.getElementById("quizOptions");
    optionsWrapper.innerHTML = quiz.options.map((opt, i) => `
        <button class="quiz-option" data-index="${i}">${opt}</button>
    `).join("");

    stepIndicator.textContent = "STEP 3: FINAL QUIZ";
    masterNextBtn.textContent = "Finish Lesson 🏆";
    masterNextBtn.disabled = true;

    setupQuizLogic(quiz.correct_index);
}

function setupQuizLogic(correctIndex) {
    const options = document.querySelectorAll(".quiz-option");
    options.forEach(btn => {
        btn.onclick = () => {
            options.forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            
            const isCorrect = parseInt(btn.dataset.index) === correctIndex;
            if (isCorrect) {
                showToast("🎉 Perfect!", "success");
                masterNextBtn.disabled = false;
            } else {
                showToast("😟 Try again!", "error");
            }
        };
    });
}

// =============================================
// CORE NAVIGATION LOGIC
// =============================================
function setupNavigation() {
    masterNextBtn.addEventListener("click", () => {
        if (currentStep === 1) renderChallengeStep();
        else if (currentStep === 2) renderQuizStep();
        else if (currentStep === 3) completeLesson();
    });

    document.getElementById("prevLessonBtn").addEventListener("click", () => {
        if (currentStep === 2) renderTheoryStep();
        else if (currentStep === 3) renderChallengeStep();
        else window.history.back();
    });
}

function toggleStepVisibility() {
    document.querySelectorAll(".lesson-step").forEach(step => step.classList.remove("active"));
    if (currentStep === 1) document.getElementById("step-theory").classList.add("active");
    if (currentStep === 2) document.getElementById("step-challenge").classList.add("active");
    if (currentStep === 3) document.getElementById("step-quiz").classList.add("active");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function completeLesson() {
    const user = auth.currentUser;
    if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            completedLessons: arrayUnion(parseInt(lessonId)),
            totalXP: (currentLessonData.meta.xp_reward || 10)
        });
    }
    document.getElementById("successModal").classList.remove("hidden");
}

// =============================================
// HELPERS
// =============================================
function showToast(msg, type) {
    const toast = document.getElementById("authMessage");
    if(!toast) return alert(msg);
    toast.textContent = msg;
    toast.className = `auth-message ${type}`;
    toast.style.display = "flex";
    setTimeout(() => toast.style.display = "none", 3000);
}

function updateSidebarProgress() {
    // Basic sidebar update logic
    document.getElementById("progressPercent").textContent = `${Math.round((lessonId / 30) * 100)}%`;
    document.getElementById("progressFill").style.width = `${(lessonId / 30) * 100}%`;
}
