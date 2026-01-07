// Variabili globali
let canvas, ctx;
let gameActive = false;
let gameLoop;

// Difficoltà di gioco
let currentDifficulty = 'normal';
const difficultyConfig = {
    easy: { meteoriteSpawnMultiplier: 1, enemySpawnIntervalMultiplier: 1.5, meteoriteProgressBonus: 2 },
    normal: { meteoriteSpawnMultiplier: 1, enemySpawnIntervalMultiplier: 1, meteoriteProgressBonus: 1 },
    hard: { meteoriteSpawnMultiplier: 1.5, enemySpawnIntervalMultiplier: 1, meteoriteProgressBonus: 0 }
};
function getMeteoriteSpawnMultiplier() { return difficultyConfig[currentDifficulty].meteoriteSpawnMultiplier; }
function getMeteoriteProgressBonus() { return difficultyConfig[currentDifficulty].meteoriteProgressBonus; }
function getEnemySpawnInterval() {
    const mult = difficultyConfig[currentDifficulty].enemySpawnIntervalMultiplier;
    const min = enemySpawnIntervalRange.min * mult;
    const max = enemySpawnIntervalRange.max * mult;
    return min + Math.random() * (max - min);
}

// Flag per evitare doppi avvii del dialogo dopo il decollo
let dialogStartedAfterTakeoff = false;

// Funzione per generare colori casuali per i bottoni
function applyRandomColorsToButtons() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        // Salta i bottoni con classe "locked"
        if (button.classList.contains('locked')) return;
        
        const randomBackground = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
        const randomBorder = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
        const darkerShadow = adjustColor(randomBackground, -30);
        
        button.style.backgroundColor = randomBackground;
        button.style.borderColor = randomBorder;
        button.style.boxShadow = `0 4px 0 ${darkerShadow}, 0 0 0 2px #000 inset`;
        button.style.setProperty('--button-shadow-color', darkerShadow);
        button.style.color = '#ffffff';
    });
}

// Funzione per scurire un colore (per le ombre)
function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const newR = Math.max(0, Math.min(255, r + amount));
    const newG = Math.max(0, Math.min(255, g + amount));
    const newB = Math.max(0, Math.min(255, b + amount));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Pausa quando la scheda non è visibile
let wasPausedByVisibility = false;
// Traccia l'inizio pausa per congelare i timer di scudo temporaneo
let pauseStartedAt = null;

// Variabile per la musica segreta
let secretAudio = new Audio('Songs/Secret.mp3');

// Variabili per il punteggio più alto
let highScore = 0;
let highestPhase = 0;

// Sistema Audio
let audioSystem = {
    currentTrack: null,
    nextTrack: null,
    mainTheme: new Audio('Songs/MainTheme.mp3'),
    victorySound: new Audio('Songs/Victory.mp3'),
    lostSound: new Audio('Songs/Lost.mp3'),
    secretTrack: new Audio('Songs/Secret.mp3'),
    levelTracks: {},
    fadeOutDuration: 1000,
    fadeInDuration: 1000,
    musicVolume: Math.pow(0.7, 2.5), // Valore convertito in scala logaritmica
    sfxVolume: Math.pow(0.7, 2.5), // Valore convertito in scala logaritmica
    isTransitioning: false,
    isInGame: false,
    normalPlaybackRate: 1.0,
    acceleratedPlaybackRate: 1.0, // Velocità accelerata della musica
    
    // Effetti sonori
    sfx: {
        aoe: new Audio('SFX/AOE.mp3'),
    hit: new Audio('SFX/Hit.mp3'),
    lost: new Audio('SFX/Lost.mp3'),
    meteor: new Audio('SFX/Meteor.mp3'),
    projectile: new Audio('SFX/Projectile.mp3'),
    shield: new Audio('SFX/Shield.mp3'),
    temporaryShield: new Audio('SFX/TemporaryShield.mp3')
    },

    init() {
        // Inizializza le tracce per ogni livello
        for (let i = 1; i <= 6; i++) {
            this.levelTracks[i] = new Audio(`Songs/Level${i}.mp3`);
            this.levelTracks[i].loop = true; // le tracce dei livelli devono ripetersi
        }
        // Traccia per la modalità infinita (se presente)
        this.infiniteTrack = new Audio('Songs/Infinite.mp3');
        this.infiniteTrack.loop = true;

        // Tema principale
        this.mainTheme.loop = true;
        this.currentTrack = this.mainTheme;
        
        // Traccia segreta
        this.secretTrack.loop = true;
        
        // Non avviare automaticamente il tema principale
        // La musica verrà avviata dopo l'interazione dell'utente
        this.initialized = true;
    },

    async fadeIn(track, duration = this.fadeInDuration) {
        track.volume = 0;
        
        try {
            // Aggiungiamo un flag per indicare che l'utente ha interagito con la pagina
            document.querySelector('body').classList.add('user-interacted');
            await track.play();
            this.isTransitioning = true;
            const startTime = Date.now();
            
            const fade = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const volume = Math.min(elapsed / duration, 1) * this.musicVolume;
                track.volume = volume;
                
                if (elapsed < duration) {
                    requestAnimationFrame(fade);
                } else {
                    track.volume = this.musicVolume;
                    this.isTransitioning = false;
                }
            };
            
            fade();
        } catch (error) {
            console.log('Audio playback failed:', error);
            // Imposta comunque il volume in caso di errore
            track.volume = this.musicVolume;
            this.isTransitioning = false;
        }
    },

    async fadeOut(track, duration = this.fadeOutDuration) {
        const startVolume = track.volume;
        const startTime = Date.now();
        this.isTransitioning = true;
        
        const fade = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const volume = Math.max(startVolume - (startVolume * elapsed / duration), 0);
            track.volume = volume;
            
            if (volume > 0) {
                requestAnimationFrame(fade);
            } else {
                track.pause();
                track.currentTime = 0;
                this.isTransitioning = false;
            }
        };
        
        fade();
    },

    async stopAllTracks() {
        // Ferma tutte le tracce audio e resetta il tempo di riproduzione a 0
        if (this.mainTheme) {
            this.mainTheme.pause();
            this.mainTheme.currentTime = 0;
        }
        if (this.victorySound) {
            this.victorySound.pause();
            this.victorySound.currentTime = 0;
        }
        if (this.lostSound) {
            this.lostSound.pause();
            this.lostSound.currentTime = 0;
        }
        if (this.secretTrack) {
            this.secretTrack.pause();
            this.secretTrack.currentTime = 0;
        }
        if (this.infiniteTrack) {
            this.infiniteTrack.pause();
            this.infiniteTrack.currentTime = 0;
        }
        for (let i = 1; i <= 6; i++) {
            if (this.levelTracks[i]) {
                this.levelTracks[i].pause();
                this.levelTracks[i].currentTime = 0;
            }
        }
        // Resetta il currentTrack
        this.currentTrack = null;
    },

    async transitionTo(newTrack) {
        if (this.isTransitioning) return;
        if (this.currentTrack === newTrack) return;
        
        // Ferma tutte le altre tracce prima di iniziare la nuova
        await this.stopAllTracks();
        
        this.currentTrack = newTrack;
        await this.fadeIn(this.currentTrack);
    },

    playMainTheme() {
        // Verifica se l'utente ha già interagito con la pagina
        // o se la variabile musicStarted è definita e true
        if (document.querySelector('body').classList.contains('user-interacted') || 
            (typeof musicStarted !== 'undefined' && musicStarted)) {
            this.transitionTo(this.mainTheme);
        } else {
            console.log('Tentativo di riproduzione automatica bloccato: richiesta interazione utente');
        }
    },

    playLevelMusic(level) {
        if (this.levelTracks[level]) {
            this.transitionTo(this.levelTracks[level]);
        }
    },

    // Musica per la modalità infinita (fallback a Level1 se mancante)
    playInfiniteMusic() {
        if (this.infiniteTrack && this.infiniteTrack.src) {
            this.transitionTo(this.infiniteTrack);
        } else if (this.levelTracks[1]) {
            this.transitionTo(this.levelTracks[1]);
        }
    },

    playVictory() {
        // Ferma tutte le tracce e riproduci l'effetto di vittoria
        this.stopAllTracks();
        this.victorySound.currentTime = 0;
        // Applica il volume musicale corrente
        this.victorySound.volume = this.musicVolume;
        // Riproduci solo se l'utente ha già interagito con la pagina
        if (this.currentTrack || document.querySelector('body').classList.contains('user-interacted')) {
            this.victorySound.play().catch(e => console.log('Audio playback failed:', e));
        }
    },

    playLost() {
        // Ferma tutte le tracce e riproduci l'effetto di sconfitta
        this.stopAllTracks();
        this.lostSound.currentTime = 0;
        // Applica il volume musicale corrente
        this.lostSound.volume = this.musicVolume;
        // Riproduci solo se l'utente ha già interagito con la pagina
        if (this.currentTrack || document.querySelector('body').classList.contains('user-interacted')) {
            this.lostSound.play().catch(e => console.log('Audio playback failed:', e));
        }
    },
    
    playSecretTrack() {
        this.transitionTo(this.secretTrack);
    },
    
    // Riproduce un effetto sonoro
    playSFX(sfxName) {
        // Riproduci SFX solo se il gioco è in corso e non nei menu
        if (!this.isInGame) return;
        
        // Verifica se l'effetto sonoro esiste
        if (!this.sfx[sfxName]) return;
        
        // Verifica se l'utente ha interagito con la pagina
        if (!document.querySelector('body').classList.contains('user-interacted')) return;
        
        try {
            // Per alcuni effetti sonori, applica variazioni casuali di intonazione
            if (sfxName === 'meteor' || sfxName === 'projectile' || sfxName === 'shield') {
                try {
                    // Metodo alternativo che evita problemi CORS
                    // Clona l'elemento audio per evitare sovrapposizioni
                    const sound = this.sfx[sfxName].cloneNode();
                    // Volume ridotto per i meteoriti, moltiplicato per il volume generale degli effetti
                    const baseVolume = sfxName === 'meteor' ? 0.4 : 0.7;
                    sound.volume = baseVolume * this.sfxVolume;
                    
                    // Genera una variazione casuale del pitch (±15%)
                    const pitchVariation = 0.85 + Math.random() * 0.3; // tra 0.85 e 1.15
                    
                    // Imposta la velocità di riproduzione
                    sound.preservesPitch = false;
                    sound.playbackRate = pitchVariation;
                    
                    // Riproduci il suono
                    sound.play().catch(e => {
                        console.log('Audio playback failed, fallback to standard:', e);
                        // Fallback alla riproduzione standard
                        const baseVolume = sfxName === 'meteor' ? 0.4 : 0.7;
                        this.sfx[sfxName].volume = baseVolume * this.sfxVolume;
                        this.sfx[sfxName].currentTime = 0;
                        this.sfx[sfxName].play().catch(e => console.log('SFX fallback failed:', e));
                    });
                } catch (audioError) {
                    console.log('Advanced audio failed, using standard playback:', audioError);
                    // Fallback alla riproduzione standard
                    const baseVolume = sfxName === 'meteor' ? 0.4 : 0.7;
                    this.sfx[sfxName].volume = baseVolume * this.sfxVolume;
                    this.sfx[sfxName].currentTime = 0;
                    this.sfx[sfxName].play().catch(e => console.log('SFX fallback failed:', e));
                }
            } else {
                // Per gli altri effetti sonori, riproduci normalmente
                this.sfx[sfxName].volume = 0.7 * this.sfxVolume;
                this.sfx[sfxName].currentTime = 0;
                this.sfx[sfxName].play().catch(e => console.log('SFX playback failed:', e));
            }
        } catch (error) {
            console.log('SFX playback error:', error);
        }
    }
};
let currentLevel = 1;
let score = 0;
let progress = 0;
let lastCompletedLevel = 0;
let pizzaTypes = ["Margherita", "Pepperoni", "Super Spaziale", "Quattro Stagioni", "Capricciosa", "Galattica", "Infinita"];
let inputEnabled = false; // input abilitato solo durante il gameplay
let canMove = false; // flag per controllare se il player può muoversi attivamente
let unlockedLevels = 1; // Solo il primo livello è sbloccato all'inizio
let isInfiniteMode = false; // Modalità infinita
let maxBullets = 20; // Numero massimo di proiettili disponibili
let remainingBullets = maxBullets; // Proiettili rimanenti
const unlockSequence = ['u','n','l','o','c','k'];
let unlockIndex = 0;

// Variabili per la sequenza Konami e il dialogo segreto sono definite in secret-dialog.js

// Gestione della sequenza Konami
document.addEventListener('keydown', function(event) {
    // Se il gioco è attivo o c'è un dialogo attivo, non processare la sequenza Konami
    if (dialogSystem && dialogSystem.active) return;
    const mainMenu = document.getElementById('main-menu');
    const isMainMenuVisible = mainMenu && !mainMenu.classList.contains('hidden');
    if (isMainMenuVisible) {
        const k = (event.key || '').toLowerCase();
        if (k === unlockSequence[unlockIndex]) {
            unlockIndex++;
            if (unlockIndex === unlockSequence.length) {
                unlockIndex = 0;
                unlockedLevels = 6;
                updateLevelButtons();
                showUnlockMessage();
            }
        } else {
            unlockIndex = 0;
        }
    }
    
    // Verifica se il tasto premuto corrisponde al prossimo nella sequenza Konami
    if (event.key === konamiSequence[konamiIndex]) {
        konamiIndex++;
        
        // Se la sequenza è completa, attiva il dialogo segreto e la musica segreta
        if (konamiIndex === konamiSequence.length) {
            konamiIndex = 0; // Reset per permettere di inserire nuovamente la sequenza
            activateSecretDialog();
        }
    } else {
        // Reset se viene premuto un tasto sbagliato
        konamiIndex = 0;
    }
});

