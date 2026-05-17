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

document.addEventListener("DOMContentLoaded", () => {

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

    initializeHints();

    initializeButtons();

    initializeScrollEffects();

    initializeAnimations();

    initializeAuthProtection();

    await initializeLessonSystem();

    initializeDashboard();

    initializeLessonsPage();

    initializeQuizPage();

}

/* =========================================
   AUTH PROTECTION
========================================= */

function initializeAuthProtection() {

    onAuthStateChanged(auth, async (user) => {

        currentUser = user || null;

        if (user) {

            console.log("👤 Logged In:", user.email);

            await updateUserUI(user);

        } else {

            console.log("🔓 Guest Mode Active");

            const userName =
                document.getElementById("userName");

            const userLevel =
                document.getElementById("userLevel");

            if (userName) {

                userName.textContent =
                    "Guest Developer";

            }

            if (userLevel) {

                userLevel.textContent =
                    "1";

            }

        }

    });

}

/* =========================================
   USER UI
========================================= */

async function updateUserUI(user) {

    try {

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

        const userRef =
            doc(db, "users", user.uid);

        const snapshot =
            await getDoc(userRef);

        if (!snapshot.exists()) return;

        updateDashboardStats(
            snapshot.data()
        );

    } catch (error) {

        console.error(
            "❌ updateUserUI Error:",
            error
        );

    }

}

/* =========================================
   DASHBOARD STATS
========================================= */

function updateDashboardStats(data) {

    const completed =
        data.completedLessons?.length || 0;

    const percent =
        Math.floor(
            (completed / TOTAL_LESSONS) * 100
        );

    setText(
        "xpValue",
        data.totalXP || 0
    );

    setText(
        "levelValue",
        data.level || 1
    );

    setText(
        "streakValue",
        data.streak || 0
    );

    setText(
        "completedLessons",
        completed
    );

    setText(
        "progressPercent",
        `${percent}%`
    );

    const progressFill =
        document.getElementById(
            "progressFill"
        ) ||
        document.getElementById(
            "dashboardProgressFill"
        );

    if (progressFill) {

        progressFill.style.width =
            `${percent}%`;

    }

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

        console.log(
            `📚 Loading Lesson ${lessonId}`
        );

        showPageLoader();

        const response =
            await fetch(
                `./lessons/lesson-${lessonId}.json`
            );

        if (!response.ok) {

            throw new Error(
                `Lesson ${lessonId} not found`
            );

        }

        const lesson =
            await response.json();

        currentLesson = lesson;

        console.log(
            "✅ Lesson Loaded:",
            lesson.title
        );

        renderLesson(
            lesson,
            lessonId
        );

        initializeEditorAfterLesson(
            lesson
        );

        initializeQuiz(
            lesson,
            lessonId
        );

        renderLessonSidebar(
            lessonId
        );

        setupLessonNavigation(
            lessonId
        );

        saveLastOpenedLesson(
            lessonId
        );

        hidePageLoader();

    } catch (error) {

        console.error(
            "❌ Lesson Load Error:",
            error
        );

        renderLessonError(error);

    }

}

/* =========================================
   RENDER LESSON
========================================= */

