// =============================================
// CYMOR CODE LEARNER - DASHBOARD ENGINE v2.0
// FIXES:
//   - TOTAL_LESSONS = 31
//   - Resume last lesson (reads currentLesson from Firestore)
//   - All stats pulled from Firestore, nothing hardcoded
//   - Milestone cards update dynamically based on completedLessons
//   - Daily goal ring computed from real data
// =============================================

import { auth, db, signOut, onAuthStateChanged } from "./firebase/firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const TOTAL_LESSONS = 31;

// Lesson ranges for each module (for milestone tracking)
const MODULES = {
  HTML: { range: [1, 9],  checkpoint: 10, icon: "🌱", label: "HTML" },
  CSS:  { range: [11, 19], checkpoint: 20, icon: "🎨", label: "CSS"  },
  JS:   { range: [21, 29], checkpoint: 30, icon: "⚙️", label: "JS"   },
  Capstone: { range: [31, 31], checkpoint: 31, icon: "🚀", label: "Deploy" },
};

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  setupAuth();
  setupLogout();
});

// =============================================
// AUTH
// =============================================
function setupAuth() {
  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = "login.html"; return; }
    currentUser = user;
    await loadDashboardData(user);
  });
}

// =============================================
// LOAD ALL DATA
// =============================================
async function loadDashboardData(user) {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      // First-time user — create doc then reload
      await setDoc(doc(db, "users", user.uid), {
        username: user.displayName || "Developer",
        email: user.email,
        totalXP: 0,
        level: 1,
        streak: 0,
        completedLessons: [],
        currentLesson: 1,
        createdAt: new Date()
      }, { merge: true });
      await loadDashboardData(user);
      return;
    }

    const data = snap.data();
    updateProfileUI(user, data);
    updateStats(data);
    updateProgress(data);
    updateMilestones(data);
    updateCurrentLesson(data);
    updateDailyGoal(data);
    updateAchievements(data);
    updateLeaderboardRow(data);
    updateDailyQuote();

  } catch (err) {
    console.error("Dashboard load error:", err);
  }
}

// =============================================
// PROFILE
// =============================================
function updateProfileUI(user, data) {
  const name = data.username || user.displayName || "Developer";
  document.querySelectorAll("#userName").forEach(el => el.textContent = name);

  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.textContent = user.email || "";

  const photo = document.getElementById("userPhoto");
  if (photo) photo.src = user.photoURL || "https://i.imgur.com/HeIi0wU.png";

  // Leaderboard row name
  const lbName = document.getElementById("lbUserName");
  if (lbName) lbName.textContent = name;
}

// =============================================
// STATS (all from Firestore — nothing hardcoded)
// =============================================
function updateStats(data) {
  const xp        = data.totalXP || data.xp || 0;
  const level     = computeLevel(xp);
  const completed = data.completedLessons?.length || 0;
  const streak    = data.streak || 0;

  animateNumber("xpValue",           xp);
  animateNumber("xpDisplay",         xp);
  animateNumber("levelValue",        level);
  animateNumber("completedLessons",  completed);
  animateNumber("streakValue",       streak);

  // XP pill in sidebar
  const xpPill = document.getElementById("xpValue");
  if (xpPill) xpPill.textContent = xp;

  // Leaderboard XP
  const lbXp = document.getElementById("lbUserXp");
  if (lbXp) lbXp.textContent = `${xp} XP`;
}

function computeLevel(xp) {
  // Each level = 100 XP — simple formula
  return Math.max(1, Math.floor(xp / 100) + 1);
}

// =============================================
// PROGRESS BAR (uses TOTAL_LESSONS = 31)
// =============================================
function updateProgress(data) {
  const completed = data.completedLessons?.length || 0;
  const pct       = Math.min(Math.floor((completed / TOTAL_LESSONS) * 100), 100);

  const pctEl  = document.getElementById("progressPercent");
  const fillEl = document.getElementById("dashboardProgressFill");

  if (pctEl)  pctEl.textContent   = `${pct}%`;
  if (fillEl) setTimeout(() => { fillEl.style.width = `${pct}%`; }, 300);
}

// =============================================
// MILESTONES — dynamic, based on completedLessons
// =============================================
function updateMilestones(data) {
  const done = data.completedLessons || [];
  const container = document.querySelector(".milestones");
  if (!container) return;

  const milestones = [
    { label: "HTML",    icon: "🌱", unlocked: done.includes(10) },
    { label: "CSS",     icon: "🎨", unlocked: done.includes(20) },
    { label: "JS",      icon: "⚙️", unlocked: done.includes(30) },
    { label: "Deploy",  icon: "🚀", unlocked: done.includes(31) },
  ];

  container.innerHTML = milestones.map(m => `
    <div class="milestone ${m.unlocked ? "done" : ""}">
      <div class="milestone-icon">${m.icon}</div>
      <div class="milestone-name">${m.label}</div>
    </div>
  `).join("");
}

