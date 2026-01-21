// © Все права защищены.
// Настоящий файл охраняется законодательством об авторском праве.
// Любое копирование, распространение, публичное воспроизведение, модификация или использование данного файла, полностью или частично, в коммерческих и некоммерческих целях без письменного разрешения правообладателя строго запрещено и может повлечь юридическую ответственность.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyByz_AmLcJHT1HaxHPx4D7oROjpDx5TCqw",
    authDomain: "roblox-e62f5.firebaseapp.com",
    projectId: "roblox-e62f5",
    storageBucket: "roblox-e62f5.firebasestorage.app",
    messagingSenderId: "42953844438",
    appId: "1:42953844438:web:15c7dd77e784ce20178b77"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUserUID = null;

// --- ИСПРАВЛЕННАЯ КНОПКА НАЗАД ---
const backBtn = document.getElementById('btn-back');
if (backBtn) {
    backBtn.addEventListener('click', () => {
        // Возвращаемся на один уровень вверх (..) и заходим в папку menu
        window.location.href = "../menu/menu.html";
    });
} else {
    console.error("Кнопка 'Назад' не найдена в HTML!");
}

// АВТОРИЗАЦИЯ И ПОКАЗ БАЛАНСА
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUID = user.uid;
        
        // Слушаем баланс ТОЛЬКО ЗДЕСЬ
        const robuxRef = ref(db, 'users/' + user.uid + '/robux');
        onValue(robuxRef, (snapshot) => {
            const val = snapshot.val() || 0;
            document.getElementById('current-balance').innerText = val;
        });

    } else {
        window.location.href = "../login/login.html";
    }
});

// ЛОГИКА ПОКУПКИ
document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!currentUserUID) return;
        
        const amount = parseInt(btn.getAttribute('data-amount'));
        
        const userRef = ref(db, 'users/' + currentUserUID);
        
        get(userRef).then((snapshot) => {
            let currentRobux = 0;
            if (snapshot.exists() && snapshot.val().robux) {
                currentRobux = snapshot.val().robux;
            }
            
            const newBalance = currentRobux + amount;
            
            update(userRef, { robux: newBalance })
            .then(() => {
                alert(`Успешно куплено: ${amount} Robux!`);
            })
            .catch((e) => alert("Ошибка: " + e.message));
        });
    });
});