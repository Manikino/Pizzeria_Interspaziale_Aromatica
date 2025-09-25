// Variabili globali
let canvas, ctx;
let gameActive = false;
let gameLoop;
let currentLevel = 1;
let score = 0;
let progress = 0;
let pizzaTypes = ["Margherita", "Pepperoni", "Super Spaziale", "Quattro Stagioni", "Capricciosa", "Galattica", "Infinita"];
let unlockedLevels = 1; // Solo il primo livello è sbloccato all'inizio
let isInfiniteMode = false; // Modalità infinita
let maxBullets = 20; // Numero massimo di proiettili disponibili
let remainingBullets = maxBullets; // Proiettili rimanenti

// Oggetti di gioco
let spaceship = {
    x: 0,
    y: 0,
    width: 60,
    height: 40,
    speed: 5,
    bullets: [],
    canShoot: false
};

let meteorites = [];
let gameKeys = {
    left: false,
    right: false,
    up: false,
    down: false,
    space: false
};

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
        documentation.classList.remove('hidden');
    });
    
    btnPlay.addEventListener('click', function() {
        hideAllSections();
        document.getElementById('level-select').classList.remove('hidden');
        updateLevelButtons();
    });
    
    // Event listeners per i livelli
    for (let i = 1; i <= 6; i++) {
        document.getElementById('level-' + i).addEventListener('click', function() {
            if (i <= unlockedLevels) {
                hideAllSections();
                document.getElementById('game-area').classList.remove('hidden');
                currentLevel = i;
                isInfiniteMode = false;
                startGame();
            }
        });
    }
    
    // Event listener per la modalità infinita
    document.getElementById('infinite-mode').addEventListener('click', function() {
        hideAllSections();
        document.getElementById('game-area').classList.remove('hidden');
        currentLevel = 1; // Inizia sempre dal livello 1
        isInfiniteMode = true;
        startGame();
    });
    
    btnCredits.addEventListener('click', function() {
        hideAllSections();
        credits.classList.remove('hidden');
    });
    
    // Event listeners per i bottoni di navigazione
    backFromDocs.addEventListener('click', backToMenu);
    backFromCredits.addEventListener('click', backToMenu);
    backFromGameover.addEventListener('click', backToMenu);
    restartBtn.addEventListener('click', function() {
        hideAllSections();
        gameArea.classList.remove('hidden');
        startGame();
    });
    
    // Event listeners per la schermata di livello completato
    nextLevelBtn.addEventListener('click', function() {
        hideAllSections();
        gameArea.classList.remove('hidden');
        startGame();
    });
    
    backToLevelsBtn.addEventListener('click', function() {
        hideAllSections();
        document.getElementById('level-select').classList.remove('hidden');
        updateLevelButtons();
    });
    
    // Event listeners per i controlli di gioco
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
        // Carica le immagini
    loadImages();
});

// Funzione per nascondere tutte le sezioni
function hideAllSections() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-area').classList.add('hidden');
    document.getElementById('documentation').classList.add('hidden');
    document.getElementById('credits').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('level-select').classList.add('hidden');
    document.getElementById('level-complete').classList.add('hidden');
}

// Funzione per tornare al menu principale
function backToMenu() {
    hideAllSections();
    document.getElementById('main-menu').classList.remove('hidden');
}

// Oggetti per le immagini
const images = {
    spaceship: new Image(),
    meteorite: new Image(),
    pizza1: new Image(),
    pizza2: new Image(),
    pizza3: new Image(),
    background: new Image()
};

