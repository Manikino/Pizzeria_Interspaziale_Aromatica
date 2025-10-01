// Variabili globali
let canvas, ctx;
let gameActive = false;
let gameLoop;
let currentLevel = 1;
let score = 0;
let progress = 0;
let lastCompletedLevel = 0;
let pizzaTypes = ["Margherita", "Pepperoni", "Super Spaziale", "Quattro Stagioni", "Capricciosa", "Galattica", "Infinita"];
let inputEnabled = false; // input abilitato solo durante il gameplay
let unlockedLevels = 1; // Solo il primo livello è sbloccato all'inizio
let isInfiniteMode = false; // Modalità infinita
let maxBullets = 20; // Numero massimo di proiettili disponibili
let remainingBullets = maxBullets; // Proiettili rimanenti

// Sistema di animazioni
let animationState = 'none'; // 'takeoff', 'landing', 'game', 'none'
let animationProgress = 0; // 0-1 per il progresso dell'animazione
let animationStartTime = 0;
let planet = {
    x: 0,
    y: 0,
    size: 0,
    color: '#8B4513'
};

// Stato iniziale per animazione atterraggio
let landingStart = {
    shipX: 0,
    shipY: 0,
    shipW: 60,
    shipH: 40,
    shipRot: 0
};

// Sistema di particelle con object pooling
let particles = [];
let particlePool = []; // Pool per riutilizzare le particelle

// Timeout per spawn ritardato dei meteoriti dopo il decollo
let meteorSpawnTimeout = null;

// Sistema di stelle animate per lo sfondo
let stars = [];
let backgroundOffset = 0;
let bgColor = '#000011';
let infinitePhase = 0;
let infiniteSpeedMultiplier = 1;

// Tween per colore sfondo infinito
let bgTween = {
    from: { r: 0, g: 0, b: 17 },
    to: { r: 0, g: 0, b: 17 },
    start: 0,
    duration: 900 // ms
};

// Oggetti di gioco
let spaceship = {
    x: 0,
    y: 0,
    width: 60,
    height: 40,
    maxSpeed: 6, // Velocità massima
    acceleration: 0.3, // Accelerazione
    friction: 0.85, // Attrito per decelerazione
    velocityX: 0, // Velocità attuale X
    velocityY: 0, // Velocità attuale Y
    bullets: [],
    canShoot: false,
    rotation: 0, // Rotazione dell'astronave per effetto di inclinazione
    thrusterActive: false // Stato del propulsore
};

let meteorites = [];
let gameKeys = {
    left: false,
    right: false,
    up: false,
    down: false,
    space: false,
    p: false
};

function clearGameKeys() {
    gameKeys.left = false;
    gameKeys.right = false;
    gameKeys.up = false;
    gameKeys.down = false;
    gameKeys.space = false;
    gameKeys.p = false;
}

// Inizializzazione al caricamento della pagina
document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const mainMenu = document.getElementById('main-menu');
    const gameArea = document.getElementById('game-area');
    const documentation = document.getElementById('documentation');
    const credits = document.getElementById('credits');
    const gameOver = document.getElementById('game-over');
    const levelComplete = document.getElementById('level-complete');
    
    // Bottoni menu
    const btnDocs = document.getElementById('btn-docs');
    const btnPlay = document.getElementById('btn-play');
    const btnCredits = document.getElementById('btn-credits');
    
    // Bottoni navigazione
    const backFromDocs = document.getElementById('back-from-docs');
    const backFromCredits = document.getElementById('back-from-credits');
    const backFromGameover = document.getElementById('back-from-gameover');
    const restartBtn = document.getElementById('restart-btn');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const backToLevelsBtn = document.getElementById('back-to-levels-btn');
    
    // Canvas e contesto
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Event listeners per i bottoni del menu
    btnDocs.addEventListener('click', function() {
        hideAllSections();
        showSection('documentation');
    });
    
    btnPlay.addEventListener('click', function() {
        hideAllSections();
        showSection('level-select');
        updateLevelButtons();
    });
    
    // Event listeners per i livelli
    for (let i = 1; i <= 6; i++) {
        document.getElementById('level-' + i).addEventListener('click', function() {
            if (i <= unlockedLevels) {
                hideAllSections();
                showSection('game-area');
                currentLevel = i;
                isInfiniteMode = false;
                startGame();
            }
        });
    }
    
    // Event listener per la modalità infinita
    document.getElementById('infinite-mode').addEventListener('click', function() {
        hideAllSections();
        showSection('game-area');
        currentLevel = 1; // Inizia sempre dal livello 1
        isInfiniteMode = true;
        startGame();
    });
    
    btnCredits.addEventListener('click', function() {
        hideAllSections();
        showSection('credits');
    });
    
    // Event listeners per i bottoni di navigazione
    backFromDocs.addEventListener('click', backToMenu);
    backFromCredits.addEventListener('click', backToMenu);
    backFromGameover.addEventListener('click', backToMenu);
    document.getElementById('back-from-levels').addEventListener('click', backToMenu);
    restartBtn.addEventListener('click', function() {
        hideAllSections();
        showSection('game-area');
        startGame();
    });
    
    // Event listeners per la schermata di livello completato
    nextLevelBtn.addEventListener('click', function() {
        hideAllSections();
        showSection('game-area');
        startGame();
    });
    
    backToLevelsBtn.addEventListener('click', function() {
        hideAllSections();
        showSection('level-select');
        updateLevelButtons();
    });
    
    // Event listeners per i controlli di gioco
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
        // Carica le immagini
    loadImages();
});

// Funzione per nascondere tutte le sezioni con animazione
function hideAllSections() {
    const sections = [
        'main-menu', 'game-area', 'documentation', 'credits', 
        'game-over', 'level-select', 'level-complete'
    ];
    
    sections.forEach(id => {
        const element = document.getElementById(id);
        if (!element.classList.contains('hidden')) {
            element.classList.add('hidden');
        }
    });
    
}

// Funzione per mostrare una sezione con animazione
function showSection(id) {
    const element = document.getElementById(id);
    element.classList.remove('hidden');
    element.classList.add('section');
    element.classList.add('fade-in');
    
    // Rimuovi la classe fade-in dopo l'animazione
    setTimeout(() => {
        element.classList.remove('fade-in');
    }, 300);
    
    // Controlla visibilità header
    updateHeaderVisibility(id);
}

// Funzione per controllare la visibilità dell'header
function updateHeaderVisibility(activeSection) {
    const header = document.querySelector('header');
    const body = document.body;
    
    // Nascondi header durante il gioco e altre sezioni, mostra solo nel menu principale
    if (activeSection === 'main-menu') {
        header.style.display = 'block';
        body.classList.remove('game-mode');
    } else {
        header.style.display = 'none';
        
        // Aggiungi classe game-mode per nascondere lo sfondo nelle schermate di gioco
        if (activeSection === 'game-area' || activeSection === 'game-over' || activeSection === 'level-complete') {
            body.classList.add('game-mode');
        } else {
            body.classList.remove('game-mode');
        }
    }
}

