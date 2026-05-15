// =========================================
// CYMOR CODE LEARNER
// MAIN APPLICATION ENGINE
// =========================================

import {
    auth,
    db,
    googleProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserDocument
} from "./firebase/firebase-config.js"; // Standardized to lowercase path

// We also need access to the base Firestore methods for internal document queries
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =========================================
// GLOBAL VARIABLES
// =========================================

let currentUser = null;
const TOTAL_LESSONS = 30;

// =========================================
// PAGE DETECTION (Optimized for Vercel Clean URLs)
// =========================================

const pathSegments = window.location.pathname.split("/");
const currentPage = pathSegments[pathSegments.length - 1] || "index.html";

// =========================================
// INIT APP
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initializeApp();
    }
);

// =========================================
// MAIN INITIALIZER
// =========================================

function initializeApp() {
    setupAuthState();
    setupGlobalButtons();
    setupDashboard();
    setupLessonPage();
    setupQuizPage();
}

// =========================================
// AUTH STATE LISTENER
// =========================================

function setupAuthState() {
    onAuthStateChanged(
        auth,
        async (user) => {
            if (user) {
                currentUser = user;
                await createUserDocument(user);
                updateUI(user);
            } else {
                currentUser = null;
                handleGuestState();
            }
        }
    );
}

// =========================================
// UPDATE UI
// =========================================

async function updateUI(user) {
    updateUserProfile(user);
    await loadDashboardData();
}

// =========================================
// GUEST STATE
// =========================================

function handleGuestState() {
    // Check handles both 'dashboard.html' and clean path Vercel structures '/dashboard'
    const protectedPages = ["dashboard.html", "dashboard"];

    if (protectedPages.includes(currentPage)) {
        window.location.href = "index.html";
    }
}

// =========================================
// UPDATE USER PROFILE
// =========================================

function updateUserProfile(user) {
    const name = user.displayName || "Developer";
    const email = user.email || "";
    const photo = user.photoURL || "https://i.imgur.com/HeIi0wU.png";

    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const userPhoto = document.getElementById("userPhoto");
    const welcomeName = document.getElementById("welcomeName");

    if (userName) userName.textContent = name;
    if (userEmail) userEmail.textContent = email;
    if (userPhoto) userPhoto.src = photo;
    if (welcomeName) welcomeName.textContent = name;
}

// =========================================
// GLOBAL BUTTONS
// =========================================

function setupGlobalButtons() {
    setupAuthButtons();
    setupNavigationButtons();
}

// =========================================
// AUTH BUTTONS
// =========================================

function setupAuthButtons() {
    // GOOGLE LOGIN
    const googleBtns = document.querySelectorAll(".google-login-btn");

    googleBtns.forEach((btn) => {
        btn.addEventListener(
            "click",
            async () => {
                try {
                    await signInWithPopup(auth, googleProvider);
                    showToast("Login successful 🚀");

                    setTimeout(() => {
                        window.location.href = "dashboard.html";
                    }, 1000);
                } catch (error) {
                    console.error(error);
                    showToast("Google login failed ❌");
                }
            }
        );
    });

    // EMAIL SIGNUP
    const signupForm = document.getElementById("signupForm");

    if (signupForm) {
        signupForm.addEventListener(
            "submit",
            async (e) => {
                e.preventDefault();
                const email = document.getElementById("signupEmail").value;
                const password = document.getElementById("signupPassword").value;

                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    showToast("Account created 🎉");
                    window.location.href = "dashboard.html";
                } catch (error) {
                    console.error(error);
                    showToast(error.message);
                }
            }
        );
    }

    // EMAIL LOGIN
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            async (e) => {
                e.preventDefault();
                const email = document.getElementById("loginEmail").value;
                const password = document.getElementById("loginPassword").value;

                try {
                    await signInWithEmailAndPassword(auth, email, password);
                    showToast("Welcome back 🚀");
                    window.location.href = "dashboard.html";
                } catch (error) {
                    console.error(error);
                    showToast("Invalid login ❌");
                }
            }
        );
    }

    // LOGOUT
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener(
            "click",
            async () => {
                await signOut(auth);
                showToast("Logged out 👋");

                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1000);
            }
        );
    }
}

// =========================================
// NAVIGATION BUTTONS
// =========================================

function setupNavigationButtons() {
    const continueBtn = document.getElementById("continueBtn");
    const resumeBtn = document.getElementById("resumeBtn");
    const continueLearningBtn = document.getElementById("continueLearningBtn");

    if (continueBtn) {
        continueBtn.addEventListener("click", openCurrentLesson);
    }

    if (resumeBtn) {
        resumeBtn.addEventListener("click", openCurrentLesson);
    }

    if (continueLearningBtn) {
        continueLearningBtn.addEventListener("click", openCurrentLesson);
    }
}

// =========================================
// OPEN CURRENT LESSON
// =========================================

async function openCurrentLesson() {
    if (!currentUser) {
        window.location.href = "index.html";
        return;
    }

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const snapshot = await getDoc(userRef);
        const data = snapshot.data();
        const lesson = data.currentLesson || 1;

        window.location.href = `lesson.html?id=${lesson}`;
    } catch (error) {
        console.error(error);
    }
}

