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
    sendPasswordResetEmail,
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
// CONFIGURATION (RESTORED CREDENTIALS)
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

// Enable Session Persistence
await setPersistence(auth, browserLocalPersistence);

// Google Auth Setup
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// =============================================
// CORE AUTHENTICATION FUNCTIONS
// =============================================

/**
 * Register a new user with Email and Password
 */
export async function registerUser(name, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Set Display Name in Firebase Auth
        await updateProfile(user, { displayName: name });

        // Initialize Firestore Document
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
        const user = userCredential.user;
        await updateLastLogin(user.uid);
        return { success: true, user };
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

/**
 * Creates or updates the user profile in Firestore
 */
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
            console.log("✅ New user profile created in Firestore");
        } else {
            await updateLastLogin(user.uid);
        }
    } catch (error) {
        console.error("❌ Firestore Error:", error);
    }
}

/**
 * Award XP to a user
 */
export async function awardXP(uid, amount = 10) {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            xp: increment(amount),
            totalXP: increment(amount),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("❌ XP Award Error:", error);
    }
}

async function updateLastLogin(uid) {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

// =============================================
// UTILITIES & OBSERVERS
// =============================================

function formatFirebaseError(error) {
    switch (error.code) {
        case "auth/email-already-in-use": return "This email is already registered.";
        case "auth/invalid-email": return "Invalid email address.";
        case "auth/weak-password": return "Password must be at least 6 characters.";
        case "auth/user-not-found": return "No account found.";
        case "auth/wrong-password": return "Incorrect password.";
        case "auth/too-many-requests": return "Too many attempts. Try again later.";
        default: return error.message;
    }
}

export function observeAuthState(callback) {
    onAuthStateChanged(auth, (user) => callback(user));
}

export { auth, db, googleProvider };