// Funzione per tornare al menu principale
function backToMenu() {
    hideAllSections();
    // Pulisci eventuali background impostati per vittoria/sconfitta
    const lc = document.getElementById('level-complete');
    if (lc) {
        lc.style.backgroundImage = '';
        lc.classList.remove('bg-image-mode', 'bg-cover');
    }
    const go = document.getElementById('game-over');
    if (go) {
        go.style.backgroundImage = '';
        go.classList.remove('bg-image-mode', 'bg-cover');
    }
    showSection('main-menu');
    inputEnabled = false;
    clearGameKeys();
    // Reset sfondo a colore normale quando si torna al menu
    resetBackground();
}

// Oggetti per le immagini
const images = {
    spaceship: new Image(),
    meteorite: new Image(),
    pizza1: new Image(),
    pizza2: new Image(),
    pizza3: new Image(),
    background: new Image(),
    fire: new Image(),
    planets: [] // immagini opzionali per i pianeti: img/planet_X.PNG
};

// Inizializzazione del sistema di stelle (super ottimizzato)
function initStars() {
    stars = [];
    // Ridotto a 35 stelle per performance massime
    for (let i = 0; i < 35; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 3 + 1,
            brightness: Math.random() * 0.8 + 0.2,
            twinkle: Math.random() * 0.02 + 0.005,
            twinkleCounter: 0 // Contatore per ottimizzare lo scintillio
        });
    }
}

// Aggiornamento delle stelle animate (ottimizzato)
function updateStars() {
    const speedFactor = getSpeedFactor();
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        
        // Movimento verso il basso
        star.y += star.speed * speedFactor;
        
        // Effetto scintillio ottimizzato (non ogni frame)
        star.twinkleCounter++;
        if (star.twinkleCounter % 3 === 0) { // Solo ogni 3 frame
            star.brightness += star.twinkle;
            if (star.brightness > 1 || star.brightness < 0.2) {
                star.twinkle = -star.twinkle;
            }
        }
        
        // Reset della posizione quando esce dallo schermo
        if (star.y > canvas.height + 10) {
            star.y = -10;
            star.x = Math.random() * canvas.width;
        }
    }
}

