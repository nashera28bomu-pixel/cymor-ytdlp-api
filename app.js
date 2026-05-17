/* =========================================
   CYMOR CODE LEARNER - MAIN APP ENGINE
   File: app.js
========================================= */

import {
    auth,
    db,
    onAuthStateChanged,
    signOut
} from "./firebase/firebase-config.js";

import {
    doc,
    getDoc,
    updateDoc,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    initEditor
} from "./components/editor.js";

import {
    initQuizEngine
} from "./components/quiz-engine.js";

import "./components/progress-tracker.js";

/* =========================================
   GLOBAL STATE
========================================= */

let currentUser = null;

let currentLesson = null;

const TOTAL_LESSONS = 30;

/* =========================================
   DOM READY
========================================= */

document.addEventListener("DOMContentLoaded", async () => {

    initializeApp();

});

/* =========================================
   MAIN INITIALIZER
========================================= */

async function initializeApp() {

    console.log("🚀 Cymor Code Learner Booting...");

    initializeTheme();

    initializeMobileMenu();

    initializeLogout();

    initializeAuthProtection();

    initializeButtons();

    initializeHints();

    initializeScrollEffects();

    initializeLessonSystem();

    initializeDashboard();

    initializeLessonsPage();

    initializeQuizPage();

    initializeAnimations();

}

/* =========================================
   AUTH PROTECTION
========================================= */

function initializeAuthProtection() {

    onAuthStateChanged(auth, async (user) => {

        const currentPage =
            window.location.pathname;

        const protectedPages = [
            "dashboard.html",
            "lesson.html",
            "lessons.html",
            "quiz.html"
        ];

        const requiresAuth =
            protectedPages.some(page =>
                currentPage.includes(page)
            );

        if (user) {

            currentUser = user;

            await updateUserUI(user);

        } else {

            if (requiresAuth) {

                window.location.href =
                    "login.html";

            }

        }

    });

}

/* =========================================
   USER UI
========================================= */

async function updateUserUI(user) {

    const userName =
        document.getElementById("userName");

    const userAvatar =
        document.getElementById("userAvatar");

    if (userName) {

        userName.textContent =
            user.displayName ||
            "Cymor Developer";

    }

    if (userAvatar) {

        userAvatar.src =
            user.photoURL ||
            "https://i.imgur.com/HeIi0wU.png";

    }

    try {

        const userRef =
            doc(db, "users", user.uid);

        const snapshot =
            await getDoc(userRef);

        if (!snapshot.exists()) return;

        const data =
            snapshot.data();

        updateDashboardStats(data);

    } catch (error) {

        console.error(error);

    }

}

/* =========================================
   DASHBOARD STATS
========================================= */

function updateDashboardStats(data) {

    const xpValue =
        document.getElementById("xpValue");

    const levelValue =
        document.getElementById("levelValue");

    const streakValue =
        document.getElementById("streakValue");

    const completedLessons =
        document.getElementById("completedLessons");

    const progressFill =
        document.getElementById(
            "dashboardProgressFill"
        );

    const progressPercent =
        document.getElementById(
            "progressPercent"
        );

    const completed =
        data.completedLessons?.length || 0;

    const percent =
        Math.floor(
            (completed / TOTAL_LESSONS) * 100
        );

    if (xpValue)
        xpValue.textContent =
            data.totalXP || 0;

    if (levelValue)
        levelValue.textContent =
            data.level || 1;

    if (streakValue)
        streakValue.textContent =
            data.streak || 0;

    if (completedLessons)
        completedLessons.textContent =
            completed;

    if (progressFill)
        progressFill.style.width =
            `${percent}%`;

    if (progressPercent)
        progressPercent.textContent =
            `${percent}%`;

}

/* =========================================
   LESSON SYSTEM
========================================= */

