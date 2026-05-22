// =============================================
// CYMOR CODE LEARNER - CORE ENGINE v2.4
// =============================================

let auth, db, doc, getDoc, updateDoc, arrayUnion, increment, onAuthStateChanged;

async function loadFirebase() {
  try {
    const fb = await import("./firebase/firebase-config.js");
    auth = fb.auth;
    db = fb.db;
    
    const authSDK = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const firestoreSDK = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    
    onAuthStateChanged = authSDK.onAuthStateChanged;
    doc = firestoreSDK.doc;
    getDoc = firestoreSDK.getDoc;
    updateDoc = firestoreSDK.updateDoc;
    arrayUnion = firestoreSDK.arrayUnion;
    increment = firestoreSDK.increment;
    
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await syncUserSidebar(user.uid);
      } else if ($("userName")) {
            $("userName").textContent = "Guest Developer";
      }
    });
  } catch (e) {
    console.warn("Firebase offline mode active.");
  }
}

// State Management
let currentLessonData = null;
let currentStep = 1; 
const urlParams = new URLSearchParams(window.location.search);
const lessonId = parseInt(urlParams.get("id")) || 1; 

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
    loadFirebase();
    loadLessonData(lessonId);
    setupNavigation();
    setupLivePreview();
});

async function loadLessonData(id) {
    try {
        const response = await fetch(`./lessons/lesson-${id}.json`);
        if (!response.ok) throw new Error("Lesson not found");
        
        currentLessonData = await response.json();
        renderTheoryStep();
        updateProgressUI();
    } catch (error) {
        console.error("Load Error:", error);
        if ($("lessonTitle")) $("lessonTitle").textContent = "Content Missing";
    }
}

function setupNavigation() {
    const masterBtn = $("masterNextBtn");
    const prevBtn = $("prevLessonBtn");

    if (masterBtn) {
        masterBtn.onclick = () => {
            if (currentStep === 1) renderChallengeStep();
            else if (currentStep === 2) renderQuizStep();
            else if (currentStep === 3) finishLesson();
        };
    }

    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentStep === 2) renderTheoryStep();
            else if (currentStep === 3) renderChallengeStep();
        };
    }
}