// Disegno delle stelle (super ottimizzato)
function drawStars() {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    
    // Disegna tutte le stelle con un singolo loop
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        ctx.globalAlpha = star.brightness;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Bagliore solo per alcune stelle grandi (ogni 4)
        if (star.size > 1.8 && i % 4 === 0) {
            ctx.globalAlpha = star.brightness * 0.15;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * 1.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    ctx.restore();
}

// Caricamento delle immagini
function loadImages() {
    images.spaceship.src = 'img/spaceship.svg';
    images.meteorite.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23777" stroke="%23333" stroke-width="1"/><circle cx="10" cy="10" r="2" fill="%23999"/><circle cx="20" cy="18" r="3" fill="%23999"/><circle cx="15" cy="8" r="1.5" fill="%23999"/></svg>';
    images.fire.src = 'img/fire.svg';
    
    // Pizze per i diversi livelli
    images.pizza1.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23FFCC66" stroke="%23CC9933" stroke-width="1"/><circle cx="15" cy="15" r="12" fill="%23FF9933"/><circle cx="10" cy="10" r="2" fill="%23CC3300"/><circle cx="20" cy="20" r="2" fill="%23CC3300"/><circle cx="15" cy="18" r="2" fill="%23009900"/></svg>';
    images.pizza2.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23FFCC66" stroke="%23CC9933" stroke-width="1"/><circle cx="15" cy="15" r="12" fill="%23FF9933"/><circle cx="10" cy="10" r="2" fill="%23CC3300"/><circle cx="20" cy="20" r="2" fill="%23CC3300"/><circle cx="15" cy="10" r="2" fill="%23CC3300"/><circle cx="10" cy="20" r="2" fill="%23CC3300"/></svg>';
    images.pizza3.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23FFCC66" stroke="%23CC9933" stroke-width="1"/><circle cx="15" cy="15" r="12" fill="%23FF9933"/><circle cx="10" cy="10" r="2" fill="%23CC3300"/><circle cx="20" cy="20" r="2" fill="%23CC3300"/><circle cx="15" cy="10" r="2" fill="%23CC3300"/><circle cx="10" cy="20" r="2" fill="%23009900"/><circle cx="20" cy="10" r="2" fill="%23009900"/></svg>';
    
    // Sfondo spaziale
    images.background.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%23000"/><circle cx="100" cy="100" r="1" fill="%23FFF"/><circle cx="200" cy="150" r="1" fill="%23FFF"/><circle cx="300" cy="200" r="1" fill="%23FFF"/><circle cx="400" cy="300" r="1" fill="%23FFF"/><circle cx="500" cy="100" r="1" fill="%23FFF"/><circle cx="600" cy="200" r="1" fill="%23FFF"/><circle cx="700" cy="300" r="1" fill="%23FFF"/><circle cx="150" cy="400" r="1" fill="%23FFF"/><circle cx="250" cy="500" r="1" fill="%23FFF"/><circle cx="350" cy="100" r="1" fill="%23FFF"/><circle cx="450" cy="200" r="1" fill="%23FFF"/><circle cx="550" cy="300" r="1" fill="%23FFF"/><circle cx="650" cy="400" r="1" fill="%23FFF"/><circle cx="750" cy="500" r="1" fill="%23FFF"/></svg>';

    // Immagini opzionali dei pianeti: planet_1.PNG .. planet_6.PNG
    images.planets = [];
    for (let i = 1; i <= 6; i++) {
        const img = new Image();
        img.src = `img/planet_${i}.PNG`;
        img.onerror = () => { img._failed = true; };
        images.planets.push(img);
    }
}

// Avvio del gioco
function startGame() {
    // Reset sfondo a colore normale ad ogni nuova partita
    resetBackground();
    // Disabilita input e pulisci i tasti finché non parte il gameplay
    inputEnabled = false;
    clearGameKeys();

    // Reset delle variabili di gioco (mantiene il livello corrente)
    score = 0;
    progress = 0;
    meteorites = [];
    spaceship.bullets = [];
    particles = []; // Reset delle particelle

    // Cancella eventuale timer di spawn meteoriti precedente
    if (meteorSpawnTimeout) {
        clearTimeout(meteorSpawnTimeout);
        meteorSpawnTimeout = null;
    }
    
    // Reset delle velocità della navicella
    spaceship.velocityX = 0;
    spaceship.velocityY = 0;
    
// Inizializza il sistema di stelle
    initStars();
    
    // Imposta la capacità di sparare in base al livello/modalità
    spaceship.canShoot = isInfiniteMode ? true : (currentLevel >= 2);
    
    // Inizializza parametri modalità infinita (partenza sfondo normale)
    if (isInfiniteMode) {
        infinitePhase = 0;
        infiniteSpeedMultiplier = 1;
        // niente shift colore all'avvio; lo cambieremo ad ogni cambio fase
    }
    
    // Imposta il numero di proiettili in base al livello
    if (isInfiniteMode) {
        maxBullets = 50;
    } else {
        maxBullets = 10 + (currentLevel * 2); // Più proiettili nei livelli superiori
    }
    remainingBullets = maxBullets;
    
    // Aggiornamento dell'interfaccia
    updateUI();
    
    // Inizia con l'animazione di decollo
    startTakeoffAnimation();
}

// Ferma il gioco
function stopGame() {
    gameActive = false;
    if (gameLoop) cancelAnimationFrame(gameLoop);
}

// Avvia l'animazione di decollo
function startTakeoffAnimation() {
    animationState = 'takeoff';
    inputEnabled = false;
    clearGameKeys();
    animationProgress = 0;
    animationStartTime = Date.now();
    
    // Configurazione iniziale del pianeta
    planet.x = canvas.width / 2;
    planet.y = canvas.height - 150;
    planet.size = 300; // Grande all'inizio
    planet.color = getPlanetColor(currentLevel);
    
    // Posiziona l'astronave piccola sopra il pianeta
    spaceship.x = planet.x - 15; // Astronave piccola (30px)
    spaceship.y = planet.y - 180; // Sopra il pianeta
    spaceship.width = 30;  // Dimensioni ridotte
    spaceship.height = 20;
    
    // Avvia il loop di animazione
    gameActive = true;
    if (gameLoop) cancelAnimationFrame(gameLoop);
    startGameLoop();
}

// Avvia l'animazione di atterraggio 
function startLandingAnimation() {
    animationState = 'landing';
    inputEnabled = false;
    clearGameKeys();
    animationProgress = 0;
    animationStartTime = Date.now();
    
    // Memorizza stato iniziale della navicella per un lerp preciso
    landingStart.shipX = spaceship.x;
    landingStart.shipY = spaceship.y;
    landingStart.shipW = spaceship.width;
    landingStart.shipH = spaceship.height;
    landingStart.shipRot = spaceship.rotation || 0;
    // Disattiva propulsore
    spaceship.thrusterActive = false;
    // Azzeriamo eventuali velocità residue
    spaceship.velocityX = 0;
    spaceship.velocityY = 0;
    
    // Il pianeta inizia piccolo e SOPRA lo schermo e scende in maniera smooth
    planet.x = canvas.width / 2;
    planet.y = -100; // Sopra lo schermo
    planet.size = 50; // Piccolo all'inizio
    planet.color = getPlanetColor(currentLevel);

    // Avvia/riavvia il loop per l'animazione di atterraggio
    gameActive = true;
    if (gameLoop) cancelAnimationFrame(gameLoop);
    startGameLoop();
}

// Ottiene il colore del pianeta in base al livello
function getPlanetColor(level) {
    const colors = [
        '#8B4513', // Livello 1 - Marrone
        '#FF6347', // Livello 2 - Rosso
        '#4169E1', // Livello 3 - Blu
        '#32CD32', // Livello 4 - Verde
        '#FFD700', // Livello 5 - Oro
        '#9370DB'  // Livello 6 - Viola
    ];
    return colors[(level - 1) % colors.length];
}

// Loop di gioco ottimizzato con requestAnimationFrame
function startGameLoop() {
    function loop() {
        if (gameActive) {
            gameUpdate();
            gameLoop = requestAnimationFrame(loop);
        }
    }
    gameLoop = requestAnimationFrame(loop);
}

// Aggiornamento dell'interfaccia utente
function updateUI() {
    document.getElementById('current-level').textContent = isInfiniteMode ? "∞" : currentLevel;
    document.getElementById('current-pizza').textContent = pizzaTypes[isInfiniteMode ? 6 : currentLevel - 1];
    
    // Mostra il punteggio solo in modalità infinita
    const scoreElement = document.getElementById('score');
    const scoreContainer = scoreElement.parentElement;
    
    if (isInfiniteMode) {
        scoreElement.textContent = score;
        scoreContainer.style.display = 'inline-block';
    } else {
        scoreContainer.style.display = 'none';
    }

    // Mostra/nascondi indicatore Fase (solo in modalità infinita)
    const phaseWrapper = document.getElementById('phase-wrapper');
    const phaseLabel = document.getElementById('phase');
    if (phaseWrapper && phaseLabel) {
        if (isInfiniteMode) {
            phaseWrapper.style.display = 'inline-block';
            phaseLabel.textContent = (infinitePhase + 1);
        } else {
            phaseWrapper.style.display = 'none';
        }
    }
    
    // Mostra/nascondi contatore proiettili (nascosto nel livello 1 non infinito)
    const bulletsCounterEl = document.querySelector('.bullets-counter');
    if (bulletsCounterEl) {
        if (!isInfiniteMode && currentLevel === 1) {
            bulletsCounterEl.style.display = 'none';
        } else {
            bulletsCounterEl.style.display = 'inline-block';
        }
    }
    
    document.getElementById('progress-fill').style.height = progress + '%';
    // In infinita, la barra rappresenta la vicinanza al cambio di fase
    document.getElementById('progress-text').textContent = isInfiniteMode ? ('Fase ' + Math.floor(progress) + '%') : (Math.floor(progress) + '%');
    document.getElementById('bullets-count').textContent = remainingBullets;
}

// Generazione dei meteoriti
function generateMeteorites() {
    const countFactor = currentLevel <= 3 ? 3 : 2; // crescita più dolce dal livello 4
    const meteoritesCount = 5 + (currentLevel * countFactor);
    
    for (let i = 0; i < meteoritesCount; i++) {
        const size = Math.random() * 25 + 15; // Dimensione tra 15 e 40
        const speedFactorLevel = currentLevel <= 3 ? 0.8 : 0.45; // velocità cresce meno dal livello 4
        const baseSpeed = 1.5 + (currentLevel * speedFactorLevel);
        
        meteorites.push({
            x: Math.random() * (canvas.width - size),
            y: Math.random() * -800 - 200, // Distribuzione più ampia sopra lo schermo
            width: size,
            height: size,
            baseSpeed: baseSpeed,
            speed: baseSpeed + Math.random() * 2, // Variazione di velocità
            velocityX: (Math.random() - 0.5) * 1.5, // Movimento laterale leggero
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.08, // Rotazione più evidente
            wobble: Math.random() * 0.02, // Effetto oscillazione
            wobbleOffset: Math.random() * Math.PI * 2, // Fase dell'oscillazione
            mass: size / 20 // Massa basata sulla dimensione
        });
    }
}

// Funzione per creare una particella (con object pooling) - MIGLIORATA
function createParticle(x, y, direction, type = 'thruster') {
    let particle;
    if (particlePool.length > 0) {
        particle = particlePool.pop();
    } else {
        particle = {};
    }
    
    particle.x = x;
    particle.y = y;
    particle.type = type;
    
    if (type === 'thruster') {
        particle.size = Math.random() * 4 + 1.5; // Dimensioni più variabili
        particle.speed = Math.random() * 3 + 2; // Velocità più alta
        particle.life = Math.random() * 30 + 20; // Vita più lunga
        particle.direction = direction || { x: (Math.random() - 0.5) * 2, y: 1.8 };
        particle.heat = Math.random(); // Fattore di calore per colore
        particle.intensity = Math.random() * 0.8 + 0.2; // Intensità luminosa
    }
    
    return particle;
}

// Funzione per aggiornare le particelle
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].direction.x * particles[i].speed;
        particles[i].y += particles[i].direction.y * particles[i].speed;
        particles[i].life--;
        particles[i].size *= 0.95; // Riduzione graduale della dimensione
        
        // Rimuovi particelle morte e restituiscile al pool
        if (particles[i].life <= 0 || particles[i].size < 0.5) {
            particlePool.push(particles[i]); // Restituisce al pool
            particles.splice(i, 1);
        }
    }
    
    // Aggiungi nuove particelle se il propulsore è attivo - MIGLIORATO
    if (spaceship.thrusterActive) {
        // Calcola la posizione di emissione in base alla rotazione della navicella
        const emitX = spaceship.x + spaceship.width / 2;
        const emitY = spaceship.y + spaceship.height;
        
        // Direzione basata sul movimento (escluso movimento verso il basso)
        let dirX = 0;
        let dirY = 0;
        let intensity = 1;
        
        if (gameKeys.left) {
            dirX = 0.8;
            intensity = 1.2;
        }
        if (gameKeys.right) {
            dirX = -0.8;
            intensity = 1.2;
        }
        if (gameKeys.up) {
            dirY = 1.5;
            intensity = 1.8;
        }
        // NON generare particelle quando ci si muove verso il basso
        
        // Particelle propulsore più spettacolari e numerose
        if (particles.length < 60) { // Aumentato limite particelle
            // Più particelle quando ci si muove intensamente
            const particleCount = Math.floor(Math.random() * 5) + 3; // 3-7 particelle per frame
            for (let i = 0; i < particleCount; i++) {
                const spreadX = (Math.random() - 0.5) * 20; // Spread orizzontale più ampio
                const spreadY = (Math.random() - 0.5) * 8; // Spread verticale
                particles.push(createParticle(
                    emitX + spreadX, 
                    emitY + spreadY,
                    { 
                        x: dirX + (Math.random() - 0.5) * 0.6, 
                        y: dirY + Math.random() * 0.8 + 0.5 
                    },
                    'thruster'
                ));
            }
        }
    }
}

