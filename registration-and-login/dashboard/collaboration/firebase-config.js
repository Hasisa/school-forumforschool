// Firebase Configuration
// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
  authDomain: "educonnect-958e2.firebaseapp.com",
  projectId: "educonnect-958e2",
  storageBucket: "educonnect-958e2.appspot.com", // исправлено
  messagingSenderId: "1044066506835",
  appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other modules
window.auth = auth;
window.db = db;

console.log("✅ Firebase initialized successfully");
 