function showUnlockMessage() {
    let el = document.getElementById('cheat-unlock-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'cheat-unlock-msg';
        el.className = 'cheat-message';
        el.textContent = 'TUTTI I LIVELLI SBLOCCATI!';
        document.body.appendChild(el);
    }
    el.style.display = '';
    el.classList.add('fade-in');
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// Sistema di animazioni e fade-in
let animationState = 'none'; // 'takeoff', 'landing', 'game', 'none', 'fade-in'
let animationProgress = 0; // 0-1 per il progresso dell'animazione
let animationStartTime = 0;
let fadeInProgress = 0; // 0-1 per il fade-in iniziale
let gameStarted = false;
// Stato esplosione navicella per sequenza game over ritardata
let shipExplosionState = { active: false, start: 0, duration: 1100, x: 0, y: 0, r: 0, maxR: 260 };
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
    shipW: 16,
    shipH: 35,
    shipRot: 0
};

// Sistema di particelle con object pooling
let particles = [];
let particlePool = []; // Pool per riutilizzare le particelle

// Timeout per spawn ritardato dei meteoriti dopo il decollo
let meteorSpawnTimeout = null;
let meteorSpawnPaused = false;
let playerHasMoved = false;

// Funzioni per controllare lo spawn dei meteoriti e lo stato del player
function pauseMeteorSpawn() {
    meteorSpawnPaused = true;
    if (meteorSpawnTimeout) {
        clearTimeout(meteorSpawnTimeout);
        meteorSpawnTimeout = null;
    }
}

function resumeMeteorSpawn() {
    console.log("DEBUG - resumeMeteorSpawn chiamata");
    meteorSpawnPaused = false;
    // Abilita esplicitamente il movimento del giocatore
    enablePlayerMovement();
    console.log("DEBUG - Stato dopo resumeMeteorSpawn: meteorSpawnPaused =", meteorSpawnPaused, "canMove =", canMove);
}

// Sistema di eventi per gestire le transizioni di stato del player
function enablePlayerMovement() {
    console.log("DEBUG - enablePlayerMovement chiamata");
    canMove = true;
    inputEnabled = true;
    // Inizia a riempire la barra di progresso quando il movimento è abilitato
    resumeProgressFill();
    console.log("DEBUG - Movimento abilitato: canMove =", canMove, "inputEnabled =", inputEnabled);
}

function disablePlayerMovement() {
    console.log("DEBUG - disablePlayerMovement chiamata");
    canMove = false;
    // Non disabilitiamo inputEnabled per permettere altre azioni come sparare
    console.log("DEBUG - Movimento disabilitato: canMove =", canMove, "inputEnabled =", inputEnabled);
}

// Power-up e gestione spawn
let powerups = []; // {x,y,type,vy,rot}
let gameStartTime = 0;
let levelShieldSpawned = false; // scudo singolo per livello (modalità livelli)
let phaseShieldSpawned = false; // scudo singolo per fase (modalità infinita)
let lastAmmoSpawn = 0;
let lastTimedShieldSpawn = 0;

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
    width: 16,
    height: 35,
    maxSpeed: 6, // Velocità massima
    acceleration: 0.3, // Accelerazione
    friction: 0.85, // Attrito per decelerazione
    velocityX: 0, // Velocità attuale X
    velocityY: 0, // Velocità attuale Y
    bullets: [],
    canShoot: false,
    rotation: 0, // Rotazione dell'astronave per effetto di inclinazione
    thrusterActive: false, // Stato del propulsore
    // Nuove proprietà
    shockwaves: [], // onde d'urto (burst)
    lastShockwave: 0,
    shieldUntil: 0, // timestamp ms per scudo temporaneo
    permanentShields: 0, // numero di scudi permanenti (max 10)
    shieldGlow: 0, // intensità bagliore scudo
    pickupAnimUntil: 0, // timestamp ms per breve animazione pickup
    // Dash properties
    dashActive: false,
    dashEndTime: 0
};

// Restituisce l'hitbox effettiva della navicella (ridotta rispetto al rendering)
function getShipHitbox() {
    // Riduciamo l'hitbox per rendere il gameplay pi meno punitivo
        const w = spaceship.width || 30; // Adjusted width for hitbox
        const h = spaceship.height || 40; // Height remains the same
    const shrinkW = 0.35; // 35% della larghezza (dimezzata rispetto al 70% precedente)
    const shrinkH = 0.375; // 37.5% dell'altezza (dimezzata rispetto al 75% precedente)
    const offsetX = (w - w * shrinkW) / 2;
    const offsetY = (h - h * shrinkH) / 2;
    return {
        x: spaceship.x + offsetX,
        y: spaceship.y + offsetY,
        width: Math.max(4, Math.round(w * shrinkW)),
        height: Math.max(4, Math.round(h * shrinkH))
    };
}

let meteorites = [];
// Navicelle nemiche indistruttibili (passano sempre per il centro come ostacoli)
let enemyShips = [];
let enemyNextSpawn = Date.now() + 8000; // primo spawn a 8s
const enemySpawnIntervalRange = { min: 8000, max: 18000 };

// Spawn di una navicella nemica: parte fuori schermo da un bordo e punta al bordo opposto
function spawnEnemyShip() {
    // Spawn from a random side and pass through the entire window area
    const margin = 120; // how far off-screen to spawn/exit
    const edges = ['left', 'right', 'top', 'bottom'];
    const edge = edges[Math.floor(Math.random() * edges.length)];

    // Get window dimensions for full-window movement
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Choose any random pass-through point in the window (no center bias)
    const passX = windowWidth * Math.random(); 
    const passY = windowHeight * Math.random();

    let sx = 0, sy = 0; // start
    let tx = 0, ty = 0; // target (on opposite side)

    if (edge === 'left') {
        sx = -margin;
        sy = Math.random() * windowHeight;
        // Ray from start through passPoint -> find intersection with right boundary
        const dirX = passX - sx;
        const dirY = passY - sy;
        const t = (windowWidth + margin - sx) / (dirX || 0.00001);
        tx = windowWidth + margin;
        ty = sy + dirY * t;
    } else if (edge === 'right') {
        sx = windowWidth + margin;
        sy = Math.random() * windowHeight;
        const dirX = passX - sx;
        const dirY = passY - sy;
        const t = (-margin - sx) / (dirX || 0.00001);
        tx = -margin;
        ty = sy + dirY * t;
    } else if (edge === 'top') {
        sx = Math.random() * windowWidth;
        sy = -margin;
        const dirX = passX - sx;
        const dirY = passY - sy;
        const t = (windowHeight + margin - sy) / (dirY || 0.00001);
        tx = sx + dirX * t;
        ty = windowHeight + margin;
    } else { // bottom
        sx = Math.random() * windowWidth;
        sy = windowHeight + margin;
        const dirX = passX - sx;
        const dirY = passY - sy;
        const t = (-margin - sy) / (dirY || 0.00001);
        tx = sx + dirX * t;
        ty = -margin;
    }

    // compute velocity towards target with slower speed
    const baseSpeed = (spaceship.maxSpeed || 6) * (0.8 + Math.random() * 0.4); // Further reduced speed
    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.hypot(dx, dy) || 1;
    const vx = (dx / dist) * baseSpeed;
    const vy = (dy / dist) * baseSpeed;

    const ship = {
        x: sx,
        y: sy,
        width: 64,
        height: 40,
        vx: vx * 0.3, // Start at 30% speed
        vy: vy * 0.3, // Start at 30% speed
        targetVx: vx, // Target velocity
        targetVy: vy, // Target velocity
        targetX: tx,
        targetY: ty,
        created: Date.now(),
        lastHit: 0 // Add hit cooldown to prevent multiple hits
    };

    enemyShips.push(ship);
}

// Aggiorna le navicelle nemiche: si muovono sempre in linea retta dal lato di spawn
// al lato opposto passando per un punto interno alla schermata.
function updateEnemyShips() {
    const speedFactor = getSpeedFactor();
    for (let i = enemyShips.length - 1; i >= 0; i--) {
        const e = enemyShips[i];
        
        // Gradually accelerate to target velocity
        const acceleration = 0.015; // Slow acceleration
        e.vx += (e.targetVx - e.vx) * acceleration;
        e.vy += (e.targetVy - e.vy) * acceleration;
        
        // Update position with current velocity
        e.x += e.vx * speedFactor;
        e.y += e.vy * speedFactor;

        // Rimosse particelle di spinta delle navicelle nemiche

        // rimuovi quando passa abbondantemente oltre il lato opposto o raggiunge il target
        const offLeft = e.x < - (e.width + 160);
        const offRight = e.x > canvas.width + (e.width + 160);
        const offTop = e.y < - (e.height + 160);
        const offBottom = e.y > canvas.height + (e.height + 160);
        const reachedTarget = Math.hypot(e.x - e.targetX, e.y - e.targetY) < 48;
        if (offLeft || offRight || offTop || offBottom || reachedTarget) {
            enemyShips.splice(i, 1);
        }
    }
}

// Disegna le navicelle nemiche (semplice forma + fiamma)
function drawEnemyShips() {
    for (const e of enemyShips) {
        ctx.save();
        // compute angle for orientation based on velocity
        const angle = Math.atan2(e.vy, e.vx) + Math.PI + (270 * Math.PI / 180); // Add PI to rotate 180 degrees + 270 degrees as requested
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;

        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // draw image if available
        if (images.enemyShip && images.enemyShip.complete && !images.enemyShip._failed && images.enemyShip.naturalWidth > 0) {
            // Invertiamo larghezza e altezza per correggere l'orientamento dell'immagine
            // L'immagine originale è verticale, quindi la disegniamo con altezza e larghezza scambiate
            ctx.drawImage(images.enemyShip, -e.height/2, -e.width/2, e.height, e.width);
        } else {
            // fallback: simple body + cockpit
            ctx.fillStyle = '#aa0000';
            ctx.strokeStyle = '#ff6666';
            ctx.lineWidth = 2;
            roundRect(ctx, -e.width/2, -e.height/2, e.width, e.height, 6, true, true);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(-e.width*0.1, -e.height*0.25, e.width*0.2, e.height*0.5);
        }

        // Fiamma/thruster nemico rimossi

        ctx.restore();
    }
}

// helper: draw rounded rect
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
    if (typeof stroke === 'undefined') stroke = true;
    if (typeof fill === 'undefined') fill = true;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}
let gameKeys = {
    left: false,
    right: false,
    up: false,
    down: false,
    space: false,
    b: false, // burst
    p: false,
    o: false // shockwave
};

// Responsive scale used to adapt sizes on small screens
let responsiveScale = 1;
let meteoriteSizeMultiplier = 1;

function updateResponsiveScale() {
    const w = window.innerWidth;
    if (w <= 420) {
        responsiveScale = 0.6;
    } else if (w <= 768) {
        responsiveScale = 0.8;
    } else {
        responsiveScale = 1;
    }
    meteoriteSizeMultiplier = responsiveScale;
    // Apply to spaceship if currently placed
    if (typeof spaceship !== 'undefined') {
        // Match sizes used in startGame (base 30x20)
        spaceship.width = Math.max(12, Math.round(30 * responsiveScale));
        spaceship.height = Math.max(12, Math.round(20 * responsiveScale));
        spaceship.maxSpeed = Math.max(3, 6 * responsiveScale);
    }
}

// Update on resize
window.addEventListener('resize', () => {
    updateResponsiveScale();
});

function clearGameKeys() {
    gameKeys.left = false;
    gameKeys.right = false;
    gameKeys.up = false;
    gameKeys.down = false;
    gameKeys.space = false;
    gameKeys.b = false;
    gameKeys.p = false;
    gameKeys.o = false;
}

// Variabili per gestire il ridimensionamento del canvas
let baseCanvasWidth = 800;
let baseCanvasHeight = 600;
let canvasScaleFactor = 1;

// Funzione per salvare il punteggio più alto
function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    
    if (infinitePhase > highestPhase) {
        highestPhase = infinitePhase;
        localStorage.setItem('highestPhase', highestPhase);
    }
    
    // Aggiorna la visualizzazione nel menu principale
    updateHighScoreDisplay();
}

// Funzione per caricare il punteggio più alto
function loadHighScore() {
    const savedHighScore = localStorage.getItem('highScore');
    const savedHighestPhase = localStorage.getItem('highestPhase');
    
    if (savedHighScore !== null) {
        highScore = parseInt(savedHighScore);
    }
    
    if (savedHighestPhase !== null) {
        highestPhase = parseInt(savedHighestPhase);
    }
    
    // Aggiorna i valori nel menu principale
    updateHighScoreDisplay();
}

// Funzione per aggiornare la visualizzazione del punteggio più alto nel menu principale
function updateHighScoreDisplay() {
    const highScoreElement = document.getElementById('high-score');
    const highestPhaseElement = document.getElementById('highest-phase');
    
    if (highScoreElement) {
        highScoreElement.textContent = highScore;
    }
    
    if (highestPhaseElement) {
        highestPhaseElement.textContent = highestPhase + 1;
    }
}