// =========================================
// DASHBOARD
// =========================================

function setupDashboard() {
    if (currentPage !== "dashboard.html" && currentPage !== "dashboard") return;
    loadDashboardData();
}

// =========================================
// LOAD DASHBOARD DATA
// =========================================

async function loadDashboardData() {
    if (!currentUser) return;

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const snapshot = await getDoc(userRef);
        const data = snapshot.data();

        if (!data) return;
        updateDashboardStats(data);
    } catch (error) {
        console.error(error);
    }
}

// =========================================
// UPDATE DASHBOARD STATS
// =========================================

function updateDashboardStats(data) {
    const xp = data.xp || 0;
    const level = data.level || 1;
    const completed = data.completedLessons?.length || 0;
    const streak = data.streak || 1;
    const progress = Math.floor((completed / TOTAL_LESSONS) * 100);

    setText("xpValue", xp);
    setText("levelValue", level);
    setText("completedLessons", completed);
    setText("streakValue", streak);
    setText("progressPercent", `${progress}%`);

    const progressFill = document.getElementById("dashboardProgressFill");
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }

    setText("currentLessonTitle", `Lesson ${data.currentLesson || 1}`);
}

// =========================================
// LESSON PAGE
// =========================================

function setupLessonPage() {
    if (currentPage !== "lesson.html" && currentPage !== "lesson") return;
    loadLesson();
}

// =========================================
// LOAD LESSON
// =========================================

async function loadLesson() {
    try {
        const params = new URLSearchParams(window.location.search);
        const lessonId = params.get("id") || 1;

        const response = await fetch(`./lessons/lesson-${lessonId}.json`);
        const lesson = await response.json();

        renderLesson(lesson);
    } catch (error) {
        console.error(error);
    }
}

// =========================================
// RENDER LESSON
// =========================================

function renderLesson(lesson) {
    const title = document.getElementById("lessonTitle");
    const content = document.getElementById("lessonContent");
    const editor = document.getElementById("codeEditor");

    if (title) title.textContent = lesson.title;

    if (content) {
        content.innerHTML = `
            ${lesson.content.explanation}
            <br><br>
            ${lesson.content.syntax_breakdown || ""}
        `;
    }

    if (editor) {
        editor.value = lesson.editor_sandbox.starter_code;
    }
}

// =========================================
// QUIZ PAGE
// =========================================

function setupQuizPage() {
    if (currentPage !== "quiz.html" && currentPage !== "quiz") return;
    loadQuiz();
}

// =========================================
// LOAD QUIZ
// =========================================

async function loadQuiz() {
    try {
        const params = new URLSearchParams(window.location.search);
        const lessonId = params.get("id") || 1;

        const response = await fetch(`./lessons/lesson-${lessonId}.json`);
        const lesson = await response.json();

        renderQuiz(lesson.quiz_engine, lessonId);
    } catch (error) {
        console.error(error);
    }
}

// =========================================
// RENDER QUIZ
// =========================================

function renderQuiz(quiz, lessonId) {
    const question = document.getElementById("quizQuestion");
    const optionsContainer = document.getElementById("quizOptions");

    if (!question || !optionsContainer) return;

    question.textContent = quiz.question;
    optionsContainer.innerHTML = "";

    quiz.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.className = "quiz-option";
        button.innerHTML = option;

        button.addEventListener("click", async () => {
            const allOptions = document.querySelectorAll(".quiz-option");
            allOptions.forEach((btn) => { btn.disabled = true; });

            if (index === quiz.correct_index) {
                button.classList.add("correct-answer");
                showToast("Correct 🎉");
                await completeLesson(lessonId, quiz.points);
            } else {
                button.classList.add("wrong-answer");
                allOptions[quiz.correct_index].classList.add("correct-answer");
                showToast("Wrong answer ❌");
            }
        });

        optionsContainer.appendChild(button);
    });
}

// =========================================
// COMPLETE LESSON
// =========================================

async function completeLesson(lessonId, points) {
    if (!currentUser) return;

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const snapshot = await getDoc(userRef);
        const data = snapshot.data();

        let completedLessons = data.completedLessons || [];

        if (!completedLessons.includes(Number(lessonId))) {
            completedLessons.push(Number(lessonId));
        }

        const nextLesson = Number(lessonId) + 1;
        const xp = (data.xp || 0) + points;
        const level = Math.floor(xp / 100) + 1;

        await updateDoc(userRef, {
            completedLessons,
            xp,
            level,
            currentLesson: nextLesson
        });

        setTimeout(() => {
            window.location.href = `lesson.html?id=${nextLesson}`;
        }, 2000);
    } catch (error) {
        console.error(error);
    }
}

// =========================================
// TOAST
// =========================================

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show-toast");
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show-toast");
        setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
}

// =========================================
// HELPER
// =========================================

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// =========================================
// GLOBAL MOBILE MENU
// =========================================

window.addEventListener("resize", () => {
    if (window.innerWidth > 950) {
        document.body.classList.remove("mobile-menu-open");
    }
});

// =========================================
// CYMOR ENGINE READY 🚀
// =========================================
console.log("🚀 Cymor Code Learner Initialized Successfully");
