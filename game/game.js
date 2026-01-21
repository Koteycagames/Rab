// © Все права защищены.
import * as THREE from 'three';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, onDisconnect, remove, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
let myColors = {
    head: '#f1c27d', torso: '#0984e3', leftArm: '#f1c27d', rightArm: '#f1c27d', leftLeg: '#55efc4', rightLeg: '#55efc4'
};

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// UI
document.getElementById('exit-game-btn').addEventListener('click', () => {
    if(confirm("Выйти в меню?")) {
        if (myPlayerRef) remove(myPlayerRef);
        if (document.exitPointerLock) document.exitPointerLock();
        window.location.href = "../menu/menu.html";
    }
});

// МОЛОТОК (STUDIO) УБРАН ОТСЮДА

// --- СОЗДАНИЕ ПЕРСОНАЖА ---
function createCharacterModel(colors) {
    const c = colors || { head: '#f1c27d', torso: '#0984e3', leftArm: '#f1c27d', rightArm: '#f1c27d', leftLeg: '#55efc4', rightLeg: '#55efc4' };

    const characterGroup = new THREE.Group();

    const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const armGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const torsoGeo = new THREE.BoxGeometry(0.8, 0.8, 0.4);
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);

    const leftLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: c.leftLeg })); 
    leftLeg.position.set(-0.2, 0.4, 0);
    const rightLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: c.rightLeg })); 
    rightLeg.position.set(0.2, 0.4, 0);
    
    const torso = new THREE.Mesh(torsoGeo, new THREE.MeshStandardMaterial({ color: c.torso })); 
    torso.position.set(0, 1.2, 0); 

    const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: c.head })); 
    head.position.set(0, 1.8, 0);

    const leftArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: c.leftArm })); 
    leftArm.position.set(-0.55, 1.2, 0); leftArm.geometry.translate(0, -0.3, 0); leftArm.position.y += 0.3;

    const rightArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: c.rightArm })); 
    rightArm.position.set(0.55, 1.2, 0); rightArm.geometry.translate(0, -0.3, 0); rightArm.position.y += 0.3;

    characterGroup.add(leftLeg, rightLeg, torso, head, leftArm, rightArm);

    characterGroup.traverse((obj) => { if(obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }});

    characterGroup.userData = { leftLeg, rightLeg, leftArm, rightArm, head };
    return characterGroup;
}

function createNameTag(name) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256; canvas.height = 64;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 30px Arial'; ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.fillText(name, 128, 42);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
    sprite.scale.set(2, 0.5, 1); sprite.position.y = 2.4;
    return sprite;
}

