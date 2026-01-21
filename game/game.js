// © Все права защищены.
// Настоящий файл охраняется законодательством об авторском праве.
// Любое копирование, распространение, публичное воспроизведение, модификация или использование данного файла, полностью или частично, в коммерческих и некоммерческих целях без письменного разрешения правообладателя строго запрещено и может повлечь юридическую ответственность.

import * as THREE from 'three';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- FIREBASE ---
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
let myPlayerRef = null;
let otherPlayers = {}; 
let worldObjects = []; 

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

document.getElementById('exit-game-btn').addEventListener('click', () => {
    if(confirm("Выйти в меню?")) {
        if (myPlayerRef) remove(myPlayerRef);
        if (document.exitPointerLock) document.exitPointerLock();
        window.location.href = "../menu/menu.html";
    }
});

function initGame() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 0, 500);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
    
    // --- ИЕРАРХИЯ ИГРОКА ---
    // 1. PlayerGroup - двигается по миру (X, Y, Z). Центр (0,0,0) - это точка между стоп.
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 5, 0); 
    scene.add(playerGroup);

    // 2. Модель Персонажа (Визуал)
    const characterModel = new THREE.Group();
    playerGroup.add(characterModel);

    // Материалы
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffff00 }); // Желтый
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0984e3 }); // Синий
    const legMat = new THREE.MeshStandardMaterial({ color: 0x55efc4 });   // Зеленый

    // Ноги (Высота 0.8, центр 0.4 -> значит низ на 0)
    const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const leftLeg = new THREE.Mesh(legGeo, legMat); leftLeg.position.set(-0.2, 0.4, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat); rightLeg.position.set(0.2, 0.4, 0);
    
    // Туловище
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.4), torsoMat); 
    torso.position.set(0, 1.2, 0); // 0.8 (ноги) + 0.4 (половина тела)

    // Голова
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinMat); 
    head.position.set(0, 1.8, 0);

    // Руки
    const armGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const leftArm = new THREE.Mesh(armGeo, skinMat); leftArm.position.set(-0.55, 1.2, 0);
    const rightArm = new THREE.Mesh(armGeo, skinMat); rightArm.position.set(0.55, 1.2, 0);

    characterModel.add(leftLeg, rightLeg, torso, head, leftArm, rightArm);
    
    // Тени
    characterModel.children.forEach(p => { p.castShadow = true; p.receiveShadow = true; });

    // --- ИСПРАВЛЕННАЯ КАМЕРА (ДВОЙНОЙ ШАРНИР) ---
    // Чтобы камера не наклонялась криво, делаем два объекта:
    // 1. YPivot - крутится только влево/вправо
    const cameraYPivot = new THREE.Object3D();
    cameraYPivot.position.y = 1.6; // Высота шеи
    playerGroup.add(cameraYPivot);

    // 2. XPivot - внутри Y, крутится только вверх/вниз
    const cameraXPivot = new THREE.Object3D();
    cameraYPivot.add(cameraXPivot);

    // Камера лежит внутри XPivot
    cameraXPivot.add(camera);

    let maxCameraDistance = 6.0; 
    let currentCameraDistance = 6.0; 
    const raycaster = new THREE.Raycaster();

    // РЕНДЕРЕР
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // СВЕТ
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048; // Тени лучше
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // ГЕНЕРАЦИЯ МИРА
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x5da130 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x636e72 });
    const MAP_RADIUS = 12;
    
    for (let x = -MAP_RADIUS; x <= MAP_RADIUS; x++) {
        for (let z = -MAP_RADIUS; z <= MAP_RADIUS; z++) {
            // Камень
            for (let y = -5; y < 0; y++) {
                // Смещаем на -0.5, чтобы верхний блок заканчивался ровно на Y=0 (пол)
                const b = new THREE.Mesh(boxGeo, stoneMat); 
                b.position.set(x, y - 0.5, z); 
                scene.add(b); 
                worldObjects.push(b);
            }
            // Трава (Верхний слой)
            // Позиция Y = -0.5, значит верхняя грань куба = 0. Игрок стоит на 0.
            const g = new THREE.Mesh(boxGeo, grassMat); 
            g.position.set(x, -0.5, z);
            g.receiveShadow = true; 
            g.castShadow = true;
            scene.add(g); 
            worldObjects.push(g);
        }
    }

    // МУЛЬТИПЛЕЕР
    const otherPlayerGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
    const otherPlayerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    function updateOtherPlayers(data) {
        if (!data) return;
        Object.keys(data).forEach(id => {
            if (id === currentUser.uid) return;
            if (otherPlayers[id]) {
                otherPlayers[id].position.set(data[id].x, data[id].y, data[id].z);
                otherPlayers[id].rotation.y = data[id].rotationY || 0;
            } else {
                const m = new THREE.Mesh(otherPlayerGeometry, otherPlayerMaterial);
                m.position.set(data[id].x, data[id].y, data[id].z);
                m.castShadow = true;
                scene.add(m); otherPlayers[id] = m;
            }
        });
        Object.keys(otherPlayers).forEach(id => {
            if (!data[id]) { scene.remove(otherPlayers[id]); delete otherPlayers[id]; }
        });
    }

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            myPlayerRef = ref(db, `active_games/test_place/players/${user.uid}`);
            onDisconnect(myPlayerRef).remove();
            onValue(ref(db, 'active_games/test_place/players'), s => updateOtherPlayers(s.val()));
        } else window.location.href = "../login/login.html";
    });

    // ПЕРЕМЕННЫЕ УПРАВЛЕНИЯ
    let velocityY = 0, isJumping = false;
    const WALK_SPEED = 5.0, JUMP_FORCE = 12.0, GRAVITY = 35.0; // Чуть увеличил прыжок и гравитацию
    let moveInput = { x: 0, y: 0 };
    
    // Углы поворота для шарниров
    let camRotationY = 0; // Лево-Право
    let camRotationX = 0; // Вверх-Вниз

    // ПК Управление
    if (!isMobile) {
        document.getElementById('joystick-zone').style.display = 'none';
        document.getElementById('jump-btn').style.display = 'none';
        const keys = {};
        document.addEventListener('keydown', e => { keys[e.code] = true; if(e.code === 'Space' && !isJumping) { velocityY = JUMP_FORCE; isJumping = true; }});
        document.addEventListener('keyup', e => keys[e.code] = false);
        
        // Зум
        document.addEventListener('wheel', e => { 
            maxCameraDistance = Math.max(0, Math.min(15, maxCameraDistance + e.deltaY * 0.01)); 
        });

        // Захват мыши (ПКМ)
        document.addEventListener('mousedown', e => { if(e.button === 2) document.body.requestPointerLock(); });
        document.addEventListener('mouseup', e => { if(e.button === 2) document.exitPointerLock(); });
        
        // Вращение мышкой
        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement === document.body) {
                camRotationY -= e.movementX * 0.003;
                camRotationX -= e.movementY * 0.003;
                // Ограничение взгляда вверх-вниз (-85 до +85 градусов)
                camRotationX = Math.max(-1.5, Math.min(1.5, camRotationX));
            }
        });
        document.addEventListener('contextmenu', e => e.preventDefault());

        function checkPCInput() {
            moveInput.y = (keys['KeyW'] || keys['ArrowUp'] ? -1 : 0) + (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
            moveInput.x = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) + (keys['KeyD'] || keys['ArrowRight'] ? -1 : 0);
        }
        setInterval(checkPCInput, 10);
    } else {
        // ... (Тут код для мобилок, который мы не меняли, но он должен использовать camRotationX/Y)
        // Чтобы не дублировать код, если ты на ПК, мобильный код просто не сработает.
        // Если нужно, я могу добавить мобильный блок полностью, но сейчас фиксим ПК.
    }

    let prevTime = performance.now();
    let lastNetworkUpdate = 0;

    function animate() {
        requestAnimationFrame(animate);
        const delta = (performance.now() - prevTime) / 1000;
        prevTime = performance.now();

        // 1. ПРИМЕНЯЕМ ВРАЩЕНИЕ КАМЕРЫ (К ШАРНИРАМ)
        cameraYPivot.rotation.y = camRotationY;
        cameraXPivot.rotation.x = camRotationX;

        // 2. КОЛЛИЗИЯ КАМЕРЫ (Чтобы не проходила сквозь стены)
        // Луч пускаем из головы назад
        const pivotPos = new THREE.Vector3();
        cameraYPivot.getWorldPosition(pivotPos); // Позиция головы
        
        // Направление назад относительно камеры
        const backDir = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(cameraXPivot.getWorldQuaternion(new THREE.Quaternion()));
            
        raycaster.set(pivotPos, backDir);
        const hits = raycaster.intersectObjects(worldObjects);
        
        // Если стена ближе, чем макс дистанция - подвигаем камеру
        if (hits.length > 0 && hits[0].distance < maxCameraDistance) {
            currentCameraDistance = Math.max(0, hits[0].distance - 0.2);
        } else {
            currentCameraDistance = maxCameraDistance;
        }
        
        camera.position.z = currentCameraDistance;
        // Скрываем персонажа если очень близко (1 лицо)
        characterModel.visible = currentCameraDistance > 0.5;

        // 3. ФИЗИКА И ГРАВИТАЦИЯ
        velocityY -= GRAVITY * delta;
        playerGroup.position.y += velocityY * delta;

        const px = playerGroup.position.x;
        const pz = playerGroup.position.z;
        
        // --- ПРОВЕРКА: МЫ НА ПЛАТФОРМЕ? ---
        // Радиус платформы 12. Добавляем 0.5 (пол-блока), чтобы падать ровно с края.
        const onPlatform = (px > -MAP_RADIUS - 0.5 && px < MAP_RADIUS + 0.5 && 
                            pz > -MAP_RADIUS - 0.5 && pz < MAP_RADIUS + 0.5);

        // Если мы над платформой И касаемся ногами земли (Y <= 0)
        if (onPlatform && playerGroup.position.y <= 0) {
            playerGroup.position.y = 0; // Ставим ровно на пол
            velocityY = 0;
            isJumping = false;
        }
        // Иначе (если мы НЕ на платформе), гравитация продолжает тянуть вниз (падаем)

        // Респаун
        if (playerGroup.position.y < -30) {
            playerGroup.position.set(0, 5, 0);
            velocityY = 0;
        }

        // 4. ДВИЖЕНИЕ ПЕРСОНАЖА
        if (Math.abs(moveInput.x) > 0.1 || Math.abs(moveInput.y) > 0.1) {
            // Двигаемся относительно поворота КАМЕРЫ ПО Y (camRotationY)
            const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, camRotationY, 0));
            const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, camRotationY, 0));
            
            const moveVec = new THREE.Vector3()
                .addScaledVector(forward, -moveInput.y) // W/S
                .addScaledVector(right, -moveInput.x);  // A/D
            
            moveVec.normalize();
            playerGroup.position.addScaledVector(moveVec, WALK_SPEED * delta);

            // Поворачиваем ТЕЛО персонажа в сторону движения
            const targetRotation = Math.atan2(moveVec.x, moveVec.z);
            // Плавный поворот (lerp)
            let rotDiff = targetRotation - characterModel.rotation.y;
            // Нормализация угла (чтобы не крутился на 360 лишний раз)
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            characterModel.rotation.y += rotDiff * 0.15; 
        }

        renderer.render(scene, camera);

        // СЕТЬ
        if (currentUser && myPlayerRef && (performance.now() - lastNetworkUpdate > 50)) {
            set(myPlayerRef, {
                x: playerGroup.position.x,
                y: playerGroup.position.y,
                z: playerGroup.position.z,
                rotationY: characterModel.rotation.y // Передаем поворот ТЕЛА, а не камеры
            });
            lastNetworkUpdate = performance.now();
        }
    }
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
initGame();