// Loop principale del gioco
function gameUpdate() {
    if (!gameActive) return;
    
    // Aggiornamento delle stelle animate
    updateStars();
    
    // Gestione delle animazioni
    if (animationState === 'takeoff') {
        updateTakeoffAnimation();
    } else if (animationState === 'landing') {
        updateLandingAnimation();
    } else if (animationState === 'game') {
        // Gameplay normale
        // Aggiornamento della posizione della navicella
        updateSpaceshipPosition();
        
        // Aggiornamento dei proiettili
        updateBullets();
        
        // Aggiornamento dei meteoriti
        updateMeteorites();
        
        // Controllo delle collisioni
        checkCollisions();
        
        // Aggiornamento del progresso basato sul tempo
        updateProgressWithTime();
        
        // Controllo del progresso
        checkProgress();
    }
    
    // Aggiornamento delle particelle (sempre attivo)
    updateParticles();
    
    // Disegno di tutti gli elementi
    drawGame();
}

// Aggiornamento dell'animazione di decollo
function updateTakeoffAnimation() {
    const elapsed = Date.now() - animationStartTime;
    const duration = 3000; // 3 secondi
    
    animationProgress = Math.min(elapsed / duration, 1);
    
    // Easing per animazione più fluida
    const eased = 1 - Math.pow(1 - animationProgress, 3);
    
    // Aggiorna posizione e dimensioni dell'astronave
    const initialX = planet.x - 15;
    const finalX = canvas.width / 2 - 30; // Posizione finale centrata
    const initialY = planet.y - 180;
    const finalY = canvas.height - 60; // Posizione finale in basso
    
    spaceship.x = initialX + (finalX - initialX) * eased;
    spaceship.y = initialY + (finalY - initialY) * eased;
    
    // Cresce l'astronave
    spaceship.width = 30 + (30 * eased); // Da 30 a 60
    spaceship.height = 20 + (20 * eased); // Da 20 a 40
    
    // Il pianeta diventa più piccolo e si allontana
    planet.size = 300 * (1 - eased * 0.8); // Diminuisce dell'80%
    planet.y = (canvas.height - 150) + (200 * eased); // Si allontana verso il basso
    
    // Attiva il propulsore per effetto visivo
    spaceship.thrusterActive = animationProgress > 0.1;
    
// Fine animazione
if (animationProgress >= 1) {
        animationState = 'game';
        // Pulisci i tasti ed abilita input da qui in poi
        clearGameKeys();
        inputEnabled = true;
        // Posizionamento finale della navicella per il gameplay
        spaceship.x = canvas.width / 2 - spaceship.width / 2;
        spaceship.y = canvas.height - spaceship.height - 20;
        spaceship.width = 60;
        spaceship.height = 40;
        spaceship.thrusterActive = false;
        
        // Genera i meteoriti con 2s di ritardo dopo che il player può muoversi
        if (meteorSpawnTimeout) { clearTimeout(meteorSpawnTimeout); }
        meteorSpawnTimeout = setTimeout(() => {
            // Evita spawn se non siamo più in gioco
            if (animationState === 'game' && gameActive) {
                generateMeteorites();
            }
        }, 2000);
    }
}

// Aggiornamento dell'animazione di atterraggio
function updateLandingAnimation() {
    const elapsed = Date.now() - animationStartTime;
    const duration = 2500; // 2.5 secondi
    
    animationProgress = Math.min(elapsed / duration, 1);
    
    // Easing per animazione più fluida
    const eased = 1 - Math.pow(1 - animationProgress, 2);
    
    // Il pianeta si avvicina
    const initialSize = 50;
    const finalSize = 300;
const initialY = -100;
const finalY = canvas.height - 150;
    
    planet.size = initialSize + (finalSize - initialSize) * eased;
    planet.y = initialY + (finalY - initialY) * eased;
    
// L'astronave diventa più piccola (lerp dalla dimensione attuale a finale)
    const finalWidth = 30;
    const finalHeight = 20;
    spaceship.width = lerp(landingStart.shipW, finalWidth, eased);
    spaceship.height = lerp(landingStart.shipH, finalHeight, eased);
    
// Target finale: centro pianeta con offset verticale
    const finalTargetX = planet.x - finalWidth / 2;
    const radius = planet.size / 2;
const clearance = -160; // ulteriore raddoppio dell'abbassamento
    const finalTargetY = planet.y - radius - clearance - (finalHeight / 2);

    // Lerp posizione dalla posizione di partenza al target finale
    spaceship.x = lerp(landingStart.shipX, finalTargetX, eased);
    spaceship.y = lerp(landingStart.shipY, finalTargetY, eased);

    // Riporta gradualmente la rotazione a 0
    spaceship.rotation = lerp(landingStart.shipRot, 0, eased);

    // Assicura che il propulsore sia spento durante l'atterraggio
    spaceship.thrusterActive = false;
    
// Fine animazione
if (animationProgress >= 1) {
        // Fissa posizione e dimensione finali con precisione
        const finalWidth = 30;
        const finalHeight = 20;
spaceship.width = finalWidth;
        spaceship.height = finalHeight;
        spaceship.x = planet.x - finalWidth / 2;
        {
const radius = planet.size / 2;
            const clearance = -160; // ulteriore raddoppio dell'abbassamento finale
            spaceship.y = planet.y - radius - clearance - (finalHeight / 2);
        }
        spaceship.rotation = 0;
        // Rimuovi meteoriti e mostra la schermata di vittoria
        meteorites = [];
        setTimeout(() => {
            showLevelCompleteScreen();
        }, 500);
    }
}

