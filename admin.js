import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

onAuthStateChanged(auth, (user) => {
    // Простая проверка, что это ты (замени на свой точный email если нужно)
    if (user && user.email.toLowerCase().includes("koteyca")) {
        loadRequests();
    } else {
        document.body.innerHTML = "<h1>ДОСТУП ЗАПРЕЩЕН</h1>";
    }
});

function loadRequests() {
    const reqRef = ref(db, 'admin_requests');
    onValue(reqRef, (snapshot) => {
        const container = document.getElementById('requests-container');
        container.innerHTML = "";
        const data = snapshot.val();

        if (!data) {
            container.innerHTML = "<p>Заявок нет. Можно отдыхать.</p>";
            return;
        }

        Object.keys(data).forEach(key => {
            const req = data[key];
            const div = document.createElement('div');
            
            // Если это подтверждение старшего возраста - помечаем красным
            const isHighRisk = req.type === "ai_verification" && req.predictedGroup >= 3;
            div.className = `request-card ${isHighRisk ? 'high-risk' : ''}`;

            let photoHtml = "";
            if (req.photoUrl && req.photoUrl !== "no_photo") {
                photoHtml = `
                    <div class="photo-check">
                        <p>📸 <b>Фото для проверки:</b> (Проверь, не фейк ли это)</p>
                        <a href="${req.photoUrl}" target="_blank"><img src="${req.photoUrl}"></a>
                    </div>
                `;
            }

            div.innerHTML = `
                <h3>User: ${req.email}</h3>
                <p><b>Тип:</b> ${req.type === "initial_registration" ? "Новая регистрация" : "Смена возраста (AI)"}</p>
                ${req.predictedAge ? `<p>🤖 Нейронка определила возраст: <b>${req.predictedAge} лет</b> (Группа ${req.predictedGroup})</p>` : ""}
                ${photoHtml}
                <hr>
                <p>Присвоить возрастную группу:</p>
                <div class="btn-group">
                    <button class="btn-0" onclick="setAge('${key}', '${req.uid}', 0)">0 (6-8)</button>
                    <button class="btn-1" onclick="setAge('${key}', '${req.uid}', 1)">1 (9-12)</button>
                    <button class="btn-2" onclick="setAge('${key}', '${req.uid}', 2)">2 (13-16)</button>
                    <button class="btn-3" onclick="setAge('${key}', '${req.uid}', 3)">3 (17-18)</button>
                    <button class="btn-4" onclick="setAge('${key}', '${req.uid}', 4)">4 (21+)</button>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

// Делаем функцию глобальной для HTML кнопок
window.setAge = (reqId, uid, group) => {
    if(!confirm(`Присвоить группу ${group} этому пользователю?`)) return;

    // 1. Обновляем пользователя
    update(ref(db, 'users/' + uid), {
        ageGroup: group,
        ageStatus: "verified"
    }).then(() => {
        // 2. Удаляем заявку
        remove(ref(db, 'admin_requests/' + reqId));
        alert("Возраст подтвержден!");
    });
};
