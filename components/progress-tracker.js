// ============================================= // CYMOR CODE LEARNER - PROGRESS TRACKER // File: components/progress-tracker.js // =============================================

import { auth, db } from "../firebase/firebase-config.js";

import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

class CymorProgressTracker { constructor() { this.user = null;

this.currentLessonId = null;

this.progressBar = document.getElementById("overall-progress-bar");
this.progressText = document.getElementById("overall-progress-text");

this.levelText = document.getElementById("user-level");
this.xpText = document.getElementById("user-total-xp");

this.completedLessonsElement = document.getElementById(
  "completed-lessons-count"
);

this.badgesContainer = document.getElementById("achievement-badges");

this.totalLessons = 30;

this.initialize();

}

// ============================================= // INITIALIZE SYSTEM // =============================================

initialize() { onAuthStateChanged(auth, async (user) => { if (!user) { console.warn("No authenticated user found."); return; }

this.user = user;

  await this.ensureUserDocument();

  await this.loadProgress();
});

}

// ============================================= // ENSURE USER DOC EXISTS // =============================================

async ensureUserDocument() { const userRef = doc(db, "users", this.user.uid);

const snapshot = await getDoc(userRef);

if (!snapshot.exists()) {
  await setDoc(userRef, {
    email: this.user.email,
    name: this.user.displayName || "Cymor Student",

    joinedAt: serverTimestamp(),

    totalXP: 0,
    level: 1,

    completedLessons: [],
    completedQuizzes: [],

    streak: 0,
    badges: [],

    lastLesson: 1,
    progressPercent: 0
  });
}

}

// ============================================= // LOAD USER PROGRESS // =============================================

async loadProgress() { const userRef = doc(db, "users", this.user.uid);

const snapshot = await getDoc(userRef);

if (!snapshot.exists()) return;

const data = snapshot.data();

this.renderProgress(data);
this.renderBadges(data.badges || []);

}

// ============================================= // MARK LESSON COMPLETE // =============================================

async completeLesson(lessonId, earnedXP = 10) { if (!this.user) return;

const userRef = doc(db, "users", this.user.uid);

const snapshot = await getDoc(userRef);

if (!snapshot.exists()) return;

const data = snapshot.data();

let completedLessons = data.completedLessons || [];

if (!completedLessons.includes(lessonId)) {
  completedLessons.push(lessonId);
}

const progressPercent = Math.floor(
  (completedLessons.length / this.totalLessons) * 100
);

const totalXP = (data.totalXP || 0) + earnedXP;

const level = this.calculateLevel(totalXP);

const badges = this.generateBadges(
  completedLessons.length,
  totalXP
);

await updateDoc(userRef, {
  completedLessons,
  totalXP,
  level,
  progressPercent,
  badges,
  lastLesson: lessonId,
  updatedAt: serverTimestamp()
});

this.showToast(
  `🎉 Lesson ${lessonId} completed! +${earnedXP} XP`
);

await this.loadProgress();

}

// ============================================= // COMPLETE QUIZ // =============================================

async completeQuiz(lessonId, quizScore = 10) { if (!this.user) return;

const userRef = doc(db, "users", this.user.uid);

const snapshot = await getDoc(userRef);

if (!snapshot.exists()) return;

const data = snapshot.data();

let completedQuizzes = data.completedQuizzes || [];

if (!completedQuizzes.includes(lessonId)) {
  completedQuizzes.push(lessonId);
}

await updateDoc(userRef, {
  completedQuizzes,
  totalXP: increment(quizScore),
  updatedAt: serverTimestamp()
});

this.showToast(
  `🧠 Quiz completed successfully! +${quizScore} XP`
);

await this.loadProgress();

}

// ============================================= // LEVEL SYSTEM // =============================================

calculateLevel(xp) { if (xp < 100) return 1; if (xp < 250) return 2; if (xp < 500) return 3; if (xp < 800) return 4; if (xp < 1200) return 5; if (xp < 1700) return 6; if (xp < 2300) return 7;

return 8;

}

// ============================================= // BADGES SYSTEM // =============================================

generateBadges(completedLessons, totalXP) { const badges = [];

if (completedLessons >= 1) {
  badges.push("🚀 Beginner Explorer");
}

if (completedLessons >= 5) {
  badges.push("🔥 HTML Starter");
}

if (completedLessons >= 10) {
  badges.push("💻 Web Architect");
}

if (completedLessons >= 20) {
  badges.push("⚡ Frontend Warrior");
}

if (completedLessons >= 30) {
  badges.push("🏆 Cymor Graduate");
}

if (totalXP >= 500) {
  badges.push("⭐ XP Master");
}

return badges;

}

// ============================================= // RENDER PROGRESS // =============================================

renderProgress(data) { const completedLessons = data.completedLessons || [];

const progressPercent = data.progressPercent || 0;

if (this.progressBar) {
  this.progressBar.style.width = `${progressPercent}%`;
}

if (this.progressText) {
  this.progressText.textContent = `${progressPercent}% Completed`;
}

if (this.levelText) {
  this.levelText.textContent = `Level ${data.level || 1}`;
}

if (this.xpText) {
  this.xpText.textContent = `${data.totalXP || 0} XP`;
}

if (this.completedLessonsElement) {
  this.completedLessonsElement.textContent =
    completedLessons.length;
}

}

// ============================================= // RENDER BADGES // =============================================

renderBadges(badges) { if (!this.badgesContainer) return;

this.badgesContainer.innerHTML = "";

if (badges.length === 0) {
  this.badgesContainer.innerHTML = `
    <p class="no-badges">
      Complete lessons to unlock badges.
    </p>
  `;

  return;
}

badges.forEach((badge) => {
  const badgeElement = document.createElement("div");

  badgeElement.className = "badge-card";

  badgeElement.innerHTML = `
    <span class="badge-text">
      ${badge}
    </span>
  `;

  this.badgesContainer.appendChild(badgeElement);
});

}

// ============================================= // SAVE CURRENT LESSON // =============================================

saveCurrentLesson(lessonId) { localStorage.setItem( "cymor_last_opened_lesson", lessonId ); }

getLastLesson() { return localStorage.getItem( "cymor_last_opened_lesson" ); }

// ============================================= // CONTINUE LEARNING // =============================================

continueLearning() { const lastLesson = this.getLastLesson() || 1;

window.location.href = `lesson.html?id=${lastLesson}`;

}

// ============================================= // TOAST NOTIFICATIONS // =============================================

showToast(message) { const toast = document.createElement("div");

toast.className = "cymor-toast";

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

// ============================================= // DAILY LOGIN BONUS // =============================================

async awardDailyLoginBonus() { if (!this.user) return;

const today = new Date().toDateString();

const lastClaim = localStorage.getItem(
  "cymor_daily_bonus"
);

if (lastClaim === today) return;

const userRef = doc(db, "users", this.user.uid);

await updateDoc(userRef, {
  totalXP: increment(20)
});

localStorage.setItem(
  "cymor_daily_bonus",
  today
);

this.showToast("🎁 Daily Login Bonus: +20 XP");

await this.loadProgress();

} }

// ============================================= // INITIALIZE GLOBALLY // =============================================

window.cymorProgress = new CymorProgressTracker();