// Aggiornamento del progresso basato sul tempo (20% più veloce)
function updateProgressWithTime() {
    // Incrementa il progresso di una piccola quantità ad ogni frame
    // Velocità aumentata del 25% per ridurre la distanza del 20%
    
    // Velocità di riempimento variabile in base al livello (più veloce)
    const baseSpeed = 0.0375; // Aumentato da 0.03 a 0.0375 (+25%)
    const levelFactor = isInfiniteMode ? 0.6 : (1 - (currentLevel * 0.08)); // Fattore più generoso
    progress += baseSpeed * Math.max(0.25, levelFactor);

    // Debug: incremento velocissimo della barra mentre si tiene premuto 'p'
    if (gameKeys.p) {
        progress += 3.5; // incremento rapido per debug
    }

    // Evita di superare il 100%
    if (progress > 100) progress = 100;
    
    // Aggiorna l'interfaccia utente con animazione fluida
    updateUI();
}

// Aggiornamento della posizione della navicella con fisica realistica
function updateSpaceshipPosition() {
    // Reset dello stato del propulsore
    spaceship.thrusterActive = false;
    
    // Calcolo delle forze di input
    let forceX = 0;
    let forceY = 0;
    
    // Movimento orizzontale con accelerazione
    if (gameKeys.left) {
        forceX = -spaceship.acceleration;
        spaceship.thrusterActive = true;
    }
    if (gameKeys.right) {
        forceX = spaceship.acceleration;
        spaceship.thrusterActive = true;
    }
    
    // Movimento verticale
    if (gameKeys.up) {
        forceY = -spaceship.acceleration;
        spaceship.thrusterActive = true;
    }
    if (gameKeys.down) {
        forceY = spaceship.acceleration * 0.7; // Movimento verso il basso più lento
    }
    
    // Applicazione delle forze alla velocità
    spaceship.velocityX += forceX;
    spaceship.velocityY += forceY;
    
    // Limitazione della velocità massima
    const maxSpeed = spaceship.maxSpeed;
    if (spaceship.velocityX > maxSpeed) spaceship.velocityX = maxSpeed;
    if (spaceship.velocityX < -maxSpeed) spaceship.velocityX = -maxSpeed;
    if (spaceship.velocityY > maxSpeed) spaceship.velocityY = maxSpeed;
    if (spaceship.velocityY < -maxSpeed) spaceship.velocityY = -maxSpeed;
    
    // Applicazione dell'attrito quando non ci sono input
    if (!gameKeys.left && !gameKeys.right) {
        spaceship.velocityX *= spaceship.friction;
    }
    if (!gameKeys.up && !gameKeys.down) {
        spaceship.velocityY *= spaceship.friction;
    }
    
    // Aggiornamento della posizione
    spaceship.x += spaceship.velocityX;
    spaceship.y += spaceship.velocityY;
    
    // Controllo dei limiti dello schermo
    if (spaceship.x < 0) {
        spaceship.x = 0;
        spaceship.velocityX = 0;
    }
    if (spaceship.x > canvas.width - spaceship.width) {
        spaceship.x = canvas.width - spaceship.width;
        spaceship.velocityX = 0;
    }
    if (spaceship.y < 0) {
        spaceship.y = 0;
        spaceship.velocityY = 0;
    }
    if (spaceship.y > canvas.height - spaceship.height) {
        spaceship.y = canvas.height - spaceship.height;
        spaceship.velocityY = 0;
    }
    
    // Rotazione basata sulla velocità orizzontale (più realistica)
    spaceship.rotation = spaceship.velocityX * 0.05;
    
    // Limitazione dell'angolo di rotazione
    const maxRotation = 0.3;
    if (spaceship.rotation > maxRotation) spaceship.rotation = maxRotation;
    if (spaceship.rotation < -maxRotation) spaceship.rotation = -maxRotation;
    
// Sparo (livello 2+ nelle modalità normali; SEMPRE in modalità infinita)
    if (gameKeys.space && (isInfiniteMode || currentLevel >= 2)) {
        if (spaceship.canShoot && remainingBullets > 0) {
            // Limitazione della frequenza di sparo
            if (!spaceship.lastShot || Date.now() - spaceship.lastShot > 200) {
                // Calcola la posizione di sparo più precisa
                const bulletX = spaceship.x + spaceship.width / 2 - 1;
                const bulletY = spaceship.y - 5;
                
                spaceship.bullets.push({
                    x: bulletX,
                    y: bulletY,
                    width: 2,
                    height: 12,
                    speed: 15, // Velocità più realistica
                    velocityX: spaceship.velocityX * 0.3, // Eredita parte del movimento della navicella
                    velocityY: -15,
                    energy: 100, // Energia del proiettile
                    trail: [] // Scia del proiettile
                });
                spaceship.lastShot = Date.now();
                remainingBullets--;
                updateUI();
            }
        }
    }
}

// Aggiornamento dei proiettili
function updateBullets() {
    const speedFactor = getSpeedFactor();
    for (let i = spaceship.bullets.length - 1; i >= 0; i--) {
        const bullet = spaceship.bullets[i];
        
        // Aggiungi posizione corrente alla scia (ridotta per performance)
        bullet.trail.push({ x: bullet.x, y: bullet.y });
        if (bullet.trail.length > 4) {
            bullet.trail.shift(); // Mantieni solo gli ultimi 4 punti
        }
        
// Aggiornamento della posizione con velocità realistica
        bullet.x += bullet.velocityX * speedFactor;
        bullet.y += bullet.velocityY * speedFactor;
        
        // Leggera decelerazione nel tempo
        bullet.velocityY *= 0.998;
        bullet.velocityX *= 0.995;
        
        // Riduzione dell'energia nel tempo
        bullet.energy -= 1;
        
        // Rimozione dei proiettili fuori dallo schermo o senza energia
        if (bullet.y < -20 || bullet.energy <= 0 || bullet.x < -10 || bullet.x > canvas.width + 10) {
            spaceship.bullets.splice(i, 1);
        }
    }
}

