// =============================================
// CYMOR CODE LEARNER - DASHBOARD ENGINE
// File: dashboard.js
// =============================================

import {
    auth,
    db,
    signOut,
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

// =============================================
// DOM READY
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    initializeDashboard();

});

// =============================================
// INITIALIZE DASHBOARD
// =============================================

function initializeDashboard() {

    console.log("🚀 Cymor Dashboard Engine Initialized");

    setupAuth();
    setupLogout();
    setupQuickActions();
    setupAnimations();

}

// =============================================
// AUTH SYSTEM
// =============================================

function setupAuth() {

    onAuthStateChanged(auth, async (user) => {

        // Redirect if not logged in
        if (!user) {

            window.location.href = "login.html";
            return;

        }

        currentUser = user;

        await loadDashboardData(user);

    });

}

// =============================================
// LOAD DASHBOARD DATA
// =============================================

async function loadDashboardData(user) {

    try {

        const userRef = doc(db, "users", user.uid);

        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {

            console.warn("⚠️ User document missing");
            return;

        }

        const data = userSnap.data();

        updateProfileUI(user, data);

        updateStats(data);

        updateProgress(data);

        updateCurrentLesson(data);

        updateAchievements(data);

        updateDailyQuote();

    } catch (error) {

        console.error("Dashboard Load Error:", error);

        showToast("⚠️ Failed to load dashboard");

    }

}

// =============================================
// PROFILE UI
// =============================================

function updateProfileUI(user, data) {

    // User Name
    const name =
        data.name ||
        user.displayName ||
        "Developer";

    const userNameElements =
        document.querySelectorAll("#userName");

    userNameElements.forEach(el => {

        el.textContent = name;

    });

    // Welcome Text
    const welcomeName =
        document.getElementById("welcomeUser");

    if (welcomeName) {

        welcomeName.textContent = name;

    }

    // Avatar
    const avatar =
        document.getElementById("userAvatar");

    if (avatar) {

        avatar.src =
            user.photoURL ||
            "https://i.imgur.com/HeIi0wU.png";

    }

}

// =============================================
// UPDATE STATS
// =============================================

function updateStats(data) {

    const completedLessons =
        data.completedLessons?.length || 0;

    const xp =
        data.xp ||
        data.totalXP ||
        0;

    const level =
        data.level || 1;

    const streak =
        data.streak || 0;

    animateNumber("xpValue", xp);

    animateNumber("levelValue", level);

    animateNumber(
        "completedLessons",
        completedLessons
    );

    animateNumber(
        "streakValue",
        streak
    );

}

// =============================================
// UPDATE PROGRESS
// =============================================

function updateProgress(data) {

    const completed =
        data.completedLessons?.length || 0;

    const progress =
        Math.floor(
            (completed / TOTAL_LESSONS) * 100
        );

    // Progress Text
    const progressText =
        document.getElementById(
            "progressPercent"
        );

    if (progressText) {

        progressText.textContent =
            `${progress}%`;

    }

    // Progress Fill
    const progressFill =
        document.getElementById(
            "dashboardProgressFill"
        );

    if (progressFill) {

        setTimeout(() => {

            progressFill.style.width =
                `${progress}%`;

        }, 300);

    }

    // Progress Label
    const progressLabel =
        document.getElementById(
            "progressLabel"
        );

    if (progressLabel) {

        progressLabel.textContent =
            `${completed}/${TOTAL_LESSONS} Lessons Completed`;

    }

}

// =============================================
// CURRENT LESSON
// =============================================

async function updateCurrentLesson(data) {

    const currentLesson =
        data.currentLesson || 1;

    try {

        const response =
            await fetch(
                `./lessons/lesson-${currentLesson}.json`
            );

        if (!response.ok)
            throw new Error("Lesson missing");

        const lesson =
            await response.json();

        const lessonTitle =
            document.getElementById(
                "currentLessonTitle"
            );

        const lessonDescription =
            document.getElementById(
                "currentLessonDescription"
            );

        const continueBtn =
            document.getElementById(
                "continueLessonBtn"
            );

        if (lessonTitle) {

            lessonTitle.textContent =
                `Lesson ${currentLesson}: ${lesson.title}`;

        }

        if (lessonDescription) {

            lessonDescription.textContent =
                lesson.description ||
                "Continue your coding journey.";

        }

        if (continueBtn) {

            continueBtn.href =
                `lesson.html?id=${currentLesson}`;

        }

    } catch (error) {

        console.error(error);

    }

}

