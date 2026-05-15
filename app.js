import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from "./firebase/firebase-config.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;
const TOTAL_LESSONS = 30;

document.addEventListener("DOMContentLoaded", () => {
    setupAuthState();
    
    // Determine if we are on the lesson page
    if (window.location.pathname.includes("lesson.html")) {
        loadLesson();
        setupLessonNavigation();
    }
});

function setupAuthState() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            updateSidebarProgress();
        } else {
            const protectedPages = ["dashboard.html", "lesson.html"];
            if (protectedPages.some(p => window.location.pathname.includes(p))) {
                window.location.href = "index.html";
            }
        }
    });
}

async function loadLesson() {
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get("id") || 1;

    try {
        const res = await fetch(`./lessons/lesson-${lessonId}.json`);
        if (!res.ok) throw new Error("Lesson not found");
        const lesson = await res.json();
        
        // Populate Title and Module
        document.getElementById("lessonTitle").textContent = lesson.title;
        document.getElementById("lessonModule").textContent = `Module: ${lesson.module}`;
        
        // Inject Content
        document.getElementById("lessonContent").innerHTML = `
            <div class="glass-card content-block">
                ${lesson.content.explanation}
            </div>
            <div class="glass-card content-block syntax-block">
                ${lesson.content.syntax_breakdown}
            </div>
        `;
        
        // Setup Sandbox
        const editor = document.getElementById("codeEditor");
        if (editor) editor.value = lesson.editor_sandbox.starter_code;

        // Populate Challenge & Summary
        document.getElementById("challengeInstruction").textContent = lesson.editor_sandbox.mini_challenge.instruction;
        document.getElementById("challengeHint").textContent = lesson.editor_sandbox.mini_challenge.hint;

        const takeaways = document.getElementById("takeawaysList");
        takeaways.innerHTML = lesson.summary.takeaways.map(t => `<li>✅ ${t}</li>`).join('');

        // Handle Next/Prev Button Visibility
        document.getElementById("prevLessonBtn").style.display = lessonId == 1 ? "none" : "block";
        document.getElementById("prevLessonBtn").onclick = () => window.location.href = `lesson.html?id=${parseInt(lessonId) - 1}`;
        document.getElementById("nextLessonBtn").onclick = () => window.location.href = `lesson.html?id=${parseInt(lessonId) + 1}`;

    } catch (err) {
        console.error("Lesson Error:", err);
        document.getElementById("lessonTitle").textContent = "Lesson Coming Soon! 🚀";
    }
}

async function updateSidebarProgress() {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
        const data = snap.data();
        const completedCount = data.completedLessons?.length || 0;
        const percent = Math.floor((completedCount / TOTAL_LESSONS) * 100);
        
        const fill = document.getElementById("progressFill");
        if (fill) fill.style.width = `${percent}%`;
        document.getElementById("progressText").textContent = `${percent}% Completed`;
    }
}

function setupLessonNavigation() {
    document.getElementById("dashboardBtn")?.addEventListener("click", () => window.location.href = "dashboard.html");
}
