import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqBFLRpYuRB1JVl1OkynE-NBd-Lp5iH7g",
  authDomain: "cymorcodelearner.firebaseapp.com",
  projectId: "cymorcodelearner",
  storageBucket: "cymorcodelearner.firebasestorage.app",
  messagingSenderId: "951164049868",
  appId: "1:951164049868:web:da50cb31190bdb6d40a569"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

async function createUserDocument(user) {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "Cymor Developer",
      email: user.email,
      photoURL: user.photoURL || "https://i.imgur.com/HeIi0wU.png",
      xp: 0,
      level: 1,
      completedLessons: [],
      completedQuizzes: [],
      streak: 1,
      currentLesson: 1,
      badges: [],
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
  } else {
    await updateDoc(userRef, { lastLogin: serverTimestamp() });
  }
}

export { auth, db, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserDocument };
