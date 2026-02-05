// Sistema di dialogo per il gioco
let dialogSystem = {
    active: false,
    currentMessage: 0,
    messages: [],
    playerResponses: [], // Risposte del player per ogni messaggio NPC
    timeoutId: null,
    autoCloseTimeout: 2000, // 1 secondo per autoskip
    displayStartTime: 0,
    progressBarInterval: null, // Intervallo per aggiornare la barra di progressione
    messageQueue: [], // Coda dei dialoghi da mostrare
    isPlayerResponse: false, // Flag per indicare se il messaggio corrente è una risposta del player
    timeouts: [], // Array per tenere traccia di tutti i timeout attivi
    currentTypingTimeout: null, // riferimento al timeout del typewriter
    
    // Ottiene il nome del giocatore da localStorage o usa un nome predefinito
    getPlayerName: function() {
        return localStorage.getItem('playerName') || 'Pilota';
    },

    // Forza il salto all'ultimo messaggio (2/2) e blocca/chiude il dialogo corrente
    skipToLastAndBlock: function() {
        // Cancella timeout in corso
        if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
        if (this.progressBarInterval) { clearInterval(this.progressBarInterval); this.progressBarInterval = null; }
        if (this.currentTypingTimeout) { clearTimeout(this.currentTypingTimeout); this.currentTypingTimeout = null; }

        // Se non c'è coda, niente da fare
        if (!this.messageQueue || this.messageQueue.length === 0) {
            // assicurati comunque di nascondere la UI
            const dialogBox = document.getElementById('dialog-box');
            const dialogText = document.getElementById('dialog-text');
            if (dialogText) dialogText.textContent = '';
            if (dialogBox) {
                dialogBox.classList.remove('dialog-visible', 'pilot-speaking', 'chef-speaking', 'bob-speaking');
                dialogBox.classList.add('dialog-hidden');
            }
            this.active = false;
            return;
        }

        // Porta lo stato a 2/2 per il messaggio corrente
        this.currentMessage = Math.min(this.messageQueue.length - 1, this.currentMessage);
        this.isPlayerResponse = true; // 2/2 è la risposta del player

        // Mostra al volo e poi chiudi
        const dialogBox = document.getElementById('dialog-box');
        const dialogText = document.getElementById('dialog-text');
        if (dialogText) {
            dialogText.textContent = '';
        }
        if (dialogBox) {
            dialogBox.classList.remove('dialog-hidden');
            dialogBox.classList.add('dialog-visible');
        }
        // Stampa immediatamente il testo completo senza typewriter
        const currentDialog = this.messageQueue[this.currentMessage];
        const message = currentDialog ? currentDialog.player : '';
        if (dialogText && message) {
            dialogText.textContent = message;
        }

        // Chiudi subito e pulisci ogni cosa
        this.end();
    },

    // Metodo per forzare la conclusione e il reset del dialogo
    forceComplete: function() {
        console.log('[DEBUG] forceComplete: pulizia totale del sistema di dialogo');
        
        // Cancella tutti i timeout
        if (this.timeouts && this.timeouts.length > 0) {
            this.timeouts.forEach(timeout => clearTimeout(timeout));
            this.timeouts = [];
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        if (this.progressBarInterval) {
            clearInterval(this.progressBarInterval);
            this.progressBarInterval = null;
        }
        if (this.currentTypingTimeout) {
            clearTimeout(this.currentTypingTimeout);
            this.currentTypingTimeout = null;
        }

        // Pulisci la UI una sola volta
        let dialogBox = document.getElementById('dialog-box');
        let dialogText = document.getElementById('dialog-text');
        if (dialogBox) {
            dialogBox.classList.remove('dialog-visible', 'pilot-speaking', 'chef-speaking', 'bob-speaking');
            dialogBox.classList.add('dialog-hidden');
        }
        if (dialogText) {
            dialogText.textContent = '';
        }

        // Resetta TUTTE le variabili di stato
        this.active = false;
        this.currentMessage = 0;
        this.messageQueue = [];
        this.isPlayerResponse = false;
        this.displayStartTime = 0;
        this.dialogStartTime = 0;
        this.pauseStartTime = 0;
        this.pausedTime = 0;
        this.isPaused = false;

        // Sblocca il gameplay
        if (typeof resumeMeteorSpawn === 'function') {
            resumeMeteorSpawn();
        }
        if (typeof resumeProgressFill === 'function') {
            resumeProgressFill();
        }
        if (typeof enablePlayerMovement === 'function') {
            enablePlayerMovement();
        }
    },
    
    // Pool di messaggi per ogni livello con relative risposte del player
    messagePools: {
        1: [
            {
                npc: "Chef: Benvenuto nello spazio, {playerName}! Dobbiamo consegnare questa Margherita prima che si raffreddi!",
                player: "{playerName}: Sarà consegnata calda e in tempo record, Chef!"
            },
            {
                npc: "Chef: Attenzione ai meteoriti, {playerName}, non possiamo permetterci di perdere un'altra navicella...",
                player: "{playerName}: Tranquillo, ho riflessi fulminei. Nessun meteorite mi colpirà!"
            }
        ],
        2: [
            {
                npc: "Chef: Ottimo lavoro con la Margherita, {playerName}! Ora abbiamo una Pepperoni da consegnare.",
                player: "{playerName}: La Pepperoni è la mia specialità, sarà un gioco da ragazzi!"
            },
            {
                npc: "Chef: Ho installato un cannone sulla navicella, {playerName}. Premi P per sparare ai meteoriti!",
                player: "{playerName}: Finalmente! Ora posso difendermi invece di solo schivare!"
            }
        ],
        3: [
            {
                npc: "Chef: La Super Spaziale è la nostra pizza più prestigiosa, {playerName}! Non deludermi.",
                player: "{playerName}: La consegnerò con la massima cura, parola di pilota spaziale!"
            },
            {
                npc: "Chef: I meteoriti sono più veloci in questa zona, {playerName}. Usa l'onda d'urto con O in caso di emergenza!",
                player: "{playerName}: Grazie per il consiglio, userò l'onda d'urto con saggezza!"
            }
        ],
        4: [
            {
                npc: "Chef: La Quattro Stagioni è molto richiesta su questo pianeta, {playerName}. Fai attenzione!",
                player: "{playerName}: Ogni stagione al suo posto, garantisco una consegna perfetta!"
            },
            {
                npc: "Chef: Dicono che in questa zona dello spazio ci siano strani fenomeni, {playerName}...",
                player: "{playerName}: Niente può fermare un pilota determinato, nemmeno i fenomeni spaziali!"
            }
        ],
        5: [
            {
                npc: "Chef: La Capricciosa è la preferita degli alieni di questo settore, {playerName}!",
                player: "{playerName}: Gli alieni hanno buon gusto, non li deluderò!"
            },
            {
                npc: "Chef: Questa zona è particolarmente pericolosa, {playerName}. Mantieni la concentrazione!",
                player: "{playerName}: Sono nato per le missioni pericolose, Chef. Nessun problema!"
            }
        ],
        6: [
            {
                npc: "Chef: La pizza Galattica è il nostro orgoglio, {playerName}. Non farla cadere!",
                player: "{playerName}: La tratterò come se fosse fatta di cristallo spaziale!"
            },
            {
                npc: "Chef: Siamo quasi alla fine della nostra missione, {playerName}. Un ultimo sforzo!",
                player: "{playerName}: Darò il massimo per questa consegna finale, Chef!"
            }
        ],
        "infinite": [
            {
                npc: "Chef: Modalità infinita attivata, {playerName}! Vediamo quanto resisti!",
                player: "{playerName}: Potrei continuare a consegnare pizze per l'eternità!"
            },
            {
                npc: "Chef: In questa modalità non ci sono limiti, {playerName}. Dimostra il tuo valore!",
                player: "{playerName}: Nessun limite può fermarmi, sono il miglior pilota della galassia!"
            }
        ],
    },
    
    // Inizializza il dialogo per il livello corrente
    initForLevel: function(level) {
        // Prima di tutto, forza la conclusione di qualsiasi dialogo precedente
        console.log(`[DEBUG] initForLevel: pulizia preventiva prima di inizializzare livello ${level}`);
        
        // Resetta lo stato del dialogo
        this.forceComplete();
        this.active = false;
        this.justCompleted = false;
        
        console.log(`[DEBUG] Inizializzando dialoghi per il livello ${level} (isInfinite: ${isInfiniteMode})`);
        
        // Pulisci completamente il testo e la coda
        const dialogBox = document.getElementById('dialog-box');
        const dialogText = document.getElementById('dialog-text');
        
        // Nascondi immediatamente il box dei dialoghi
        if (dialogBox) {
            dialogBox.classList.remove('dialog-visible', 'pilot-speaking', 'chef-speaking', 'bob-speaking');
            dialogBox.classList.add('dialog-hidden');
        }
        if (dialogText) {
            dialogText.textContent = '';
        }
        this.messageQueue = [];
        
        // Resetta lo stato
        this.active = false;
        this.currentMessage = 0;
        this.isPlayerResponse = false;
        
        // Seleziona il pool di messaggi corretto
        const pool = isInfiniteMode ? this.messagePools.infinite : this.messagePools[level];
        
        // Seleziona dialoghi casuali dal pool
        // Assicuriamoci di avere almeno un dialogo
        const randomIndex = Math.floor(Math.random() * pool.length);
        this.addToQueue(pool[randomIndex].npc, pool[randomIndex].player);
        
        // Aggiungiamo un secondo dialogo casuale (diverso dal primo)
        if (pool.length > 1) {
            let secondIndex;
            do {
                secondIndex = Math.floor(Math.random() * pool.length);
            } while (secondIndex === randomIndex && pool.length > 1);
            this.addToQueue(pool[secondIndex].npc, pool[secondIndex].player);
        }
    },
    
    // Aggiunge un dialogo alla coda
    addToQueue: function(npcMessage, playerResponse) {
        // Sostituisci {playerName} con il nome del giocatore
        const playerName = this.getPlayerName();
        npcMessage = npcMessage.replace(/\{playerName\}/g, playerName);
        playerResponse = playerResponse.replace(/\{playerName\}/g, playerName);
        this.messageQueue.push({
            npc: npcMessage,
            player: playerResponse
        });
    },
    
    // Aggiunge un dialogo di test alla coda
    addTestDialog: function() {
        // Svuota la coda attuale
        this.messageQueue = [];
        
        // Aggiungi una serie di dialoghi di test per verificare il sistema
        const testPool = this.messagePools.test;
        for (let i = 0; i < testPool.length; i++) {
            this.addToQueue(testPool[i].npc, testPool[i].player);
        }
        
        // Se il dialogo non è attivo, avvialo
        if (!this.active) {
            this.start();
        }
    },
    
    // Avvia la sequenza di dialogo
    start: function() {
        if (this.messageQueue.length === 0) {
            console.log('[DEBUG] start: nessun messaggio nella coda, uscita');
            return;
        }
        
        // Se c'è già un dialogo attivo, terminalo prima di iniziarne uno nuovo
        if (this.active) {
            console.log('[DEBUG] start: c\'è già un dialogo attivo, lo termino');
            this.forceComplete();
            return; // Non avviare immediatamente il nuovo dialogo
        }
        
        // Doppio controllo dopo la pulizia
        if (this.active) {
            console.log('[DEBUG] start: dialogo ancora attivo dopo la pulizia, annullo avvio');
            return;
        }
        
        this.active = true;
        this.currentMessage = 0;
        this.isPlayerResponse = false;
        this.displayStartTime = Date.now();
        
        console.log('[DEBUG] start: avvio nuovo dialogo');
        // Mostra il primo messaggio NPC
        this.showCurrentMessage();
        
        // Il player può continuare a muoversi durante i dialoghi
        // inputEnabled = true; // Non disabilitiamo più l'input
        
        // Assicurati che il movimento del player sia abilitato durante il dialogo
        if (typeof enablePlayerMovement === 'function') {
            enablePlayerMovement();
        }
        
        // Riprendi la barra di progresso se era in pausa
        if (typeof resumeProgressFill === 'function') {
            resumeProgressFill();
        }
    },
    
    // Mostra il messaggio corrente
    showCurrentMessage: function() {
        // Protezione contro messaggi sovrapposti
        if (!this.active || !this.messageQueue[this.currentMessage]) {
            console.log('[DEBUG] showCurrentMessage: nessun messaggio valido da mostrare');
            this.forceComplete();
            return;
        }
        console.log(`[DEBUG] Mostrando messaggio ${this.currentMessage + 1}/${this.messageQueue.length} (isPlayerResponse: ${this.isPlayerResponse})`);
        
        const dialogBox = document.getElementById('dialog-box');
        const dialogText = document.getElementById('dialog-text');
        
        // Resetta il testo e cancella eventuali timeout pendenti
        if (this.timeouts && this.timeouts.length > 0) {
            this.timeouts.forEach(timeout => clearTimeout(timeout));
            this.timeouts = [];
        }
        dialogText.textContent = '';
        
        // Rimuovi tutte le classi di posizionamento precedenti
        dialogBox.classList.remove('pilot-speaking', 'chef-speaking', 'bob-speaking');
        
        // Determina il messaggio da mostrare (NPC o risposta del player)
        const currentDialog = this.messageQueue[this.currentMessage];
        
        // Determina chi sta parlando e posiziona il dialogo di conseguenza
        const messageText = this.isPlayerResponse ? currentDialog.player : currentDialog.npc;
        
        if (messageText.startsWith("Pilota:")) {
            dialogBox.classList.add('pilot-speaking');
        } else if (messageText.startsWith("Chef:")) {
            dialogBox.classList.add('chef-speaking');
        } else if (messageText.startsWith("Bob:")) {
            dialogBox.classList.add('bob-speaking');
        }
        
        // Mostra la finestra di dialogo con animazione
        dialogBox.classList.remove('dialog-hidden');
        dialogBox.classList.add('dialog-visible');
        const message = this.isPlayerResponse ? currentDialog.player : currentDialog.npc;
        
        // Effetto typewriter (salviamo il riferimento al timeout per poterlo cancellare)
        let charIndex = 0;
        // Assicuriamoci di cancellare eventuali timeout del typewriter precedenti
        if (this.currentTypingTimeout) {
            clearTimeout(this.currentTypingTimeout);
            this.currentTypingTimeout = null;
        }

        const typeWriter = () => {
            // Se il gioco è in pausa, non continuare a scrivere
            if (typeof isPaused !== 'undefined' && isPaused) {
                // Salva lo stato attuale e riprendi dopo il countdown
                const currentIndex = charIndex;
                const checkPauseState = () => {
                    if (!isPaused && !isCountingDown) {
                        // Riprendi da dove eravamo rimasti
                        charIndex = currentIndex;
                        typeWriter();
                    } else {
                        // Controlla di nuovo tra poco
                        this.currentTypingTimeout = setTimeout(checkPauseState, 100);
                    }
                };
                this.currentTypingTimeout = setTimeout(checkPauseState, 100);
                return;
            }

            if (charIndex < message.length) {
                dialogText.textContent += message.charAt(charIndex);
                charIndex++;
                // Velocità di digitazione variabile in base a chi parla
                let typingSpeed = 15; // Velocità normale
                if (message.startsWith("Bob:")) {
                    typingSpeed = 10; // Bob parla più velocemente
                }
                this.currentTypingTimeout = setTimeout(typeWriter, typingSpeed);
            }
        };

        typeWriter();
        this.displayStartTime = Date.now();
        
            // Imposta il timeout per la chiusura automatica
        this.setAutoCloseTimeout();
    },
    
    // Passa al messaggio successivo o termina il dialogo
    nextMessage: function() {
        console.log(`[DEBUG] nextMessage: pulisco i timeout e gestisco la transizione`);
        
        // Cancella il timeout automatico e l'intervallo della barra di progressione
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        if (this.progressBarInterval) {
            clearInterval(this.progressBarInterval);
        }
        // Cancella anche eventuale timeout del typewriter
        if (this.currentTypingTimeout) {
            clearTimeout(this.currentTypingTimeout);
            this.currentTypingTimeout = null;
        }
        
        // Se è un messaggio NPC, passa alla risposta del player
        if (!this.isPlayerResponse) {
            console.log('[DEBUG] nextMessage: passo alla risposta del player');
            this.isPlayerResponse = true;
            this.showCurrentMessage();
        } else {
            // Se è una risposta del player, passa al prossimo dialogo NPC
            console.log('[DEBUG] nextMessage: passo al prossimo dialogo NPC');
            this.isPlayerResponse = false;
            this.currentMessage++;
            
            // Se ci sono altri messaggi, mostrali
            if (this.currentMessage < this.messageQueue.length) {
                this.showCurrentMessage();
            } else {
                // Altrimenti termina il dialogo
                console.log('[DEBUG] nextMessage: nessun altro messaggio, termino il dialogo');
                this.end();
            }
        }
    },
    
    // Termina la sequenza di dialogo
    end: function() {
        console.log('[DEBUG] end: terminazione dialogo in corso');
        const dialogBox = document.getElementById('dialog-box');
        
        // Cancella il timeout automatico
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        // Cancella anche eventuale timeout del typewriter
        if (this.currentTypingTimeout) {
            clearTimeout(this.currentTypingTimeout);
            this.currentTypingTimeout = null;
        }
        
        // Nascondi la finestra di dialogo con animazione
        dialogBox.classList.remove('dialog-visible', 'pilot-speaking', 'chef-speaking', 'bob-speaking');
        dialogBox.classList.add('dialog-hidden');
        
        // Dopo l'animazione di chiusura, resetta lo stato
        setTimeout(() => {
            console.log('[DEBUG] end: stato resettato, dialogo completamente terminato');
            // Usa forceComplete per assicurarci che tutto sia pulito correttamente
            this.forceComplete();
            
            // Avvia lo spawn dei meteoriti se necessario
            if (typeof startMeteorSpawn === 'function') {
                startMeteorSpawn();
            }
        }, 300); // Durata dell'animazione di chiusura
    },
    
    // Imposta il timeout per la chiusura automatica
    setAutoCloseTimeout: function() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        
        // Salva il tempo di inizio
        this.dialogStartTime = Date.now();
        this.pausedTime = 0;
        this.isPaused = false;
        
        const checkAndClose = () => {
            // Se il gioco è in pausa
            if (typeof isPaused !== 'undefined' && (isPaused || isCountingDown)) {
                if (!this.isPaused) {
                    // Memorizza quando è iniziata la pausa
                    this.pauseStartTime = Date.now();
                    this.isPaused = true;
                }
                
                // Controlla di nuovo tra poco
                this.timeoutId = setTimeout(checkAndClose, 100);
                return;
            } else if (this.isPaused) {
                // Il gioco è ripreso dopo una pausa
                this.pausedTime += (Date.now() - this.pauseStartTime);
                this.isPaused = false;
            }
            
            // Calcola il tempo effettivamente trascorso (escludendo le pause)
            const elapsedTime = Date.now() - this.dialogStartTime - this.pausedTime;
            
            if (elapsedTime >= this.autoCloseTimeout) {
                // Il tempo è scaduto, passa al messaggio successivo
                this.nextMessage();
            } else {
                // Altrimenti continua a controllare
                const remainingTime = this.autoCloseTimeout - elapsedTime;
                this.timeoutId = setTimeout(checkAndClose, Math.min(remainingTime, 100));
            }
        };
        
        this.timeoutId = setTimeout(checkAndClose, 100);
    },
    
    // Gestisce l'input del giocatore durante il dialogo
    handleInput: function(key) {
        // Non permettiamo più di skippare i dialoghi con la barra spaziatrice
        // Il giocatore può solo muoversi durante i dialoghi
        return false;
    },
    
    // Chiude istantaneamente il dialogo in caso di sconfitta
    closeOnDefeat: function() {
        // Interrompi tutti i timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        if (this.progressBarInterval) {
            clearInterval(this.progressBarInterval);
            this.progressBarInterval = null;
        }
        // Cancella anche eventuale timeout del typewriter
        if (this.currentTypingTimeout) {
            clearTimeout(this.currentTypingTimeout);
            this.currentTypingTimeout = null;
        }
        
        // Chiudi il dialogo
        this.active = false;
        this.messageQueue = [];
        this.currentMessage = 0;
        
        // Nascondi il dialog box
        const dialogBox = document.getElementById('dialog-box');
        dialogBox.classList.remove('dialog-visible');
        dialogBox.classList.add('dialog-hidden');
    },
    
    // Aggiorna il sistema di dialogo (da chiamare nel game loop)
    update: function() {
        // Implementazione futura se necessario
    }
};

