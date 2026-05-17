/* =========================================
   CYMOR CODE LEARNER - AUTH SYSTEM
   File: auth.js
========================================= */

import {
    auth,
    db,
    googleProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    createUserDocument
} from "./firebase/firebase-config.js";

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================================
   GLOBAL VARIABLES
========================================= */

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const googleButtons = document.querySelectorAll(".google-signin-btn");

const logoutBtn = document.getElementById("logoutBtn");

const authLoader = document.getElementById("authLoader");

const authMessage = document.getElementById("authMessage");

/* =========================================
   AUTH INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeAuth();

});

/* =========================================
   MAIN INITIALIZER
========================================= */

function initializeAuth() {

    setupLogin();

    setupRegister();

    setupGoogleAuth();

    setupLogout();

    monitorAuthState();

}

/* =========================================
   LOGIN SYSTEM
========================================= */

function setupLogin() {

    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        if (!email || !password) {

            showMessage(
                "⚠️ Please fill all fields.",
                "error"
            );

            return;
        }

        try {

            startLoading("Signing you in...");

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;

            await updateUserLogin(user.uid);

            showMessage(
                "✅ Login successful!",
                "success"
            );

            setTimeout(() => {

                redirectUser();

            }, 1000);

        } catch (error) {

            console.error(error);

            handleFirebaseError(error);

        } finally {

            stopLoading();

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

        const name =
            document.getElementById("registerName").value.trim();

        const email =
            document.getElementById("registerEmail").value.trim();

        const password =
            document.getElementById("registerPassword").value;

        const confirmPassword =
            document.getElementById("registerConfirmPassword").value;

        if (
            !name ||
            !email ||
            !password ||
            !confirmPassword
        ) {

            showMessage(
                "⚠️ Please fill all fields.",
                "error"
            );

            return;
        }

        if (password.length < 6) {

            showMessage(
                "⚠️ Password must be at least 6 characters.",
                "error"
            );

            return;
        }

        if (password !== confirmPassword) {

            showMessage(
                "⚠️ Passwords do not match.",
                "error"
            );

            return;
        }

        try {

            startLoading("Creating account...");

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;

            await user.updateProfile({
                displayName: name
            });

            await createUserDocument({
                ...user,
                displayName: name
            });

            showMessage(
                "🎉 Account created successfully!",
                "success"
            );

            setTimeout(() => {

                redirectUser();

            }, 1200);

        } catch (error) {

            console.error(error);

            handleFirebaseError(error);

        } finally {

            stopLoading();

        }

    });

}

/* =========================================
   GOOGLE AUTH
========================================= */

