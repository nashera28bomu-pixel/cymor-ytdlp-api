/* =========================================
   CYMOR CODE LEARNER - AUTH SYSTEM
   File: auth.js
========================================= */

import {
    auth,
    db,
    registerUser,
    loginUser,
    loginWithGoogle,
    logoutUser,
    observeAuthState
} from "./firebase/firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================================
   DOM ELEMENTS
========================================= */
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const googleButtons = document.querySelectorAll(".google-signin-btn");
const logoutBtn = document.getElementById("logoutBtn");
const authLoader = document.getElementById("authLoader");
const authMessage = document.getElementById("authMessage");
const authCard = document.querySelector(".auth-card") || document.querySelector(".register-card");

/* =========================================
   INITIALIZATION
========================================= */
document.addEventListener("DOMContentLoaded", () => {
    setupLogin();
    setupRegister();
    setupGoogleAuth();
    setupLogout();
    
    // Observe Auth State
    observeAuthState((user) => {
        handleAuthStateChange(user);
    });
});

/* =========================================
   LOGIN SYSTEM
========================================= */
function setupLogin() {
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        if (!email || !password) return showMessage("⚠️ Please fill all fields.", "error");

        // UI LOCK: Prevent double submission
        loginForm.style.pointerEvents = "none";
        loginForm.style.opacity = "0.7";
        
        startLoading("Signing you in...");
        const result = await loginUser(email, password);

        if (result.success) {
            if (authCard) authCard.style.display = "none"; // Hide buttons immediately
            showMessage("✅ Login successful!", "success");
            setTimeout(redirectUser, 800);
        } else {
            stopLoading();
            loginForm.style.pointerEvents = "all";
            loginForm.style.opacity = "1";
            showMessage(result.error, "error");
        }
    });
}

/* =========================================
   REGISTER SYSTEM
========================================= */
function setupRegister() {
    if (!registerForm) return;

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;
        const confirm = document.getElementById("registerConfirmPassword").value;

        if (!name || !email || !password) return showMessage("⚠️ Please fill all fields.", "error");
        if (password.length < 6) return showMessage("⚠️ Password too short (min 6 chars).", "error");
        if (password !== confirm) return showMessage("⚠️ Passwords do not match.", "error");

        registerForm.style.pointerEvents = "none";
        startLoading("Creating account...");
        
        const result = await registerUser(name, email, password);

        if (result.success) {
            if (authCard) authCard.style.display = "none"; // Hide buttons immediately
            showMessage("🎉 Account created successfully!", "success");
            setTimeout(redirectUser, 1000);
        } else {
            stopLoading();
            registerForm.style.pointerEvents = "all";
            showMessage(result.error, "error");
        }
    });
}

/* =========================================
   GOOGLE AUTH
========================================= */
function setupGoogleAuth() {
    googleButtons.forEach((btn) => {
        btn.addEventListener("click", async () => {
            startLoading("Connecting to Google...");
            const result = await loginWithGoogle();

            if (result.success) {
                if (authCard) authCard.style.display = "none"; // Hide buttons immediately
                showMessage(`🚀 Welcome ${result.user.displayName}!`, "success");
                setTimeout(redirectUser, 800);
            } else {
                stopLoading();
                showMessage(result.error, "error");
            }
        });
    });
}

/* =========================================
   LOGOUT SYSTEM
========================================= */
function setupLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener("click", async () => {
        const result = await logoutUser();
        if (result.success) {
            localStorage.removeItem("cymor_last_opened_lesson");
            showMessage("👋 Logged out.", "success");
            setTimeout(() => window.location.href = "login.html", 600);
        }
    });
}

/* =========================================
   AUTH STATE MONITOR
========================================= */
function handleAuthStateChange(user) {
    const path = window.location.pathname;
    
    // Check if we are on an auth-related page
    const isAuthPage = path.includes("login.html") || 
                       path.includes("register.html") || 
                       path === "/" || 
                       path.endsWith("/");

    const protectedPages = ["dashboard.html", "lesson.html", "quiz.html", "lessons.html"];
    const isProtected = protectedPages.some(page => path.includes(page));

    if (user) {
        // If user is already logged in and views Login/Register, hide the UI and redirect
        if (isAuthPage) {
            if (authCard) authCard.style.opacity = "0"; 
            redirectUser();
        }
        updateUserUI(user);
    } else {
        if (isProtected) {
            window.location.href = "login.html";
        }
    }
}

/* =========================================
   UI UPDATES
========================================= */
async function updateUserUI(user) {
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const userAvatar = document.getElementById("userAvatar");

    if (userName) userName.textContent = user.displayName || "Cymor Developer";
    if (userEmail) userEmail.textContent = user.email;
    if (userAvatar) userAvatar.src = user.photoURL || "https://i.imgur.com/HeIi0wU.png";

    try {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
            updateDashboardStats(snapshot.data());
        }
    } catch (error) {
        console.error("UI Data Sync Error:", error);
    }
}

function updateDashboardStats(data) {
    const xp = document.getElementById("xpValue");
    const level = document.getElementById("levelValue");
    const completed = document.getElementById("completedLessons");
    const streak = document.getElementById("streakValue");
    const progressFill = document.getElementById("dashboardProgressFill");
    const progressPercent = document.getElementById("progressPercent");

    if (xp) xp.textContent = data.totalXP || 0;
    if (level) level.textContent = data.level || 1;
    if (completed) completed.textContent = data.completedLessons?.length || 0;
    if (streak) streak.textContent = data.streak || 0;

    const percent = data.progressPercent || 0;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
}

/* =========================================
   HELPERS
========================================= */
function redirectUser() {
    const lastLesson = localStorage.getItem("cymor_last_opened_lesson");
    const target = lastLesson ? `lesson.html?id=${lastLesson}` : "dashboard.html";
    
    // Safety check to prevent infinite loop
    if (!window.location.pathname.includes(target)) {
        window.location.href = target;
    }
}

function showMessage(message, type = "default") {
    if (authMessage) {
        authMessage.className = `auth-message ${type}`;
        authMessage.innerHTML = message;
        authMessage.style.display = "flex";
        authMessage.style.opacity = "1";
        setTimeout(() => {
            authMessage.style.opacity = "0";
            setTimeout(() => authMessage.style.display = "none", 300);
        }, 3500);
    }
}

function startLoading(text) {
    if (!authLoader) return;
    authLoader.classList.add("active");
    authLoader.innerHTML = `<div class="loader-spinner"></div><span>${text}</span>`;
}

function stopLoading() {
    if (authLoader) authLoader.classList.remove("active");
}