function renderLesson(
    lesson,
    lessonId
) {

    setText(
        "lessonTitle",
        lesson.title
    );

    setText(
        "heroLessonTitle",
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
                    ${lesson.content?.explanation || ""}
                </div>

            </div>

            <div class="glass-card lesson-block fade-up">

                <h2>⚡ Syntax Breakdown</h2>

                <div class="lesson-rich-text syntax-highlight">
                    ${lesson.content?.syntax_breakdown || ""}
                </div>

            </div>

        `;

    }

    setupChallenge(lesson);

    renderTakeaways(lesson);

    renderCheatSheet(lesson);

}

/* =========================================
   EDITOR SYSTEM
========================================= */

function initializeEditorAfterLesson(
    lesson
) {

    try {

        const editor =
            document.getElementById(
                "codeEditor"
            );

        if (
            editor &&
            lesson.editor_sandbox
        ) {

            editor.value =
                lesson.editor_sandbox
                .starter_code || "";

        }

        setTimeout(() => {

            initEditor();

        }, 300);

    } catch (error) {

        console.error(
            "❌ Editor Error:",
            error
        );

    }

}

/* =========================================
   QUIZ SYSTEM
========================================= */

function initializeQuiz(
    lesson,
    lessonId
) {

    try {

        if (!lesson.quiz_engine) {

            console.warn(
                "⚠ No quiz_engine found"
            );

            return;

        }

        initQuizEngine(

            lesson.quiz_engine,

            lessonId,

            async (
                completedLessonId,
                xp
            ) => {

                await completeLesson(
                    completedLessonId,
                    xp
                );

            }

        );

    } catch (error) {

        console.error(
            "❌ Quiz Engine Error:",
            error
        );

    }

}

/* =========================================
   COMPLETE LESSON
========================================= */

async function completeLesson(
    lessonId,
    xp = 10
) {

    try {

        if (!currentUser) {

            createToast(
                "⚠ Login to save progress",
                "warning"
            );

            return;

        }

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

        const totalXP =
            (data.totalXP || 0) + xp;

        const progressPercent =
            Math.floor(
                (
                    completedLessons.length /
                    TOTAL_LESSONS
                ) * 100
            );

        await updateDoc(userRef, {

            completedLessons,

            totalXP,

            progressPercent,

            lastLesson: lessonId,

            updatedAt:
                serverTimestamp()

        });

        createToast(
            `🎉 Lesson Complete! +${xp} XP`,
            "success"
        );

        await updateUserUI(
            currentUser
        );

    } catch (error) {

        console.error(
            "❌ completeLesson Error:",
            error
        );

    }

}

/* =========================================
   LESSON SIDEBAR
========================================= */

function renderLessonSidebar(
    currentId
) {

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

        const item =
            document.createElement("a");

        item.href =
            `lesson.html?id=${i}`;

        item.className =
            `lesson-link ${
                i === currentId
                    ? "active-lesson"
                    : ""
            }`;

        item.innerHTML =
            `📘 Lesson ${i}`;

        lessonList.appendChild(item);

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
                `lesson.html?id=${lessonId - 1}`;

        };

    }

    if (nextBtn) {

        nextBtn.onclick = () => {

            window.location.href =
                `lesson.html?id=${lessonId + 1}`;

        };

    }

}

/* =========================================
   CHALLENGE SYSTEM
========================================= */

function setupChallenge(lesson) {

    try {

        const sandbox =
            lesson.editor_sandbox;

        if (!sandbox) return;

        const instruction =
            document.getElementById(
                "challengeInstruction"
            );

        const hint =
            document.getElementById(
                "challengeHint"
            );

        if (instruction) {

            instruction.innerHTML =
                sandbox.mini_challenge
                ?.instruction || "";

        }

        if (hint) {

            hint.innerHTML =
                sandbox.mini_challenge
                ?.hint || "";

        }

    } catch (error) {

        console.error(
            "❌ Challenge Error:",
            error
        );

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

    const takeaways =
        lesson.summary.takeaways || [];

    takeawaysList.innerHTML =
        takeaways
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
        lesson.summary.cheat_sheet || {};

    cheatSheet.innerHTML =
        Object.entries(cheats)
        .map(
            ([key, value]) => `
            <div class="cheat-item">
                <strong>${key}</strong>
                <p>${value}</p>
            </div>
        `
        )
        .join("");

}

/* =========================================
   LESSONS PAGE
========================================= */

function initializeLessonsPage() {

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

        const card =
            document.createElement("a");

        card.href =
            `lesson.html?id=${i}`;

        card.className =
            "lesson-card";

        card.innerHTML = `

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

        lessonsGrid.appendChild(card);

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

    if (!dashboardBtn) return;

    dashboardBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "dashboard.html";

        }
    );

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

    toast.innerHTML =
        `<span>${message}</span>`;

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
   STORAGE
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

function renderLessonError(error) {

    console.error(error);

    setText(
        "lessonTitle",
        "🚧 Lesson Failed To Load"
    );

    const lessonContent =
        document.getElementById(
            "lessonContent"
        );

    if (lessonContent) {

        lessonContent.innerHTML = `

            <div class="glass-card lesson-block">

                <h2>❌ Error Loading Lesson</h2>

                <p>
                    The lesson could not load properly.
                </p>

                <pre>
${error}
                </pre>

            </div>

        `;

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
