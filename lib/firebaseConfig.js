import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDrau06NijxflHkdeNTBUy1Sqvm6bseErw",
  authDomain: "myworkout-b87bb.firebaseapp.com",
  projectId: "myworkout-b87bb",
  storageBucket: "myworkout-b87bb.firebasestorage.app",
  messagingSenderId: "195021109964",
  appId: "1:195021109964:web:c2c278ded480c7acfbe069",
  measurementId: "G-179ZG65WMS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app)
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