// =============================================
// CURRENT LESSON — FIX: resume from Firestore
// =============================================
async function updateCurrentLesson(data) {
  // FIX 4: use currentLesson saved by lessons.js, not hardcoded 1
  const nextLesson = getNextLesson(data);

  // Update the resume button href
  const resumeBtn = document.querySelector(".resume-btn");
  if (resumeBtn) resumeBtn.href = `lesson.html?id=${nextLesson}`;

  // Update CTA in topbar
  const ctaBtn = document.querySelector(".cta-btn");
  if (ctaBtn)  ctaBtn.href = `lesson.html?id=${nextLesson}`;

  // Load the lesson JSON to get its title
  try {
    const res = await fetch(`./lessons/lesson-${nextLesson}.json`);
    if (!res.ok) return;
    const lesson = await res.json();

    const titleEl = document.getElementById("currentLessonTitle");
    if (titleEl) titleEl.textContent = lesson.title;

    const descEl = document.getElementById("currentLessonDescription");
    if (descEl) descEl.textContent = lesson.content?.explanation
      ? stripHTML(lesson.content.explanation).slice(0, 100) + "…"
      : "Continue your coding journey.";

    // Update the lesson thumb emoji based on module
    const thumbEl = document.querySelector(".lesson-thumb");
    if (thumbEl) {
      if (nextLesson <= 10)       thumbEl.textContent = "🌐";
      else if (nextLesson <= 20)  thumbEl.textContent = "🎨";
      else if (nextLesson <= 30)  thumbEl.textContent = "⚙️";
      else                        thumbEl.textContent = "🚀";
    }

    // Tag on the card
    const tagEl = document.querySelector(".tags .tag");
    if (tagEl) {
      if (nextLesson <= 10)       tagEl.textContent = "HTML";
      else if (nextLesson <= 20)  tagEl.textContent = "CSS";
      else if (nextLesson <= 30)  tagEl.textContent = "JavaScript";
      else                        tagEl.textContent = "Capstone";
    }

  } catch (e) { console.warn("Lesson fetch:", e); }
}

function getNextLesson(data) {
  // PRIMARY: currentLesson is saved by lessons.js every time the user
  // opens a lesson — it's the exact lesson they were on when they left
  if (data.currentLesson && data.currentLesson >= 1) {
    return Math.min(data.currentLesson, TOTAL_LESSONS);
  }
  // FALLBACK: if field doesn't exist yet, scan for first uncompleted
  const done = new Set(data.completedLessons || []);
  for (let i = 1; i <= TOTAL_LESSONS; i++) {
    if (!done.has(i)) return i;
  }
  return TOTAL_LESSONS;
}

function stripHTML(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || "";
}

// =============================================
// DAILY GOAL RING — computed from today's activity
// =============================================
function updateDailyGoal(data) {
  const todayKey  = new Date().toISOString().slice(0, 10); // "2026-06-22"
  const todayDone = (data.completedToday || {})[todayKey] || 0;
  const target    = 3; // 3 lessons/day goal
  const pct       = Math.min(Math.round((todayDone / target) * 100), 100);

  const ring = document.querySelector(".ring-fill");
  if (ring) {
    const circumference = 220;
    ring.style.strokeDashoffset = circumference * (1 - pct / 100);
  }

  const ringPct = document.querySelector(".ring-pct");
  if (ringPct) ringPct.textContent = `${pct}%`;

  const goalInfo = document.querySelector(".goal-info h3");
  if (goalInfo) goalInfo.textContent = todayDone >= target ? "Goal Complete! 🎉" : `${target - todayDone} Lesson${target - todayDone !== 1 ? "s" : ""} Left`;
}

// =============================================
// ACHIEVEMENTS — from Firestore completedLessons
// =============================================
function updateAchievements(data) {
  const done = data.completedLessons || [];

  const achievements = [
    { emoji: "🚀", name: "Explorer",    earned: done.length >= 1 },
    { emoji: "🔥", name: "On a Roll",   earned: done.length >= 5 },
    { emoji: "⚡", name: "First Code",  earned: done.includes(2) },
    { emoji: "🧠", name: "Quiz Master", earned: done.length >= 15 },
    { emoji: "🏆", name: "Champion",    earned: done.length >= 25 },
    { emoji: "💎", name: "Legend",      earned: done.length >= 31 },
  ];

  const container = document.getElementById("achievement-badges");
  if (!container) return;

  container.innerHTML = achievements.map(a => `
    <div class="badge ${a.earned ? "earned" : "locked"}">
      <span class="badge-emoji">${a.emoji}</span>
      <div class="badge-name">${a.name}</div>
    </div>
  `).join("");
}

// =============================================
// LEADERBOARD ROW
// =============================================
function updateLeaderboardRow(data) {
  const xp     = data.totalXP || data.xp || 0;
  const lbXp   = document.getElementById("lbUserXp");
  if (lbXp) lbXp.textContent = `${xp} XP`;
}

// =============================================
// DAILY QUOTE
// =============================================
function updateDailyQuote() {
  const quotes = [
    "🚀 Great developers are built one lesson at a time.",
    "💡 Consistency beats talent when talent stops learning.",
    "⚡ Every expert programmer was once a beginner.",
    "🔥 Small progress every day becomes huge success.",
    "🧠 Code. Learn. Build. Repeat.",
    "🏆 The best way to learn coding is by coding.",
    "💻 Your future is being written line by line.",
  ];
  const el = document.getElementById("dailyQuote");
  if (el) el.textContent = quotes[new Date().getDate() % quotes.length];

  // Also update the motivation card copy
  const motEl = document.querySelector(".motivation-card p");
  if (motEl) motEl.textContent = quotes[(new Date().getDate() + 1) % quotes.length];
}

// =============================================
// LOGOUT
// =============================================
function setupLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (e) { console.error("Logout failed:", e); }
  });
}

// =============================================
// ANIMATED COUNTER
// =============================================
function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step  = Math.max(1, Math.floor(target / 40));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current;
  }, 20);
}

// =============================================
// GLOBAL REFRESH
// =============================================
window.cymorDashboard = {
  refresh: async () => { if (currentUser) await loadDashboardData(currentUser); }
};

console.log("✅ Cymor Dashboard v2.0 ready");
