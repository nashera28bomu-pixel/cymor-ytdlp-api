// =============================================
// CYMOR CODE LEARNER - LESSONS ENGINE
// File: lessons.js
// =============================================

import {
    auth,
    db,
    onAuthStateChanged
} from "./firebase/firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =============================================
// GLOBAL STATE
// =============================================

const TOTAL_LESSONS = 30;

let currentUser = null;

let completedLessons = [];

let currentFilter = "all";

let lessonsCache = [];

// =============================================
// DOM READY
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("🚀 Cymor Lessons Engine Started");

    initializeLessonsPage();

});

// =============================================
// INITIALIZE PAGE
// =============================================

async function initializeLessonsPage() {

    setupAuth();

    setupSearch();

    setupFilters();

    setupAnimations();

    await loadAllLessons();

}

// =============================================
// AUTH SYSTEM
// =============================================

function setupAuth() {

    onAuthStateChanged(auth, async (user) => {

        if (!user) {

            window.location.href = "login.html";
            return;

        }

        currentUser = user;

        await loadUserProgress();

    });

}

// =============================================
// LOAD USER PROGRESS
// =============================================

async function loadUserProgress() {

    try {

        const userRef =
            doc(db, "users", currentUser.uid);

        const snap =
            await getDoc(userRef);

        if (!snap.exists()) return;

        const data =
            snap.data();

        completedLessons =
            data.completedLessons || [];

        updateStats(data);

        renderLessons(lessonsCache);

    } catch (error) {

        console.error(
            "Failed loading user progress:",
            error
        );

    }

}

// =============================================
// LOAD LESSONS
// =============================================

async function loadAllLessons() {

    const lessonsContainer =
        document.getElementById(
            "lessonsContainer"
        );

    if (lessonsContainer) {

        lessonsContainer.innerHTML = `
            <div class="loading-lessons">
                <div class="loader"></div>
                <p>Loading amazing lessons...</p>
            </div>
        `;

    }

    try {

        const loadedLessons = [];

        for (
            let i = 1;
            i <= TOTAL_LESSONS;
            i++
        ) {

            try {

                const response =
                    await fetch(
                        `./lessons/lesson-${i}.json`
                    );

                if (!response.ok)
                    continue;

                const lesson =
                    await response.json();

                loadedLessons.push({

                    id: i,
                    ...lesson

                });

            } catch (err) {

                console.warn(
                    `Lesson ${i} missing`
                );

            }

        }

        lessonsCache = loadedLessons;

        renderLessons(loadedLessons);

        updateLessonCounter(
            loadedLessons.length
        );

    } catch (error) {

        console.error(
            "Lesson Loading Error:",
            error
        );

        showToast(
            "⚠️ Failed to load lessons"
        );

    }

}

// =============================================
// RENDER LESSONS
// =============================================

function renderLessons(lessons) {

    const container =
        document.getElementById(
            "lessonsContainer"
        );

    if (!container) return;

    container.innerHTML = "";

    if (lessons.length === 0) {

        container.innerHTML = `
            <div class="empty-lessons">
                <h2>📭 No lessons found</h2>
                <p>Try another search.</p>
            </div>
        `;

        return;

    }

    lessons.forEach((lesson, index) => {

        const completed =
            completedLessons.includes(
                lesson.id
            );

        const difficulty =
            lesson.meta?.difficulty ||
            "beginner";

        const xp =
            lesson.meta?.xp_reward ||
            10;

        const module =
            lesson.module ||
            "Web Development";

        const card =
            document.createElement("div");

        card.className =
            `lesson-card ${completed ? "completed" : ""}`;

        card.style.animationDelay =
            `${index * 0.05}s`;

        card.innerHTML = `

            <div class="lesson-card-top">

                <div class="lesson-badge">
                    ${completed ? "✅ Completed" : "🚀 Ready"}
                </div>

                <div class="lesson-number">
                    Lesson ${lesson.id}
                </div>

            </div>

            <div class="lesson-card-body">

                <h2 class="lesson-title">
                    ${lesson.title}
                </h2>

                <p class="lesson-description">
                    ${lesson.description || "Interactive coding lesson"}
                </p>

                <div class="lesson-tags">

                    <span class="lesson-tag">
                        📚 ${module}
                    </span>

                    <span class="lesson-tag">
                        ⚡ ${xp} XP
                    </span>

                    <span class="lesson-tag difficulty-${difficulty}">
                        🔥 ${difficulty}
                    </span>

                </div>

            </div>

            <div class="lesson-card-footer">

                <div class="lesson-progress">

                    <div class="mini-progress-bar">

                        <div
                            class="mini-progress-fill"
                            style="
                                width:
                                ${completed ? "100%" : "15%"}
                            ">
                        </div>

                    </div>

                </div>

                <a
                    href="lesson.html?id=${lesson.id}"
                    class="primary-btn lesson-btn">

                    ${completed ? "Review Lesson" : "Start Learning"}

                </a>

            </div>

        `;

        container.appendChild(card);

    });

}

