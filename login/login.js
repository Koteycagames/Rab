// © Все права защищены.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Элементы UI
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const btnLoginTab = document.getElementById('tab-login');
const btnRegisterTab = document.getElementById('tab-register');

// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
btnLoginTab.addEventListener('click', () => {
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    btnLoginTab.classList.add('active');
    btnRegisterTab.classList.remove('active');
});

btnRegisterTab.addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    btnLoginTab.classList.remove('active');
    btnRegisterTab.classList.add('active');
});

// ЛОГИКА ВХОДА (LOGIN)
document.getElementById('btn-login-action').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    signInWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            // Успешный вход
            window.location.href = "../menu/menu.html";
        })
        .catch((error) => {
            alert("Ошибка входа: " + error.message);
        });
});

// ЛОГИКА РЕГИСТРАЦИИ (REGISTER)
document.getElementById('btn-register-action').addEventListener('click', () => {
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    if (pass.length < 6) {
        alert("Пароль должен быть не менее 6 символов!");
        return;
    }

    createUserWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            const user = userCredential.user;
            const dt = new Date();

            // 1. Создаем запись пользователя в базе
            set(ref(db, 'users/' + user.uid), {
                email: email,
                robux: 0,
                ageGroup: -1, // -1 значит "Не указан"
                ageStatus: "pending_initial", // Статус: "Ожидает первичной проверки админом"
                regDate: dt.toLocaleString(),
                // Дефолтные цвета скина
                avatarColors: {
                    head: '#f1c27d',
                    torso: '#0984e3',
                    leftArm: '#f1c27d',
                    rightArm: '#f1c27d',
                    leftLeg: '#55efc4',
                    rightLeg: '#55efc4'
                }
            });

            // 2. Создаем заявку АДМИНУ (Koteyca)
            const newRequestRef = push(ref(db, 'admin_requests'));
            set(newRequestRef, {
                uid: user.uid,
                email: email,
                type: "initial_registration", // Тип заявки: Новая регистрация
                timestamp: dt.getTime(),
                photoUrl: "no_photo" // Фото нет, админ выбирает возраст на глаз или ставит 0
            });

            alert("Аккаунт создан! Пожалуйста, дождитесь подтверждения возраста администратором.");
            window.location.href = "../menu/menu.html";
        })
        .catch((error) => {
            alert("Ошибка регистрации: " + error.message);
        });
});

// Проверка, если уже вошли
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Если пользователь уже залогинен, сразу кидаем в меню
        // window.location.href = "../menu/menu.html";
    }
});
