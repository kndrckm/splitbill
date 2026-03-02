// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBZu-buqJJRXB-rhKHEkPMI5E_-BT-EK84",
    authDomain: "splitbill-app-965d5.firebaseapp.com",
    projectId: "splitbill-app-965d5",
    storageBucket: "splitbill-app-965d5.firebasestorage.app",
    messagingSenderId: "1084331089307",
    appId: "1:1084331089307:web:d32bb283a99ec56efa553e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