async function initializeLessonSystem() {

    if (
        !window.location.pathname.includes(
            "lesson.html"
        )
    ) return;

    const params =
        new URLSearchParams(
            window.location.search
        );

    const lessonId =
        Number(params.get("id")) || 1;

    try {

        showPageLoader();

        const response =
            await fetch(
                `./lessons/lesson-${lessonId}.json`
            );

        if (!response.ok)
            throw new Error(
                "Lesson not found"
            );

        const lesson =
            await response.json();

        currentLesson = lesson;

        renderLesson(lesson, lessonId);

        initializeEditorAfterLesson();

        initializeQuiz(lesson, lessonId);

        renderLessonSidebar(lessonId);

        saveLastOpenedLesson(lessonId);

        hidePageLoader();

    } catch (error) {

        console.error(error);

        renderLessonError();

    }

}

/* =========================================
   RENDER LESSON
========================================= */

function renderLesson(lesson, lessonId) {

    setText(
        "lessonTitle",
        lesson.title
    );

    setText(
        "lessonModule",
        lesson.module
    );

    const lessonContent =
        document.getElementById(
            "lessonContent"
        );

    if (lessonContent) {

        lessonContent.innerHTML = `

            <div class="glass-card lesson-block fade-up">

                <h2>📘 Explanation</h2>

                <div class="lesson-rich-text">
                    ${lesson.content.explanation}
                </div>

            </div>

            <div class="glass-card lesson-block fade-up">

                <h2>⚡ Syntax Breakdown</h2>

                <div class="lesson-rich-text syntax-highlight">
                    ${lesson.content.syntax_breakdown}
                </div>

            </div>

        `;

    }

    setupChallenge(lesson);

    renderTakeaways(lesson);

    renderCheatSheet(lesson);

    setupLessonNavigation(lessonId);

}

/* =========================================
   EDITOR SYSTEM
========================================= */

function initializeEditorAfterLesson() {

    setTimeout(() => {

        initEditor();

    }, 500);

}

/* =========================================
   QUIZ SYSTEM
========================================= */

function initializeQuiz(lesson, lessonId) {

    if (!lesson.quiz) return;

    initQuizEngine(

        lesson.quiz,

        lessonId,

        async (completedLessonId, xp) => {

            await completeLesson(
                completedLessonId,
                xp
            );

        }

    );

}

/* =========================================
   COMPLETE LESSON
========================================= */

async function completeLesson(
    lessonId,
    xp = 10
) {

    if (!currentUser) return;

    try {

        const userRef =
            doc(
                db,
                "users",
                currentUser.uid
            );

        const snapshot =
            await getDoc(userRef);

        if (!snapshot.exists()) return;

        const data =
            snapshot.data();

        let completedLessons =
            data.completedLessons || [];

        if (
            !completedLessons.includes(
                lessonId
            )
        ) {

            completedLessons.push(
                lessonId
            );

        }

        const progressPercent =
            Math.floor(
                (
                    completedLessons.length /
                    TOTAL_LESSONS
                ) * 100
            );

        const totalXP =
            (data.totalXP || 0) + xp;

        await updateDoc(userRef, {

            completedLessons,

            totalXP,

            progressPercent,

            lastLesson: lessonId,

            updatedAt:
                serverTimestamp()

        });

        createToast(
            `🎉 Lesson Completed! +${xp} XP`,
            "success"
        );

        await updateUserUI(currentUser);

    } catch (error) {

        console.error(error);

    }

}

/* =========================================
   LESSON SIDEBAR
========================================= */

function renderLessonSidebar(currentId) {

    const lessonList =
        document.getElementById(
            "lessonList"
        );

    if (!lessonList) return;

    lessonList.innerHTML = "";

    for (
        let i = 1;
        i <= TOTAL_LESSONS;
        i++
    ) {

        const lessonItem =
            document.createElement("a");

        lessonItem.href =
            `lesson.html?id=${i}`;

        lessonItem.className =
            `lesson-link ${
                i === currentId
                    ? "active-lesson"
                    : ""
            }`;

        lessonItem.innerHTML = `
            <span>Lesson ${i}</span>
        `;

        lessonList.appendChild(
            lessonItem
        );

    }

}

