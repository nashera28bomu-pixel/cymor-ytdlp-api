// =============================================
// CYMOR CODE LEARNER - LESSON ENGINE V10
// =============================================

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

const urlParams =
    new URLSearchParams(window.location.search);

const lessonId =
    urlParams.get("id") || "1";

// =============================================
// DOM ELEMENTS
// =============================================

const masterNextBtn =
    document.getElementById("masterNextBtn");

const stepIndicator =
    document.getElementById("stepIndicator");

const lessonTitle =
    document.getElementById("lessonTitle");

const heroLessonTitle =
    document.getElementById("heroLessonTitle");

const heroLessonDescription =
    document.getElementById("heroLessonDescription");

const progressPercent =
    document.getElementById("progressPercent");

const progressFill =
    document.getElementById("progressFill");

const userName =
    document.getElementById("userName");

const userLevel =
    document.getElementById("userLevel");

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            console.log(
                "🚀 Cymor Lesson Engine Started"
            );

            console.log(
                "📘 Loading Lesson:",
                lessonId
            );

            // Load Lesson First
            await loadLessonData(lessonId);

            // Setup Navigation
            setupNavigation();

            // Setup Live Preview
            setupLivePreview();

            // Setup Hint Button
            setupHintSystem();

            // Optional Auth
            onAuthStateChanged(
                auth,
                async (user) => {

                    try {

                        if (user) {

                            console.log(
                                "👤 Logged in:",
                                user.email
                            );

                            await syncUserSidebar(
                                user.uid
                            );

                        } else {

                            console.log(
                                "🔓 Guest/Test Mode"
                            );

                            if (userName)
                                userName.textContent =
                                "Guest Developer";

                            if (userLevel)
                                userLevel.textContent =
                                "1";

                        }

                    } catch (authError) {

                        console.error(
                            "❌ Auth Error:",
                            authError
                        );

                    }

                }
            );

        } catch (initError) {

            console.error(
                "❌ INIT ERROR:",
                initError
            );

            showFatalError(
                initError.message
            );

        }

    }
);

// =============================================
// LOAD LESSON JSON
// =============================================

async function loadLessonData(id) {

    try {

        const path =
            `./lessons/lesson-${id}.json`;

        console.log(
            "📂 Fetching:",
            path
        );

        const response =
            await fetch(path);

        console.log(
            "📡 Response Status:",
            response.status
        );

        if (!response.ok) {

            throw new Error(
                `Lesson file not found:
                 ${path}`
            );

        }

        const text =
            await response.text();

        console.log(
            "📄 Raw JSON Loaded"
        );

        currentLessonData =
            JSON.parse(text);

        console.log(
            "✅ Lesson Parsed Successfully"
        );

        renderTheoryStep();

        updateProgressUI();

    } catch (error) {

        console.error(
            "❌ LESSON LOAD ERROR:",
            error
        );

        showFatalError(error.message);

    }

}

// =============================================
// STEP 1 - THEORY
// =============================================

function renderTheoryStep() {

    if (!currentLessonData) return;

    currentStep = 1;

    toggleStepVisibility();

    // Titles

    if (lessonTitle)
        lessonTitle.textContent =
        currentLessonData.title;

    if (heroLessonTitle)
        heroLessonTitle.textContent =
        currentLessonData.title;

    // Description Preview

    if (heroLessonDescription) {

        const plainText =
            currentLessonData
            .content
            .explanation
            .replace(/<[^>]*>/g, "")
            .substring(0, 160);

        heroLessonDescription.textContent =
            plainText + "...";

    }

    // Main Content

    const contentArea =
        document.getElementById(
            "lessonContent"
        );

    if (contentArea) {

        contentArea.innerHTML = `

        <div class="card">
            ${currentLessonData.content.explanation}
        </div>

        <div class="card">
            ${currentLessonData.content.syntax_breakdown}
        </div>

        `;

    }

    // Takeaways

    const list =
        document.getElementById(
            "takeawaysList"
        );

    if (
        list &&
        currentLessonData.summary?.takeaways
    ) {

        list.innerHTML =
            currentLessonData.summary
            .takeaways
            .map(
                item =>
                `<li>${item}</li>`
            )
            .join("");

    }

    // Button States

    if (stepIndicator)
        stepIndicator.textContent =
        "STEP 1: THEORY";

    if (masterNextBtn) {

        masterNextBtn.textContent =
            "Start Practice ➡";

        masterNextBtn.disabled =
            false;

    }

}

