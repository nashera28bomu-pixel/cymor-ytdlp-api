// =============================================
// CYMOR CODE LEARNER - QUIZ ENGINE
// File: components/quiz-engine.js
// =============================================

class CymorQuizEngine {
  constructor(options = {}) {
    // Maps seamlessly to your updated app.js layout parameters
    this.questionElement = document.getElementById(options.questionId || "quizQuestion");
    this.optionsContainer = document.getElementById(options.optionsId || "quizOptions");
    this.submitButton = document.getElementById(options.submitBtnId || "submit-quiz-btn");
    this.nextButton = document.getElementById(options.nextBtnId || "next-lesson-btn");
    this.feedbackBox = document.getElementById(options.feedbackId || "quiz-feedback");
    this.progressBar = document.getElementById(options.progressBarId || "quiz-progress-bar");
    this.scoreElement = document.getElementById(options.scoreId || "quiz-score");
    this.timerElement = document.getElementById(options.timerId || "quiz-timer");
    this.streakElement = document.getElementById(options.streakId || "quiz-streak");
    this.xpElement = document.getElementById(options.xpId || "quiz-xp");

    this.currentQuiz = null;
    this.selectedIndex = null;
    this.score = 0;
    this.streak = 0;
    this.totalXP = 0;
    this.timer = null;
    this.timeLeft = 30;
    this.quizAnswered = false;
    this.lessonId = null;
    this.completionCallback = null;

    this.storageKeys = {
      score: "cymor_quiz_score",
      streak: "cymor_quiz_streak",
      xp: "cymor_total_xp"
    };

    this.loadSavedStats();
    this.attachEvents();
  }

  // =============================================
  // LOAD QUIZ DATA
  // =============================================
  loadQuiz(quizData, lessonId = null, completionCallback = null) {
    if (!quizData) {
      console.error("Quiz data missing.");
      return;
    }

    this.currentQuiz = quizData;
    this.lessonId = lessonId;
    this.completionCallback = completionCallback;
    this.selectedIndex = null;
    this.quizAnswered = false;

    this.renderQuestion();
    this.renderOptions();
    this.clearFeedback();
    this.startTimer();
    this.updateProgressBar(0);
  }

  renderQuestion() {
    if (!this.questionElement) return;
    this.questionElement.innerHTML = this.currentQuiz.question;
  }

