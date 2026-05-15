// =========================================
// CYMOR CODE LEARNER - MAIN ENGINE
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
} from "./firebase/firebase-config.js";

import { 
    doc, 
    getDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =========================================
// GLOBAL STATE
// =========================================
let currentUser = null;
const TOTAL_LESSONS = 30;
const pathSegments = window.location.pathname.split("/");
const currentPage = pathSegments[pathSegments.length - 1] || "index.html";

// =========================================
// INITIALIZER pipeline
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    setupAuthState();
    setupGlobalButtons();
    
    // Page specific triggers
    if (currentPage.includes("dashboard")) setupDashboard();
    if (currentPage.includes("lesson")) setupLessonPage();
    if (currentPage.includes("quiz")) setupQuizPage();
});

// =========================================
// AUTH LOGIC
// =========================================
function setupAuthState() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await createUserDocument(user);
            updateUI(user);
        } else {
            currentUser = null;
            handleGuestState();
        }
    });
}

function handleGuestState() {
    const protectedPages = ["dashboard.html", "dashboard", "lesson.html", "lesson"];
    if (protectedPages.some(p => currentPage.includes(p))) {
        window.location.href = "index.html";
    }
}

// =========================================
// BUTTON WIRING (The fix for your "Non-working" buttons)
// =========================================
function setupGlobalButtons() {
    
    // 1. SIGN IN BUTTONS (Catches "Login" or "Start Learning" in your screenshot)
    const loginTriggers = document.querySelectorAll('#loginBtn, .login-btn, #startLearningBtn, .primary-btn');
    
    loginTriggers.forEach(btn => {
        // Only attach Google login if the button text suggests it and user isn't logged in
        btn.addEventListener('click', async () => {
            if (!currentUser) {
                try {
                    await signInWithPopup(auth, googleProvider);
                    showToast("Redirecting to Dashboard... 🚀");
                    setTimeout(() => window.location.href = "dashboard.html", 1000);
                } catch (err) {
                    console.error("Auth Error:", err);
                    showToast("Login Failed ❌");
                }
            } else {
                // If already logged in, just go to dashboard
                window.location.href = "dashboard.html";
            }
        });
    });

    // 2. LOGOUT LOGIC
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await signOut(auth);
            window.location.href = "index.html";
        };
    }

    // 3. LESSON NAVIGATION
    const continueBtn = document.getElementById("continueBtn");
    if (continueBtn) {
        continueBtn.onclick = openCurrentLesson;
    }
}

// =========================================
// DATA LOADING
// =========================================
async function updateUI(user) {
    const userName = document.getElementById("userName");
    const welcomeName = document.getElementById("welcomeName");
    
    if (userName) userName.textContent = user.displayName || "Developer";
    if (welcomeName) welcomeName.textContent = user.displayName || "Developer";
    
    await loadDashboardData();
}

async function loadDashboardData() {
    if (!currentUser) return;
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const snapshot = await getDoc(userRef);
        const data = snapshot.data();
        if (data) updateDashboardStats(data);
    } catch (error) { console.error(error); }
}

function updateDashboardStats(data) {
    const completed = data.completedLessons?.length || 0;
    const progress = Math.floor((completed / TOTAL_LESSONS) * 100);

    setText("xpValue", data.xp || 0);
    setText("levelValue", data.level || 1);
    setText("progressPercent", `${progress}%`);

    const fill = document.getElementById("dashboardProgressFill");
    if (fill) fill.style.width = `${progress}%`;
}

// =========================================
// LESSON ENGINE
// =========================================
async function loadLesson() {
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get("id") || 1;

    try {
        const res = await fetch(`./lessons/lesson-${lessonId}.json`);
        const lesson = await res.json();
        
        document.getElementById("lessonTitle").textContent = lesson.title;
        // Combines your content into the single 'lessonContent' div for cleaner mobile display
        document.getElementById("lessonContent").innerHTML = `
            <div class="explanation">${lesson.content.explanation}</div>
            <div class="syntax">${lesson.content.syntax_breakdown || ""}</div>
        `;
        
        const editor = document.getElementById("codeEditor");
        if (editor) editor.value = lesson.editor_sandbox.starter_code;
        
    } catch (err) { console.error("Lesson Load Fail:", err); }
}

async function openCurrentLesson() {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    const lessonId = snap.data()?.currentLesson || 1;
    window.location.href = `lesson.html?id=${lessonId}`;
}

// =========================================
// UI HELPERS
// =========================================
function showToast(msg) {
    const t = document.createElement("div");
    t.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#8b5cf6; color:white; padding:12px 24px; border-radius:10px; z-index:9999; font-weight:bold;";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

console.log("Cymor Engine Live 🚀");