// =============================================
// STEP 2 - CHALLENGE
// =============================================

function renderChallengeStep() {

    currentStep = 2;

    toggleStepVisibility();

    const sandbox =
        currentLessonData.editor_sandbox;

    // Challenge Text

    const challengeInstruction =
        document.getElementById(
            "challengeInstruction"
        );

    if (challengeInstruction) {

        challengeInstruction.textContent =
            sandbox.mini_challenge
            .instruction;

    }

    // Starter Code

    const editor =
        document.getElementById(
            "codeEditor"
        );

    if (
        editor &&
        !editor.value
    ) {

        editor.value =
            sandbox.starter_code;

        updateLivePreview();

    }

    // Buttons

    if (stepIndicator)
        stepIndicator.textContent =
        "STEP 2: CHALLENGE";

    if (masterNextBtn) {

        masterNextBtn.textContent =
            "Check Code ➡";

        masterNextBtn.disabled =
            true;

    }

    // Validation

    setupChallengeVerification(
        sandbox
        .mini_challenge
        .validation_keyword
    );

}

// =============================================
// CHALLENGE VERIFICATION
// =============================================

function setupChallengeVerification(keyword) {

    const checkBtn =
        document.getElementById(
            "checkChallengeBtn"
        );

    const editor =
        document.getElementById(
            "codeEditor"
        );

    if (!checkBtn || !editor) return;

    checkBtn.onclick = () => {

        const code =
            editor.value.toLowerCase();

        if (
            code.includes(
                keyword.toLowerCase()
            )
        ) {

            masterNextBtn.disabled =
                false;

            masterNextBtn.textContent =
                "Go To Quiz ➡";

            alert(
                "🎉 Challenge completed successfully!"
            );

        } else {

            alert(
                `❌ Missing:
                "${keyword}"`
            );

        }

    };

}

// =============================================
// STEP 3 - QUIZ
// =============================================

function renderQuizStep() {

    currentStep = 3;

    toggleStepVisibility();

    const quiz =
        currentLessonData.quiz_engine;

    // Question

    const question =
        document.getElementById(
            "quizQuestion"
        );

    if (question)
        question.textContent =
        quiz.question;

    // XP

    const xp =
        document.getElementById(
            "quiz-xp"
        );

    if (xp)
        xp.textContent =
        quiz.points || 10;

    // Options

    const optionsWrapper =
        document.getElementById(
            "quizOptions"
        );

    if (optionsWrapper) {

        optionsWrapper.innerHTML =
            quiz.options.map(
                (opt, i) => `

            <button
            class="quiz-option"
            data-index="${i}">
                ${opt}
            </button>

            `
            ).join("");

    }

    // Buttons

    if (stepIndicator)
        stepIndicator.textContent =
        "STEP 3: QUIZ";

    if (masterNextBtn) {

        masterNextBtn.textContent =
            "Complete Lesson 🏆";

        masterNextBtn.disabled =
            true;

    }

    // Quiz Logic

    document
        .querySelectorAll(
            ".quiz-option"
        )
        .forEach(btn => {

            btn.onclick = () => {

                document
                    .querySelectorAll(
                        ".quiz-option"
                    )
                    .forEach(b =>
                        b.classList.remove(
                            "selected"
                        )
                    );

                btn.classList.add(
                    "selected"
                );

                const selected =
                    parseInt(
                        btn.dataset.index
                    );

                if (
                    selected ===
                    quiz.correct_index
                ) {

                    masterNextBtn.disabled =
                        false;

                }

            };

        });

}

// =============================================
// LIVE PREVIEW ENGINE
// =============================================