// =============================================
// ACHIEVEMENTS
// =============================================

function updateAchievements(data) {

    const badges =
        data.badges || [];

    const badgeContainer =
        document.getElementById(
            "badgesContainer"
        );

    if (!badgeContainer) return;

    badgeContainer.innerHTML = "";

    if (badges.length === 0) {

        badgeContainer.innerHTML = `
            <div class="empty-badge-card">
                <h3>🏆 No Badges Yet</h3>
                <p>
                    Complete lessons to unlock achievements.
                </p>
            </div>
        `;

        return;

    }

    badges.forEach((badge, index) => {

        const badgeCard =
            document.createElement("div");

        badgeCard.className =
            "badge-card";

        badgeCard.style.animationDelay =
            `${index * 0.1}s`;

        badgeCard.innerHTML = `
            <div class="badge-icon">
                🏅
            </div>

            <div class="badge-content">
                <h3>${badge}</h3>
                <p>Achievement Unlocked</p>
            </div>
        `;

        badgeContainer.appendChild(
            badgeCard
        );

    });

}

// =============================================
// QUICK ACTIONS
// =============================================

function setupQuickActions() {

    // Continue Learning
    const continueBtn =
        document.getElementById(
            "continueLearningBtn"
        );

    if (continueBtn) {

        continueBtn.addEventListener(
            "click",
            () => {

                window.location.href =
                    "lesson.html?id=1";

            }
        );

    }

    // Browse Lessons
    const lessonsBtn =
        document.getElementById(
            "browseLessonsBtn"
        );

    if (lessonsBtn) {

        lessonsBtn.addEventListener(
            "click",
            () => {

                window.location.href =
                    "lessons.html";

            }
        );

    }

}

// =============================================
// LOGOUT
// =============================================

function setupLogout() {

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );

    if (!logoutBtn) return;

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                showToast(
                    "👋 Logged out successfully"
                );

                setTimeout(() => {

                    window.location.href =
                        "login.html";

                }, 1200);

            } catch (error) {

                console.error(error);

                showToast(
                    "⚠️ Logout failed"
                );

            }

        }
    );

}

// =============================================
// ANIMATED COUNTERS
// =============================================

function animateNumber(id, target) {

    const element =
        document.getElementById(id);

    if (!element) return;

    let current = 0;

    const increment =
        Math.max(1, Math.floor(target / 40));

    const timer =
        setInterval(() => {

            current += increment;

            if (current >= target) {

                current = target;

                clearInterval(timer);

            }

            element.textContent = current;

        }, 20);

}

// =============================================
// DAILY QUOTES SYSTEM
// =============================================

function updateDailyQuote() {

    const quotes = [

        "🚀 Great developers are built one lesson at a time.",

        "💡 Consistency beats talent when talent stops learning.",

        "⚡ Every expert programmer was once a beginner.",

        "🔥 Small progress every day becomes huge success.",

        "🧠 Code. Learn. Build. Repeat.",

        "🏆 The best way to learn coding is by coding.",

        "💻 Your future is being written line by line."

    ];

    const quoteElement =
        document.getElementById(
            "dailyQuote"
        );

    if (!quoteElement) return;

    const today =
        new Date().getDate();

    quoteElement.textContent =
        quotes[today % quotes.length];

}

// =============================================
// TOAST NOTIFICATION
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

        }, 400);

    }, 3000);

}

// =============================================
// ANIMATIONS
// =============================================

function setupAnimations() {

    const cards =
        document.querySelectorAll(".card");

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "show-card"
                        );

                    }

                });

            },
            {
                threshold: 0.15
            }
        );

    cards.forEach(card => {

        observer.observe(card);

    });

}

// =============================================
// GLOBAL UTILITIES
// =============================================

window.cymorDashboard = {

    refresh: async () => {

        if (currentUser) {

            await loadDashboardData(currentUser);

        }

    }

};

console.log(
    "✅ Cymor Dashboard System Ready"
);