/* =========================================
   LESSON NAVIGATION
========================================= */

function setupLessonNavigation(
    lessonId
) {

    const prevBtn =
        document.getElementById(
            "prevLessonBtn"
        );

    const nextBtn =
        document.getElementById(
            "nextLessonBtn"
        );

    if (prevBtn) {

        prevBtn.style.display =
            lessonId <= 1
                ? "none"
                : "inline-flex";

        prevBtn.onclick = () => {

            window.location.href =
                `lesson.html?id=${
                    lessonId - 1
                }`;

        };

    }

    if (nextBtn) {

        nextBtn.onclick = () => {

            window.location.href =
                `lesson.html?id=${
                    lessonId + 1
                }`;

        };

    }

}

/* =========================================
   CHALLENGE SYSTEM
========================================= */

function setupChallenge(lesson) {

    const instruction =
        document.getElementById(
            "challengeInstruction"
        );

    const hint =
        document.getElementById(
            "challengeHint"
        );

    if (
        instruction &&
        lesson.editor_sandbox
    ) {

        instruction.innerHTML =
            lesson.editor_sandbox
            .mini_challenge
            .instruction;

    }

    if (
        hint &&
        lesson.editor_sandbox
    ) {

        hint.innerHTML =
            lesson.editor_sandbox
            .mini_challenge.hint;

    }

}

/* =========================================
   TAKEAWAYS
========================================= */

function renderTakeaways(lesson) {

    const takeawaysList =
        document.getElementById(
            "takeawaysList"
        );

    if (
        !takeawaysList ||
        !lesson.summary
    ) return;

    takeawaysList.innerHTML =
        lesson.summary.takeaways
        .map(
            item => `
            <li>✅ ${item}</li>
        `
        )
        .join("");

}

/* =========================================
   CHEAT SHEET
========================================= */

function renderCheatSheet(
    lesson
) {

    const cheatSheet =
        document.getElementById(
            "cheatSheetList"
        );

    if (
        !cheatSheet ||
        !lesson.summary
    ) return;

    const cheats =
        lesson.summary.cheat_sheet || [];

    cheatSheet.innerHTML =
        cheats.map(
            item => `
            <div class="cheat-item">
                ${item}
            </div>
        `
        ).join("");

}

/* =========================================
   LESSONS PAGE
========================================= */

async function initializeLessonsPage() {

    if (
        !window.location.pathname.includes(
            "lessons.html"
        )
    ) return;

    const lessonsGrid =
        document.getElementById(
            "lessonsGrid"
        );

    if (!lessonsGrid) return;

    lessonsGrid.innerHTML = "";

    for (
        let i = 1;
        i <= TOTAL_LESSONS;
        i++
    ) {

        const lessonCard =
            document.createElement("a");

        lessonCard.href =
            `lesson.html?id=${i}`;

        lessonCard.className =
            "lesson-card";

        lessonCard.innerHTML = `
            <div class="lesson-card-top">
                <span class="lesson-badge">
                    Lesson ${i}
                </span>
            </div>

            <h3>
                HTML Lesson ${i}
            </h3>

            <p>
                Interactive coding lesson.
            </p>

            <div class="lesson-card-footer">
                <span>⚡ +10 XP</span>
                <span>➡</span>
            </div>
        `;

        lessonsGrid.appendChild(
            lessonCard
        );

    }

}

/* =========================================
   QUIZ PAGE
========================================= */

function initializeQuizPage() {

    if (
        !window.location.pathname.includes(
            "quiz.html"
        )
    ) return;

    console.log(
        "🧠 Quiz Page Loaded"
    );

}

/* =========================================
   LOGOUT
========================================= */