// Caricamento delle immagini
function loadImages() {
    images.spaceship.src = 'img/spaceship.svg';
    images.meteorite.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23777" stroke="%23333" stroke-width="1"/><circle cx="10" cy="10" r="2" fill="%23999"/><circle cx="20" cy="18" r="3" fill="%23999"/><circle cx="15" cy="8" r="1.5" fill="%23999"/></svg>';
    
    // Pizze per i diversi livelli
    images.pizza1.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23FFCC66" stroke="%23CC9933" stroke-width="1"/><circle cx="15" cy="15" r="12" fill="%23FF9933"/><circle cx="10" cy="10" r="2" fill="%23CC3300"/><circle cx="20" cy="20" r="2" fill="%23CC3300"/><circle cx="15" cy="18" r="2" fill="%23009900"/></svg>';
    images.pizza2.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23FFCC66" stroke="%23CC9933" stroke-width="1"/><circle cx="15" cy="15" r="12" fill="%23FF9933"/><circle cx="10" cy="10" r="2" fill="%23CC3300"/><circle cx="20" cy="20" r="2" fill="%23CC3300"/><circle cx="15" cy="10" r="2" fill="%23CC3300"/><circle cx="10" cy="20" r="2" fill="%23CC3300"/></svg>';
    images.pizza3.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23FFCC66" stroke="%23CC9933" stroke-width="1"/><circle cx="15" cy="15" r="12" fill="%23FF9933"/><circle cx="10" cy="10" r="2" fill="%23CC3300"/><circle cx="20" cy="20" r="2" fill="%23CC3300"/><circle cx="15" cy="10" r="2" fill="%23CC3300"/><circle cx="10" cy="20" r="2" fill="%23009900"/><circle cx="20" cy="10" r="2" fill="%23009900"/></svg>';
    
    // Sfondo spaziale
    images.background.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%23000"/><circle cx="100" cy="100" r="1" fill="%23FFF"/><circle cx="200" cy="150" r="1" fill="%23FFF"/><circle cx="300" cy="200" r="1" fill="%23FFF"/><circle cx="400" cy="300" r="1" fill="%23FFF"/><circle cx="500" cy="100" r="1" fill="%23FFF"/><circle cx="600" cy="200" r="1" fill="%23FFF"/><circle cx="700" cy="300" r="1" fill="%23FFF"/><circle cx="150" cy="400" r="1" fill="%23FFF"/><circle cx="250" cy="500" r="1" fill="%23FFF"/><circle cx="350" cy="100" r="1" fill="%23FFF"/><circle cx="450" cy="200" r="1" fill="%23FFF"/><circle cx="550" cy="300" r="1" fill="%23FFF"/><circle cx="650" cy="400" r="1" fill="%23FFF"/><circle cx="750" cy="500" r="1" fill="%23FFF"/></svg>';
}

// Avvio del gioco
function startGame() {
    // Reset delle variabili di gioco (mantiene il livello corrente)
    score = 0;
    progress = 0;
    meteorites = [];
    spaceship.bullets = [];
    
    // Imposta la capacità di sparare in base al livello
    spaceship.canShoot = currentLevel >= 2;
    
    // Imposta il numero di proiettili in base al livello
    if (isInfiniteMode) {
        maxBullets = 50;
    } else {
        maxBullets = 10 + (currentLevel * 2); // Più proiettili nei livelli superiori
    }
    remainingBullets = maxBullets;
    
    // Posizionamento iniziale della navicella
    spaceship.x = canvas.width / 2 - spaceship.width / 2;
    spaceship.y = canvas.height - spaceship.height - 20;
    
    // Aggiornamento dell'interfaccia
    updateUI();
    
    // Avvio del loop di gioco
    gameActive = true;
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameUpdate, 1000 / 60); // 60 FPS
    
    // Generazione dei meteoriti in base al livello
    generateMeteorites();
}

// Ferma il gioco
function stopGame() {
    gameActive = false;
    if (gameLoop) clearInterval(gameLoop);
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
    
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('progress-text').textContent = Math.floor(progress) + '%';
    document.getElementById('bullets-count').textContent = remainingBullets;
}

// Generazione dei meteoriti
function generateMeteorites() {
    const meteoritesCount = 5 + (currentLevel * 3); // Più meteoriti nei livelli superiori
    
    for (let i = 0; i < meteoritesCount; i++) {
        const size = Math.random() * 20 + 20; // Dimensione tra 20 e 40
        meteorites.push({
            x: Math.random() * (canvas.width - size),
            y: Math.random() * -500, // Posizione iniziale sopra il canvas
            width: size,
            height: size,
            speed: 1 + Math.random() * currentLevel // Velocità aumenta con il livello
        });
    }
}