function initGame() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 0, 500);
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
    
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 5, 0); 
    scene.add(playerGroup);

    const cameraYPivot = new THREE.Object3D(); cameraYPivot.position.y = 1.6; playerGroup.add(cameraYPivot);
    const cameraXPivot = new THREE.Object3D(); cameraYPivot.add(cameraXPivot); cameraXPivot.add(camera);

    let maxCameraDistance = 6.0; let currentCameraDistance = 6.0; 
    const raycaster = new THREE.Raycaster();

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8); dirLight.position.set(50, 100, 50); dirLight.castShadow = true; scene.add(dirLight);

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x5da130 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x636e72 });
    
    for (let x = -12; x <= 12; x++) {
        for (let z = -12; z <= 12; z++) {
            for (let y = -5; y < 0; y++) {
                const b = new THREE.Mesh(boxGeo, stoneMat); b.position.set(x, y - 0.5, z); 
                scene.add(b); worldObjects.push(b);
            }
            const g = new THREE.Mesh(boxGeo, grassMat); g.position.set(x, -0.5, z);
            g.receiveShadow = true; g.castShadow = true; scene.add(g); worldObjects.push(g);
        }
    }

    function updateOtherPlayers(data) {
        if (!data) return;
        Object.keys(data).forEach(id => {
            if (id === currentUser.uid) return;
            const pData = data[id];
            
            if (!otherPlayers[id]) {
                const newChar = createCharacterModel(pData.colors);
                newChar.add(createNameTag(pData.name || "Guest"));
                scene.add(newChar);
                otherPlayers[id] = { mesh: newChar, lastPos: null };
            }

            const other = otherPlayers[id].mesh;
            const newPos = new THREE.Vector3(pData.x, pData.y, pData.z);
            const oldPos = otherPlayers[id].lastPos || newPos;
            
            if (oldPos.distanceTo(newPos) > 0.05) {
                const t = Date.now() * 0.01;
                other.userData.leftLeg.rotation.x = Math.sin(t) * 0.5;
                other.userData.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.5;
                other.userData.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.5;
                other.userData.rightArm.rotation.x = Math.sin(t) * 0.5;
            } else {
                other.userData.leftLeg.rotation.x = 0; other.userData.rightLeg.rotation.x = 0;
                other.userData.leftArm.rotation.x = 0; other.userData.rightArm.rotation.x = 0;
            }
            other.position.copy(newPos);
            other.rotation.y = pData.rotationY || 0;
            otherPlayers[id].lastPos = newPos;
        });

        Object.keys(otherPlayers).forEach(id => {
            if (!data[id]) { scene.remove(otherPlayers[id].mesh); delete otherPlayers[id]; }
        });
    }

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            
            get(ref(db, `users/${user.uid}/avatarColors`)).then(snap => {
                if (snap.exists()) {
                    myColors = snap.val();
                }
                
                const myCharacter = createCharacterModel(myColors);
                playerGroup.add(myCharacter);
                playerGroup.userData.model = myCharacter;

                const shortName = user.email.split('@')[0];
                myPlayerRef = ref(db, `active_games/test_place/players/${user.uid}`);
                onDisconnect(myPlayerRef).remove();
                
                onValue(ref(db, 'active_games/test_place/players'), s => updateOtherPlayers(s.val()));

                set(myPlayerRef, { 
                    x: 0, y: 5, z: 0, rotationY: 0, name: shortName, colors: myColors 
                });
            });

        } else window.location.href = "../login/login.html";
    });

    let velocityY = 0, isJumping = false;
    const WALK_SPEED = 5.0, JUMP_FORCE = 12.0, GRAVITY = 35.0; 
    let moveInput = { x: 0, y: 0 };
    let camRotationY = 0, camRotationX = 0;

    if (!isMobile) {
        const keys = {};
        document.addEventListener('keydown', e => { keys[e.code] = true; if(e.code === 'Space' && !isJumping) { velocityY = JUMP_FORCE; isJumping = true; }});
        document.addEventListener('keyup', e => keys[e.code] = false);
        
        document.addEventListener('wheel', e => { 
            maxCameraDistance = Math.max(0, Math.min(15, maxCameraDistance + e.deltaY * 0.01));
            if (maxCameraDistance === 0) document.body.requestPointerLock();
        });

        document.addEventListener('mousedown', e => { if(e.button === 2 || maxCameraDistance === 0) document.body.requestPointerLock(); });
        document.addEventListener('mouseup', e => { if(e.button === 2 && maxCameraDistance > 0) document.exitPointerLock(); });
        
        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement === document.body) {
                camRotationY -= e.movementX * 0.003;
                camRotationX -= e.movementY * 0.003;
                camRotationX = Math.max(-1.5, Math.min(1.5, camRotationX));
            }
        });
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        setInterval(() => {
            moveInput.y = (keys['KeyW'] || keys['ArrowUp'] ? -1 : 0) + (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
            moveInput.x = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) + (keys['KeyD'] || keys['ArrowRight'] ? -1 : 0);
        }, 10);
    } else {
        document.getElementById('joystick-zone').style.display = 'block';
        document.getElementById('jump-btn').style.display = 'block';
    }

    let prevTime = performance.now();
    let lastNetworkUpdate = 0;

    function animate() {
        requestAnimationFrame(animate);
        const delta = (performance.now() - prevTime) / 1000;
        prevTime = performance.now();

        cameraYPivot.rotation.y = camRotationY;
        cameraXPivot.rotation.x = camRotationX;

        const pivotPos = new THREE.Vector3(); cameraYPivot.getWorldPosition(pivotPos); 
        const backDir = new THREE.Vector3(0, 0, 1).applyQuaternion(cameraXPivot.getWorldQuaternion(new THREE.Quaternion()));
        raycaster.set(pivotPos, backDir);
        const hits = raycaster.intersectObjects(worldObjects);
        
        if (hits.length > 0 && hits[0].distance < maxCameraDistance) currentCameraDistance = Math.max(0, hits[0].distance - 0.2);
        else currentCameraDistance = maxCameraDistance;
        
        camera.position.z = currentCameraDistance;
        
        if (playerGroup.userData.model) playerGroup.userData.model.visible = currentCameraDistance > 0.5;

        velocityY -= GRAVITY * delta;
        playerGroup.position.y += velocityY * delta;

        const px = playerGroup.position.x; const pz = playerGroup.position.z;
        if (px > -12.5 && px < 12.5 && pz > -12.5 && pz < 12.5 && playerGroup.position.y <= 0) {
            playerGroup.position.y = 0; velocityY = 0; isJumping = false;
        }
        if (playerGroup.position.y < -30) { playerGroup.position.set(0, 5, 0); velocityY = 0; }

        let isMoving = false;
        if (Math.abs(moveInput.x) > 0.1 || Math.abs(moveInput.y) > 0.1) {
            isMoving = true;
            const f = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, camRotationY, 0));
            const r = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, camRotationY, 0));
            const mv = new THREE.Vector3().addScaledVector(f, -moveInput.y).addScaledVector(r, -moveInput.x).normalize();
            playerGroup.position.addScaledVector(mv, WALK_SPEED * delta);

            if (playerGroup.userData.model) {
                const tr = Math.atan2(mv.x, mv.z);
                let rd = tr - playerGroup.userData.model.rotation.y;
                while (rd > Math.PI) rd -= Math.PI * 2; while (rd < -Math.PI) rd += Math.PI * 2;
                playerGroup.userData.model.rotation.y += rd * 0.15; 
            }
        }

        if (playerGroup.userData.model) {
            const m = playerGroup.userData.model;
            if (isMoving) {
                const t = Date.now() * 0.01;
                m.userData.leftLeg.rotation.x = Math.sin(t) * 0.5; m.userData.rightLeg.rotation.x = Math.sin(t + Math.PI) * 0.5;
                m.userData.leftArm.rotation.x = Math.sin(t + Math.PI) * 0.5; m.userData.rightArm.rotation.x = Math.sin(t) * 0.5;
            } else {
                m.userData.leftLeg.rotation.x = 0; m.userData.rightLeg.rotation.x = 0;
                m.userData.leftArm.rotation.x = 0; m.userData.rightArm.rotation.x = 0;
            }
        }

        renderer.render(scene, camera);

        if (currentUser && myPlayerRef && (performance.now() - lastNetworkUpdate > 50) && playerGroup.userData.model) {
            set(myPlayerRef, {
                x: playerGroup.position.x, y: playerGroup.position.y, z: playerGroup.position.z,
                rotationY: playerGroup.userData.model.rotation.y,
                name: currentUser.email.split('@')[0],
                colors: myColors 
            });
            lastNetworkUpdate = performance.now();
        }
    }
    animate();
    window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
}
initGame();