// Inizializzazione al caricamento della pagina
document.addEventListener('DOMContentLoaded', function() {
    // Inizializza il sistema audio
    audioSystem.init();
    // Carica il punteggio più alto
    loadHighScore();
    // Non avviare automaticamente la musica, aspetta l'interazione dell'utente
    audioSystem.stopAllTracks();
    
    // Applica colori casuali a tutti i bottoni
    applyRandomColorsToButtons();
    
    // Gestione della schermata di benvenuto
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainMenu = document.getElementById('main-menu');
    const header = document.querySelector('header');
    const startButton = document.getElementById('start-game');
    const playerNameInput = document.getElementById('player-name');
    
    // Quando l'utente preme il bottone "sono pronto"
    startButton.addEventListener('click', function() {
        // Ottieni il nome del giocatore o usa "Bobo" come default
        let playerName = playerNameInput.value.trim();
        if (!playerName) {
            playerName = "Bobo";
        }
        
        // Salva il nome del giocatore
        localStorage.setItem('playerName', playerName);
        
        // Crea un overlay per il fade-out/fade-in
        const fadeOverlay = document.createElement('div');
        fadeOverlay.style.position = 'fixed';
        fadeOverlay.style.top = '0';
        fadeOverlay.style.left = '0';
        fadeOverlay.style.width = '100%';
        fadeOverlay.style.height = '100%';
        fadeOverlay.style.backgroundColor = 'black';
        fadeOverlay.style.opacity = '0';
        fadeOverlay.style.transition = 'opacity 0.5s ease-in-out';
        fadeOverlay.style.zIndex = '9999';
        document.body.appendChild(fadeOverlay);
        
        // Avvia la musica direttamente
        document.querySelector('body').classList.add('user-interacted');
        musicStarted = true;
        
        try {
            // Ferma qualsiasi altra traccia
            audioSystem.stopAllTracks();
            
            // Imposta il volume a 0 per il fade-in
            audioSystem.mainTheme.volume = 0;
            
            // Riproduci direttamente
            audioSystem.mainTheme.play()
                .then(() => {
                    console.log('Musica avviata con successo al click su "Sono pronto"');
                    audioSystem.currentTrack = audioSystem.mainTheme;
                })
                .catch(error => {
                    console.error('Errore nella riproduzione:', error);
                });
        } catch (error) {
            console.error('Errore nella riproduzione forzata:', error);
        }
        
        // Esegui il fade-out
        fadeOverlay.style.opacity = '1';
        
        // Dopo il fade-out, cambia schermata e avvia il fade-in
        setTimeout(() => {
            // Nascondi la schermata di benvenuto
            welcomeScreen.style.display = 'none';
            
            // Mostra l'header e il menu principale
            header.classList.remove('hidden');
            mainMenu.classList.remove('hidden');
            
            // Esegui il fade-in dello schermo
            fadeOverlay.style.opacity = '0';
            
            // Esegui il fade-in della musica
            let volume = 0;
            const fadeInterval = setInterval(() => {
                volume += 0.05;
                if (volume >= 1) {
                    audioSystem.mainTheme.volume = 1;
                    clearInterval(fadeInterval);
                    
                    // Rimuovi l'overlay dopo il fade-in
                    setTimeout(() => {
                        document.body.removeChild(fadeOverlay);
                    }, 500);
                } else {
                    audioSystem.mainTheme.volume = volume;
                }
            }, 50);
        }, 500); // Attendi 500ms per il fade-out prima di cambiare schermata
     });
    
    // Inizializza gli slider del volume
    const musicVolumeSlider = document.getElementById('music-volume');
    const sfxVolumeSlider = document.getElementById('sfx-volume');
    
    // Imposta i valori iniziali degli slider (convertendo da logaritmico a lineare)
    musicVolumeSlider.value = convertToLinearValue(audioSystem.musicVolume);
    sfxVolumeSlider.value = convertToLinearValue(audioSystem.sfxVolume);
    
    // Funzione per convertire il valore dello slider in una scala logaritmica per il volume
    function convertToLogarithmicVolume(value) {
        // Usa una curva esponenziale per rendere le variazioni più percettibili
        // Questo dà più precisione ai livelli bassi di volume
        return value <= 0 ? 0 : Math.pow(value, 2.5);
    }
    
    // Funzione per convertire il volume logaritmico in valore lineare per lo slider
    function convertToLinearValue(volume) {
        // Inverso della funzione precedente
        return volume <= 0 ? 0 : Math.pow(volume, 1/2.5);
    }
    
    // Gestisci i cambiamenti del volume della musica
    musicVolumeSlider.addEventListener('input', function() {
        const linearValue = parseFloat(this.value);
        audioSystem.musicVolume = convertToLogarithmicVolume(linearValue);
        
        // Aggiorna il volume della traccia corrente se esiste
        if (audioSystem.currentTrack) {
            audioSystem.currentTrack.volume = audioSystem.musicVolume;
        }
    });
    
    // Gestisci i cambiamenti del volume degli effetti sonori
    sfxVolumeSlider.addEventListener('input', function() {
        const linearValue = parseFloat(this.value);
        audioSystem.sfxVolume = convertToLogarithmicVolume(linearValue);
    });
    
    // Elementi DOM
    // mainMenu è già stato dichiarato sopra
    const gameArea = document.getElementById('game-area');
    const documentation = document.getElementById('documentation');
    const credits = document.getElementById('credits');
    const gameOver = document.getElementById('game-over');
    const levelComplete = document.getElementById('level-complete');
    
    // Bottoni menu
    const btnDocs = document.getElementById('btn-docs');
    const btnPlay = document.getElementById('btn-play');
    const btnCredits = document.getElementById('btn-credits');

    // Difficoltà UI
    const diffEasy = document.getElementById('difficulty-easy');
    const diffNormal = document.getElementById('difficulty-normal');
    const diffHard = document.getElementById('difficulty-hard');
    const diffTooltip = document.getElementById('difficulty-tooltip');
    const diffDetails = document.getElementById('difficulty-details');
    function setDifficulty(d) {
        currentDifficulty = d;
        document.querySelectorAll('.difficulty-button').forEach(b => b.classList.remove('selected'));
        const id = d === 'easy' ? 'difficulty-easy' : d === 'hard' ? 'difficulty-hard' : 'difficulty-normal';
        const el = document.getElementById(id);
        if (el) el.classList.add('selected');
        updateDifficultyDetails(d);
    }
    function showTooltip(text) { if (diffTooltip) diffTooltip.textContent = text || ''; }
    function updateDifficultyDetails(d) {
        if (!diffDetails) return;
        const cfg = difficultyConfig[d];
        const meteorTxt = cfg.meteoriteSpawnMultiplier > 1 ? '+50% meteoriti' : 'Meteoriti standard';
        const progressTxt = `Progresso per meteorite: ${cfg.meteoriteProgressBonus}%`;
        const enemyTxt = cfg.enemySpawnIntervalMultiplier > 1 ? 'Spawn nemici -50%' : 'Spawn nemici standard';
        diffDetails.innerHTML = `<div class="diff-line">${meteorTxt}</div><div class="diff-line">${progressTxt}</div><div class="diff-line">${enemyTxt}</div>`;
    }
    const tipEasy = 'Facile: +2% progresso, nemici -50%';
    const tipNormal = 'Normale: +1% progresso';
    const tipHard = 'Difficile: +50% meteoriti, 0% progresso';
    if (diffEasy && diffNormal && diffHard) {
        diffEasy.addEventListener('click', () => setDifficulty('easy'));
        diffNormal.addEventListener('click', () => setDifficulty('normal'));
        diffHard.addEventListener('click', () => setDifficulty('hard'));
        diffEasy.addEventListener('mouseenter', () => showTooltip(tipEasy));
        diffNormal.addEventListener('mouseenter', () => showTooltip(tipNormal));
        diffHard.addEventListener('mouseenter', () => showTooltip(tipHard));
        [diffEasy, diffNormal, diffHard].forEach(b => b && b.addEventListener('mouseleave', () => showTooltip('')));
        setDifficulty(currentDifficulty);
    }
    
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
    
    // Funzione per ridimensionare il canvas in base alle dimensioni della finestra
    function resizeGameCanvas() {
        const container = document.querySelector('.game-container');
        if (!container) return;
        
        // Calcola la larghezza disponibile
        const windowWidth = window.innerWidth;
        const availableHeight = window.innerHeight * 0.8; // 80vh
        
        // Limita il canvas a 2/3 della larghezza dello schermo
        const targetWidth = Math.min(windowWidth * 0.66, baseCanvasWidth);
        
        // Calcola il fattore di scala mantenendo le proporzioni
        const widthScale = targetWidth / baseCanvasWidth;
        const heightScale = availableHeight / baseCanvasHeight;
        canvasScaleFactor = Math.min(widthScale, heightScale);
        
        // Imposta le nuove dimensioni del canvas
        canvas.width = Math.round(baseCanvasWidth * canvasScaleFactor);
        canvas.height = Math.round(baseCanvasHeight * canvasScaleFactor);
        
        // Centra il canvas nella game-container
        canvas.style.margin = '0 auto';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.width = '100%';
        container.style.paddingRight = '0'; // Rimuovi il padding-right
    }
    
    // Ridimensiona il canvas all'avvio e quando la finestra cambia dimensione
    resizeGameCanvas();
    window.addEventListener('resize', resizeGameCanvas);
    
    // Funzione per creare particelle sui bottoni
    function createButtonParticles(button, color) {
        // Genera particelle solo se si è in partita, non in pausa e la scheda è visibile
        if (document.hidden || !gameActive || (typeof isPaused !== 'undefined' && isPaused) || animationState !== 'game') {
            return;
        }
        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        // Particelle in-game
        if (!document.hidden && gameActive && animationState === 'game') {
            for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 30 + 20;
                const particle = createParticle(
                    x + Math.cos(angle) * distance,
                    y + Math.sin(angle) * distance,
                    { x: Math.cos(angle) * 0.5, y: Math.sin(angle) * 0.5 },
                    'explosion'
                );
                if (particle) {
                    particle.color = color;
                    particle.size = Math.random() * 3 + 2;
                    particle.life = Math.random() * 20 + 10;
                    particles.push(particle);
                }
            }
        }
    }

    // Event listeners per i bottoni del menu con effetti particellari
    btnDocs.addEventListener('click', function() {
    createButtonParticles(btnDocs, '#6b5ff2');
        setTimeout(() => {
            hideAllSections();
            showSection('documentation');
        }, 200);
    });
    
    btnPlay.addEventListener('click', function() {
    createButtonParticles(btnPlay, '#8f79f5');
        setTimeout(() => {
            hideAllSections();
            showSection('level-select');
            updateLevelButtons();
        }, 200);
    });
    
    // Aggiungi effetto hover con particelle
    btnDocs.addEventListener('mouseenter', () => createButtonParticles(btnDocs, '#6b5ff2'));
    btnPlay.addEventListener('mouseenter', () => createButtonParticles(btnPlay, '#8f79f5'));
    
    // Event listeners per i livelli
    for (let i = 1; i <= 6; i++) {
        document.getElementById('level-' + i).addEventListener('click', function() {
            if (i <= unlockedLevels) {
                hideAllSections();
                showSection('game-area');
                currentLevel = i;
                isInfiniteMode = false;
                // Ferma tutte le tracce e avvia la musica del livello selezionato dal principio
                audioSystem.stopAllTracks();
                audioSystem.playLevelMusic(currentLevel);
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
        // Ferma tutte le tracce e avvia la musica della modalità infinita dal principio
        audioSystem.stopAllTracks();
        audioSystem.playInfiniteMusic();
        startGame();
    });
    
    btnCredits.addEventListener('click', function() {
    createButtonParticles(btnCredits, '#ff66a3');
        setTimeout(() => {
            hideAllSections();
            showSection('credits');
        }, 200);
    });
    
    // Aggiungi effetto hover con particelle
    btnCredits.addEventListener('mouseenter', () => createButtonParticles(btnCredits, '#ff66a3'));
    
    // Event listeners per i bottoni di navigazione
    backFromDocs.addEventListener('click', backToMenu);
    backFromCredits.addEventListener('click', backToMenu);
    backFromGameover.addEventListener('click', backToMenu);
    document.getElementById('back-from-levels').addEventListener('click', backToMenu);
    restartBtn.addEventListener('click', function() {
        hideAllSections();
        showSection('game-area');
        // Ferma tutte le tracce e avvia la musica corretta per la modalità corrente
        audioSystem.stopAllTracks();
        if (isInfiniteMode) {
            audioSystem.playInfiniteMusic();
        } else {
            audioSystem.playLevelMusic(currentLevel);
        }
        // Forza il messaggio corrente a 2/2 e bloccalo, così ripartiamo puliti
        if (window.dialogSystem && typeof dialogSystem.skipToLastAndBlock === 'function') {
            dialogSystem.skipToLastAndBlock();
        }
        startGame();
    });
    
    // Event listeners per la schermata di livello completato
    nextLevelBtn.addEventListener('click', function() {
        hideAllSections();
        showSection('game-area');
        // Ferma tutte le tracce e avvia la musica corretta per la modalità corrente
        // L'utente ha già interagito con la pagina a questo punto
        audioSystem.stopAllTracks();
        if (isInfiniteMode) {
            audioSystem.playInfiniteMusic();
        } else {
            audioSystem.playLevelMusic(currentLevel);
        }
        startGame();
    });
    
    backToLevelsBtn.addEventListener('click', function() {
        hideAllSections();
        showSection('level-select');
        updateLevelButtons();
        
        // Ferma la musica di vittoria e riproduci la musica del menu
        audioSystem.stopAllTracks();
        audioSystem.playMainTheme();
    });
    
    // Event listeners per i controlli di gioco
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Inizializza i controlli touch (se presenti) per dispositivi mobili
    try { setupTouchControls(); } catch(e) { /* fail silently if DOM not ready */ }

    // Pausa automatica quando la scheda cambia visibilità
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Metti il gioco in pausa se attivo e non già in pausa
            if (gameActive && !isPaused) {
                togglePause();
                wasPausedByVisibility = true;
            }
            // Pausa la traccia audio corrente
            if (audioSystem.currentTrack && !audioSystem.currentTrack.paused) {
                try { audioSystem.currentTrack.pause(); } catch (e) {}
                audioSystem._pausedByVisibility = true;
            }
        } else {
            // Restare in pausa finché l'utente non riprende manualmente
            wasPausedByVisibility = false;
            // Riprendi la musica dal punto in cui era stata fermata (se fermata per visibilità)
            if (audioSystem._pausedByVisibility && audioSystem.currentTrack && audioSystem.currentTrack.paused) {
                try { audioSystem.currentTrack.play(); } catch (e) {}
                audioSystem._pausedByVisibility = false;
            }
            // Non ripartire la musica automaticamente; verrà ripresa su resume se necessario
        }
    });
    
    // Variabile per tenere traccia se la musica è già stata avviata
    let musicStarted = false;
    
        // Carica le immagini
    loadImages();
    // Attiva da subito il parallax del background alla partenza del sito
    enableMenuParallax();
        // Init UI overlay (particles for hover/click/ambient)
        initUIOverlay();
});

    /* UI overlay particle system (ambient stars + hover-fall + click-explode)
       Uses its own overlay canvas placed on top of the page; lightweight and decoupled
    */
    let uiCanvas, uiCtx, uiParticles = [], uiParticlePool = [];
    let uiAnimationId = null;

    function initUIOverlay() {
        // Create overlay canvas
        uiCanvas = document.createElement('canvas');
        uiCanvas.id = 'ui-overlay-canvas';
        uiCanvas.style.position = 'fixed';
        uiCanvas.style.left = '0';
        uiCanvas.style.top = '0';
        uiCanvas.style.pointerEvents = 'none';
        uiCanvas.style.zIndex = '9999';
        uiCanvas.width = window.innerWidth;
        uiCanvas.height = window.innerHeight;
        document.body.appendChild(uiCanvas);
        uiCtx = uiCanvas.getContext('2d');

        // Resize handler
        window.addEventListener('resize', () => {
            uiCanvas.width = window.innerWidth;
            uiCanvas.height = window.innerHeight;
        });

        // Ambient spawn (extremely high frequency)
        setInterval(() => {
            // spawn 10-20 ambient particles randomly across screen (aumentato significativamente da 4-9)
            const count = 10 + Math.floor(Math.random() * 11);
            for (let i = 0; i < count; i++) {
                spawnUIParticle(Math.random() * uiCanvas.width, Math.random() * uiCanvas.height, 'ambient');
            }
        }, 250); // Diminuito ulteriormente l'intervallo da 400ms a 250ms

        // Hook pointer events for hover/click (menu buttons will trigger their own via createButtonParticles)
        window.addEventListener('mousemove', (ev) => {
            // Spawn moltissime particelle al movimento del mouse
            if (Math.random() < 0.5) { // Aumentato ulteriormente da 0.25 a 0.5 (il doppio)
                const rect = document.body.getBoundingClientRect();
                const x = ev.clientX;
                const y = ev.clientY;
                // Genera più particelle per ogni evento di movimento
                for (let i = 0; i < 2; i++) { // Genera 2 particelle invece di 1
                    spawnUIParticle(x + (Math.random()-0.5)*12, y + 6 + Math.random()*8, 'hover');
                }
            }
        });

        window.addEventListener('click', (ev) => {
            // Click explosion at pointer - ancora più spettacolare
            const x = ev.clientX;
            const y = ev.clientY;
            for (let i = 0; i < 40; i++) { // Aumentato ulteriormente da 25 a 40
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 4; // Velocità aumentata
                const p = spawnUIParticle(x, y, 'click');
                if (p) {
                    p.direction = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
                    p.size = 2.5 + Math.random() * 4; // Dimensioni aumentate
                    p.life = 35 + Math.random() * 25; // Durata aumentata
                    // Più variazione di colori
                    p.color = (Math.random() < 0.33) ? '#8f79f5' : 
                              (Math.random() < 0.5) ? '#ff66a3' : 
                              (Math.random() < 0.5) ? '#66ffcc' : '#ffcc33';
                }
            }
        });

        // Start overlay loop
        function uiLoop() {
            updateUIParticles();
            drawUIParticles();
            uiAnimationId = requestAnimationFrame(uiLoop);
        }
        uiLoop();
    }

    function spawnUIParticle(x, y, kind = 'ambient') {
        let p = uiParticlePool.length > 0 ? uiParticlePool.pop() : {};
        p.x = x; p.y = y; p.kind = kind;
        if (kind === 'ambient') {
            p.size = 1.0 + Math.random() * 2.2; // Dimensioni aumentate
            p.direction = { x: (Math.random()-0.5) * 0.4, y: 0.3 + Math.random() * 0.8 }; // Movimento più evidente
            p.life = 100 + Math.random() * 120; // Durata aumentata
            // Colori più vari e luminosi
            if (Math.random() < 0.7) {
                p.color = 'rgba(255,255,255,' + (0.1 + Math.random()*0.4) + ')';
            } else if (Math.random() < 0.5) {
                p.color = 'rgba(180,180,255,' + (0.1 + Math.random()*0.3) + ')';
            } else if (Math.random() < 0.5) {
                p.color = 'rgba(255,220,180,' + (0.1 + Math.random()*0.3) + ')';
            } else {
                p.color = 'rgba(180,255,220,' + (0.1 + Math.random()*0.3) + ')';
            }
        } else if (kind === 'hover') {
            p.size = 1 + Math.random() * 2;
            p.direction = { x: (Math.random()-0.5) * 0.6, y: 0.6 + Math.random() * 1.2 };
            p.life = 28 + Math.random() * 18;
            p.color = Math.random() < 0.6 ? '#6b5ff2' : '#8f79f5';
        } else if (kind === 'click') {
            p.size = 2 + Math.random() * 3;
            p.direction = p.direction || { x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2 };
            p.life = 24 + Math.random() * 24;
            p.color = Math.random() < 0.6 ? '#8f79f5' : '#ff66a3';
        }
        uiParticles.push(p);
        return p;
    }

    function updateUIParticles() {
        for (let i = uiParticles.length - 1; i >= 0; i--) {
            const p = uiParticles[i];
            p.x += p.direction.x;
            p.y += p.direction.y;
            p.life--;
            p.size *= 0.985;
            if (p.life <= 0 || p.size < 0.3 || p.y > uiCanvas.height + 50 || p.x < -50 || p.x > uiCanvas.width + 50) {
                uiParticlePool.push(p);
                uiParticles.splice(i, 1);
            }
        }
    }

    function drawUIParticles() {
        if (!uiCtx) return;
        uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
        uiCtx.save();
        uiParticles.forEach(p => {
            uiCtx.globalCompositeOperation = 'lighter';
            uiCtx.beginPath();
            uiCtx.fillStyle = p.color || '#fff';
            uiCtx.globalAlpha = Math.max(0.05, Math.min(1, p.life / 80));
            uiCtx.arc(p.x, p.y, Math.max(0.3, p.size), 0, Math.PI*2);
            uiCtx.fill();
            // small glow
            uiCtx.globalAlpha = 0.12 * (p.life / 80);
            uiCtx.fillStyle = p.color || '#fff';
            uiCtx.beginPath();
            uiCtx.arc(p.x, p.y, Math.max(2, p.size * 3), 0, Math.PI*2);
            uiCtx.fill();
        });
        uiCtx.restore();
    }

