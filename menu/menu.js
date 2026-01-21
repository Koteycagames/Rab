// © Все права защищены.
// Настоящий файл охраняется законодательством об авторском праве.
// Любое копирование, распространение, публичное воспроизведение, модификация или использование данного файла, полностью или частично, в коммерческих и некоммерческих целях без письменного разрешения правообладателя строго запрещено и может повлечь юридическую ответственность.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('lobby-username').innerText = user.email.replace("@gmail.com", "");
        // Мы больше НЕ загружаем баланс здесь
    } else {
        window.location.href = "../login/login.html";
    }
});

// ПЕРЕХОД В МАГАЗИН
document.getElementById('btn-robux-nav').addEventListener('click', () => {
    window.location.href = "../robux/robux.html";
});

// ОСТАЛЬНЫЕ КНОПКИ
document.getElementById('btn-logout').addEventListener('click', () => {
    if(confirm("Выйти из аккаунта?")) {
        signOut(auth).then(() => { window.location.href = "../login/login.html"; });
    }
});
document.getElementById('btn-home').addEventListener('click', () => location.reload());
document.getElementById('btn-editor').addEventListener('click', () => window.location.href = "../editor/editor.html");
document.getElementById('play-test-game').addEventListener('click', () => window.location.href = "../game/game.html");