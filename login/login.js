import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error-msg');

function getEmail(u) { return u.trim() + "@gmail.com"; }

// Проверка: если уже вошел, кидаем в меню
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "../menu/menu.html";
    }
});

document.getElementById('btn-register').addEventListener('click', () => {
    createUserWithEmailAndPassword(auth, getEmail(usernameInput.value), passwordInput.value)
        .catch(e => errorMsg.innerText = e.message);
});

document.getElementById('btn-login').addEventListener('click', () => {
    signInWithEmailAndPassword(auth, getEmail(usernameInput.value), passwordInput.value)
        .catch(e => errorMsg.innerText = e.message);
});