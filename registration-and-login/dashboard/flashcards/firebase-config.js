// firebase-config.js
// Firebase Configuration - replace with your actual Firebase project configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
  authDomain: "educonnect-958e2.firebaseapp.com",
  projectId: "educonnect-958e2",
  storageBucket: "educonnect-958e2.appspot.com",
  messagingSenderId: "1044066506835",
  appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6",
  measurementId: "G-B8T5RKWZ5T"
};

/*
  Setup Instructions:
  1. Go to https://console.firebase.google.com/
  2. Create a new project or select an existing one
  3. Add a web app to your project
  4. Copy the configuration object above and replace the placeholder values
  5. Enable Firestore Database in your Firebase console
  6. Set up security rules (test mode is okay for development)
*/

/*
  Example Firestore Security Rules (development / test mode):
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      // Allow read/write access to flashcards collection
      match /flashcards/{document} {
        allow read, write: if true; // Change for production
      }

      // Allow read/write access to user progress
      match /progress/{userId} {
        allow read, write: if true; // Change for production
      }
    }
  }

  Example Security Rules for Production with Authentication:
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /flashcards/{document} {
        allow read, write: if request.auth != null;
      }
      
      match /progress/{userId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
*/