// Aggiornamento dei meteoriti (ottimizzato)
function updateMeteorites() {
    const speedFactor = getSpeedFactor();
    for (let i = meteorites.length - 1; i >= 0; i--) {
        const meteorite = meteorites[i];
        
        // Movimento principale verso il basso
        meteorite.y += meteorite.speed * speedFactor;
        
        // Movimento laterale semplificato
        meteorite.x += meteorite.velocityX * speedFactor;
        
        // Effetto oscillazione semplificato (senza Math.sin)
        if (i % 3 === 0) { // Solo ogni terzo meteorite
            meteorite.wobbleOffset += meteorite.wobble;
            // Oscillazione lineare invece di sinusoidale
            if (meteorite.wobbleOffset > 1) {
                meteorite.wobble = -Math.abs(meteorite.wobble);
            } else if (meteorite.wobbleOffset < -1) {
                meteorite.wobble = Math.abs(meteorite.wobble);
            }
            meteorite.x += meteorite.wobbleOffset * 0.2;
        }
        
// Rotazione costante (senza variazioni casuali)
        meteorite.rotation += meteorite.rotationSpeed * speedFactor;
        
        // Controllo dei limiti laterali semplificato
        if (meteorite.x < -meteorite.width || meteorite.x > canvas.width + meteorite.width) {
            meteorite.velocityX = -meteorite.velocityX * 0.7;
        }
        
        // Riposizionamento dei meteoriti che escono dallo schermo
        if (meteorite.y > canvas.height + meteorite.height) {
            meteorite.y = Math.random() * -200 - 50;
            meteorite.x = Math.random() * (canvas.width - meteorite.width);
            meteorite.velocityX = (Math.random() - 0.5) * 1.2;
        }
    }
    
// Aggiunta di nuovi meteoriti se ce ne sono pochi
    if (meteorites.length < 5 + (currentLevel * 2)) {
        const size = Math.random() * 25 + 15;
        const speedFactorLevel = currentLevel <= 3 ? 0.8 : 0.45;
        const baseSpeed = (1.5 + (currentLevel * speedFactorLevel)) * (isInfiniteMode ? infiniteSpeedMultiplier : 1);
        
        meteorites.push({
            x: Math.random() * (canvas.width - size),
            y: Math.random() * -300 - 100,
            width: size,
            height: size,
            baseSpeed: baseSpeed,
            speed: baseSpeed + Math.random() * 2,
            velocityX: (Math.random() - 0.5) * 1.5,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.08,
            wobble: Math.random() * 0.02,
            wobbleOffset: Math.random() * Math.PI * 2,
            mass: size / 20
        });
    }
}

// Controllo delle collisioni
function checkCollisions() {
    // Collisione tra proiettili e meteoriti
    for (let i = spaceship.bullets.length - 1; i >= 0; i--) {
        const bullet = spaceship.bullets[i];
        
        for (let j = meteorites.length - 1; j >= 0; j--) {
            const meteorite = meteorites[j];
            
            if (
                bullet.x < meteorite.x + meteorite.width &&
                bullet.x + bullet.width > meteorite.x &&
                bullet.y < meteorite.y + meteorite.height &&
                bullet.y + bullet.height > meteorite.y
            ) {
// Collisione rilevata
                spaceship.bullets.splice(i, 1);
                meteorites.splice(j, 1);
                
                // Incrementa il punteggio solo in modalità infinita
                if (isInfiniteMode) {
                    score += 10 * currentLevel;
                } else {
                    // Nelle altre modalità, colpire i meteoriti aumenta il progresso solo dal livello 2 in poi
                    if (currentLevel >= 2) {
                        progress += 2.5;
                    }
                }
                
                updateUI();
                break;
            }
        }
    }
    
    // Collisione tra navicella e meteoriti
    for (let i = 0; i < meteorites.length; i++) {
        const meteorite = meteorites[i];
        
        if (
            spaceship.x < meteorite.x + meteorite.width &&
            spaceship.x + spaceship.width > meteorite.x &&
            spaceship.y < meteorite.y + meteorite.height &&
            spaceship.y + spaceship.height > meteorite.y
        ) {
            // Game over
            gameOver();
            return;
        }
    }
}

