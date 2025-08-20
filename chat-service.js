// chat-service.js
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js'; // через CDN

class ChatService {
  constructor() {
    this.messagesCollection = 'messages';
    this.unsubscribe = null;

    // ⚠ Токен больше не хранится на фронтенде!
    this.SERVER_URL = 'http://localhost:3000'; // адрес локального сервера
  }

  async saveMessage(userId, message, type = 'user') {
    try {
      const messageData = {
        userId,
        message,
        type,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, this.messagesCollection), messageData);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error saving message:', error);
      return { success: false, error: error.message };
    }
  }

  loadChatHistory(userId, callback) {
    try {
      const q = query(
        collection(db, this.messagesCollection),
        where('userId', '==', userId),
        orderBy('timestamp', 'asc')
      );

      this.unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages = [];
        querySnapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        callback(messages);
      });

      return this.unsubscribe;
    } catch (error) {
      console.error('Error loading chat history:', error);
      callback([]);
    }
  }

  unsubscribeFromChatHistory() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  async createUserProfile(userId, profileData) {
    try {
      await setDoc(doc(db, 'users', userId), {
        ...profileData,
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error creating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  async sendToAI(message) {
    try {
      const response = await fetch(`${this.SERVER_URL}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error ${response.status}: ${text}`);
      }

      const data = await response.json();
      return { success: true, response: data.response };
    } catch (error) {
      console.error('Error sending message to AI:', error);
      return { success: false, error: `Не удалось обработать запрос к AI: ${error.message}` };
    }
  }
}

export default new ChatService();
