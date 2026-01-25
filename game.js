const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- FULLSCREEN & SCALING (logical base coords: 800x500) ---
const BASE_WIDTH = 800, BASE_HEIGHT = 500;
let scale = 1, offsetX = 0, offsetY = 0;

function resizeCanvas() {
    // set CSS size to match viewport and remove default body margin
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

// Remove page margins so centering math aligns with viewport
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

const carImages = {
    'Honda Fit': new Image(),
    'Ferrari': new Image(),
    'Formula 1': new Image(),
    'Porsche': new Image()
};

// Asegúrate de que los nombres coincidan exactamente con tus archivos
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
// Reduce base speed (initial) as requested
const baseSpeed = 2;
let speed = baseSpeed;
let gameRunning = false;
let keys = {};
let trees = [], obstacles = [], offsetRoad = 0;

// --- LÓGICA DEL BOSQUE ---
function initTrees() {
    trees = [];
    for(let i=0; i<25; i++) {
        trees.push({
            x: Math.random() < 0.5 ? Math.random() * 40 : 350 + Math.random() * 50,
            y: Math.random() * 500
        });
    }
}

// --- CONTROLES ---
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// --- CONTROLES TÁCTILES (móvil / tablet): tocar mitad izquierda/derecha ---
function updateTouchKeys(touchList) {
    let anyLeft = false, anyRight = false;
    for(let i = 0; i < touchList.length; i++) {
        const t = touchList[i];
        // convertir a coordenadas lógicas del juego (BASE_WIDTH)
        const logicalX = (t.clientX - offsetX) / scale;
        if(logicalX < (BASE_WIDTH / 2)) anyLeft = true;
        else anyRight = true;
    }
    keys['ArrowLeft'] = anyLeft;
    keys['ArrowRight'] = anyRight;
}

window.addEventListener('touchstart', function(e) {
    updateTouchKeys(e.touches);
    // evitar que la pantalla haga scroll mientras juegas
    e.preventDefault();
}, {passive: false});

window.addEventListener('touchmove', function(e) {
    updateTouchKeys(e.touches);
    e.preventDefault();
}, {passive: false});

window.addEventListener('touchend', function(e) {
    // en touchend usar e.touches (toques restantes)
    updateTouchKeys(e.touches);
}, {passive: true});

window.addEventListener('touchcancel', function(e) {
    updateTouchKeys(e.touches);
}, {passive: true});

function selectCar(name) {
    carSelected = name;
    document.getElementById('selected-txt').innerText = "Seleccionado: " + name;
    document.getElementById('start-btn').disabled = false;
}

function startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    carX = 350; score = 0; speed = baseSpeed;
    obstacles = [];
    initTrees();
    gameRunning = true;
    music.currentTime = 0;
    music.play();
    requestAnimationFrame(update);
}

// --- BUCLE PRINCIPAL ---
function update() {
    if(!gameRunning) return;

    // Movimiento del coche
    if(keys['ArrowLeft'] && carX > 140) carX -= 4;
    if(keys['ArrowRight'] && carX < 570) carX += 4;

    // Animación de carretera
    offsetRoad = (offsetRoad + speed) % 50;

    // Movimiento de árboles
    trees.forEach(t => {
        t.y += speed;
        if(t.y > 500) {
            t.y = -60;
            t.x = Math.random() < 0.5 ? Math.random() * 80 : 700 + Math.random() * 100;
        }
    });

    // Generación de obstáculos
    if(obstacles.length === 0) {
        let count = Math.random() > 0.5 ? 2 : 3;
        for(let i=0; i<count; i++) {
            // Generar posición X aleatoria dentro del ancho de la carretera (200-600)
            let x = 210 + Math.random() * 380; // rango de 210 a 590 dentro de la carretera
            obstacles.push({x: x, y: -100 - (i * 150)});
        }
    }

    // Movimiento y colisión de obstáculos
    obstacles.forEach((obs, index) => {
        obs.y += speed;
        
        // Caja de colisión (Hitbox)
        if(Math.abs((carX + 25) - obs.x) < 35 && Math.abs((carY + 40) - obs.y) < 40) {
            gameOver();
        }

        if(obs.y > 550) obstacles.splice(index, 1);
    });

    // Subir dificultad
    if(obstacles.length === 0) {
        score++;
        speed = baseSpeed + Math.floor(score / 3);
    }

    draw();
    requestAnimationFrame(update);
}

// --- RENDERIZADO ---
function draw() {
    // clear full canvas in screen-space, then apply logical scale transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    // Pasto: rellenar las orillas con múltiples copias de Arbol.png
    // usamos el offset de la carretera para dar movimiento vertical a las orillas
    const treeOffset = offsetRoad % 80;
    const leftXs = [80, 50, 110];
    const rightXs = [720, 690, 750];
    for (let x of leftXs) {
        for (let y = -140 + treeOffset; y < 600; y += 80) {
            ctx.drawImage(imgArbol, x - 30, y - 30, 70, 70);
        }
    }
    for (let x of rightXs) {
        for (let y = -140 + treeOffset; y < 600; y += 80) {
            ctx.drawImage(imgArbol, x - 30, y - 30, 70, 70);
        }
    }

    // Árboles en movimiento (por encima del fondo)
    trees.forEach(t => ctx.drawImage(imgArbol, t.x - 30, t.y - 30, 70, 70));

    // Gradas a los costados (derecha e izquierda) — dibujadas después de los árboles
    // repetimos verticalmente para cubrir la pantalla y usamos el mismo treeOffset para movimiento
    // Colocar las gradas más alejadas del centro para no tapar los árboles
    const standLeftX = 0; // lado izquierdo, más cerca
    const standRightX = 600; // lado derecho, más cerca
    for (let y = -140 + treeOffset; y < 600; y += 150) {
        ctx.drawImage(imgGradasIzq, standLeftX, y, 350, 350);
        ctx.drawImage(imgGradas, standRightX, y, 350, 350);
    }

    // Asfalto
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(200, 0, 400, 500);
    
    // Líneas laterales
    ctx.strokeStyle = "white"; ctx.lineWidth = 4;
    ctx.strokeRect(202, -10, 396, 520);

    // Líneas amarillas centrales
    ctx.fillStyle = "yellow";
    for(let i = -50; i < 550; i += 50) {
        ctx.fillRect(400, i + offsetRoad, 16, 30);
    }

    // Dibujar Coche Jugador (todas las imágenes se dibujan igual)
    const img = carImages[carSelected];
    ctx.drawImage(img, carX, carY, 50, 80);

    // Dibujar Obstáculos
    obstacles.forEach(obs => ctx.drawImage(imgCono, obs.x - 20, obs.y - 20, 40, 40));

    // Texto de Puntaje
    ctx.fillStyle = "white";
    ctx.font = "bold 18px Arial";
    ctx.shadowBlur = 4; ctx.shadowColor = "black";
    ctx.fillText(`PUNTOS: ${score}`, 15, 30);
    ctx.fillText(`RÉCORD: ${record}`, 15, 55);
    ctx.shadowBlur = 0;
}

function gameOver() {
    gameRunning = false;
    music.pause();
    crashSound.play();
    if(score > record) record = score;
    document.getElementById('final-score').innerText = "Puntaje Final: " + score;
    document.getElementById('game-over').classList.remove('hidden');
}

function restartGame() { startGame(); }
function showMenu() {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}