// =============================================
// SEARCH SYSTEM
// =============================================

function setupSearch() {

    const searchInput =
        document.getElementById(
            "lessonSearch"
        );

    if (!searchInput) return;

    searchInput.addEventListener(
        "input",
        (e) => {

            const value =
                e.target.value
                .toLowerCase()
                .trim();

            filterLessons(value);

        }
    );

}

// =============================================
// FILTER LESSONS
// =============================================

function filterLessons(searchTerm = "") {

    let filtered =
        [...lessonsCache];

    // Search filter
    if (searchTerm) {

        filtered =
            filtered.filter((lesson) => {

                return (
                    lesson.title
                    ?.toLowerCase()
                    .includes(searchTerm) ||

                    lesson.module
                    ?.toLowerCase()
                    .includes(searchTerm) ||

                    lesson.description
                    ?.toLowerCase()
                    .includes(searchTerm)
                );

            });

    }

    // Status filters
    if (currentFilter === "completed") {

        filtered =
            filtered.filter(
                lesson =>
                completedLessons.includes(
                    lesson.id
                )
            );

    }

    if (currentFilter === "incomplete") {

        filtered =
            filtered.filter(
                lesson =>
                !completedLessons.includes(
                    lesson.id
                )
            );

    }

    renderLessons(filtered);

    updateLessonCounter(filtered.length);

}

// =============================================
// FILTER BUTTONS
// =============================================

function setupFilters() {

    const filterButtons =
        document.querySelectorAll(
            ".filter-btn"
        );

    filterButtons.forEach(btn => {

        btn.addEventListener(
            "click",
            () => {

                filterButtons.forEach(b =>
                    b.classList.remove(
                        "active-filter"
                    )
                );

                btn.classList.add(
                    "active-filter"
                );

                currentFilter =
                    btn.dataset.filter;

                filterLessons(
                    document
                    .getElementById(
                        "lessonSearch"
                    )
                    ?.value || ""
                );

            }
        );

    });

}

// =============================================
// UPDATE STATS
// =============================================

function updateStats(data) {

    const completed =
        data.completedLessons?.length || 0;

    const xp =
        data.xp ||
        data.totalXP ||
        0;

    const level =
        data.level || 1;

    const progress =
        Math.floor(
            (completed / TOTAL_LESSONS) * 100
        );

    updateElement(
        "totalLessonsCount",
        TOTAL_LESSONS
    );

    updateElement(
        "completedLessonsCount",
        completed
    );

    updateElement(
        "totalXPCount",
        xp
    );

    updateElement(
        "userLevel",
        level
    );

    updateElement(
        "overallProgressText",
        `${progress}%`
    );

    const progressFill =
        document.getElementById(
            "overallProgressFill"
        );

    if (progressFill) {

        setTimeout(() => {

            progressFill.style.width =
                `${progress}%`;

        }, 300);

    }

}

// =============================================
// UPDATE LESSON COUNTER
// =============================================

function updateLessonCounter(count) {

    const counter =
        document.getElementById(
            "lessonsFoundText"
        );

    if (!counter) return;

    counter.textContent =
        `${count} lessons found`;

}

// =============================================
// HELPER
// =============================================

function updateElement(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent = value;

    }

}

// =============================================
// TOAST
// =============================================

function showToast(message) {

    const toast =
        document.createElement("div");

    toast.className =
        "cymor-toast";

    toast.innerHTML = message;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("show");

    }, 100);

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        }, 500);

    }, 3000);

}

// =============================================
// SCROLL ANIMATIONS
// =============================================

function setupAnimations() {

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(entry => {

                    if (
                        entry.isIntersecting
                    ) {

                        entry.target.classList.add(
                            "show-card"
                        );

                    }

                });

            },
            {
                threshold: 0.1
            }
        );

    setTimeout(() => {

        document
            .querySelectorAll(
                ".lesson-card"
            )
            .forEach(card => {

                observer.observe(card);

            });

    }, 1000);

}

// =============================================
// GLOBAL UTILITIES
// =============================================

window.cymorLessons = {

    refreshLessons: async () => {

        await loadAllLessons();

    },

    searchLessons: (query) => {

        filterLessons(query);

    }

};

console.log(
    "✅ Cymor Lessons System Ready"
);
