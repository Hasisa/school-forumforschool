// FirebaseManager.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, query, orderBy, doc, deleteDoc, updateDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

class FirebaseManager {
    constructor() {
        this.app = null;
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.useLocalStorage = false;
        this.initFirebase();
    }

    initFirebase() {
        const firebaseConfig = {
            apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
            authDomain: "educonnect-958e2.firebaseapp.com",
            projectId: "educonnect-958e2",
            storageBucket: "educonnect-958e2.appspot.com",
            messagingSenderId: "1044066506835",
            appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6"
        };

        try {
            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            this.auth = getAuth(this.app);

            onAuthStateChanged(this.auth, (user) => {
                this.currentUser = user;
                if (user) {
                    console.log("User signed in:", user.uid);
                } else {
                    this.signInAnonymously();
                }
            });

            console.log("Firebase initialized successfully");
        } catch (error) {
            console.error("Firebase initialization error:", error);
            this.useLocalStorage = true;
        }
    }

    async signInAnonymously() {
        try {
            const userCredential = await signInAnonymously(this.auth);
            this.currentUser = userCredential.user;
            console.log("Signed in anonymously:", this.currentUser.uid);
        } catch (error) {
            console.error("Anonymous sign in error:", error);
            this.useLocalStorage = true;
        }
    }

    // ✅ Save quiz inside users/{uid}/quizzes
    async saveQuiz(quizData) {
        if (this.useLocalStorage || !this.currentUser) {
            return this.saveToLocalStorage(quizData);
        }

        try {
            const docRef = await addDoc(
                collection(this.db, "users", this.currentUser.uid, "quizzes"),
                {
                    ...quizData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }
            );

            console.log("Quiz saved with ID:", docRef.id);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("Error saving quiz to Firestore:", error);
            return this.saveToLocalStorage(quizData);
        }
    }

    // ✅ Get quizzes from users/{uid}/quizzes
    async getQuizzes() {
        if (this.useLocalStorage || !this.currentUser) {
            return this.getFromLocalStorage();
        }

        try {
            const q = query(
                collection(this.db, "users", this.currentUser.uid, "quizzes"),
                orderBy("createdAt", "desc")
            );

            const snapshot = await getDocs(q);
            const quizzes = [];
            snapshot.forEach(docSnap => {
                quizzes.push({ id: docSnap.id, ...docSnap.data() });
            });

            return quizzes;
        } catch (error) {
            console.error("Error getting quizzes from Firestore:", error);
            return this.getFromLocalStorage();
        }
    }

    // ✅ Delete quiz from users/{uid}/quizzes
    async deleteQuiz(quizId) {
        if (this.useLocalStorage || !this.currentUser) {
            return this.deleteFromLocalStorage(quizId);
        }

        try {
            await deleteDoc(doc(this.db, "users", this.currentUser.uid, "quizzes", quizId));
            console.log("Quiz deleted:", quizId);
            return { success: true };
        } catch (error) {
            console.error("Error deleting quiz from Firestore:", error);
            return this.deleteFromLocalStorage(quizId);
        }
    }

    // ✅ Update quiz inside users/{uid}/quizzes
    async updateQuiz(quizId, quizData) {
        if (this.useLocalStorage || !this.currentUser) {
            return this.updateLocalStorage(quizId, quizData);
        }

        try {
            await updateDoc(
                doc(this.db, "users", this.currentUser.uid, "quizzes", quizId),
                {
                    ...quizData,
                    updatedAt: serverTimestamp()
                }
            );
            console.log("Quiz updated:", quizId);
            return { success: true };
        } catch (error) {
            console.error("Error updating quiz in Firestore:", error);
            return this.updateLocalStorage(quizId, quizData);
        }
    }

    // ---------------- LocalStorage fallback ----------------
    saveToLocalStorage(quizData) {
        try {
            const quizzes = JSON.parse(localStorage.getItem("quizzes") || "[]");
            const newQuiz = {
                ...quizData,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            quizzes.push(newQuiz);
            localStorage.setItem("quizzes", JSON.stringify(quizzes));
            return { success: true, id: newQuiz.id };
        } catch (error) {
            console.error("Error saving to localStorage:", error);
            return { success: false, error: error.message };
        }
    }

    getFromLocalStorage() {
        try {
            return JSON.parse(localStorage.getItem("quizzes") || "[]");
        } catch (error) {
            console.error("Error getting from localStorage:", error);
            return [];
        }
    }

    deleteFromLocalStorage(quizId) {
        try {
            const quizzes = JSON.parse(localStorage.getItem("quizzes") || "[]");
            const filtered = quizzes.filter(q => q.id !== quizId);
            localStorage.setItem("quizzes", JSON.stringify(filtered));
            return { success: true };
        } catch (error) {
            console.error("Error deleting from localStorage:", error);
            return { success: false, error: error.message };
        }
    }

    updateLocalStorage(quizId, quizData) {
        try {
            const quizzes = JSON.parse(localStorage.getItem("quizzes") || "[]");
            const index = quizzes.findIndex(q => q.id === quizId);
            if (index !== -1) {
                quizzes[index] = { ...quizzes[index], ...quizData, updatedAt: new Date().toISOString() };
                localStorage.setItem("quizzes", JSON.stringify(quizzes));
                return { success: true };
            }
            return { success: false, error: "Quiz not found" };
        } catch (error) {
            console.error("Error updating localStorage:", error);
            return { success: false, error: error.message };
        }
    }
}

// Создаем глобальный объект
window.firebaseManager = new FirebaseManager();
