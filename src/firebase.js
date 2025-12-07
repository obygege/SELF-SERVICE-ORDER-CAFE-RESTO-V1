import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAJB7KysJOUDf9a_sra--Lj9p5DuU57UZg",
  authDomain: "cafe-pos-27111.firebaseapp.com",
  projectId: "cafe-pos-27111",
  storageBucket: "cafe-pos-27111.firebasestorage.app",
  messagingSenderId: "762853568606",
  appId: "1:762853568606:web:a813ec65e6a82dce9a44cf",
  measurementId: "G-KE9WTD1L68"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();