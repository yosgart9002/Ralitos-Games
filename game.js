const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONFIGURACIÓN BASE ---
const BASE_WIDTH = 800, BASE_HEIGHT = 500;
let scale = 1, offsetX = 0, offsetY = 0;
let shakeIntensity = 0; // Para el efecto de sacudida

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

// --- ASSETS ---
const imgArbol = new Image(); imgArbol.src = 'Arbol.png';
const imgCono = new Image(); imgCono.src = 'cono.png';
const imgGradas = new Image(); imgGradas.src = 'Gradas.png';
const imgGradasIzq = new Image(); imgGradasIzq.src = 'Gradas izq.png';

const carImages = {
    'Honda Fit': new Image(), 'Ferrari': new Image(),
    'Formula 1': new Image(), 'Porsche': new Image()
};
carImages['Honda Fit'].src = 'Honda Fit.png';
carImages['Ferrari'].src = 'Ferrari.png';
carImages['Formula 1'].src = 'Formula 1.png';
carImages['Porsche'].src = 'Porsche.png';

const music = new Audio('Music.wav'); music.loop = true;
const crashSound = new Audio('choque.wav');

// --- VARIABLES DE ESTADO ---
let carSelected = null;
let carX = 375, carY = 400;
let score = 0, record = 0;
const baseSpeed = 4;
let speed = baseSpeed;
let gameRunning = false;
let keys = {};
let trees = [], obstacles = [], powerUps = [], particles = [];
let offsetRoad = 0;

// Estados de Power-up
let hasShield = false;
let turboActive = false;
let turboTimer = 0;

// --- SISTEMA DE PARTÍCULAS (HUMO) ---
function createSmoke() {
    if (speed > 0) {
        particles.push({
            x: carX + 10 + Math.random() * 30,
            y: carY + 70,
            size: 5 + Math.random() * 10,
            opacity: 0.6,
            vX: (Math.random() - 0.5) * 2,
            vY: 2 + Math.random() * 2
        });
    }
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
    carX = 350; score = 0; speed = baseSpeed;
    obstacles = []; powerUps = []; particles = [];
    hasShield = false; turboActive = false;
    initTrees();
    gameRunning = true;
    music.currentTime = 0;
    music.play();
    requestAnimationFrame(update);
}

// --- BUCLE PRINCIPAL ---
function update() {
    if(!gameRunning) return;

    // Reducir intensidad de sacudida
    if (shakeIntensity > 0) shakeIntensity *= 0.9;

    // Manejo de Turbo
    if (turboActive) {
        turboTimer--;
        speed = baseSpeed * 3;
        if (turboTimer <= 0) turboActive = false;
    } else {
        speed = baseSpeed + Math.floor(score / 3);
    }

    // Movimiento
    if(keys['ArrowLeft'] && carX > 140) carX -= 6;
    if(keys['ArrowRight'] && carX < 570) carX += 6;

    offsetRoad = (offsetRoad + speed) % 50;

    // Crear humo si el coche se mueve
    if (Math.random() > 0.5) createSmoke();

    // Actualizar Árboles
    trees.forEach(t => {
        t.y += speed;
        if(t.y > 500) {
            t.y = -60;
            t.x = Math.random() < 0.5 ? Math.random() * 80 : 720 + Math.random() * 80;
        }
    });

    // Obstáculos y Power-ups
    if(obstacles.length === 0 && Math.random() < 0.05) {
        let x = 210 + Math.random() * 380;
        obstacles.push({x: x, y: -100});
        
        // Probabilidad de generar un Power-up
        if (Math.random() > 0.7) {
            let px = 210 + Math.random() * 380;
            let type = Math.random() > 0.5 ? 'shield' : 'turbo';
            powerUps.push({x: px, y: -300, type: type});
        }
    }

    // Colisiones Obstáculos
    obstacles.forEach((obs, index) => {
        obs.y += speed;
        if(Math.abs((carX + 25) - obs.x) < 35 && Math.abs((carY + 40) - obs.y) < 40) {
            if (hasShield || turboActive) {
                hasShield = false;
                obstacles.splice(index, 1);
                shakeIntensity = 10; // Sacudida leve al romper obstáculo
            } else {
                gameOver();
            }
        }
        if(obs.y > 550) {
            obstacles.splice(index, 1);
            score++;
        }
    });

    // Colisiones Power-ups
    powerUps.forEach((p, index) => {
        p.y += speed;
        if(Math.abs((carX + 25) - p.x) < 35 && Math.abs((carY + 40) - p.y) < 40) {
            if (p.type === 'shield') hasShield = true;
            if (p.type === 'turbo') { turboActive = true; turboTimer = 180; }
            powerUps.splice(index, 1);
        }
        if(p.y > 550) powerUps.splice(index, 1);
    });

    // Actualizar Partículas
    particles.forEach((p, i) => {
        p.y += p.vY;
        p.x += p.vX;
        p.opacity -= 0.02;
        if (p.opacity <= 0) particles.splice(i, 1);
    });

    draw();
    requestAnimationFrame(update);
}

// --- RENDERIZADO ---
function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Aplicar Sacudida (Screen Shake)
    let sx = (Math.random() - 0.5) * shakeIntensity;
    let sy = (Math.random() - 0.5) * shakeIntensity;
    ctx.setTransform(scale, 0, 0, scale, offsetX + sx, offsetY + sy);

    // Carretera y decoraciones
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(200, 0, 400, 500);
    
    // Líneas amarillas
    ctx.fillStyle = "yellow";
    for(let i = -50; i < 550; i += 50) {
        ctx.fillRect(400, i + offsetRoad, 10, 30);
    }

    // Dibujar Humo
    particles.forEach(p => {
        ctx.fillStyle = `rgba(150, 150, 150, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Sombra del Coche
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(carX + 25, carY + 80, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dibujar Coche
    const img = carImages[carSelected];
    ctx.drawImage(img, carX, carY, 50, 80);

    // Efecto visual de Escudo o Turbo
    if (hasShield) {
        ctx.strokeStyle = "cyan"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(carX + 25, carY + 40, 50, 0, Math.PI * 2); ctx.stroke();
    }
    if (turboActive) {
        ctx.strokeStyle = "orange"; ctx.lineWidth = 5;
        ctx.strokeRect(carX - 5, carY - 5, 60, 90);
    }

    // Dibujar Obstáculos y Power-ups
    obstacles.forEach(obs => ctx.drawImage(imgCono, obs.x - 20, obs.y - 20, 40, 40));
    powerUps.forEach(p => {
        ctx.fillStyle = p.type === 'shield' ? 'cyan' : 'gold';
        ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "white"; ctx.fillText(p.type === 'shield' ? "S" : "T", p.x - 5, p.y + 5);
    });

    // UI
    ctx.fillStyle = "white"; ctx.font = "bold 18px Arial";
    ctx.fillText(`PUNTOS: ${score}`, 15, 30);
    if (turboActive) ctx.fillStyle = "orange";
    ctx.fillText(turboActive ? "¡TURBO!" : "", 15, 80);
}

function gameOver() {
    gameRunning = false;
    shakeIntensity = 30; // Gran sacudida al chocar
    music.pause();
    crashSound.play();
    if(score > record) record = score;
    document.getElementById('final-score').innerText = "Puntaje Final: " + score;
    document.getElementById('game-over').classList.remove('hidden');
}
// (Funciones restartGame y showMenu se mantienen igual)