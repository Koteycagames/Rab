import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, update, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const IMGBB_API_KEY = "d303f89a3557c69b66f8513e5f66a3af";
let currentUser = null;

// UI
const video = document.getElementById('video');
const btnScan = document.getElementById('btn-scan');
const loadingText = document.getElementById('loading-text');
const statusText = document.getElementById('current-status');
const groupText = document.getElementById('current-group');

document.getElementById('back-btn').addEventListener('click', () => window.location.href = "../menu/menu.html");

// 1. ЗАГРУЗКА МОДЕЛЕЙ (МОЗГОВ)
async function loadModels() {
    // Грузим модели с CDN, чтобы не качать файлы локально
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
    
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
        // Включаем камеру только когда мозги загрузились
        startVideo();
    } catch (err) {
        alert("Ошибка загрузки нейросети: " + err);
    }
}

// 2. ЗАПУСК ВИДЕО
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
            btnScan.innerText = "📸 Сканировать лицо";
            btnScan.disabled = false;
        })
        .catch(err => console.error(err));
}

// 3. ОТПРАВКА НА IMGBB
async function uploadToImgBB(base64Image) {
    const formData = new FormData();
    const cleanBase64 = base64Image.split(',')[1];
    formData.append("image", cleanBase64);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST", body: formData
    });
    const data = await response.json();
    return data.data.url;
}

// 4. ГЛАВНАЯ КНОПКА (СКАНИРОВАНИЕ)
btnScan.addEventListener('click', async () => {
    if (!currentUser) return;
    btnScan.disabled = true;
    loadingText.style.display = 'block';
    loadingText.innerText = "👀 Нейросеть смотрит на вас...";

    // 4.1. Детектим лицо и возраст
    // Используем TinyFaceDetector для скорости
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withAgeAndGender();

    if (!detections) {
        alert("Лицо не найдено! Встаньте ровно перед камерой и снимите очки/маску.");
        loadingText.style.display = 'none';
        btnScan.disabled = false;
        return;
    }

    const predictedAge = Math.round(detections.age);
    loadingText.innerText = `Возраст определен: ${predictedAge} лет. Обработка...`;

    // 4.2. Определяем группу
    let group = 0;
    if (predictedAge >= 9 && predictedAge <= 12) group = 1;
    if (predictedAge >= 13 && predictedAge <= 16) group = 2;
    if (predictedAge >= 17 && predictedAge <= 18) group = 3;
    if (predictedAge >= 19) group = 4; // 21+ (или 19+)

    // 4.3. Делаем снимок для проверки
    const canvas = document.getElementById('snapshot-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const photoData = canvas.toDataURL('image/png');

    try {
        // --- ЛОГИКА КОТЕЙКИ ---
        
        // Если группа 0, 1 или 2 (до 16 лет) -> ВЕРИМ СРАЗУ
        if (group <= 2) {
            await update(ref(db, 'users/' + currentUser.uid), {
                ageGroup: group,
                ageStatus: "verified_ai"
            });
            alert(`✅ Нейросеть подтвердила возраст: ${predictedAge} лет.\nГруппа обновлена!`);
            location.reload();
        } 
        // Если группа 3 или 4 (17+) -> ОТПРАВЛЯЕМ АДМИНУ
        else {
            loadingText.innerText = "Загрузка фото на сервер для проверки...";
            
            // Грузим на ImgBB
            const photoUrl = await uploadToImgBB(photoData);

            // Создаем заявку
            const reqRef = push(ref(db, 'admin_requests'));
            await set(reqRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                type: "ai_verification", // Тип: проверка нейронкой
                predictedAge: predictedAge,
                predictedGroup: group,
                photoUrl: photoUrl,
                timestamp: Date.now()
            });

            // Ставим статус "На проверке"
            await update(ref(db, 'users/' + currentUser.uid), {
                ageStatus: "pending_admin_review"
            });

            alert(`⚠️ Нейросеть определила: ${predictedAge} лет.\nТак как вы выглядите старше 16, фото отправлено Администратору для защиты от фейков.\nОжидайте подтверждения.`);
            location.reload();
        }

    } catch (e) {
        alert("Ошибка: " + e.message);
        btnScan.disabled = false;
        loadingText.style.display = 'none';
    }
});

// ЗАГРУЗКА
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Загружаем модели при входе
        loadModels();
        
        onValue(ref(db, 'users/' + user.uid), (snap) => {
            const data = snap.val();
            statusText.innerText = data.ageStatus || "Неизвестно";
            
            const groups = ["6-8 лет", "9-12 лет", "13-16 лет", "17-18 лет", "21+"];
            groupText.innerText = data.ageGroup !== undefined && data.ageGroup !== -1 ? groups[data.ageGroup] : "Не указана";

            if (data.ageStatus === 'pending_admin_review') {
                btnScan.disabled = true;
                loadingText.style.display = 'block';
                loadingText.innerText = "Ваша заявка на рассмотрении у администратора.";
            }
        });
    } else {
        window.location.href = "../login/login.html";
    }
});
