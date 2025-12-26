import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

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
export const storage = getStorage(app);

// Inisialisasi Messaging dengan pengecekan dukungan browser
export const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

export const requestForToken = async () => {
  try {
    const messagingInstance = await getMessaging(app);
    const currentToken = await getToken(messagingInstance, {
      vapidKey: 'BLatbFBWa2Ynz4DPERL7WRAqMhp9TJaVlG8ARo00odRIyhoWfW1ArDF2GpPviPFka0A7sRFfNnxd5qNn6Ki0Abs'
    });
    if (currentToken) {
      return currentToken;
    } else {
      console.log('No registration token available.');
      return null;
    }
  } catch (err) {
    console.log('Firebase Messaging not supported or blocked:', err.message);
    return null;
  }
};

export const onMessageListener = async () => {
  const messagingInstance = await getMessaging(app);
  return new Promise((resolve) => {
    onMessage(messagingInstance, (payload) => {
      resolve(payload);
    });
  });
};