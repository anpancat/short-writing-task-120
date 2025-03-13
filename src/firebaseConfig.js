// Firebase SDK 가져오기
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyBF-qFmxRa4OWpKeaG8eEoNHiVE5zJ1SvY",
  authDomain: "writing-6ede7.firebaseapp.com",
  projectId: "writing-6ede7",
  storageBucket: "writing-6ede7.appspot.com",
  messagingSenderId: "392608356172",
  appId: "1:392608356172:web:ebd510aa0f36e111c061e9",
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();


export { db, auth, signInAnonymously, onAuthStateChanged, collection, addDoc, getDocs };
