const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- ESCALADO Y CONFIGURACIÓN (Base lógica: 800x500) ---
const BASE_WIDTH = 800, BASE_HEIGHT = 500;
let scale = 1, offsetX = 0, offsetY = 0;
let shakeIntensity = 0;

function resizeCanvas() {
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    scale = Math.min(canvas.width / BASE_WIDTH, canvas.height / BASE_HEIGHT);
    offsetX = (canvas.width - BASE_WIDTH * scale) / 2;
    offsetY = (canvas.height - BASE_HEIGHT * scale) / 2;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

document.body.style.margin = '0';
canvas.style.display = 'block';
canvas.style.position = 'fixed';
canvas.style.left = '0';
canvas.style.top = '0';

// --- ASSETS (IMÁGENES Y SONIDOS) ---
const imgArbol = new Image(); imgArbol.src = 'Arbol.png';
const imgCono = new Image(); imgCono.src = 'cono.png';
const imgGradas = new Image(); imgGradas.src = 'Gradas.png';
const imgGradasIzq = new Image(); imgGradasIzq.src = 'Gradas izq.png';
const imgEscudo = new Image(); imgEscudo.src = 'Escudo.png';
const imgCoin = new Image(); imgCoin.src = 'Coin.png';

const carImages = {
    'Onda Fit': new Image(),
    'Fegarri': new Image(),
    'Formulado 1': new Image(),
    'Porch': new Image()
};
carImages['Onda Fit'].src = 'Honda Fit.png';
carImages['Fegarri'].src = 'Ferrari.png';
carImages['Formulado 1'].src = 'Formula 1.png';
carImages['Porch'].src = 'Porsche.png';

const music = new Audio('Music.wav'); music.loop = true;
const crashSound = new Audio('choque.wav');

// --- VARIABLES DE ESTADO ---
let carSelected = null;
let carX = 375, carY = 400;
let score = 0, record = localStorage.getItem('highScore') || 0;
const baseSpeed = 6;
let speed = baseSpeed;
let gameRunning = false;
let keys = {};
let obstacles = [], powerUps = [], particles = [];
let offsetRoad = 0;

// Estados de Power-up
let hasShield = false;
let turboActive = false;
let turboTimer = 0;

// --- SISTEMA DE PARTÍCULAS (HUMO) ---
function createSmoke() {
    if (speed > 0) {
        particles.push({
            x: carX + 15 + Math.random() * 20,
            y: carY + 75,
            size: 4 + Math.random() * 8,
            opacity: 0.5,
            vX: (Math.random() - 0.5) * 2,
            vY: 2
        });
    }
}

// --- CONTROLES ---
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

function updateTouchKeys(touchList) {
    let anyLeft = false, anyRight = false;
    for(let i = 0; i < touchList.length; i++) {
        const t = touchList[i];
        const logicalX = (t.clientX - offsetX) / scale;
        if(logicalX < (BASE_WIDTH / 2)) anyLeft = true;
        else anyRight = true;
    }
    keys['ArrowLeft'] = anyLeft;
    keys['ArrowRight'] = anyRight;
}

window.addEventListener('touchstart', e => { updateTouchKeys(e.touches); e.preventDefault(); }, {passive: false});
window.addEventListener('touchmove', e => { updateTouchKeys(e.touches); e.preventDefault(); }, {passive: false});
window.addEventListener('touchend', e => updateTouchKeys(e.touches));

function selectCar(name) {
    carSelected = name;
    document.getElementById('selected-txt').innerText = "Seleccionado: " + name;
    document.getElementById('start-btn').disabled = false;
}

function startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    carX = 375; score = 0; speed = baseSpeed;
    obstacles = []; powerUps = []; particles = [];
    hasShield = false; turboActive = false;
    gameRunning = true;
    music.currentTime = 0;
    music.play().catch(() => {});
    requestAnimationFrame(update);
}

