import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCu9HyNbCd-SwZatXqVr2EQGqZ1yyA1Z2o",
    authDomain: "reto30-app-cortex.firebaseapp.com",
    projectId: "reto30-app-cortex",
    storageBucket: "reto30-app-cortex.firebasestorage.app",
    messagingSenderId: "1089728175914",
    appId: "1:1089728175914:web:6427413d923c9bff8dc853"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