// Disegno di tutti gli elementi del gioco
function drawGame() {
    // Pulizia del canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Sfondo spaziale variabile con tween di colore
    ctx.fillStyle = getCurrentBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Disegna le stelle animate
    drawStars();
    
    // Disegna il pianeta se siamo in animazione
    if (animationState === 'takeoff' || animationState === 'landing') {
        drawPlanet();
    }
    
    // Disegna le particelle con colori realistici - MIGLIORATO
    for (const particle of particles) {
        if (particle.type === 'thruster') {
            // Calcola colore basato su calore e vita
            const lifeRatio = particle.life / 50;
            const heat = particle.heat;
            
            // Colori realistici del propulsore: blu-bianco-giallo-arancione-rosso
            let r, g, b;
            if (heat < 0.2) {
                // Blu molto caldo
                r = Math.floor(100 + heat * 775); // 100-255
                g = Math.floor(150 + heat * 525); // 150-255
                b = 255;
            } else if (heat < 0.5) {
                // Bianco-giallo
                const factor = (heat - 0.2) / 0.3;
                r = 255;
                g = 255;
                b = Math.floor(255 - factor * 100); // 255-155
            } else {
                // Giallo-arancione-rosso
                const factor = (heat - 0.5) / 0.5;
                r = 255;
                g = Math.floor(255 - factor * 155); // 255-100
                b = Math.floor(50 - factor * 50); // 50-0
            }
            
            // Disegna particella con gradiente
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 2
            );
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${lifeRatio * particle.intensity})`);
            gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${lifeRatio * particle.intensity * 0.5})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Navicella con rotazione
    ctx.save();
    ctx.translate(spaceship.x + spaceship.width/2, spaceship.y + spaceship.height/2);
    ctx.rotate(spaceship.rotation);
    
    // Disegna il fuoco del propulsore se attivo
    if (spaceship.thrusterActive) {
        // Disegna il fuoco dietro la navicella (dimensioni originali)
        ctx.drawImage(images.fire, -spaceship.width/2, spaceship.height/2 - 10, spaceship.width, 30);
    }
    
    // Disegna la navicella
    ctx.drawImage(images.spaceship, -spaceship.width/2, -spaceship.height/2, spaceship.width, spaceship.height);
    ctx.restore();
    
    // Proiettili con scia ottimizzata
    ctx.save();
    for (const bullet of spaceship.bullets) {
        // Disegna la scia semplificata
        if (bullet.trail.length > 1) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(bullet.trail[0].x, bullet.trail[0].y);
            for (let i = 1; i < bullet.trail.length; i++) {
                ctx.lineTo(bullet.trail[i].x, bullet.trail[i].y);
            }
            ctx.stroke();
        }
        
        // Disegna il proiettile principale
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bullet.x - 1, bullet.y, bullet.width, bullet.height);
        
        // Bagliore semplificato
        ctx.fillStyle = '#ffff00';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(bullet.x, bullet.y + 2, bullet.width - 2, bullet.height - 4);
    }
    ctx.restore();
    
    // Meteoriti con rotazione
for (const meteorite of meteorites) {
        ctx.save();
        // Durante atterraggio, dissolvi i meteoriti gradualmente
if (animationState === 'landing') {
            const fade = Math.max(0, 1 - animationProgress * 1.8); // dissolvenza più rapida dei meteoriti
            ctx.globalAlpha = fade;
        } else {
            ctx.globalAlpha = 1;
        }
        ctx.translate(meteorite.x + meteorite.width/2, meteorite.y + meteorite.height/2);
        ctx.rotate(meteorite.rotation);
        ctx.drawImage(images.meteorite, -meteorite.width/2, -meteorite.height/2, meteorite.width, meteorite.height);
        ctx.restore();
        
        // Aggiorna la rotazione del meteorite
        meteorite.rotation += meteorite.rotationSpeed;
    }
    
    // Pizza obiettivo (in base al livello) - Solo durante il gameplay
    if (animationState === 'game') {
        const pizzaImage = currentLevel === 1 ? images.pizza1 : (currentLevel === 2 ? images.pizza2 : images.pizza3);
        ctx.drawImage(pizzaImage, canvas.width - 50, 10, 40, 40);
    }
}

// Disegna il pianeta
function drawPlanet() {
    ctx.save();

    // Se disponibile, usa immagine del pianeta corrente
    const idx = Math.max(1, Math.min(6, currentLevel)) - 1;
    const planetImg = images.planets && images.planets[idx] && !images.planets[idx]._failed ? images.planets[idx] : null;
    if (planetImg && planetImg.complete && planetImg.naturalWidth > 0) {
        const drawSize = planet.size;
        ctx.drawImage(planetImg, planet.x - drawSize / 2, planet.y - drawSize / 2, drawSize, drawSize);
    } else {
        // Fallback: disegna il pianeta con gradiente
        const gradient = ctx.createRadialGradient(
            planet.x - planet.size * 0.3, planet.y - planet.size * 0.3, 0,
            planet.x, planet.y, planet.size / 2
        );
        gradient.addColorStop(0, lightenColor(planet.color, 40));
        gradient.addColorStop(0.7, planet.color);
        gradient.addColorStop(1, darkenColor(planet.color, 30));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Aggiunge dettagli al pianeta (crateri/macchie)
        ctx.fillStyle = darkenColor(planet.color, 20);
        ctx.globalAlpha = 0.6;
        
        const craterCount = 3 + (currentLevel % 3);
        for (let i = 0; i < craterCount; i++) {
            const angle = (i * Math.PI * 2) / craterCount + (currentLevel * 0.5);
            const distance = planet.size * 0.2;
            const craterX = planet.x + Math.cos(angle) * distance;
            const craterY = planet.y + Math.sin(angle) * distance;
            const craterSize = planet.size * 0.05;
            
            ctx.beginPath();
            ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    ctx.globalAlpha = 1;
    ctx.restore();
}

// Funzioni di utilità per i colori
function lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
        (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
        (B > 255 ? 255 : B < 0 ? 0 : B))
        .toString(16).slice(1);
}

// Reset sfondo a colore normale
function resetBackground() {
    bgColor = '#000011';
    bgTween.from = { r: 0, g: 0, b: 17 };
    bgTween.to = { r: 0, g: 0, b: 17 };
    bgTween.start = Date.now();
    bgTween.duration = 0;
}

// Fattore di velocità corrente (modalità infinita + debug 'p')
function getSpeedFactor() {
    let factor = isInfiniteMode ? infiniteSpeedMultiplier : 1;
    if (gameKeys.p) factor *= 3;
    return factor;
}

// Utilità colori per sfondo variabile e tween
function hexToRgb(hex) {
    const num = parseInt(hex.replace('#',''), 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r, g, b) {
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// Restituisce il colore di sfondo corrente, interpolando se tween attivo
function getCurrentBgColor() {
    const now = Date.now();
    const t = clamp((now - bgTween.start) / bgTween.duration, 0, 1);
    const k = easeOutCubic(t);
    const r = Math.round(lerp(bgTween.from.r, bgTween.to.r, k));
    const g = Math.round(lerp(bgTween.from.g, bgTween.to.g, k));
    const b = Math.round(lerp(bgTween.from.b, bgTween.to.b, k));
    return rgbToHex(r, g, b);
}

// Cambia lo sfondo in modo impattante ad ogni fase infinita (con tween)
function setRandomBackgroundColorShift(initial = false) {
    // Punto di partenza = colore attuale al momento della chiamata
    // In modalità infinita, non resettare mai al colore base durante il gioco
    const current = initial ? { r: 0, g: 0, b: 17 } : hexToRgb(getCurrentBgColor());
    const channels = ['r','g','b'];
    // Scegli un canale da aumentare forte e uno da variare leggermente
    const strongIdx = Math.floor(Math.random() * 3);
    let weakIdx = Math.floor(Math.random() * 3);
    if (weakIdx === strongIdx) weakIdx = (weakIdx + 1) % 3;
    const strongDelta = Math.random() < 0.5 ? 1 : -1;
    const weakDelta = Math.random() < 0.5 ? 1 : -1;
    const strongChange = Math.floor(Math.random() * 80) + 40; // 40-120
    const weakChange = Math.floor(Math.random() * 30);        // 0-30

    const target = { r: current.r, g: current.g, b: current.b };
    target[channels[strongIdx]] = clamp(target[channels[strongIdx]] + strongDelta * strongChange, 0, 255);
    target[channels[weakIdx]] = clamp(target[channels[weakIdx]] + weakDelta * weakChange, 0, 255);

    // Imposta tween
    bgTween.from = current;
    bgTween.to = target;
    bgTween.start = Date.now();
    // opzionale: regola durata per transizione percepibile
    bgTween.duration = 900;

    // Mantieni bgColor come ultimo target noto (per compatibilità altrove)
    bgColor = rgbToHex(target.r, target.g, target.b);
}

// Mostra la schermata di completamento livello
function showLevelCompleteScreen() {
    animationState = 'none';
    
    // Ferma il gioco
    gameActive = false;
    if (gameLoop) cancelAnimationFrame(gameLoop);
    
// Mostra la schermata di congratulazioni
    document.getElementById('game-area').classList.add('hidden');
    showSection('level-complete');
    document.getElementById('completed-level').textContent = lastCompletedLevel;

    // Imposta background di vittoria per livello
    const levelCompleteSection = document.getElementById('level-complete');
    levelCompleteSection.className = 'game-section level-' + lastCompletedLevel;
    levelCompleteSection.classList.add('bg-image-mode', 'bg-cover');
    levelCompleteSection.style.backgroundImage = `url('img/Win_${lastCompletedLevel}.PNG')`;

    // Gestione pulsanti a fine livello
    const nextBtn = document.getElementById('next-level-btn');
    const backBtn = document.getElementById('back-to-levels-btn');
    if (lastCompletedLevel >= 6) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (backBtn) {
            backBtn.textContent = 'Torna al Menu';
            backBtn.onclick = function(e) {
                if (e) { e.preventDefault(); e.stopImmediatePropagation(); }
                backToMenu();
            };
        }
    } else {
        if (nextBtn) nextBtn.style.display = '';
        if (backBtn) {
            backBtn.textContent = 'Torna alla Selezione';
            backBtn.onclick = null; // usa l'handler standard registrato all'avvio
        }
    }
    
    // Aggiorna i pulsanti dei livelli
    updateLevelButtons();
    // Aggiorna i pulsanti dei livelli
    updateLevelButtons();
}

// Controllo del progresso
function checkProgress() {
    if (progress >= 100) {
if (isInfiniteMode) {
            // Modalità infinita: sali di fase senza interrompere il gioco
            progress = 0;
            infinitePhase++;
            infiniteSpeedMultiplier = Math.min(infiniteSpeedMultiplier * 1.02, 2.0);
            
            // Cicla indicatore di livello 1-6 per varietà visiva
            currentLevel = currentLevel >= 6 ? 1 : (currentLevel + 1);
            
            // Aumenta leggermente la velocità degli elementi esistenti
            for (let i = 0; i < meteorites.length; i++) {
                meteorites[i].speed *= 1.02;
                meteorites[i].velocityX *= 1.02;
                meteorites[i].rotationSpeed *= 1.02;
            }
            // Leggero boost velocità nave (con limite)
            spaceship.maxSpeed = Math.min(spaceship.maxSpeed * 1.01, 10);
            
            // Cambia colore dello sfondo per effetto infinito (con tween)
            setRandomBackgroundColorShift(false);
            
            // Continua il gioco senza resettare
            updateUI();
            return;
        } else {
            // Modalità livelli normali: procedura classica
            // Memorizza il livello appena completato per la schermata
            lastCompletedLevel = currentLevel;
            // Passaggio al livello successivo
            currentLevel++;
            
            // Sblocca il livello successivo se non è già sbloccato
            if (currentLevel > unlockedLevels) {
                unlockedLevels = currentLevel;
            }
            
            // Ferma il gioco e avvia l'atterraggio
            gameActive = false;
            if (gameLoop) cancelAnimationFrame(gameLoop);
            
            if (currentLevel > 6) {
                // Hai completato tutti i livelli - usa animazione di atterraggio per l'ultimo livello
                currentLevel = 6; // Ripristina per mostrare il livello 6 completato
                startLandingAnimation();
            } else {
                // Livelli 1-6 - Avvia animazione di atterraggio
                startLandingAnimation();
            }
        }
    }
}

// Funzione per aggiornare i pulsanti dei livelli
function updateLevelButtons() {
    // Aggiorna lo stato dei pulsanti dei livelli normali (1-6)
    for (let i = 1; i <= 6; i++) {
        const levelButton = document.getElementById('level-' + i);
        if (!levelButton) continue; // Salta se l'elemento non esiste
        
        const isUnlocked = i <= unlockedLevels;
        
        if (isUnlocked) {
            levelButton.classList.remove('locked');
            levelButton.classList.add('unlocked');
        } else {
            levelButton.classList.remove('unlocked');
            levelButton.classList.add('locked');
        }
    }
    
    // Gestisci separatamente la modalità infinita
    const infiniteModeButton = document.getElementById('infinite-mode');
    if (infiniteModeButton) {
        if (unlockedLevels >= 6) {
            infiniteModeButton.disabled = false;
            infiniteModeButton.style.opacity = '1';
        } else {
            infiniteModeButton.disabled = true;
            infiniteModeButton.style.opacity = '0.5';
        }
    }
}

// Game over
function gameOver() {
    gameActive = false;
    if (gameLoop) cancelAnimationFrame(gameLoop);
    
    // Disabilita input e pulisci tasti
    inputEnabled = false;
    clearGameKeys();

    // Reset sfondo a colore normale alla sconfitta
    resetBackground();

    // Aggiornamento dell'interfaccia di game over
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-level').textContent = currentLevel;

    // Mostra immagine di sconfitta, se presente
    const overImg = document.getElementById('game-over-image');
    if (overImg) {
        overImg.src = 'img/Lost.Png';
        overImg.alt = 'Hai perso';
    }
    
    // In modalità infinita, riavvia sempre dal livello 1
    if (isInfiniteMode) {
        currentLevel = 1;
    }
    
// Visualizzazione della schermata di game over
    document.getElementById('game-area').classList.add('hidden');
    const overSection = document.getElementById('game-over');
    overSection.classList.add('bg-image-mode', 'bg-cover');
    overSection.style.backgroundImage = "url('img/Lost.Png')";
    showSection('game-over');
}

// Vittoria
function victory() {
    gameActive = false;
    if (gameLoop) cancelAnimationFrame(gameLoop);
    inputEnabled = false;
    clearGameKeys();
    
    // Aggiornamento dell'interfaccia di game over con messaggio di vittoria
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-level').textContent = "Completato!";
    
    // Visualizzazione della schermata di game over
    document.getElementById('game-area').classList.add('hidden');
    showSection('game-over');
}

// Pausa del gioco
function togglePause() {
    gameActive = !gameActive;
    
    if (!gameActive) {
        // Logica per la pausa
        if (gameLoop) cancelAnimationFrame(gameLoop);
    } else {
        // Logica per la ripresa
        startGameLoop();
    }
}

// Gestione degli input da tastiera
function handleKeyDown(e) {
    // Consenti solo ESC quando l'input non è abilitato
    if (!inputEnabled) {
        if (e.key === 'Escape') {
            togglePause();
        }
        return;
    }
    
    switch(e.key) {
        case 'ArrowLeft':
            gameKeys.left = true;
            break;
        case 'ArrowRight':
            gameKeys.right = true;
            break;
        case 'ArrowUp':
            gameKeys.up = true;
            break;
        case 'ArrowDown':
            gameKeys.down = true;
            break;
        case ' ':
            gameKeys.space = true;
            break;
case 'Escape':
            togglePause();
            break;
        case 'p':
        case 'P':
            gameKeys.p = true;
            break;
    }
}

function handleKeyUp(e) {
    // Ignora rilasci quando l'input non è abilitato
    if (!inputEnabled) {
        return;
    }
    
    switch(e.key) {
        case 'ArrowLeft':
            gameKeys.left = false;
            break;
        case 'ArrowRight':
            gameKeys.right = false;
            break;
        case 'ArrowUp':
            gameKeys.up = false;
            break;
        case 'ArrowDown':
            gameKeys.down = false;
            break;
case ' ':
            gameKeys.space = false;
            break;
        case 'p':
        case 'P':
            gameKeys.p = false;
            break;
    }
}