function setupLivePreview() {

    const editor =
        document.getElementById(
            "codeEditor"
        );

    if (!editor) return;

    editor.addEventListener(
        "input",
        updateLivePreview
    );

}

function updateLivePreview() {

    const editor =
        document.getElementById(
            "codeEditor"
        );

    const preview =
        document.getElementById(
            "live-preview"
        );

    if (!editor || !preview) return;

    preview.srcdoc =
        editor.value;

}

// =============================================
// HINT SYSTEM
// =============================================

function setupHintSystem() {

    const hintBtn =
        document.getElementById(
            "showHintBtn"
        );

    const hintBox =
        document.getElementById(
            "challengeHint"
        );

    if (!hintBtn || !hintBox) return;

    hintBtn.onclick = () => {

        const hint =
            currentLessonData
            ?.editor_sandbox
            ?.mini_challenge
            ?.hint;

        if (!hint) return;

        hintBox.innerHTML =
            hint.replace(
                /\n/g,
                "<br>"
            );

        hintBox.classList.toggle(
            "hidden"
        );

    };

}

// =============================================
// NAVIGATION
// =============================================

function setupNavigation() {

    if (masterNextBtn) {

        masterNextBtn.addEventListener(
            "click",
            () => {

                if (currentStep === 1)
                    renderChallengeStep();

                else if (
                    currentStep === 2
                )
                    renderQuizStep();

                else if (
                    currentStep === 3
                )
                    finishLesson();

            }
        );

    }

    const prevBtn =
        document.getElementById(
            "prevLessonBtn"
        );

    if (prevBtn) {

        prevBtn.onclick = () => {

            if (currentStep === 2)
                renderTheoryStep();

            else if (
                currentStep === 3
            )
                renderChallengeStep();

        };

    }

}

// =============================================
// STEP VISIBILITY
// =============================================

function toggleStepVisibility() {

    document
        .querySelectorAll(
            ".lesson-step"
        )
        .forEach(step => {

            step.classList.remove(
                "active"
            );

        });

    const steps = [
        "step-theory",
        "step-challenge",
        "step-quiz"
    ];

    const current =
        document.getElementById(
            steps[currentStep - 1]
        );

    if (current)
        current.classList.add(
            "active"
        );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}

// =============================================
// PROGRESS UI
// =============================================

function updateProgressUI() {

    const totalLessons = 30;

    const percent =
        Math.round(
            (parseInt(lessonId) /
                totalLessons) * 100
        );

    if (progressPercent)
        progressPercent.textContent =
        percent + "%";

    if (progressFill)
        progressFill.style.width =
        percent + "%";

}

// =============================================
// USER SIDEBAR
// =============================================

async function syncUserSidebar(uid) {

    try {

        const snap =
            await getDoc(
                doc(
                    db,
                    "users",
                    uid
                )
            );

        if (snap.exists()) {

            const data =
                snap.data();

            if (userLevel)
                userLevel.textContent =
                data.level || "1";

            if (userName)
                userName.textContent =
                data.username ||
                "Developer";

        }

    } catch (error) {

        console.error(
            "❌ Sidebar Sync Error:",
            error
        );

    }

}

// =============================================
// FINISH LESSON
// =============================================

async function finishLesson() {

    try {

        const user =
            auth.currentUser;

        // Save Progress

        if (user) {

            await updateDoc(
                doc(
                    db,
                    "users",
                    user.uid
                ),
                {
                    completedLessons:
                    arrayUnion(
                        parseInt(
                            lessonId
                        )
                    ),

                    totalXP:
                    increment(
                        currentLessonData
                        ?.meta
                        ?.xp_reward || 10
                    )
                }
            );

        }

        // Show Success

        const modal =
            document.getElementById(
                "successModal"
            );

        if (modal)
            modal.classList.remove(
                "hidden"
            );

        console.log(
            "🏆 Lesson Completed"
        );

    } catch (error) {

        console.error(
            "❌ Finish Error:",
            error
        );

        alert(
            "Failed to save progress."
        );

    }

}

// =============================================
// FATAL ERROR UI
// =============================================

function showFatalError(message) {

    console.error(
        "💥 Fatal:",
        message
    );

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