  renderOptions() {
    if (!this.optionsContainer) return;
    this.optionsContainer.innerHTML = "";

    this.currentQuiz.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "quiz-option";

      button.innerHTML = `
        <span class="option-letter">${String.fromCharCode(65 + index)}</span>
        <span class="option-text">${option}</span>
      `;

      button.addEventListener("click", () => {
        this.selectOption(index, button);
      });

      this.optionsContainer.appendChild(button);
    });

    // Hide or adjust submission visibility buttons if option interaction triggers answers instantly
    if (this.submitButton) {
      this.submitButton.style.display = "inline-block";
    }
  }

  selectOption(index, buttonElement) {
    if (this.quizAnswered) return;
    this.selectedIndex = index;

    document.querySelectorAll(".quiz-option").forEach((btn) => {
      btn.classList.remove("selected");
    });

    buttonElement.classList.add("selected");

    // Instant grading mechanic matching your app.js layout architecture
    if (!this.submitButton) {
      this.submitQuiz();
    }
  }

  // =============================================
  // SUBMIT QUIZ
  // =============================================
  submitQuiz() {
    if (this.quizAnswered) return;

    if (this.selectedIndex === null) {
      this.showFeedback("⚠️ Please select an answer first.", "warning");
      return;
    }

    this.quizAnswered = true;
    clearInterval(this.timer);

    const correctIndex = this.currentQuiz.correct_index;
    const options = document.querySelectorAll(".quiz-option");

    options.forEach((option, index) => {
      if (index === correctIndex) {
        option.classList.add("correct-answer", "correct");
      }
      if (index === this.selectedIndex && index !== correctIndex) {
        option.classList.add("wrong-answer", "wrong");
      }
      option.disabled = true;
    });

    if (this.selectedIndex === correctIndex) {
      this.handleCorrectAnswer();
    } else {
      this.handleWrongAnswer();
    }

    this.updateProgressBar(100);
  }

  // =============================================
  // CORRECT ANSWER
  // =============================================
  async handleCorrectAnswer() {
    this.score += 1;
    this.streak += 1;

    const earnedXP = this.currentQuiz.points || 10;
    this.totalXP += earnedXP;

    this.saveStats();
    this.updateStatsUI();

    this.showFeedback(
      `✅ Correct! +${earnedXP} XP earned.`,
      "success",
      this.currentQuiz.explanation_feedback || ""
    );

    this.playSound("success");
    this.showConfetti();

    // Trigger downstream Firestore sync callbacks to main app layer database tracking
    if (typeof this.completionCallback === "function") {
      await this.completionCallback(this.lessonId, earnedXP);
    }
  }

  // =============================================
  // WRONG ANSWER
  // =============================================
  handleWrongAnswer() {
    this.streak = 0;
    this.saveStats();
    this.updateStatsUI();

    this.showFeedback(
      "❌ Incorrect answer.",
      "error",
      this.currentQuiz.explanation_feedback || ""
    );

    this.playSound("error");
  }

  // =============================================
  // FEEDBACK
  // =============================================
  showFeedback(message, type = "default", explanation = "") {
    if (!this.feedbackBox) return;

    this.feedbackBox.className = `quiz-feedback ${type}`;
    this.feedbackBox.innerHTML = `
      <div class="feedback-message">${message}</div>
      <div class="feedback-explanation">${explanation}</div>
    `;
  }

  clearFeedback() {
    if (!this.feedbackBox) return;
    this.feedbackBox.innerHTML = "";
    this.feedbackBox.className = "quiz-feedback";
  }

  // =============================================
  // TIMER SYSTEM
  // =============================================
  startTimer() {
    clearInterval(this.timer);
    this.timeLeft = 30;
    this.updateTimerUI();

    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateTimerUI();

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.handleTimeExpired();
      }
    }, 1000);
  }

  updateTimerUI() {
    if (!this.timerElement) return;
    this.timerElement.textContent = `${this.timeLeft}s`;

    if (this.timeLeft <= 10) {
      this.timerElement.classList.add("danger");
    } else {
      this.timerElement.classList.remove("danger");
    }
  }

  handleTimeExpired() {
    if (this.quizAnswered) return;
    this.quizAnswered = true;

    this.showFeedback(
      "⏰ Time is up!",
      "warning",
      "Try reading the lesson summary again before retrying."
    );

    const options = document.querySelectorAll(".quiz-option");
    options.forEach((option, index) => {
      if (index === this.currentQuiz.correct_index) {
        option.classList.add("correct-answer", "correct");
      }
      option.disabled = true;
    });

    this.streak = 0;
    this.saveStats();
    this.updateStatsUI();
  }

  // =============================================
  // PROGRESS BAR
  // =============================================
  updateProgressBar(percent) {
    if (!this.progressBar) return;
    this.progressBar.style.width = `${percent}%`;
  }

  // =============================================
  // STATS STORAGE MANAGEMENT
  // =============================================
  loadSavedStats() {
    this.score = Number(localStorage.getItem(this.storageKeys.score)) || 0;
    this.streak = Number(localStorage.getItem(this.storageKeys.streak)) || 0;
    this.totalXP = Number(localStorage.getItem(this.storageKeys.xp)) || 0;
    this.updateStatsUI();
  }

  saveStats() {
    localStorage.setItem(this.storageKeys.score, this.score);
    localStorage.setItem(this.storageKeys.streak, this.streak);
    localStorage.setItem(this.storageKeys.xp, this.totalXP);
  }

  updateStatsUI() {
    if (this.scoreElement) this.scoreElement.textContent = this.score;
    if (this.streakElement) this.streakElement.textContent = this.streak;
    if (this.xpElement) this.xpElement.textContent = this.totalXP;
  }

  // =============================================
  // AUDIO ASSETS CONTROLLER
  // =============================================
  playSound(type) {
    let audio;
    if (type === "success") {
      audio = new Audio("assets/sounds/success.mp3");
    } else {
      audio = new Audio("assets/sounds/error.mp3");
    }
    audio.volume = 0.4;
    audio.play().catch(() => { /* Swallows user interaction play policies blocks */ });
  }

  // =============================================
  // CONFETTI EFFECT ENGINE
  // =============================================
  showConfetti() {
    if (typeof confetti !== "function") return;
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  }

  attachEvents() {
    if (this.submitButton) {
      this.submitButton.addEventListener("click", () => { this.submitQuiz(); });
    }
    if (this.nextButton) {
      this.nextButton.addEventListener("click", () => { this.goToNextLesson(); });
    }
  }

  goToNextLesson() {
    const currentLesson = Number(new URLSearchParams(window.location.search).get("id"));
    if (!currentLesson) return;
    const nextLesson = currentLesson + 1;
    window.location.href = `lesson.html?id=${nextLesson}`;
  }
}

// =============================================
// ES EXPORT INITIALIZATION PIPELINE FOR APP.JS
// =============================================
export function initQuizEngine(quizData, lessonId, completionCallback) {
  console.log("🧠 Cymor Quiz Engine Module Linked");

  if (!window.cymorQuiz) {
    window.cymorQuiz = new CymorQuizEngine({
      questionId: "quizQuestion",
      optionsId: "quizOptions",
      submitBtnId: "submit-quiz-btn",
      nextBtnId: "next-lesson-btn",
      feedbackId: "quiz-feedback",
      progressBarId: "quiz-progress-bar",
      scoreId: "quiz-score",
      timerId: "quiz-timer",
      streakId: "quiz-streak",
      xpId: "quiz-xp"
    });
  }

  if (quizData) {
    window.cymorQuiz.loadQuiz(quizData, lessonId, completionCallback);
  }
}

// Fallback auto-init fallback handler for isolated static configurations
document.addEventListener("DOMContentLoaded", () => {
  const quizExists = document.getElementById("quizQuestion") || document.getElementById("quiz-question");
  if (quizExists && !window.cymorQuiz) {
    // Intentionally holds processing setup until app.js passes downstream arguments via initQuizEngine()
  }
});