function toggleStepVisibility(stepNum) {
    currentStep = stepNum;
    document.querySelectorAll(".lesson-step").forEach(s => s.classList.remove("active"));
    
    const stepIds = ["step-theory", "step-challenge", "step-quiz"];
    const target = $(stepIds[stepNum - 1]);
    if (target) target.classList.add("active");
    
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderTheoryStep() {
    toggleStepVisibility(1);
    const { title, content, summary } = currentLessonData;

    if ($("lessonTitle")) $("lessonTitle").textContent = title;
    if ($("heroLessonTitle")) $("heroLessonTitle").textContent = title;
    if ($("heroLessonDescription")) $("heroLessonDescription").innerHTML = content.explanation;

    if ($("takeawaysList") && summary.takeaways) {
        $("takeawaysList").innerHTML = summary.takeaways.map(t => `<li>${t}</li>`).join("");
    }

    if ($("cheatSheetList") && summary.cheat_sheet) {
        $("cheatSheetList").innerHTML = Object.entries(summary.cheat_sheet)
            .map(([key, value]) => `
                <div class="card" style="margin-bottom:10px; border-left: 4px solid #00d9ff;">
                    <h4 style="color:#00d9ff; font-size: 0.9rem; margin-bottom: 5px;">${key}</h4>
                    <p style="font-size: 0.85rem; opacity: 0.9;">${value}</p>
                </div>
            `).join("");
    }

    $("masterNextBtn").textContent = "Start Practice ➡";
    $("masterNextBtn").disabled = false;
    $("stepIndicator").textContent = "STEP 1: THEORY";
}

function renderChallengeStep() {
    toggleStepVisibility(2);
    const sandbox = currentLessonData.editor_sandbox;

    if ($("challengeInstruction")) $("challengeInstruction").textContent = sandbox.mini_challenge.instruction;
    if ($("codeEditor") && !$("codeEditor").value) $("codeEditor").value = sandbox.starter_code;
    
    updateLivePreview();
    
    $("masterNextBtn").textContent = "Check Code ➡";
    $("masterNextBtn").disabled = true; 
    $("stepIndicator").textContent = "STEP 2: CHALLENGE";

    const checkBtn = $("checkChallengeBtn");
    const keyword = sandbox.mini_challenge.validation_keyword;

    checkBtn.onclick = () => {
        const userCode = $("codeEditor").value.toLowerCase();
        if (userCode.includes(keyword.toLowerCase())) {
            $("masterNextBtn").disabled = false;
            $("masterNextBtn").textContent = "Go to Quiz ➡";
            showToast("Success! Challenge completed.", "success");
        } else {
            showToast(`Keep trying! Hint: Use the ${keyword} tag.`, "error");
        }
    };
}

function renderQuizStep() {
    toggleStepVisibility(3);
    const quiz = currentLessonData.quiz_engine;

    if ($("quizQuestion")) $("quizQuestion").textContent = quiz.question;
    
    const optionsWrapper = $("quizOptions");
    optionsWrapper.innerHTML = quiz.options.map((opt, i) => `
        <button class="quiz-option" onclick="handleQuizSelection(${i}, ${quiz.correct_index})">
            ${opt}
        </button>
    `).join("");

    $("masterNextBtn").textContent = "Complete Lesson 🏆";
    $("masterNextBtn").disabled = true;
    $("stepIndicator").textContent = "STEP 3: QUIZ";
}

window.handleQuizSelection = (selectedIndex, correctIndex) => {
    const options = document.querySelectorAll(".quiz-option");
    options.forEach(opt => opt.classList.remove("selected", "correct", "wrong"));
    
    const selectedBtn = options[selectedIndex];
    selectedBtn.classList.add("selected");

    if (selectedIndex === correctIndex) {
        selectedBtn.classList.add("correct");
        $("masterNextBtn").disabled = false;
        showToast("Brilliant! That is correct.", "success");
    } else {
        selectedBtn.classList.add("wrong");
        $("masterNextBtn").disabled = true;
        showToast("Incorrect answer. Try again!", "error"); 
    }
};

function setupLivePreview() {
    if ($("codeEditor")) {
        $("codeEditor").addEventListener("input", updateLivePreview);
    }
}

function updateLivePreview() {
    const preview = $("live-preview");
    const code = $("codeEditor").value;
    if (preview) preview.srcdoc = `<html><style>body{color:black; font-family:sans-serif; padding:15px;}</style><body>${code}</body></html>`;
}

// UPDATED: Robust Navigation Fix
async function finishLesson() {
    const modal = $("successModal");
    const masterBtn = $("masterNextBtn");

    masterBtn.disabled = true;
    masterBtn.textContent = "Saving...";

    try {
        if (auth?.currentUser) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                completedLessons: arrayUnion(lessonId),
                totalXP: increment(10)
            });
            console.log("Progress saved for Lesson:", lessonId);
        }

        if (modal) {
            modal.classList.remove("hidden");
            const nextId = Number(lessonId) + 1; 
            const modalBtn = modal.querySelector(".primary-btn");
            
            if (modalBtn) {
                modalBtn.textContent = `Start Lesson ${nextId} 🚀`;
                modalBtn.onclick = (e) => {
                    e.preventDefault();
                    // Using URL constructor to safely set the next ID
                    const nextUrl = new URL(window.location.href);
                    nextUrl.searchParams.set("id", nextId);
                    window.location.href = nextUrl.pathname + nextUrl.search;
                };
            }
        }
    } catch (error) {
        console.error("Save Error:", error);
        if (modal) modal.classList.remove("hidden"); 
    }
}

function showToast(msg, type) {
    const toast = $("authMessage");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `auth-message ${type}`;
    toast.style.display = "flex"; 
    setTimeout(() => { toast.style.display = "none"; }, 3000);
}

function updateProgressUI() {
    const totalLessons = 30;
    const progress = Math.min((lessonId / totalLessons) * 100, 100);
    if ($("progressPercent")) $("progressPercent").textContent = `${Math.round(progress)}%`;
    if ($("progressFill")) $("progressFill").style.width = `${progress}%`;
}

async function syncUserSidebar(uid) {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists() && $("userName")) {
            $("userName").textContent = snap.data().username || "Developer";
        }
    } catch (e) { console.error(e); }
}