// Parallax background per tutte le schermate (segue il mouse)
let _menuParallaxHandler = null;
let lastBackgroundPosition = { x: 0, y: 0 }; // Memorizza l'ultima posizione

function enableMenuParallax() {
    if (_menuParallaxHandler) return;
    const strength = 60; // pixel massimo di offset più ampio
    document.body.style.backgroundSize = '120%';
    
    // Imposta la posizione iniziale se esiste una posizione precedente
    if (lastBackgroundPosition.x !== 0 || lastBackgroundPosition.y !== 0) {
        document.body.style.backgroundPosition = `calc(50% + ${lastBackgroundPosition.x}px) calc(50% + ${lastBackgroundPosition.y}px)`;
    }
    
    _menuParallaxHandler = (ev) => {
        const rect = document.body.getBoundingClientRect();
        const mx = ev.clientX / rect.width - 0.5;
        const my = ev.clientY / rect.height - 0.5;
        const x = Math.round(mx * strength);
        const y = Math.round(my * strength);
        
        // Salva l'ultima posizione
        lastBackgroundPosition = { x, y };
        document.body.style.backgroundPosition = `calc(50% + ${x}px) calc(50% + ${y}px)`;
    };
    window.addEventListener('mousemove', _menuParallaxHandler);
}
function disableMenuParallax() {
    if (_menuParallaxHandler) {
        window.removeEventListener('mousemove', _menuParallaxHandler);
        _menuParallaxHandler = null;
    }
}

// Power-up helpers
function spawnPowerup(type) {
    const x = Math.random() * (canvas.width - 24);
    const y = -30;
    powerups.push({ x, y, vy: 2 + Math.random()*1.5, rot: 0, type });
}

function handlePowerupSpawning() {
    const now = Date.now();
    // A) Ammo +10: solo modalità infinita, ogni ~7-10s probabilità
    if (isInfiniteMode && now - lastAmmoSpawn > 7000) {
        if (Math.random() < 0.5) {
            spawnPowerup('ammo');
        }
        lastAmmoSpawn = now;
    }
    // B) Scudo 5s: da livello 3 (normale) e in infinita ogni ~12-18s
    if ((isInfiniteMode || currentLevel >= 3) && now - lastTimedShieldSpawn > 12000) {
        if (Math.random() < (isInfiniteMode ? 0.5 : 0.35)) {
            spawnPowerup('shield_timed');
        }
        lastTimedShieldSpawn = now;
    }
    // C) Scudo singolo: una volta per livello/fase
    if (!isInfiniteMode) {
        if (currentLevel >= 4 && !levelShieldSpawned && now - gameStartTime > 5000) {
            spawnPowerup('shield_once');
            levelShieldSpawned = true;
        }
    } else {
        if (!phaseShieldSpawned && progress > 5) { // poco dopo l'inizio fase
            spawnPowerup('shield_once');
            phaseShieldSpawned = true;
        }
    }
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.y += p.vy * getSpeedFactor();
        p.rot += 0.05;
        if (p.y > canvas.height + 30) {
                powerups.splice(i, 1); // Remove powerup if it goes off screen
        }
    }
}

function checkPowerupCollisions() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        const px = p.x;
        const py = p.y;
        const shipBox = getShipHitbox();
        if (
            shipBox.x < px + 24 &&
            shipBox.x + shipBox.width > px &&
            shipBox.y < py + 24 &&
            shipBox.y + shipBox.height > py
        ) {
            // pickup effect
            spaceship.pickupAnimUntil = Date.now() + 200;
            if (p.type === 'ammo') {
                remainingBullets += 10;
            } else if (p.type === 'shield_timed') {
                spaceship.shieldUntil = Date.now() + 5000; // 5 secondi
                // Riproduci effetto sonoro scudo temporaneo
                audioSystem.playSFX('temporaryShield');
            } else if (p.type === 'shield_once') {
                if (spaceship.permanentShields < 10) { // Massimo 10 scudi permanenti
                    spaceship.permanentShields++;
                    // Riproduci effetto sonoro scudo permanente
                    audioSystem.playSFX('shield');
                }
            }
            updateUI();
                powerups.splice(i, 1); // Remove powerup after collection
        }
    }
}

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

    // Manteniamo il parallax attivo in tutte le schermate
    if (!_menuParallaxHandler) {
        enableMenuParallax();
    }
    
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
    
    // Ferma tutte le tracce audio e riproduci il tema principale o mantieni la musica segreta se attiva
    audioSystem.stopAllTracks();
    if (secretMusicActive) {
        audioSystem.playSecretTrack();
    } else {
        audioSystem.playMainTheme();
    }
    
    // Se siamo in modalità infinita, resetta la flag
    isInfiniteMode = false;
    
    // Disabilita gli effetti sonori quando si torna al menu
    audioSystem.isInGame = false;

    // Reset forzato del sistema di dialogo
    if (window.dialogSystem) {
        // Prima forza 2/2 di qualsiasi dialogo precedente e chiudi
        if (typeof dialogSystem.skipToLastAndBlock === 'function') {
            dialogSystem.skipToLastAndBlock();
        }
        // Poi pulizia totale
        dialogSystem.forceComplete();
    }

    // Reset totale del dialogo segreto, se presente
    if (typeof window.resetSecretDialog === 'function') {
        window.resetSecretDialog();
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
    enemyShip: new Image(),
    shieldIcon: new Image(),
    tempShieldIcon: new Image(),
    planets: [] // immagini opzionali per i pianeti: img/planet_X.PNG
};

// Inizializzazione del sistema di stelle (super ottimizzato)
function initStars() {
    stars = [];
    // Ridotto il numero di stelle da 120 a 60
    const starCount = Math.floor(60 * (window.innerWidth / 1920)); // Scala in base alla larghezza dello schermo
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2.5 + 0.8, // Dimensioni leggermente aumentate
            speed: Math.random() * 3.5 + 1, // Velocità leggermente aumentata
            brightness: Math.random() * 0.9 + 0.3, // Luminosità aumentata
            twinkle: Math.random() * 0.03 + 0.008, // Scintillio più evidente
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
    images.spaceship.src = 'img/spaceship.png';
    images.meteorite.src = 'img/meteor.png';
    images.fire.src = 'img/fire.svg';
    images.enemyShip.src = 'img/Enemy.png';
    images.enemyShip.onerror = () => { images.enemyShip._failed = true; };
    
    // Icone scudo PNG (relative to index.html document root)
    images.shieldIcon.src = 'img/Shield.png';
    images.tempShieldIcon.src = 'img/TempShield.png';
    

    
    // Pizze per i diversi livelli
    images.pizza1.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23FFCC66" stroke="%23CC9933" stroke-width="1"/><circle cx="15" cy="15" r="12" fill="%23FF9933"/><circle cx="10" cy="10" r="2" fill="%23CC3300"/><circle cx="20" cy="20" r="2" fill="%23CC3300"/><circle cx="15" cy="18" r="2" fill="%23009900"/></svg>';
    images.pizza2.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23FFCC66" stroke="%23CC9933" stroke-width="1"/><circle cx="15" cy="15" r="12" fill="%23FF9933"/><circle cx="10" cy="10" r="2" fill="%23CC3300"/><circle cx="20" cy="20" r="2" fill="%23CC3300"/><circle cx="15" cy="10" r="2" fill="%23CC3300"/><circle cx="10" cy="20" r="2" fill="%23CC3300"/></svg>';
    images.pizza3.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="15" fill="%23FFCC66" stroke="%23CC9933" stroke-width="1"/><circle cx="15" cy="15" r="12" fill="%23FF9933"/><circle cx="10" cy="10" r="2" fill="%23CC3300"/><circle cx="20" cy="20" r="2" fill="%23CC3300"/><circle cx="15" cy="10" r="2" fill="%23CC3300"/><circle cx="10" cy="20" r="2" fill="%23009900"/><circle cx="20" cy="10" r="2" fill="%23009900"/></svg>';
    
    // Sfondo spaziale
    images.background.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%23000"/><circle cx="100" cy="100" r="1" fill="%23FFF"/><circle cx="200" cy="150" r="1" fill="%23FFF"/><circle cx="300" cy="200" r="1" fill="%23FFF"/><circle cx="400" cy="300" r="1" fill="%23FFF"/><circle cx="500" cy="100" r="1" fill="%23FFF"/><circle cx="600" cy="200" r="1" fill="%23FFF"/><circle cx="700" cy="300" r="1" fill="%23FFF"/><circle cx="150" cy="400" r="1" fill="%23FFF"/><circle cx="250" cy="500" r="1" fill="%23FFF"/><circle cx="350" cy="100" r="1" fill="%23FFF"/><circle cx="450" cy="200" r="1" fill="%23FFF"/><circle cx="550" cy="300" r="1" fill="%23FFF"/><circle cx="650" cy="400" r="1" fill="%23FFF"/><circle cx="750" cy="500" r="1" fill="%23FFF"/></svg>';

    // Immagini opzionali dei pianeti: Planet_1.png .. Planet_6.png (nome con maiuscola nel repo)
    images.planets = [];
    for (let i = 1; i <= 6; i++) {
        const img = new Image();
        img.src = `img/Planet_${i}.png`;
        img.onerror = () => { img._failed = true; };
        images.planets.push(img);
    }
}

