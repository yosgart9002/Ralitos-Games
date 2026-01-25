const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- ESCALADO DINÁMICO ---
const BASE_WIDTH = 800, BASE_HEIGHT = 500;
let scale = 1, offsetX = 0, offsetY = 0;
let shakeIntensity = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    scale = Math.min(canvas.width / BASE_WIDTH, canvas.height / BASE_HEIGHT);
    offsetX = (canvas.width - BASE_WIDTH * scale) / 2;
    offsetY = (canvas.height - BASE_HEIGHT * scale) / 2;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- CARGA DE ASSETS (CON PROTECCIÓN) ---
function createImg(src) {
    const img = new Image();
    img.src = src;
    return img;
}

const imgArbol = createImg('Arbol.png');
const imgCono = createImg('cono.png');
const imgGradas = createImg('Gradas.png');
const imgGradasIzq = createImg('Gradas izq.png');

const carImages = {
    'Honda Fit': createImg('Honda Fit.png'),
    'Ferrari': createImg('Ferrari.png'),
    'Formula 1': createImg('Formula 1.png'),
    'Porsche': createImg('Porsche.png')
};

const music = new Audio('Music.wav'); music.loop = true;
const crashSound = new Audio('choque.wav');

// --- VARIABLES DE JUEGO ---
let carSelected = null;
let carX = 375, carY = 400;
let score = 0, record = localStorage.getItem('highScore') || 0;
const baseSpeed = 4;
let speed = baseSpeed;
let gameRunning = false;
let keys = {};
let trees = [], obstacles = [], powerUps = [], particles = [];
let offsetRoad = 0;

// Power-up States
let hasShield = false;
let turboActive = false;
let turboTimer = 0;

// --- SISTEMA DE PARTÍCULAS ---
function createSmoke() {
    particles.push({
        x: carX + 15 + Math.random() * 20,
        y: carY + 75,
        size: 4 + Math.random() * 8,
        opacity: 0.5,
        vX: (Math.random() - 0.5) * 2,
        vY: 2
    });
}

// --- CONTROLES ---
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

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
    initTrees();
    gameRunning = true;
    music.play().catch(() => console.log("Audio bloqueado hasta interacción"));
    requestAnimationFrame(update);
}

function initTrees() {
    trees = [];
    for(let i=0; i<20; i++) {
        trees.push({
            x: Math.random() < 0.5 ? Math.random() * 100 : 700 + Math.random() * 100,
            y: Math.random() * 500
        });
    }
}

// --- BUCLE PRINCIPAL ---
function update() {
    if(!gameRunning) return;

    if (shakeIntensity > 0) shakeIntensity *= 0.9;

    // Lógica de Turbo
    if (turboActive) {
        turboTimer--;
        speed = baseSpeed * 2.5;
        if (turboTimer <= 0) turboActive = false;
    } else {
        speed = baseSpeed + Math.floor(score / 5);
    }

    // Movimiento del coche
    if(keys['ArrowLeft'] && carX > 210) carX -= 7;
    if(keys['ArrowRight'] && carX < 540) carX += 7;

    offsetRoad = (offsetRoad + speed) % 50;
    if (Math.random() > 0.4) createSmoke();

    // Actualizar Árboles
    trees.forEach(t => {
        t.y += speed;
        if(t.y > 500) { t.y = -60; t.x = Math.random() < 0.5 ? Math.random() * 100 : 700 + Math.random() * 100; }
    });

    // Generar Obstáculos y Power-ups
    if(obstacles.length === 0) {
        let x = 230 + Math.random() * 340;
        obstacles.push({x: x, y: -100});
        if (Math.random() > 0.8) {
            powerUps.push({x: 230 + Math.random() * 340, y: -400, type: Math.random() > 0.5 ? 'shield' : 'turbo'});
        }
    }

    // Colisiones
    obstacles.forEach((obs, i) => {
        obs.y += speed;
        if(Math.abs((carX + 25) - obs.x) < 35 && Math.abs((carY + 40) - obs.y) < 40) {
            if (hasShield || turboActive) {
                hasShield = false; obstacles.splice(i, 1); shakeIntensity = 10;
            } else { gameOver(); }
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
    });

    particles.forEach((p, i) => {
        p.y += p.vY; p.opacity -= 0.02;
        if(p.opacity <= 0) particles.splice(i, 1);
    });

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let sx = (Math.random() - 0.5) * shakeIntensity;
    let sy = (Math.random() - 0.5) * shakeIntensity;
    ctx.setTransform(scale, 0, 0, scale, offsetX + sx, offsetY + sy);

    // Fondo y Carretera
    ctx.fillStyle = "forestgreen"; ctx.fillRect(0,0,800,500);
    ctx.fillStyle = "#2a2a2a"; ctx.fillRect(200, 0, 400, 500);
    ctx.strokeStyle = "white"; ctx.lineWidth = 4; ctx.strokeRect(200, -10, 400, 520);

    // Líneas amarillas
    ctx.fillStyle = "yellow";
    for(let i = -50; i < 550; i += 50) ctx.fillRect(395, i + offsetRoad, 10, 30);

    // Dibujar Assets
    trees.forEach(t => ctx.drawImage(imgArbol, t.x - 30, t.y - 30, 70, 70));
    
    // Dibujar gradas solo si las imágenes cargaron
    if(imgGradas.complete) {
        for(let y = -150 + offsetRoad; y < 600; y += 300) {
            ctx.drawImage(imgGradasIzq, 0, y, 200, 300);
            ctx.drawImage(imgGradas, 600, y, 200, 300);
        }
    }

    particles.forEach(p => {
        ctx.fillStyle = `rgba(200, 200, 200, ${p.opacity})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    });

    // Coche
    if (hasShield) { ctx.strokeStyle = "cyan"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(carX+25, carY+40, 45, 0, Math.PI*2); ctx.stroke(); }
    ctx.drawImage(carImages[carSelected], carX, carY, 50, 80);

    obstacles.forEach(obs => ctx.drawImage(imgCono, obs.x - 20, obs.y - 20, 40, 40));
    powerUps.forEach(p => {
        ctx.fillStyle = p.type === 'shield' ? 'cyan' : 'gold';
        ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "black"; ctx.font = "bold 12px Arial"; ctx.fillText(p.type === 'shield' ? "S" : "T", p.x-4, p.y+5);
    });

    // UI
    ctx.fillStyle = "white"; ctx.font = "bold 20px Arial";
    ctx.fillText(`PUNTOS: ${score}`, 20, 40);
    ctx.fillText(`RECORD: ${record}`, 20, 70);
    if(turboActive) { ctx.fillStyle = "orange"; ctx.fillText("¡TURBO ACTIVO!", 320, 40); }
}

function gameOver() {
    gameRunning = false; shakeIntensity = 25;
    music.pause(); crashSound.play();
    if(score > record) { record = score; localStorage.setItem('highScore', record); }
    document.getElementById('final-score').innerText = "Puntaje Final: " + score;
    document.getElementById('game-over').classList.remove('hidden');
}

function restartGame() { startGame(); }
function showMenu() {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}