function setupGoogleAuth() {

    if (!googleButtons.length) return;

    googleButtons.forEach((button) => {

        button.addEventListener("click", async () => {

            try {

                startLoading("Connecting to Google...");

                const result =
                    await signInWithPopup(
                        auth,
                        googleProvider
                    );

                const user = result.user;

                await createUserDocument(user);

                showMessage(
                    `🚀 Welcome ${user.displayName}!`,
                    "success"
                );

                setTimeout(() => {

                    redirectUser();

                }, 1000);

            } catch (error) {

                console.error(error);

                handleFirebaseError(error);

            } finally {

                stopLoading();

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

        try {

            await signOut(auth);

            localStorage.removeItem(
                "cymor_last_opened_lesson"
            );

            showMessage(
                "👋 Logged out successfully.",
                "success"
            );

            setTimeout(() => {

                window.location.href =
                    "login.html";

            }, 800);

        } catch (error) {

            console.error(error);

            showMessage(
                "❌ Logout failed.",
                "error"
            );

        }

    });

}

/* =========================================
   AUTH STATE MONITOR
========================================= */

function monitorAuthState() {

    onAuthStateChanged(auth, async (user) => {

        const currentPage =
            window.location.pathname;

        const isAuthPage =
            currentPage.includes("login.html") ||
            currentPage.includes("register.html");

        if (user) {

            if (isAuthPage) {

                redirectUser();

            }

            updateUserUI(user);

        } else {

            const protectedPages = [
                "dashboard.html",
                "lesson.html",
                "quiz.html",
                "lessons.html"
            ];

            const requiresAuth =
                protectedPages.some((page) =>
                    currentPage.includes(page)
                );

            if (requiresAuth) {

                window.location.href =
                    "login.html";

            }

        }

    });

}

/* =========================================
   UPDATE USER DATA
========================================= */

async function updateUserLogin(uid) {

    try {

        const userRef =
            doc(db, "users", uid);

        await updateDoc(userRef, {

            lastLogin:
                serverTimestamp()

        });

    } catch (error) {

        console.error(
            "User login update failed:",
            error
        );

    }

}

/* =========================================
   UPDATE USER UI
========================================= */

async function updateUserUI(user) {

    const userName =
        document.getElementById("userName");

    const userEmail =
        document.getElementById("userEmail");

    const userAvatar =
        document.getElementById("userAvatar");

    if (userName) {

        userName.textContent =
            user.displayName ||
            "Cymor Developer";

    }

    if (userEmail) {

        userEmail.textContent =
            user.email;

    }

    if (userAvatar) {

        userAvatar.src =
            user.photoURL ||
            "https://i.imgur.com/HeIi0wU.png";

    }

    try {

        const userRef =
            doc(db, "users", user.uid);

        const snapshot =
            await getDoc(userRef);

        if (!snapshot.exists()) return;

        const data =
            snapshot.data();

        updateDashboardStats(data);

    } catch (error) {

        console.error(error);

    }

}

/* =========================================
   DASHBOARD DATA
========================================= */

function updateDashboardStats(data) {

    const xp =
        document.getElementById("xpValue");

    const level =
        document.getElementById("levelValue");

    const completed =
        document.getElementById("completedLessons");

    const streak =
        document.getElementById("streakValue");

    const progressFill =
        document.getElementById(
            "dashboardProgressFill"
        );

    const progressPercent =
        document.getElementById(
            "progressPercent"
        );

    if (xp)
        xp.textContent =
            data.totalXP || 0;

    if (level)
        level.textContent =
            data.level || 1;

    if (completed)
        completed.textContent =
            data.completedLessons?.length || 0;

    if (streak)
        streak.textContent =
            data.streak || 0;

    const percent =
        data.progressPercent || 0;

    if (progressFill) {

        progressFill.style.width =
            `${percent}%`;

    }

    if (progressPercent) {

        progressPercent.textContent =
            `${percent}%`;

    }

}

/* =========================================
   REDIRECT USER
========================================= */

function redirectUser() {

    const lastLesson =
        localStorage.getItem(
            "cymor_last_opened_lesson"
        );

    if (lastLesson) {

        window.location.href =
            `lesson.html?id=${lastLesson}`;

    } else {

        window.location.href =
            "dashboard.html";

    }

}

/* =========================================
   TOAST MESSAGE SYSTEM
========================================= */

function showMessage(message, type = "default") {

    if (authMessage) {

        authMessage.className =
            `auth-message ${type}`;

        authMessage.innerHTML = message;

        authMessage.style.display = "flex";

        setTimeout(() => {

            authMessage.style.opacity = "1";

        }, 50);

        setTimeout(() => {

            authMessage.style.opacity = "0";

            setTimeout(() => {

                authMessage.style.display =
                    "none";

            }, 300);

        }, 3500);

    } else {

        createFloatingToast(message, type);

    }

}

/* =========================================
   FLOATING TOAST
========================================= */

function createFloatingToast(message, type) {

    const toast =
        document.createElement("div");

    toast.className =
        `cymor-toast ${type}`;

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

    }, 3500);

}

/* =========================================
   FIREBASE ERROR HANDLER
========================================= */

function handleFirebaseError(error) {

    let message =
        "❌ Something went wrong.";

    switch (error.code) {

        case "auth/email-already-in-use":
            message =
                "⚠️ Email already in use.";
            break;

        case "auth/invalid-email":
            message =
                "⚠️ Invalid email address.";
            break;

        case "auth/weak-password":
            message =
                "⚠️ Weak password.";
            break;

        case "auth/user-not-found":
            message =
                "⚠️ User not found.";
            break;

        case "auth/wrong-password":
            message =
                "⚠️ Incorrect password.";
            break;

        case "auth/popup-closed-by-user":
            message =
                "⚠️ Google popup closed.";
            break;

        case "auth/network-request-failed":
            message =
                "🌐 Network error.";
            break;
    }

    showMessage(message, "error");

}

/* =========================================
   LOADER SYSTEM
========================================= */

function startLoading(text = "Loading...") {

    if (!authLoader) return;

    authLoader.classList.add("active");

    authLoader.innerHTML = `
        <div class="loader-spinner"></div>
        <span>${text}</span>
    `;

}

function stopLoading() {

    if (!authLoader) return;

    authLoader.classList.remove("active");

}

/* =========================================
   EXPORTS
========================================= */

export {

    redirectUser,

    showMessage,

    updateDashboardStats

};