// Avvio del gioco
function startGame() {
    // Inizializza il sistema audio se non è già stato fatto
    if (!audioSystem.initialized) {
        audioSystem.init();
        audioSystem.initialized = true;
    }
    
    // Abilita gli effetti sonori durante il gioco
    audioSystem.isInGame = true;

    // Reset sfondo a colore normale ad ogni nuova partita
    resetBackground();
    // Disabilita input e pulisci i tasti finché non parte il gameplay
    inputEnabled = false;
    clearGameKeys();
    
    // Imposta lo stato di fade-in
    animationState = 'fade-in';
    fadeInProgress = 0;
    animationStartTime = Date.now();
    // Reset del cooldown ESC
    lastEscTime = 0;

    // Reset delle variabili di gioco (mantiene il livello corrente)
    score = 0;
    progress = 0;
    meteorites = [];
    spaceship.bullets = [];
    spaceship.shockwaves = [];
    powerups = [];
    particles = []; // Reset delle particelle
    
    // Reset scudi e stato invulnerabilità
    spaceship.shieldUntil = 0;
    spaceship.permanentShields = 0;
    spaceship.invulnerableUntil = 0;
    spaceship.flashUntil = 0;
    
    // Reset completo del sistema di dialogo
    if (window.dialogSystem) {
        // Annulla tutti i timeout pendenti dei dialoghi
        if (dialogSystem.timeouts) {
            dialogSystem.timeouts.forEach(timeout => clearTimeout(timeout));
            dialogSystem.timeouts = [];
        }
        // Reset completo dello stato del dialogo
        dialogSystem.active = false;
        dialogSystem.currentDialog = null;
        dialogSystem.currentIndex = 0;
        dialogSystem.queue = [];
        dialogSystem.dialogHistory = []; // Reset anche della storia dei dialoghi
        // Nascondi e resetta la UI del dialogo
        const dialogBox = document.getElementById('dialog-box');
        if (dialogBox) {
            dialogBox.classList.remove('dialog-visible', 'pilot-speaking', 'chef-speaking', 'bob-speaking');
            dialogBox.classList.add('dialog-hidden');
            const dialogText = document.getElementById('dialog-text');
            if (dialogText) {
                dialogText.textContent = '';
            }
        }
    }
    
    // Reset navicelle nemiche
    enemyShips = [];
    enemyNextSpawn = Date.now() + getEnemySpawnInterval();

    // Cancella eventuale timer di spawn meteoriti precedente
    if (meteorSpawnTimeout) {
        clearTimeout(meteorSpawnTimeout);
        meteorSpawnTimeout = null;
    }
    
    // Reset delle velocità della navicella
    spaceship.velocityX = 0;
    spaceship.velocityY = 0;
    spaceship.shieldUntil = 0;
    spaceship.oneHitShield = false;
    spaceship.pickupAnimUntil = 0;
    spaceship.dashActive = false;
    spaceship.dashEndTime = 0;
    spaceship.maxSpeed = 6; // Reset velocità normale
    levelShieldSpawned = false;
    phaseShieldSpawned = false;
    lastAmmoSpawn = 0;
    lastTimedShieldSpawn = 0;
    
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
    // Reset guard per dialogo post-decollo
    dialogStartedAfterTakeoff = false;
    
    // Abilita gli effetti sonori durante l'animazione di decollo
    audioSystem.isInGame = true;
    
    // Avvia la musica del livello o della modalità infinita solo se l'utente ha già interagito con la pagina
    if (audioSystem.currentTrack) {
        if (isInfiniteMode) {
            audioSystem.playInfiniteMusic();
        } else {
            audioSystem.playLevelMusic(currentLevel);
        }
    }
    
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
    
    // Disabilita gli effetti sonori durante l'animazione di atterraggio
    audioSystem.isInGame = false;
    
    // Riproduci la musica di vittoria solo se l'utente ha già interagito con la pagina
    if (audioSystem.currentTrack) {
        audioSystem.playVictory();
    }
    
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

// Loop di gioco ottimizzato con requestAnimationFrame e frame skipping
function startGameLoop() {
    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;
    
    function loop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const elapsed = timestamp - lastTime;
        
        if (gameActive) {
            // Aggiorna il gioco solo se è passato abbastanza tempo
            if (elapsed > frameInterval) {
                gameUpdate();
                lastTime = timestamp - (elapsed % frameInterval);
            }
            gameLoop = requestAnimationFrame(loop);
        }
    }
    gameLoop = requestAnimationFrame(loop);
}

// Aggiornamento dell'interfaccia utente
function updateUI() {
    // In modalità infinita, nascondiamo le informazioni sul livello e sulla pizza
    if (isInfiniteMode) {
        document.getElementById('current-level').parentElement.style.display = 'none';
        document.getElementById('current-pizza').parentElement.style.display = 'none';
    } else {
        document.getElementById('current-level').parentElement.style.display = '';
        document.getElementById('current-pizza').parentElement.style.display = '';
        document.getElementById('current-level').textContent = currentLevel;
        document.getElementById('current-pizza').textContent = pizzaTypes[currentLevel - 1];
    }
    
    // Mostra il punteggio solo in modalità infinita
    const scoreElement = document.getElementById('score');
    const scoreContainer = scoreElement.parentElement;
    
    if (isInfiniteMode) {
        scoreElement.textContent = score;
        scoreContainer.style.display = 'inline-block';
        
        // Mostra il punteggio più alto e la fase più alta nella schermata di gioco
        const highScoreWrapper = document.getElementById('high-score-wrapper');
        const highScoreElement = document.getElementById('game-high-score');
        const highestPhaseWrapper = document.getElementById('highest-phase-wrapper');
        const highestPhaseElement = document.getElementById('game-highest-phase');
        
        if (highScoreWrapper && highScoreElement) {
            highScoreWrapper.style.display = 'inline-block';
            highScoreElement.textContent = highScore;
            
            // Posiziona il record in alto al centro
            highScoreWrapper.style.position = 'absolute';
            highScoreWrapper.style.top = '10px';
            highScoreWrapper.style.left = '50%';
            highScoreWrapper.style.transform = 'translateX(-50%)';
            highScoreWrapper.style.zIndex = '100';
        }
        
        if (highestPhaseWrapper && highestPhaseElement) {
            highestPhaseWrapper.style.display = 'inline-block';
            highestPhaseElement.textContent = highestPhase + 1;
            
            // Posiziona la fase record in alto al centro sotto il record
            highestPhaseWrapper.style.position = 'absolute';
            highestPhaseWrapper.style.top = '40px';
            highestPhaseWrapper.style.left = '50%';
            highestPhaseWrapper.style.transform = 'translateX(-50%)';
            highestPhaseWrapper.style.zIndex = '100';
        }
    } else {
        scoreContainer.style.display = 'none';
        
        // Nascondi il punteggio più alto e la fase più alta nella schermata di gioco
        const highScoreWrapper = document.getElementById('high-score-wrapper');
        const highestPhaseWrapper = document.getElementById('highest-phase-wrapper');
        
        if (highScoreWrapper) highScoreWrapper.style.display = 'none';
        if (highestPhaseWrapper) highestPhaseWrapper.style.display = 'none';
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

    // Indicatore scudo temporaneo
    const tempShieldIndicator = document.getElementById('temp-shield-indicator');
    if (tempShieldIndicator) {
        const tempActive = (spaceship.shieldUntil > Date.now());
        tempShieldIndicator.style.display = tempActive ? 'block' : 'none';
        if (tempActive && images.tempShieldIcon && images.tempShieldIcon.src) {
            tempShieldIndicator.style.backgroundImage = `url('${images.tempShieldIcon.src}')`;
        }
    }
    
    // Indicatori scudi permanenti
    for (let i = 1; i <= 10; i++) {
        const shieldIndicator = document.getElementById(`shield-indicator-${i}`);
        if (shieldIndicator) {
            // Mostra sempre tutti gli slot, ma con opacità diversa se attivi/inattivi
            shieldIndicator.style.display = 'block';
            shieldIndicator.style.opacity = (i <= spaceship.permanentShields) ? '1' : '0.3';
            if (images.shieldIcon && images.shieldIcon.src) {
                shieldIndicator.style.backgroundImage = `url('${images.shieldIcon.src}')`;
            }
        }
    }
}

// Generazione dei meteoriti
function generateMeteorites() {
    // Debug: stampa lo stato delle variabili di controllo
    console.log("DEBUG - generateMeteorites chiamata: meteorSpawnPaused =", meteorSpawnPaused, "canMove =", canMove, "dialogActive =", dialogActive);
    
    // Non generare meteoriti se lo spawn è in pausa o il player non può muoversi
    if (meteorSpawnPaused || !canMove) {
        console.log("DEBUG - Generazione meteoriti bloccata!");
        return;
    }
    
    const countFactor = currentLevel <= 3 ? 3 : 2; // crescita più dolce dal livello 4
    
    // Scala il numero di meteoriti in base alla dimensione della finestra
    const screenSizeFactor = window.innerWidth / 1920;
    const meteoritesCount = Math.floor((5 + (currentLevel * countFactor)) * screenSizeFactor * getMeteoriteSpawnMultiplier());
    
    for (let i = 0; i < meteoritesCount; i++) {
        const baseSize = Math.random() * 30 + 35; // Dimensione base tra 35 e 65
        const size = Math.max(12, Math.round(baseSize * meteoriteSizeMultiplier));
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
// Utility function to ensure safe radius/size values
function ensureSafeSize(size, minSize = 0.1) {
    return Math.max(minSize, size || minSize);
}

function createParticle(x, y, direction, type = 'thruster') {
    // Consenti creazione particelle solo durante la partita, non in pausa e con scheda visibile
    if (document.hidden || !gameActive || (typeof isPaused !== 'undefined' && isPaused)) {
        return null;
    }
    let particle;
    if (particlePool.length > 0) {
        particle = particlePool.pop();
    } else {
        particle = {};
    }
    
    particle.x = x;
    particle.y = y;
    particle.type = type;
    particle.createdAt = Date.now(); // Timestamp di creazione
    particle.maxLifeTime = 3000; // Durata massima in millisecondi (3 secondi)
    
    if (type === 'thruster') {
        particle.size = ensureSafeSize(Math.random() * 4 + 1.5); // Dimensioni più variabili con safety check
        particle.speed = Math.random() * 3 + 2; // Velocità più alta
        particle.life = Math.random() * 30 + 20; // Vita più lunga
        particle.direction = direction || { x: (Math.random() - 0.5) * 2, y: 1.8 };
        particle.heat = Math.random(); // Fattore di calore per colore
        particle.intensity = Math.random() * 0.8 + 0.2; // Intensità luminosa
    } else if (type === 'polvere') {
        // Particelle di polvere per l'accelerazione
        particle.size = ensureSafeSize(Math.random() * 2 + 0.5); // Particelle più piccole
        particle.speed = Math.random() * 4 + 3; // Velocità più alta
        particle.life = Math.random() * 40 + 25; // Vita più lunga
        particle.direction = direction || { x: (Math.random() - 0.5) * 2, y: 1.8 };
        particle.heat = 0.8 + Math.random() * 0.2; // Fattore di calore per colore (più verso il bianco/grigio)
        particle.intensity = Math.random() * 0.6 + 0.2; // Intensità luminosa più bassa
    } else if (type === 'explosion') {
        particle.size = Math.random() * 3 + 2;
        particle.speed = Math.random() * 4 + 2.5;
        particle.life = Math.random() * 25 + 20;
        const angle = Math.random() * Math.PI * 2;
        particle.direction = direction || { x: Math.cos(angle), y: Math.sin(angle) };
        particle.color = Math.random() < 0.5 ? '#ffbb33' : '#ffdd55';
        particle.intensity = Math.random() * 0.6 + 0.4;
    } else if (type === 'shipExplosion') {
        particle.size = Math.random() * 5 + 3;
        particle.speed = Math.random() * 3 + 1.5;
        particle.life = Math.random() * 35 + 25;
        const angle = Math.random() * Math.PI * 2;
        particle.direction = direction || { x: Math.cos(angle), y: Math.sin(angle) };
        particle.color = Math.random() < 0.5 ? '#ffee88' : '#ff5533';
        particle.intensity = Math.random() * 0.7 + 0.5;
    }
    
    return particle;
}

// Funzione per aggiornare le particelle
function updateParticles() {
    const currentTime = Date.now();
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].x += particles[i].direction.x * particles[i].speed;
        particles[i].y += particles[i].direction.y * particles[i].speed;
        particles[i].life--;
        // Ensure size never goes below minimum
        particles[i].size = ensureSafeSize(particles[i].size * 0.95); // Riduzione graduale della dimensione
        
        // Rimuovi particelle morte, troppo vecchie o troppo piccole e restituiscile al pool
        if (particles[i].life <= 0 || particles[i].size < 0.5 || 
            (currentTime - particles[i].createdAt > particles[i].maxLifeTime)) {
            particlePool.push(particles[i]); // Restituisce al pool
            particles.splice(i, 1);
        }
    }
    
    // Aggiungi nuove particelle del propulsore SOLO se in partita, non in pausa e in gameplay
    if (gameActive && !(typeof isPaused !== 'undefined' && isPaused) && animationState === 'game' && spaceship.thrusterActive) {
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
        
        // Particelle propulsore ottimizzate per evitare lag
    if (particles.length < 120) { // Aumentato il limite per permettere più particelle durante l'accelerazione
        // Calcola il numero di particelle in base all'accelerazione
        let particleCount;
        if (gameKeys.space && isInfiniteMode && spaceship.dashActive) {
            // Più particelle durante l'accelerazione nella modalità infinita
            particleCount = Math.floor(Math.random() * 8) + 7; // 7-14 particelle per frame durante l'accelerazione
        } else {
            // Numero normale di particelle
            particleCount = Math.floor(Math.random() * 5) + 3; // 3-7 particelle per frame
        }
        for (let i = 0; i < particleCount; i++) {
                const spreadX = (Math.random() - 0.5) * 25; // Spread orizzontale ancora più ampio (da 20 a 25)
                const spreadY = (Math.random() - 0.5) * 12; // Spread verticale aumentato (da 8 a 12)
                // Usa il tipo 'polvere' durante l'accelerazione, altrimenti 'thruster'
                const particleType = (gameKeys.space && isInfiniteMode && spaceship.dashActive) ? 'polvere' : 'thruster';
                
                const p = createParticle(
                    emitX + spreadX, 
                    emitY + spreadY,
                    { 
                        x: dirX + (Math.random() - 0.5) * 0.8,
                        y: dirY + Math.random() * 1.0 + 0.6
                    },
                    particleType
                );
                if (p) particles.push(p);
            }
        }
    }
}

// Loop principale del gioco
function gameUpdate() {
    if (!gameActive) return;
    // Pausa hard quando la scheda è nascosta per evitare spawn particelle e avanzamento
    if (document.hidden) return;
    
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
        
        // Aggiornamento delle onde d'urto
        updateShockwaves();
        
        // Aggiornamento dei meteoriti
        updateMeteorites();

        // Aggiornamento delle navicelle nemiche (ostacoli indistruttibili)
        updateEnemyShips();
        // Spawn programmato delle navicelle nemiche (solo dal livello 4 o in modalità infinita)
        if (Date.now() >= enemyNextSpawn && (currentLevel >= 4 || isInfiniteMode)) {
            spawnEnemyShip();
            enemyNextSpawn = Date.now() + getEnemySpawnInterval();
        }
        
        // Spawn e aggiornamento power-up
        handlePowerupSpawning();
        updatePowerups();
        checkPowerupCollisions();
        
        // Controllo delle collisioni
        checkCollisions();
        
        // Aggiornamento del progresso basato sul tempo
        updateProgressWithTime();
        
        // Controllo del progresso
        checkProgress();
    } else if (animationState === 'ship_explosion') {
        updateShipExplosionAnimation();
    }
    
    // Aggiornamento delle particelle (sempre attivo)
    updateParticles();
    
    // Disegno di tutti gli elementi
    drawGame();
}

