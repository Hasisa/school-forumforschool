// Firebase Configuration
// Заменяй значения на конфигурацию своего Firebase проекта
const firebaseConfig = {
      apiKey: "AIzaSyCkU8o1vz4Tmo0yVRFrlq2_1_eDfI_GPaA",
      authDomain: "educonnect-958e2.firebaseapp.com",
      projectId: "educonnect-958e2",
      storageBucket: "educonnect-958e2.firebasestorage.com",
      messagingSenderId: "1044066506835",
      appId: "1:1044066506835:web:ad2866ebfe60aa90978ea6",
};

// Инициализация Firebase (используя глобальный объект firebase из compat версии)
firebase.initializeApp(firebaseConfig);

// Инициализация служб Firebase — аутентификация и Firestore база
const auth = firebase.auth();
const db = firebase.firestore();

// Экспортируем эти объекты через глобальные переменные, чтобы использовать в других скриптах
window.firebaseAuth = auth;
window.firebaseDb = db;