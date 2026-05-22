// =============================================
// CYMOR CODE LEARNER - FIREBASE CORE
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =============================================
// CONFIGURATION
// =============================================
const firebaseConfig = {
    apiKey: "AIzaSyCqBFLRpYuRB1JVl1OkynE-NBd-Lp5iH7g",
    authDomain: "cymorcodelearner.firebaseapp.com",
    projectId: "cymorcodelearner",
    storageBucket: "cymorcodelearner.firebasestorage.app",
    messagingSenderId: "951164049868",
    appId: "1:951164049868:web:da50cb31190bdb6d40a569"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable Session Persistence (NON-BLOCKING)
// We use .then() instead of await to avoid freezing the script import
setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("🔒 Persistence Enabled"))
    .catch((err) => console.error("Persistence Error:", err));

// Google Auth Setup
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// =============================================
// CORE AUTHENTICATION FUNCTIONS
// =============================================

/**
 * Register a new user
 */
export async function registerUser(name, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile display name immediately
        await updateProfile(user, { displayName: name });

        // Initialize Firestore
        await createUserDocument(user, { name });

        return { success: true, user };
    } catch (error) {
        return { success: false, error: formatFirebaseError(error) };
    }
}

/**
 * Login existing user
 */
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await updateLastLogin(userCredential.user.uid);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: formatFirebaseError(error) };
    }
}

/**
 * Sign in with Google
 */
export async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        await createUserDocument(result.user);
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, error: formatFirebaseError(error) };
    }
}

/**
 * Log out user
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// =============================================
// FIRESTORE DATA FUNCTIONS
// =============================================

export async function createUserDocument(user, extraData = {}) {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);

    try {
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
            const userData = {
                uid: user.uid,
                name: user.displayName || extraData.name || "Cymor Developer",
                email: user.email,
                photoURL: user.photoURL || "https://i.imgur.com/HeIi0wU.png",
                xp: 0,
                totalXP: 0,
                level: 1,
                streak: 1,
                completedLessons: [],
                completedQuizzes: [],
                unlockedLessons: [1],
                currentLesson: 1,
                lastOpenedLesson: 1,
                progressPercent: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                ...extraData
            };
            await setDoc(userRef, userData);
        } else {
            await updateLastLogin(user.uid);
        }
    } catch (error) {
        console.error("❌ Firestore Error:", error);
    }
}

async function updateLastLogin(uid) {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        console.warn("Failed to update last login timestamp.");
    }
}

// =============================================
// UTILITIES & OBSERVERS
// =============================================

function formatFirebaseError(error) {
    console.error("Firebase Auth Error Code:", error.code);
    switch (error.code) {
        case "auth/email-already-in-use": return "This email is already registered.";
        case "auth/invalid-email": return "Invalid email address.";
        case "auth/weak-password": return "Password must be at least 6 characters.";
        case "auth/user-not-found": 
        case "auth/wrong-password": 
        case "auth/invalid-credential": return "Incorrect email or password.";
        case "auth/too-many-requests": return "Too many attempts. Try again later.";
        case "auth/popup-closed-by-user": return "Login cancelled.";
        default: return "An authentication error occurred. Please try again.";
    }
}

export function observeAuthState(callback) {
    onAuthStateChanged(auth, (user) => callback(user));
}

export { auth, db, googleProvider };