// Loop principale del gioco
function gameUpdate() {
    if (!gameActive) return;
    
    // Aggiornamento della posizione della navicella
    updateSpaceshipPosition();
    
    // Aggiornamento dei proiettili
    updateBullets();
    
    // Aggiornamento dei meteoriti
    updateMeteorites();
    
    // Controllo delle collisioni
    checkCollisions();
    
    // Disegno di tutti gli elementi
    drawGame();
    
    // Aggiornamento del progresso basato sul tempo
    updateProgressWithTime();
    
    // Controllo del progresso
    checkProgress();
}

// Aggiornamento del progresso basato sul tempo
function updateProgressWithTime() {
    // Incrementa il progresso di una piccola quantità ad ogni frame
    // Questo garantisce che il progresso avanzi nel tempo
    progress += 0.05;
    
    // Aggiorna l'interfaccia utente
    updateUI();
}

// Aggiornamento della posizione della navicella
function updateSpaceshipPosition() {
    if (gameKeys.left && spaceship.x > 0) {
        spaceship.x -= spaceship.speed;
    }
    if (gameKeys.right && spaceship.x < canvas.width - spaceship.width) {
        spaceship.x += spaceship.speed;
    }
    if (gameKeys.up && spaceship.y > 0) {
        spaceship.y -= spaceship.speed;
    }
    if (gameKeys.down && spaceship.y < canvas.height - spaceship.height) {
        spaceship.y += spaceship.speed;
    }
    
    // Sparo (solo dal livello 2 in poi)
    if (gameKeys.space && currentLevel >= 2) {
        if (spaceship.canShoot && remainingBullets > 0) {
            // Limitazione della frequenza di sparo
            if (!spaceship.lastShot || Date.now() - spaceship.lastShot > 300) {
                spaceship.bullets.push({
                    x: spaceship.x + spaceship.width / 2 - 2,
                    y: spaceship.y,
                    width: 4,
                    height: 10,
                    speed: 10
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
    for (let i = spaceship.bullets.length - 1; i >= 0; i--) {
        spaceship.bullets[i].y -= spaceship.bullets[i].speed;
        
        // Rimozione dei proiettili fuori dallo schermo
        if (spaceship.bullets[i].y < 0) {
            spaceship.bullets.splice(i, 1);
        }
    }
}

// Aggiornamento dei meteoriti
function updateMeteorites() {
    for (let i = meteorites.length - 1; i >= 0; i--) {
        meteorites[i].y += meteorites[i].speed;
        
        // Riposizionamento dei meteoriti che escono dallo schermo
        if (meteorites[i].y > canvas.height) {
            meteorites[i].y = Math.random() * -100;
            meteorites[i].x = Math.random() * (canvas.width - meteorites[i].width);
        }
    }
    
    // Aggiunta di nuovi meteoriti se ce ne sono pochi
    if (meteorites.length < 5 + (currentLevel * 2)) {
        const size = Math.random() * 20 + 20;
        meteorites.push({
            x: Math.random() * (canvas.width - size),
            y: Math.random() * -100,
            width: size,
            height: size,
            speed: 1 + Math.random() * currentLevel
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
                    // Nelle altre modalità, colpire i meteoriti riduce il tempo necessario per raggiungere il 100%
                    progress += 1;
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
    
    // Sfondo
    ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    
    // Navicella
    ctx.drawImage(images.spaceship, spaceship.x, spaceship.y, spaceship.width, spaceship.height);
    
    // Proiettili
    ctx.fillStyle = '#ffff00';
    for (const bullet of spaceship.bullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
    
    // Meteoriti
    for (const meteorite of meteorites) {
        ctx.drawImage(images.meteorite, meteorite.x, meteorite.y, meteorite.width, meteorite.height);
    }
    
    // Pizza obiettivo (in base al livello)
    const pizzaImage = currentLevel === 1 ? images.pizza1 : (currentLevel === 2 ? images.pizza2 : images.pizza3);
    ctx.drawImage(pizzaImage, canvas.width - 50, 10, 40, 40);
}

// Controllo del progresso
function checkProgress() {
    if (progress >= 100) {
        // Passaggio al livello successivo
        currentLevel++;
        
        // Sblocca il livello successivo se non è già sbloccato
        if (currentLevel > unlockedLevels && !isInfiniteMode) {
            unlockedLevels = currentLevel;
        }
        
        // Ferma il gioco
        gameActive = false;
        clearInterval(gameLoop);
        
        if (isInfiniteMode) {
            // Modalità infinita - continua senza interruzioni
            currentLevel = currentLevel > 6 ? 1 : currentLevel; // Cicla tra i livelli 1-6
            progress = 0;
            // Ricarica i proiettili senza pausa
            remainingBullets = maxBullets;
            // Riavvia il gioco immediatamente
            startGame();
        } else if (currentLevel > 6) {
            // Hai completato tutti i livelli
            document.getElementById('game-area').classList.add('hidden');
            document.getElementById('level-complete').classList.remove('hidden');
            document.getElementById('completed-level').textContent = 6;
            
            // Aggiorna i pulsanti dei livelli
            updateLevelButtons();
        } else {
            // Livelli 1-6 - Mostra la schermata di congratulazioni
            document.getElementById('game-area').classList.add('hidden');
            document.getElementById('level-complete').classList.remove('hidden');
            document.getElementById('completed-level').textContent = currentLevel - 1;
            
            // Aggiorna i pulsanti dei livelli
            updateLevelButtons();
        }
    }
}

// Funzione per aggiornare i pulsanti dei livelli
function updateLevelButtons() {
    // Aggiorna lo stato dei pulsanti dei livelli in base ai livelli sbloccati
    for (let i = 1; i <= 7; i++) {
        const levelButton = document.getElementById(i === 7 ? 'level-7' : 'level-' + i);
        
        // Condizione di sblocco: livelli 1-6 normali, livello 7 (infinito) se hai sbloccato il 6
        const isUnlocked = (i <= 6 && i <= unlockedLevels) || (i === 7 && unlockedLevels >= 6);
        
        if (isUnlocked) {
            levelButton.classList.remove('locked');
            levelButton.classList.add('unlocked');
            
            // Aggiungi event listener solo se non è già stato aggiunto
            if (!levelButton.hasAttribute('data-has-listener')) {
                levelButton.addEventListener('click', function() {
                    hideAllSections();
                    document.getElementById('game-area').classList.remove('hidden');
                    currentLevel = i;
                    isInfiniteMode = (i === 7);
                    startGame();
                });
                levelButton.setAttribute('data-has-listener', 'true');
            }
        } else {
            levelButton.classList.remove('unlocked');
            levelButton.classList.add('locked');
        }
    }
}

// Game over
function gameOver() {
    gameActive = false;
    clearInterval(gameLoop);
    
    // Aggiornamento dell'interfaccia di game over
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-level').textContent = currentLevel;
    
    // In modalità infinita, riavvia sempre dal livello 1
    if (isInfiniteMode) {
        currentLevel = 1;
    }
    
    // Visualizzazione della schermata di game over
    document.getElementById('game-area').classList.add('hidden');
    document.getElementById('game-over').classList.remove('hidden');
}

// Vittoria
function victory() {
    gameActive = false;
    clearInterval(gameLoop);
    
    // Aggiornamento dell'interfaccia di game over con messaggio di vittoria
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-level').textContent = "Completato!";
    
    // Visualizzazione della schermata di game over
    document.getElementById('game-area').classList.add('hidden');
    document.getElementById('game-over').classList.remove('hidden');
}

// Pausa del gioco
function togglePause() {
    gameActive = !gameActive;
    
    // Non facciamo più riferimento ai bottoni rimossi
    if (!gameActive) {
        // Logica per la pausa
        clearInterval(gameLoop);
    } else {
        // Logica per la ripresa
        gameLoop = setInterval(gameUpdate, 1000 / 60);
    }
}

// Gestione degli input da tastiera
function handleKeyDown(e) {
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
    }
}

function handleKeyUp(e) {
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
    }
}