function initializeLogout() {

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );

    if (!logoutBtn) return;

    logoutBtn.addEventListener(
        "click",
        async () => {

            await signOut(auth);

            window.location.href =
                "login.html";

        }
    );

}

/* =========================================
   MOBILE MENU
========================================= */

function initializeMobileMenu() {

    const mobileToggle =
        document.getElementById(
            "mobileMenuBtn"
        );

    const sidebar =
        document.querySelector(
            ".dashboard-sidebar"
        );

    if (
        !mobileToggle ||
        !sidebar
    ) return;

    mobileToggle.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "sidebar-open"
            );

        }
    );

}

/* =========================================
   HINT SYSTEM
========================================= */

function initializeHints() {

    const hintBtn =
        document.getElementById(
            "showHintBtn"
        );

    const hintBox =
        document.getElementById(
            "challengeHint"
        );

    if (
        !hintBtn ||
        !hintBox
    ) return;

    hintBtn.addEventListener(
        "click",
        () => {

            hintBox.classList.toggle(
                "hidden"
            );

        }
    );

}

/* =========================================
   BUTTONS
========================================= */

function initializeButtons() {

    const dashboardBtn =
        document.getElementById(
            "dashboardBtn"
        );

    if (dashboardBtn) {

        dashboardBtn.addEventListener(
            "click",
            () => {

                window.location.href =
                    "dashboard.html";

            }
        );

    }

}

/* =========================================
   DASHBOARD
========================================= */

function initializeDashboard() {

    if (
        !window.location.pathname.includes(
            "dashboard.html"
        )
    ) return;

    console.log(
        "📊 Dashboard Initialized"
    );

}

/* =========================================
   THEME
========================================= */

function initializeTheme() {

    document.body.classList.add(
        "theme-loaded"
    );

}

/* =========================================
   SCROLL EFFECTS
========================================= */

function initializeScrollEffects() {

    window.addEventListener(
        "scroll",
        () => {

            document.body.style.setProperty(
                "--scroll-y",
                `${window.scrollY}px`
            );

        }
    );

}

/* =========================================
   PAGE LOADER
========================================= */

function showPageLoader() {

    const loader =
        document.getElementById(
            "pageLoader"
        );

    if (loader) {

        loader.classList.remove(
            "hidden"
        );

    }

}

function hidePageLoader() {

    const loader =
        document.getElementById(
            "pageLoader"
        );

    if (loader) {

        loader.classList.add(
            "hidden"
        );

    }

}

/* =========================================
   ANIMATIONS
========================================= */

function initializeAnimations() {

    const animated =
        document.querySelectorAll(
            ".fade-up"
        );

    animated.forEach(
        (element, index) => {

            element.style.animationDelay =
                `${index * 0.1}s`;

        }
    );

}

/* =========================================
   TOAST SYSTEM
========================================= */

function createToast(
    message,
    type = "default"
) {

    const toast =
        document.createElement("div");

    toast.className =
        `cymor-toast ${type}`;

    toast.innerHTML = message;

    document.body.appendChild(
        toast
    );

    setTimeout(() => {

        toast.classList.add(
            "show"
        );

    }, 100);

    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

        setTimeout(() => {

            toast.remove();

        }, 300);

    }, 3500);

}

/* =========================================
   LESSON STORAGE
========================================= */

function saveLastOpenedLesson(
    lessonId
) {

    localStorage.setItem(
        "cymor_last_opened_lesson",
        lessonId
    );

}

/* =========================================
   HELPERS
========================================= */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent = value;

    }

}

function renderLessonError() {

    const lessonTitle =
        document.getElementById(
            "lessonTitle"
        );

    if (lessonTitle) {

        lessonTitle.textContent =
            "🚧 Lesson Coming Soon";

    }

}

/* =========================================
   GLOBAL ACCESS
========================================= */

window.cymorApp = {

    completeLesson,

    createToast

};

console.log(
    "✅ Cymor App Engine Ready"
);