// Funzione per avviare lo spawn dei meteoriti
// Esportata globalmente per essere accessibile da main.js
window.startMeteorSpawn = function() {
    // Riprendi lo spawn dei meteoriti e il riempimento della barra di progresso
    resumeMeteorSpawn();
    resumeProgressFill();
    
    // Assicurati che il movimento del player sia abilitato
    enablePlayerMovement();
};

// Funzione per avviare la sequenza di dialogo dopo il decollo
// Esportata globalmente per essere accessibile da main.js
window.startDialogAfterTakeoff = function() {
    // Prima ferma qualsiasi dialogo precedente e pulisci tutto
    dialogSystem.forceComplete();
    
    // Aspetta un attimo per assicurarci che tutto sia pulito
    setTimeout(() => {
        // Inizializza il dialogo per il livello corrente
        dialogSystem.initForLevel(currentLevel);
        
        // Metti in pausa la barra di progresso e lo spawn dei meteoriti
        pauseProgressFill();
        pauseMeteorSpawn();
        
        // Avvia il dialogo (il player può continuare a muoversi)
        dialogSystem.start();
    }, 100);
};

// Funzione per testare il sistema di dialogo
// Esportata globalmente per essere accessibile da main.js
window.testDialogSystem = function() {
    // Aggiungi un dialogo di test alla coda
    dialogSystem.addTestDialog();
};

// Event listener per la barra spaziatrice
document.addEventListener('keydown', function(event) {
    // Se il dialogo è attivo, gestisci l'input
    if (dialogSystem.active) {
        if (dialogSystem.handleInput(event.key)) {
            event.preventDefault();
        }
    }
});