// Mostra UI di game over dopo l'esplosione
function performGameOverUI() {
    // Disabilita input e pulisci tasti
    inputEnabled = false;
    clearGameKeys();
    // Reset sfondo a colore normale alla sconfitta
    resetBackground();

    // Reset immediato dei dialoghi (sia sistema principale che segreto)
    if (window.dialogSystem && typeof dialogSystem.closeOnDefeat === 'function') {
        dialogSystem.closeOnDefeat();
    }
    if (typeof window.resetSecretDialog === 'function') {
        window.resetSecretDialog();
    }

    // Disabilita gli effetti sonori quando il gioco termina
    audioSystem.isInGame = false;
    // Riproduci la musica di sconfitta
    audioSystem.playLost();
    // Aggiornamento dell'interfaccia di game over
    document.getElementById('final-score').textContent = score;
    if (isInfiniteMode) {
        document.getElementById('final-level-label').textContent = 'Fase raggiunta:';
        document.getElementById('final-level').textContent = infinitePhase + 1;
        
        // Salva il punteggio più alto se in modalità infinita
        saveHighScore();
    } else {
        document.getElementById('final-level-label').textContent = 'Livello raggiunto:';
        document.getElementById('final-level').textContent = currentLevel;
    }
    // Mostra immagine di sconfitta, se presente
    const overImg = document.getElementById('game-over-image');
    if (overImg) {
        overImg.src = 'img/Lost.PNG';
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
    overSection.style.backgroundImage = "url('img/Lost.PNG')";
    showSection('game-over');
}

// Animazione esplosione navicella e transizione a game over
function updateShipExplosionAnimation() {
    const now = Date.now();
    const t = Math.min(1, (now - shipExplosionState.start) / shipExplosionState.duration);
    // genera particelle molto più spettacolari
    if (t < 0.8) {
        for (let i = 0; i < 25; i++) { // Aumentato da 12 a 25 particelle
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 20; // Distribuzione iniziale
            const particle = createParticle(
                shipExplosionState.x + Math.cos(angle) * distance,
                shipExplosionState.y + Math.sin(angle) * distance,
                {
                    x: Math.cos(angle) * (Math.random() * 2 + 1),
                    y: Math.sin(angle) * (Math.random() * 2 + 1)
                },
                'shipExplosion'
            );
            if (particle) {
                // Personalizza le particelle per un effetto più drammatico
                particle.size = Math.random() * 6 + 4;
                particle.life = Math.random() * 45 + 30;
                particle.color = Math.random() < 0.4 ? '#ff3300' : (Math.random() < 0.6 ? '#ffaa00' : '#ffff00');
                particle.intensity = Math.random() * 0.9 + 0.8;
                particles.push(particle);
            }
        }
    }
    shipExplosionState.r = shipExplosionState.maxR * (0.6 + 0.4 * easeOutCubic(t));
    // Flash bianco più intenso e prolungato al picco
    if (t < 0.3) { // Durata aumentata da 0.2 a 0.3
        ctx.save();
        ctx.globalAlpha = 0.45 * (1 - t / 0.3); // Intensità aumentata da 0.25 a 0.45
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Aggiungi un secondo flash colorato per effetto drammatico
        ctx.save();
        ctx.globalAlpha = 0.25 * (1 - t / 0.3);
        ctx.fillStyle = '#ff5500';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    if (t >= 1) {
        shipExplosionState.active = false;
        animationState = 'none';
        performGameOverUI();
    }
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
        // Pulisci i tasti ma NON abilitare ancora l'input
        clearGameKeys();
        inputEnabled = false; // Manteniamo l'input disabilitato fino alla fine del dialogo
        canMove = false; // Disabilita il movimento del player durante il dialogo
        gameStartTime = Date.now();
        lastAmmoSpawn = gameStartTime;
        lastTimedShieldSpawn = gameStartTime;
        
        // Avvia la sequenza di dialogo una sola volta
        if (!dialogStartedAfterTakeoff) {
            dialogStartedAfterTakeoff = true;
            startDialogAfterTakeoff();
        }
        // Posizionamento finale della navicella per il gameplay
        spaceship.x = canvas.width / 2 - spaceship.width / 2;
        spaceship.y = canvas.height - spaceship.height - 20;
        spaceship.width = 60;
        spaceship.height = 40;
        spaceship.thrusterActive = false;
        
        // Lo spawn dei meteoriti verrà gestito dalla funzione resumeMeteorSpawn()
        // che sarà chiamata alla fine del dialogo
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

// Variabile per controllare se il progresso è in pausa
let progressPaused = false;

// Aggiornamento del progresso basato sul tempo (20% più veloce)
function updateProgressWithTime() {
    // Se il progresso è in pausa, non aggiornare.
    // Se c'è un dialogo attivo, permetti l'aggiornamento SOLO se il player può muoversi (canMove)
    if (progressPaused) {
        return;
    }
    if (dialogSystem && dialogSystem.active && !canMove) {
        return;
    }
    
    // Incrementa il progresso di una piccola quantità ad ogni frame
    // Velocità aumentata del 25% per ridurre la distanza del 20%
    
    // Velocità di riempimento variabile in base al livello (più veloce)
    const baseSpeed = 0.0375; // Aumentato da 0.03 a 0.0375 (+25%)
    const levelFactor = isInfiniteMode ? 0.6 : (1 - (currentLevel * 0.08)); // Fattore più generoso
    progress += baseSpeed * Math.max(0.25, levelFactor);

    // Debug: incremento velocissimo della barra mentre si tiene premuto spazio (solo infinita)
    if (gameKeys.space && isInfiniteMode) {
        progress += 3.5; // incremento rapido per debug
    }

    // Evita di superare il 100%
    if (progress > 100) progress = 100;
    
    // Aggiorna l'interfaccia utente con animazione fluida
    updateUI();
}

// Funzione per mettere in pausa il progresso
function pauseProgressFill() {
    progressPaused = true;
}

// Funzione per riprendere il progresso
function resumeProgressFill() {
    progressPaused = false;
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
    
    // Controlla se il giocatore ha iniziato a muoversi
    if (!playerHasMoved && (gameKeys.left || gameKeys.right || gameKeys.up || gameKeys.down)) {
        playerHasMoved = true;
        // Genera i meteoriti con un breve ritardo dopo il primo movimento
        if (meteorSpawnTimeout) { clearTimeout(meteorSpawnTimeout); }
        meteorSpawnTimeout = setTimeout(() => {
            // Evita spawn se non siamo più in gioco o se lo spawn è in pausa
            if (animationState === 'game' && gameActive && !meteorSpawnPaused) {
                generateMeteorites();
            }
        }, 500);
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
    
    // Aggiornamento della posizione - scalato in base al fattore di scala del canvas
    // per mantenere la stessa velocità di gioco indipendentemente dalla dimensione del canvas
    spaceship.x += spaceship.velocityX * (canvasScaleFactor ? 1 : 1);
    spaceship.y += spaceship.velocityY * (canvasScaleFactor ? 1 : 1);
    
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
    
    // Sparo con P (livello 2+ nelle modalità normali; SEMPRE in modalità infinita)
    if (gameKeys.p && (isInfiniteMode || currentLevel >= 2)) {
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
                
                // Riproduci effetto sonoro proiettile
                audioSystem.playSFX('projectile');
            }
        }
    }

    // Scatto (solo in modalità infinita)
    if (gameKeys.space && isInfiniteMode) {
        // Aumenta temporaneamente la velocità massima
        if (!spaceship.dashActive) {
            spaceship.maxSpeed *= 1.5;
            spaceship.dashActive = true;
            spaceship.dashEndTime = Date.now() + 500; // 0.5 secondi di scatto
            
            // Accelera la musica
            if (audioSystem.currentTrack && audioSystem.currentTrack === audioSystem.infiniteTrack) {
                audioSystem.currentTrack.playbackRate = audioSystem.acceleratedPlaybackRate;
            }
        }
    }

    // Reset dash quando finisce
    if (spaceship.dashActive && Date.now() >= spaceship.dashEndTime) {
        spaceship.maxSpeed = 6; // Reset alla velocità normale
        spaceship.dashActive = false;
        
        // Ripristina la velocità normale della musica
        if (audioSystem.currentTrack && audioSystem.currentTrack === audioSystem.infiniteTrack) {
            audioSystem.currentTrack.playbackRate = audioSystem.normalPlaybackRate;
        }
    }

    // Shockwave burst (tasto O, livello 3+)
    if (gameKeys.o && (isInfiniteMode || currentLevel >= 3)) {
        const shockCost = 5;
        if (spaceship.canShoot && remainingBullets >= shockCost) {
            const now = Date.now();
            if (!spaceship.lastShockwave || now - spaceship.lastShockwave > 800) {
                const cx = spaceship.x + spaceship.width / 2;
                const cy = spaceship.y + spaceship.height / 2;
                // onda più veloce e ampia
                spaceship.shockwaves.push({ x: cx, y: cy, r: 0, maxR: 180, life: 220, created: now });
                spaceship.lastShockwave = now;
                remainingBullets -= shockCost;
                updateUI();
                
                // Riproduci effetto sonoro AOE
                audioSystem.playSFX('aoe');
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

// Aggiornamento delle onde d'urto (burst)
function updateShockwaves() {
    const now = Date.now();
    for (let i = spaceship.shockwaves.length - 1; i >= 0; i--) {
        const sw = spaceship.shockwaves[i];
        const t = (now - sw.created) / sw.life;
        sw.r = sw.maxR * t;
        // Collisione con meteoriti
        for (let j = meteorites.length - 1; j >= 0; j--) {
            const m = meteorites[j];
            const cx = m.x + m.width/2;
            const cy = m.y + m.height/2;
            const dx = cx - sw.x;
            const dy = cy - sw.y;
            const dist = Math.hypot(dx, dy);
            if (dist < sw.r + Math.max(m.width, m.height)/2) {
                // Distruggi meteorite colpito da shockwave
                spawnExplosion(cx, cy, Math.max(m.width, m.height));
                meteorites.splice(j, 1);
                if (isInfiniteMode) {
                    score += 10 * currentLevel;
                } else if (currentLevel >= 2) {
                    progress += getMeteoriteProgressBonus();
                }
                updateUI();
            }
        }
        if (t >= 1) {
            spaceship.shockwaves.splice(i, 1);
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
    if (meteorites.length < (5 + (currentLevel * 2)) * getMeteoriteSpawnMultiplier()) {
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
                const cx = meteorite.x + meteorite.width/2;
                const cy = meteorite.y + meteorite.height/2;
                spawnExplosion(cx, cy, Math.max(meteorite.width, meteorite.height));
                meteorites.splice(j, 1);
                
                // Riproduci effetto sonoro distruzione meteorite
                audioSystem.playSFX('meteor');
                
                // Incrementa il punteggio solo in modalità infinita
                if (isInfiniteMode) {
                    score += 10 * currentLevel;
                } else {
                    // Nelle altre modalità, colpire i meteoriti aumenta il progresso solo dal livello 2 in poi
                    if (currentLevel >= 2) {
                        progress += getMeteoriteProgressBonus();
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
        const shipBox = getShipHitbox();
        
        if (
            shipBox.x < meteorite.x + meteorite.width &&
            shipBox.x + shipBox.width > meteorite.x &&
            shipBox.y < meteorite.y + meteorite.height &&
            shipBox.y + shipBox.height > meteorite.y
        ) {
            const hasTimedShield = spaceship.shieldUntil > Date.now();
            const hasPermanentShield = spaceship.permanentShields > 0;
            if (hasTimedShield || hasPermanentShield) {
                // Parata: distruggi meteorite, consuma scudo permanente se necessario
                const cx = meteorite.x + meteorite.width/2;
                const cy = meteorite.y + meteorite.height/2;
                spawnExplosion(cx, cy, Math.max(meteorite.width, meteorite.height));
                
                // Riproduci effetto sonoro scudo appropriato
                if (hasTimedShield) {
                    audioSystem.playSFX('temporaryShield');
                } else {
                    audioSystem.playSFX('shield');
                }
                
                // Punti ridotti quando si usa lo scudo
                if (hasTimedShield && isInfiniteMode) {
                    score += 5 * currentLevel; // Punti con scudo temporaneo
                } else if (isInfiniteMode) {
                    score += 2 * currentLevel; // Punti con scudo permanente
                }
                meteorites.splice(i, 1);
                 if (!hasTimedShield && hasPermanentShield) {
                     spaceship.permanentShields--;
                 }
                // breve flash pick
                spaceship.pickupAnimUntil = Date.now() + 200;
                updateUI();
                // continua senza game over
                i--; // perché array accorciato
                continue;
            } else {
                const now = Date.now();
                // Se è già invulnerabile, salta la collisione
                if (spaceship.invulnerableUntil && now < spaceship.invulnerableUntil) {
                    continue;
                }
                
                // Avvia invulnerabilità e effetto lampeggio per 0.2 secondi
                spaceship.invulnerableUntil = now + 200;
                spaceship.flashUntil = now + 200;
                spaceship.hitTime = now;
                
                // Riproduci effetto sonoro colpo
                audioSystem.playSFX('hit');

                // Effetti particellari per l'impatto
                const hitX = (shipBox.x + shipBox.width/2 + meteorite.x + meteorite.width/2) / 2;
                const hitY = (shipBox.y + shipBox.height/2 + meteorite.y + meteorite.height/2) / 2;
                
                for (let p = 0; p < 20; p++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 2 + Math.random() * 3;
                    const particle = createParticle(
                        hitX,
                        hitY,
                        { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                        'explosion'
                    );
                    if (particle) {
                        particle.color = '#ff6600';
                        particle.life = 30 + Math.random() * 20;
                        particles.push(particle);
                    }
                }

                // Game over
                startShipExplosion();
                return;
            }
        }
    }

    // Collisione tra navicella e navicelle nemiche (indistruttibili)
    for (let ei = 0; ei < enemyShips.length; ei++) {
        const e = enemyShips[ei];
        const shipBox = getShipHitbox();
        if (
            shipBox.x < e.x + e.width &&
            shipBox.x + shipBox.width > e.x &&
            shipBox.y < e.y + e.height &&
            shipBox.y + shipBox.height > e.y
        ) {
            const now = Date.now();
            const hasTimedShield = spaceship.shieldUntil > now;
            const hasPermanentShield = spaceship.permanentShields > 0;
            
            // Se non ci sono scudi, la navicella nemica non spawna
            if (!hasTimedShield && !hasPermanentShield) {
                continue;
            }

            // Remove all shields
            spaceship.permanentShields = 0;

            // Visual effects for shield loss
            const hitX = (shipBox.x + shipBox.width/2 + e.x + e.width/2) / 2;
            const hitY = (shipBox.y + shipBox.height/2 + e.y + e.height/2) / 2;
            
            // More dramatic particle effect for losing all shields
            for (let p = 0; p < 20; p++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                const particle = createParticle(
                    hitX,
                    hitY,
                    { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                    'explosion'
                );
                if (particle) {
                    particle.color = '#ff6600';
                    particle.life = 30 + Math.random() * 20;
                    particles.push(particle);
                }
            }

            updateUI();
            continue;
        }
    }
}

// Esplosione meteorite: genera particelle radiali in base alla dimensione
function spawnExplosion(x, y, size) {
    const count = Math.min(120, Math.max(40, Math.floor(size * 3.5)));
    for (let k = 0; k < count; k++) {
        const particle = createParticle(x, y, null, 'explosion');
        if (!particle) continue;
        // Aumenta dimensione e durata delle particelle
        particle.size = Math.random() * 4.5 + 3;
        particle.life = Math.random() * 35 + 25;
        // Aggiungi variazione di colore per effetto più spettacolare
        particle.color = Math.random() < 0.6 ? '#ffbb33' : (Math.random() < 0.5 ? '#ffdd55' : '#ff6622');
        particle.intensity = Math.random() * 0.8 + 0.6;
        particles.push(particle);
    }
}

// Disegno di tutti gli elementi del gioco
function drawGame() {
    // Pulizia del canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Sfondo spaziale variabile con tween di colore
    ctx.fillStyle = getCurrentBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Overlay nero per il fade-in
    if (animationState === 'fade-in') {
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - fadeInProgress})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Disegna le stelle animate
    drawStars();
    
    // Disegna il pianeta se siamo in animazione
    if (animationState === 'takeoff' || animationState === 'landing') {
        drawPlanet();
    }
    
    // Disegna le particelle con colori realistici - MIGLIORATO
    for (const particle of particles) {
        if (particle.type === 'thruster' || particle.type === 'polvere') {
            // Calcola colore basato su calore e vita
            const lifeRatio = particle.life / 50;
            const heat = particle.heat;
            
            // Colori realistici del propulsore: blu-bianco-giallo-arancione-rosso
            let r, g, b;
            if (particle.type === 'polvere') {
                // Colori grigi per la polvere
                const grayValue = 180 + Math.floor(heat * 75); // 180-255 (grigio chiaro)
                r = g = b = grayValue;
            } else if (heat < 0.2) {
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
        else if (particle.type === 'explosion' || particle.type === 'shipExplosion') {
            const lifeRatio = Math.max(0, particle.life / 60);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 2.5
            );
            const base = particle.color || '#ffcc66';
            const rgb = hexToRgb(base);
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.8 * lifeRatio * (particle.intensity || 1)})`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    // Effetto glow scudo e pickup
    const shieldActive = (spaceship.shieldUntil > Date.now()) || spaceship.oneHitShield;
    if (shieldActive) {
        const timeLeft = spaceship.shieldUntil - Date.now();
        const isBlinking = timeLeft > 0 && timeLeft <= 2000; // Last 2 seconds
        const shouldShowBlue = isBlinking && Math.floor(timeLeft / 333) % 2 === 0; // Blink every 1/3 second for 6 blinks total

        // Update canvas border color
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.classList.toggle('shield-active', shieldActive && !shouldShowBlue);
        }

        const cx = spaceship.x + spaceship.width/2;
        const cy = spaceship.y + spaceship.height/2;
        const radius = Math.max(spaceship.width, spaceship.height) * 0.7;
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200);
        ctx.save();
        const grad = ctx.createRadialGradient(cx, cy, radius*0.6, cx, cy, radius*1.2);
        if (shouldShowBlue) {
            grad.addColorStop(0, 'rgba(0,180,255,0.25)');
            grad.addColorStop(1, 'rgba(0,120,255,0)');
        } else {
            grad.addColorStop(0, 'rgba(255,105,180,0.25)');
            grad.addColorStop(1, 'rgba(255,20,147,0)');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (1 + 0.05*pulse), 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
    if (spaceship.pickupAnimUntil > Date.now()) {
        const t = Math.min(1, (spaceship.pickupAnimUntil - Date.now()) / 200);
        const cx = spaceship.x + spaceship.width/2;
        const cy = spaceship.y + spaceship.height/2;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,0,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const radius = Math.max(0, 10 + 25*(1-t)); // Ensure radius is never negative
        ctx.arc(cx, cy, radius, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
    }

    // Navicella con rotazione (non durante esplosione)
    {
        ctx.save();
        ctx.translate(spaceship.x + spaceship.width/2, spaceship.y + spaceship.height/2);
        ctx.rotate(spaceship.rotation);

        // No flash effect

        if (spaceship.thrusterActive) {
            ctx.drawImage(images.fire, -spaceship.width/2, spaceship.height/2 - 10, spaceship.width, 30);
        }
        // Disegna la navicella mantenendo le proporzioni (più stretta lateralmente) e centrata
        ctx.drawImage(images.spaceship, -spaceship.width * 0.7/2, -spaceship.height/2, spaceship.width * 0.7, spaceship.height);
        ctx.restore();
    }
    
    // Disegna onde d'urto (burst)
    ctx.save();
    for (const sw of spaceship.shockwaves) {
        const age = Date.now() - sw.created;
        const t = Math.min(1, age / sw.life);
        const life = 1 - t;

        // Effetto più visibile: ondata gialla veloce, glow e riempimento
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Riempimento interno con gradiente giallo -> trasparente
        const gFill = ctx.createRadialGradient(sw.x, sw.y, sw.r * 0.6, sw.x, sw.y, sw.r);
        gFill.addColorStop(0, `rgba(255, 230, 0, ${0.15 * life})`);
        gFill.addColorStop(1, 'rgba(255, 230, 0, 0)');
        ctx.fillStyle = gFill;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.fill();

        // Anello esterno brillante
        const alpha = 0.7 * life;
        ctx.strokeStyle = `rgba(255, 220, 0, ${alpha})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.stroke();

        // Alone più ampio
        const gHalo = ctx.createRadialGradient(sw.x, sw.y, sw.r, sw.x, sw.y, sw.r * 1.3);
        gHalo.addColorStop(0, `rgba(255, 200, 0, ${0.15 * life})`);
        gHalo.addColorStop(1, 'rgba(255, 200, 0, 0)');
        ctx.fillStyle = gHalo;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r * 1.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
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
    
    // Power-up
    for (const p of powerups) {
        ctx.save();
        ctx.translate(p.x + 12, p.y + 12);
        ctx.rotate(p.rot || 0);
        if (p.type === 'ammo') {
            // Box ammo: azzurro/celeste con +10
            ctx.fillStyle = '#5B6EE6';
            ctx.strokeStyle = '#4e5bd6';
            ctx.lineWidth = 2;
            ctx.fillRect(-12, -12, 24, 24);
            ctx.strokeRect(-12, -12, 24, 24);
            ctx.fillStyle = '#05264c';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+10', 0, 0);
        } else if (p.type === 'shield_timed') {
            // Usa la texture PNG del TempShield come item da raccogliere
            if (images.tempShieldIcon && images.tempShieldIcon.complete && images.tempShieldIcon.naturalWidth > 0) {
                ctx.drawImage(images.tempShieldIcon, -14, -14, 28, 28);
            } else {
                // Fallback semplice se l'immagine non è disponibile
                ctx.fillStyle = '#66c9ff';
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI*2);
                ctx.fill();
            }
        } else if (p.type === 'shield_once') {
            // Piccolo scudo
            ctx.drawImage(images.shieldIcon, -14, -14, 28, 28);
        }
        ctx.restore();
    }

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
    }
       
    // Rimossa visualizzazione pizza durante il gameplay
    // Disegna le navicelle nemiche sopra i meteoriti
    if (enemyShips.length > 0) {
        drawEnemyShips();
    }
    // Rimosso bagliore sottostante del power-up scudo temporaneo
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

// Fattore di velocità corrente (modalità infinita + spazio per accelerare)
function getSpeedFactor() {
    // Scala la velocità in base alla dimensione della finestra (1920px è la dimensione di riferimento a schermo intero)
    const screenSizeFactor = window.innerWidth / 1920;
    let factor = (isInfiniteMode ? infiniteSpeedMultiplier : 1) * screenSizeFactor;
    if (gameKeys.space && isInfiniteMode) factor *= 3;
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
    
    // Disabilita gli effetti sonori quando il livello è completato
    audioSystem.isInGame = false;
    
    // Mostra la schermata di congratulazioni
    const gameArea = document.getElementById('game-area');
    if (gameArea) gameArea.classList.add('hidden');
    
    const levelComplete = document.getElementById('level-complete');
    if (!levelComplete) return;
    
    // Resetta e imposta le classi di base
    levelComplete.className = 'game-section';
    levelComplete.classList.add('level-' + lastCompletedLevel, 'bg-image-mode', 'bg-cover');
    levelComplete.style.position = 'fixed';
    levelComplete.style.top = '0';
    levelComplete.style.left = '0';
    levelComplete.style.width = '100%';
    levelComplete.style.height = '100%';
    
    // Imposta lo sfondo corretto per il livello
    levelComplete.style.backgroundImage = `url('img/bg-level${lastCompletedLevel}.svg')`;
    
    // Mostra la sezione e aggiorna il testo del livello
    showSection('level-complete');
    const completedLevelElement = document.getElementById('completed-level');
    if (completedLevelElement) {
        const consegnaNumero = ['prima', 'seconda', 'terza', 'quarta', 'quinta', 'sesta'];
        completedLevelElement.textContent = `Hai completato la ${consegnaNumero[lastCompletedLevel - 1]} consegna!`;
    }

    // Gestione pulsanti a fine livello
    const nextBtn = document.getElementById('next-level-btn');
    const backBtn = document.getElementById('back-to-levels-btn');
    
    // Applica stili personalizzati ai pulsanti
    if (nextBtn) {
        nextBtn.classList.add('menu-button', 'menu-play');
        nextBtn.style.backgroundColor = '#4CAF50';
        nextBtn.style.color = '#ffffff';
        nextBtn.style.fontWeight = 'bold';
    }
    
    if (backBtn) {
        backBtn.classList.add('menu-button', 'menu-docs');
        backBtn.style.backgroundColor = '#2196F3';
        backBtn.style.color = '#ffffff';
        backBtn.style.fontWeight = 'bold';
    }
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
            // Reset spawn scudo singolo per nuova fase
            phaseShieldSpawned = false;
            
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
            
            // Applica colori casuali ai bordi per i livelli sbloccati (come il livello 1)
            const randomBackground = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
            const randomBorder = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
            const darkerShadow = adjustColor(randomBackground, -30);
            
            levelButton.style.backgroundColor = randomBackground;
            levelButton.style.borderColor = randomBorder;
            levelButton.style.boxShadow = `0 4px 0 ${darkerShadow}, 0 0 0 2px #000 inset`;
            levelButton.style.setProperty('--button-shadow-color', darkerShadow);
            levelButton.style.color = '#ffffff';
        } else {
            levelButton.classList.remove('unlocked');
            levelButton.classList.add('locked');
            // Resetta gli stili per i livelli bloccati
            levelButton.style.backgroundColor = '';
            levelButton.style.borderColor = '';
            levelButton.style.boxShadow = '';
            levelButton.style.color = '';
        }
    }
    
    // Gestisci separatamente la modalità infinita (sempre sbloccata)
    const infiniteModeButton = document.getElementById('infinite-mode');
    if (infiniteModeButton) {
        infiniteModeButton.disabled = false;
        infiniteModeButton.style.opacity = '1';
    }
}

// Game over
function gameOver() {
    // Salva il punteggio più alto se in modalità infinita
    if (isInfiniteMode) {
        saveHighScore();
    }
    
    // Riproduci la musica di game over
    audioSystem.playLost();
    // Avvia sequenza esplosione invece di mostrare subito la schermata
    startShipExplosion();
}

// Vittoria
function victory() {
    gameActive = false;
    if (gameLoop) cancelAnimationFrame(gameLoop);
    inputEnabled = false;
    clearGameKeys();
    
    // Disabilita gli effetti sonori quando il gioco termina
    audioSystem.isInGame = false;
    
    // Riproduci la musica di vittoria
    audioSystem.playVictory();
    
    // Aggiornamento dell'interfaccia di game over con messaggio di vittoria
    if (isInfiniteMode) {
        document.getElementById('final-score').textContent = score;
        document.getElementById('final-level').textContent = "Completato!";
    } else {
        document.getElementById('final-score').textContent = '';
        document.getElementById('final-level').textContent = '';
    }
    
    // Visualizzazione della schermata di game over
    document.getElementById('game-area').classList.add('hidden');
    showSection('game-over');
}

let isPaused = false;
let isCountingDown = false;

// Pausa del gioco
function togglePause() {
    const pausePanel = document.getElementById('pause-panel');
    if (!isPaused) {
        isPaused = true;
        gameActive = false;
        if (gameLoop) cancelAnimationFrame(gameLoop);
        // Memorizza inizio pausa per congelare timer scudo temporaneo
        pauseStartedAt = Date.now();
        
        // Abbassa il volume della musica gradualmente quando il gioco è in pausa
        if (audioSystem.currentTrack) {
            // Salva il volume corrente per ripristinarlo dopo
            audioSystem.savedVolume = audioSystem.currentTrack.volume;
            
            // Abbassa il volume gradualmente
            const fadeOutInterval = setInterval(() => {
                if (audioSystem.currentTrack && audioSystem.currentTrack.volume > 0.3) {
                    audioSystem.currentTrack.volume -= 0.05;
                    if (audioSystem.currentTrack.volume <= 0.3) {
                        audioSystem.currentTrack.volume = 0.3; // Volume minimo durante la pausa
                        clearInterval(fadeOutInterval);
                    }
                } else {
                    clearInterval(fadeOutInterval);
                }
            }, 50);
        }
        
        // Mostra il pannello di pausa se non esiste
        if (!pausePanel) {
            const newPausePanel = document.createElement('div');
            newPausePanel.id = 'pause-panel';
            newPausePanel.style.cssText = `
                display: block;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.8);
                padding: 20px;
                border-radius: 15px;
                border-radius: 10px;
                text-align: center;
                color: white;
                z-index: 1000;
            `;
            
            newPausePanel.innerHTML = `
                <h2 style="margin-bottom: 20px; color: #fff;">Gioco in pausa</h2>
                <button id="resume-btn" class="level-button" style="margin: 10px;">Riprendi</button>
                <button id="menu-btn" class="level-button" style="margin: 10px;">Torna al menù</button>
            `;
            
            document.getElementById('game-area').appendChild(newPausePanel);
            
            // Aggiungi il countdown panel se non esiste
            const countdownPanel = document.createElement('div');
            countdownPanel.id = 'countdown-panel';
            countdownPanel.style.cssText = `
                display: none;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                color: white;
                z-index: 1000;
            `;
            document.getElementById('game-area').appendChild(countdownPanel);
            
            // Aggiungi gli event listener ai bottoni
            document.getElementById('resume-btn').onclick = startCountdown;
            document.getElementById('menu-btn').onclick = () => {
                isPaused = false;
                const pausePanel = document.getElementById('pause-panel');
                if (pausePanel) pausePanel.style.display = 'none';
                
                // Ripristina il volume normale prima di tornare al menu
                if (audioSystem.currentTrack && audioSystem.savedVolume) {
                    const fadeInInterval = setInterval(() => {
                        if (audioSystem.currentTrack) {
                            const target = Math.min(1, audioSystem.savedVolume || 1);
                            if (audioSystem.currentTrack.volume < target) {
                                const next = Math.min(target, 1, audioSystem.currentTrack.volume + 0.05);
                                audioSystem.currentTrack.volume = next;
                                if (audioSystem.currentTrack.volume >= target) {
                                    audioSystem.currentTrack.volume = target;
                                    clearInterval(fadeInInterval);
                                }
                            } else {
                                clearInterval(fadeInInterval);
                            }
                        } else {
                            clearInterval(fadeInInterval);
                        }
                    }, 50);
                }
                
                backToMenu();
            };
        } else {
            pausePanel.style.display = 'block';
        }
    }
}

function startCountdown() {
    const pausePanel = document.getElementById('pause-panel');
    const countdownPanel = document.getElementById('countdown-panel');
    
    if (pausePanel) pausePanel.style.display = 'none';
    if (countdownPanel) {
        isCountingDown = true;
        let count = 3;
        
        // Inizia a ripristinare gradualmente il volume durante il countdown
        if (audioSystem.currentTrack && audioSystem.savedVolume) {
            // Se la traccia era stata messa in pausa dalla visibilità, riprendi la riproduzione ora
            if (audioSystem._pausedByVisibility && audioSystem.currentTrack.paused) {
                try { audioSystem.currentTrack.play(); } catch (e) {}
                audioSystem._pausedByVisibility = false;
            }
            const fadeInInterval = setInterval(() => {
                if (!isCountingDown) {
                    clearInterval(fadeInInterval);
                    return;
                }
                if (audioSystem.currentTrack) {
                    const target = Math.min(1, audioSystem.savedVolume || 1);
                    if (audioSystem.currentTrack.volume < target) {
                        const next = Math.min(target, 1, audioSystem.currentTrack.volume + 0.05);
                        audioSystem.currentTrack.volume = next;
                        if (audioSystem.currentTrack.volume >= target) {
                            audioSystem.currentTrack.volume = target;
                            clearInterval(fadeInInterval);
                        }
                    } else {
                        clearInterval(fadeInInterval);
                    }
                } else {
                    clearInterval(fadeInInterval);
                }
            }, 50);
        }
        
        function updateCount() {
            if (count > 0) {
                countdownPanel.style.display = 'block';
                countdownPanel.textContent = count;
                count--;
                setTimeout(updateCount, 1000);
            } else {
                countdownPanel.style.display = 'none';
                isPaused = false;
                isCountingDown = false;
                gameActive = true;
                // Congela i timer basati su Date.now() (es. scudo temporaneo)
                if (pauseStartedAt) {
                    const delta = Date.now() - pauseStartedAt;
                    if (spaceship && typeof spaceship.shieldUntil === 'number' && spaceship.shieldUntil > 0) {
                        spaceship.shieldUntil += delta;
                    }
                    pauseStartedAt = null;
                }
                
                // Assicurati che il volume sia completamente ripristinato
                if (audioSystem.currentTrack && audioSystem.savedVolume) {
                    audioSystem.currentTrack.volume = audioSystem.savedVolume;
                }
                
                startGameLoop();
            }
        }
        
        updateCount();
    }
}

// Variabile per il cooldown del tasto ESC
let lastEscTime = 0;
const escCooldown = 2000; // 5 secondi di cooldown

// Gestione degli input da tastiera
function handleKeyDown(e) {
    // Gestisci ESC per il menu di pausa con cooldown
    if (e.key === 'Escape') {
        // Non fare nulla se il countdown è attivo
        if (isCountingDown) {
            return;
        }
        
        const now = Date.now();
        if (now - lastEscTime < escCooldown) {
            // Non fare nulla se siamo ancora nel cooldown
            return;
        }
        lastEscTime = now;
        
        if (isPaused) {
            startCountdown();
        } else if (inputEnabled) {
            togglePause();
        }
        return;
    }
    
    // Non processare altri tasti se l'input non è abilitato
    if (!inputEnabled) {
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
        case 'a':
        case 'A':
            gameKeys.left = true;
            break;
        case 'd':
        case 'D':
            gameKeys.right = true;
            break;
        case 'w':
        case 'W':
            gameKeys.up = true;
            break;
        case 's':
        case 'S':
            gameKeys.down = true;
            break;
        case ' ':
            gameKeys.space = true; // Spazio per scatto
            break;
        case 'o':
        case 'O':
            gameKeys.o = true; // O per onda d'urto
            break;
        case 'Escape':
            togglePause();
            break;
        case 'p':
        case 'P':
            gameKeys.p = true; // P per sparare
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
        case 'a':
        case 'A':
            gameKeys.left = false;
            break;
        case 'd':
        case 'D':
            gameKeys.right = false;
            break;
        case 'w':
        case 'W':
            gameKeys.up = false;
            break;
        case 's':
        case 'S':
            gameKeys.down = false;
            break;
        case ' ':
            gameKeys.space = false; // Spazio per scatto
            break;
        case 'o':
        case 'O':
            gameKeys.o = false; // O per onda d'urto
            break;
        case 'p':
        case 'P':
            gameKeys.p = false; // P per sparare
            break;
    }
}

// Inizializza i controlli touch: collega i bottoni a gameKeys
function setupTouchControls() {
    // Action buttons (fire, aoe, boost)
    const actionMappings = [
        { id: 'touch-fire', key: 'p' },
        { id: 'touch-aoe', key: 'o' },
        { id: 'touch-boost', key: 'space' }
    ];
    actionMappings.forEach(mapping => {
        const el = document.getElementById(mapping.id);
        if (!el) return;
        const onDown = (ev) => { ev.preventDefault(); gameKeys[mapping.key] = true; try { if (ev.pointerId) el.setPointerCapture(ev.pointerId); } catch(e) {} };
        const onUp = (ev) => { ev && ev.preventDefault(); gameKeys[mapping.key] = false; try { if (ev && ev.pointerId) el.releasePointerCapture(ev.pointerId); } catch(e) {} };
        el.addEventListener('pointerdown', onDown, { passive: false });
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
        el.addEventListener('pointerleave', onUp);
    });

    // Joystick movement
    const joyBase = document.getElementById('joystick-base');
    const joyKnob = document.getElementById('joystick-knob');
    if (joyBase && joyKnob) {
        let activePointer = null;
        let center = { x: 0, y: 0 };
        const baseRect = () => joyBase.getBoundingClientRect();
        const maxRadius = () => Math.min(baseRect().width, baseRect().height) * 0.42;

        const setKnobPos = (dx, dy) => {
            joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        };

        const resetKnob = () => {
            setKnobPos(0,0);
            ['left','right','up','down'].forEach(k => gameKeys[k] = false);
        };

        const onPointerDown = (ev) => {
            ev.preventDefault();
            activePointer = ev.pointerId;
            joyBase.setPointerCapture && joyBase.setPointerCapture(activePointer);
            const r = baseRect();
            center = { x: r.left + r.width/2, y: r.top + r.height/2 };
            onPointerMove(ev);
        };

        const onPointerMove = (ev) => {
            if (activePointer !== null && ev.pointerId !== activePointer) return;
            ev.preventDefault();
            const dx = ev.clientX - center.x;
            const dy = ev.clientY - center.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const r = maxRadius();
            const clampDist = Math.min(dist, r);
            const nx = (dist === 0) ? 0 : dx / dist;
            const ny = (dist === 0) ? 0 : dy / dist;
            const knobX = nx * clampDist;
            const knobY = ny * clampDist;
            setKnobPos(knobX, knobY);

            // Thresholds for directional activation (normalized)
            const threshold = 0.35;
            const normX = clampDist === 0 ? 0 : knobX / r;
            const normY = clampDist === 0 ? 0 : knobY / r;

            // y-axis: negative is up
            gameKeys.left = normX < -threshold;
            gameKeys.right = normX > threshold;
            gameKeys.up = normY < -threshold;
            gameKeys.down = normY > threshold;
        };

        const onPointerUp = (ev) => {
            if (activePointer !== null && ev.pointerId !== activePointer) return;
            ev && ev.preventDefault();
            try { joyBase.releasePointerCapture && joyBase.releasePointerCapture(activePointer); } catch(e) {}
            activePointer = null;
            resetKnob();
        };

        joyBase.addEventListener('pointerdown', onPointerDown, { passive: false });
        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp);
        joyBase.addEventListener('pointercancel', onPointerUp);
    }

    // Sicurezza: al rilascio del puntatore su window, azzera gli stati di input touch (azioni)
    window.addEventListener('pointerup', () => {
        ['p','o','space'].forEach(k => { gameKeys[k] = false; });
    });

    // Disabilita lo scrolling involontario durante il gioco su mobile
    const canvasEl = document.getElementById('game-canvas');
    if (canvasEl) canvasEl.style.touchAction = 'none';
}

function startShipExplosion() {
    // Mantieni il loop attivo per animare l'esplosione
    gameActive = true;
    animationState = 'ship_explosion';
    inputEnabled = false;
    clearGameKeys();
    shipExplosionState.active = true;
    shipExplosionState.start = Date.now();
    shipExplosionState.duration = 1100;
    shipExplosionState.r = 0;
    shipExplosionState.maxR = 260;
    shipExplosionState.x = spaceship.x + spaceship.width/2;
    shipExplosionState.y = spaceship.y + spaceship.height/2;
    
    // Riproduci effetto sonoro morte
    audioSystem.playSFX('lost');
}
