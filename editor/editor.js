// © Все права защищены.
import * as THREE from 'three';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

let currentUser = null;
let currentRobux = 0;
let selectedPart = 'head'; // Какую часть тела красим

// Дефолтные цвета
const avatarColors = {
    head: '#f1c27d',
    torso: '#0984e3',
    leftArm: '#f1c27d',
    rightArm: '#f1c27d',
    leftLeg: '#55efc4',
    rightLeg: '#55efc4'
};

// 3D Сцена
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
let characterGroup;
let charMesh = {}; // Ссылки на меши частей тела

function initPreview() {
    const container = document.getElementById('preview-container');
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Свет
    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 5, 5);
    scene.add(dir);

    // Персонаж
    characterGroup = new THREE.Group();
    
    // Геометрия
    const headG = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const torsoG = new THREE.BoxGeometry(0.8, 0.8, 0.4);
    const limbG = new THREE.BoxGeometry(0.3, 0.8, 0.3);

    // Создаем меши
    charMesh.head = new THREE.Mesh(headG, new THREE.MeshStandardMaterial({ color: avatarColors.head }));
    charMesh.head.position.y = 1.8;

    charMesh.torso = new THREE.Mesh(torsoG, new THREE.MeshStandardMaterial({ color: avatarColors.torso }));
    charMesh.torso.position.y = 1.2;

    charMesh.leftArm = new THREE.Mesh(limbG, new THREE.MeshStandardMaterial({ color: avatarColors.leftArm }));
    charMesh.leftArm.position.set(-0.55, 1.2, 0);

    charMesh.rightArm = new THREE.Mesh(limbG, new THREE.MeshStandardMaterial({ color: avatarColors.rightArm }));
    charMesh.rightArm.position.set(0.55, 1.2, 0);

    charMesh.leftLeg = new THREE.Mesh(limbG, new THREE.MeshStandardMaterial({ color: avatarColors.leftLeg }));
    charMesh.leftLeg.position.set(-0.2, 0.4, 0);

    charMesh.rightLeg = new THREE.Mesh(limbG, new THREE.MeshStandardMaterial({ color: avatarColors.rightLeg }));
    charMesh.rightLeg.position.set(0.2, 0.4, 0);

    // Добавляем все в группу
    for (let key in charMesh) characterGroup.add(charMesh[key]);
    scene.add(characterGroup);

    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 1.2, 0);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    characterGroup.rotation.y += 0.005; // Медленное вращение
    renderer.render(scene, camera);
}

// UI Логика
document.getElementById('btn-back').addEventListener('click', () => window.location.href = "../menu/menu.html");

// Выбор части тела
document.querySelectorAll('.part-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.part-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPart = btn.getAttribute('data-part');
    });
});

// ПОКУПКА ЦВЕТА
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const colorHex = btn.getAttribute('data-hex');
        
        if (!currentUser) return;

        // Если цвет уже такой же, не тратим деньги
        if (avatarColors[selectedPart] === colorHex) {
            alert("Этот цвет уже установлен!");
            return;
        }

        if (confirm(`Покрасить ${selectedPart} в этот цвет за 15 Robux?`)) {
            buyColor(selectedPart, colorHex);
        }
    });
});

function buyColor(part, hex) {
    if (currentRobux < 15) {
        alert("Недостаточно Robux! Купите их в магазине.");
        return;
    }

    const newBalance = currentRobux - 15;
    const userRef = ref(db, 'users/' + currentUser.uid);

    // 1. Списываем Робуксы
    update(userRef, { robux: newBalance }).then(() => {
        // 2. Сохраняем цвет
        // Путь: users/UID/avatarColors/head = #hex
        update(ref(db, `users/${currentUser.uid}/avatarColors`), {
            [part]: hex
        }).then(() => {
            alert("Успешно!");
            // Обновляем визуал локально
            avatarColors[part] = hex;
            charMesh[part].material.color.set(hex);
            currentRobux = newBalance;
            document.getElementById('user-robux').innerText = currentRobux;
        });
    }).catch(err => alert("Ошибка транзакции: " + err.message));
}

// Загрузка данных
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        initPreview(); // Запускаем 3D

        // Грузим Робуксы и Цвета
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then(snapshot => {
            const data = snapshot.val();
            if (data) {
                currentRobux = data.robux || 0;
                document.getElementById('user-robux').innerText = currentRobux;

                // Применяем сохраненные цвета
                if (data.avatarColors) {
                    Object.assign(avatarColors, data.avatarColors);
                    for (let key in charMesh) {
                        if (avatarColors[key]) charMesh[key].material.color.set(avatarColors[key]);
                    }
                }
            }
        });
    } else {
        window.location.href = "../login/login.html";
    }
});

// Ресайз
window.addEventListener('resize', () => {
    const container = document.getElementById('preview-container');
    if (container && renderer) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
});