// --- BUCLE PRINCIPAL ---
function update() {
    if(!gameRunning) return;

    if (shakeIntensity > 0) shakeIntensity *= 0.9;

    if (turboActive) {
        turboTimer--;
        speed = baseSpeed * 2.5;
        if (turboTimer <= 0) turboActive = false;
    } else {
        speed = baseSpeed + Math.floor(score / 5);
    }

    if(keys['ArrowLeft'] && carX > 210) carX -= 10;
    if(keys['ArrowRight'] && carX < 540) carX += 10;

    offsetRoad = (offsetRoad + speed) % 150;
    if (Math.random() > 0.4) createSmoke();

    if(obstacles.length === 0) {
        obstacles.push({x: 230 + Math.random() * 340, y: -100});
        if (Math.random() > 0.8) {
            powerUps.push({x: 230 + Math.random() * 340, y: -400, type: Math.random() > 0.5 ? 'shield' : 'turbo'});
        }
    }

    obstacles.forEach((obs, i) => {
        obs.y += speed;
        if(Math.abs((carX + 25) - obs.x) < 45 && Math.abs((carY + 40) - obs.y) < 50) {
            if (hasShield || turboActive) { hasShield = false; obstacles.splice(i, 1); shakeIntensity = 10; }
            else { gameOver(); }
        }
        if(obs.y > 550) { obstacles.splice(i, 1); score++; }
    });

    powerUps.forEach((p, i) => {
        p.y += speed;
        if(Math.abs((carX + 25) - p.x) < 30 && Math.abs((carY + 40) - p.y) < 30) {
            if(p.type === 'shield') hasShield = true;
            else { turboActive = true; turboTimer = 200; }
            powerUps.splice(i, 1);
        }
        if(p.y > 550) powerUps.splice(i, 1);
    });

    particles.forEach((p, i) => {
        p.y += p.vY; p.opacity -= 0.02;
        if(p.opacity <= 0) particles.splice(i, 1);
    });

    draw();
    requestAnimationFrame(update);
}

// --- RENDERIZADO ---
function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let sx = (Math.random() - 0.5) * shakeIntensity;
    let sy = (Math.random() - 0.5) * shakeIntensity;
    ctx.setTransform(scale, 0, 0, scale, offsetX + sx, offsetY + sy);

    // 1. Fondo base verde
    ctx.fillStyle = "forestgreen";
    ctx.fillRect(-500, -500, 1800, 1500);

    const scrollY = offsetRoad;

    // 2. Capa de Gradas (Bordes exteriores)
    const standLeftX = -250; 
    const standRightX = 700; 
    for (let y = -400 + scrollY; y < 800; y += 350) {
        ctx.drawImage(imgGradasIzq, standLeftX, y, 350, 350);
        ctx.drawImage(imgGradas, standRightX, y, 350, 350);
    }

    // 3. CAPA DE BOSQUE DENSO (Rellenar huecos verdes)
    // Dibujamos múltiples columnas de árboles muy juntos para que se traslapen
    // Lado Izquierdo (entre x=100 y x=200)
    for (let x = 100; x < 200; x += 40) {
        for (let y = -150 + scrollY; y < 650; y += 30) {
            // Añadimos un pequeño desvío aleatorio en X basado en Y para que se vea natural
            let offsetXTree = (Math.sin(y * 0.1) * 10);
            ctx.drawImage(imgArbol, x + offsetXTree - 35, y - 35, 100, 100);
        }
    }
    // Lado Derecho (entre x=600 y x=700)
    for (let x = 600; x < 700; x += 40) {
        for (let y = -150 + scrollY; y < 650; y += 30) {
            let offsetXTree = (Math.cos(y * 0.1) * 10);
            ctx.drawImage(imgArbol, x + offsetXTree - 35, y - 35, 100, 100);
        }
    }

    // 4. Carretera
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(200, 0, 400, 500);
    ctx.strokeStyle = "white"; ctx.lineWidth = 4;
    ctx.strokeRect(200, -10, 400, 520);

    // Líneas amarillas
    ctx.fillStyle = "yellow";
    for(let i = -50; i < 550; i += 50) ctx.fillRect(395, i + (scrollY % 50), 10, 30);

    // Humo, Coche y Power-ups
    particles.forEach(p => {
        ctx.fillStyle = `rgba(200, 200, 200, ${p.opacity})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    });

    if (hasShield) { ctx.strokeStyle = "cyan"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(carX+30, carY+50, 55, 0, Math.PI*2); ctx.stroke(); }
    ctx.drawImage(carImages[carSelected], carX, carY, 60, 100);

    obstacles.forEach(obs => ctx.drawImage(imgCono, obs.x - 30, obs.y - 30, 60, 60));
    powerUps.forEach(p => {
        const img = p.type === 'shield' ? imgEscudo : imgCoin;
        ctx.drawImage(img, p.x - 25, p.y - 25, 50, 50);
    });

    // UI Puntaje
    ctx.fillStyle = "white"; ctx.font = "bold 20px Arial";
    ctx.shadowBlur = 4; ctx.shadowColor = "black";
    ctx.fillText(`PUNTOS: ${score}`, 20, 40);
    ctx.fillText(`RECORD: ${record}`, 20, 70);
    if(turboActive) { ctx.fillStyle = "orange"; ctx.fillText("¡TURBO!", 350, 40); }
    ctx.shadowBlur = 0;
}

function gameOver() {
    gameRunning = false;
    shakeIntensity = 25;
    music.pause();
    crashSound.play();
    if(score > record) { record = score; localStorage.setItem('highScore', record); }
    document.getElementById('final-score').innerText = "Puntaje Final: " + score;
    document.getElementById('game-over').classList.remove('hidden');
}

function restartGame() { startGame(); }
function showMenu() {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}