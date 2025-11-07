// === IMPOSTAZIONI FONT ===
const style = document.createElement('style');
style.innerHTML = `
@font-face {
    font-family: 'PressStart2P';
    src: url('fonts/Press_Start_2P/PressStart2P-Regular.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}

.secret-dialog, .dialog-text, .dialog-line, .dialog-continue-hint {
    font-family: 'PressStart2P', monospace;
}

.dialog-line {
    opacity: 0;
    transition: opacity 0.5s ease;
}

.dialog-line.active {
    opacity: 1;
}
`;
document.head.appendChild(style);

// === VARIABILI DIALOGO ===
const konamiSequence = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight'];
let konamiIndex = 0;
let secretDialogActive = false;
let currentDialogIndex = 0;
let typingInProgress = false;
let typingSpeed = 20;
let dialogShownThisSession = false;
let inputLocked = false;
let secretMusicActive = false;

// === ARRAY DIALOGHI PROTAGONISTA/ CAPO ===
const secretDialogs = [
    {speaker: "???", text: "Ehi piccola, quando hai iniziato a lavorare qui?"},
    {speaker: "Scimmia", text: "Credo qualche anno fa, ma sembra ieri che ero piccola e inesperta."},
    {speaker: "???", text: "Ah sì? Ricordo quando ti ho vista per la prima volta, con quella curiosità infinita."},
    {speaker: "Scimmia", text: "Sì, volevo capire tutto subito, anche se facevo pasticci."},
    {speaker: "???", text: "Eppure hai imparato veloce, più di quanto immaginassi."},
    {speaker: "Scimmia", text: "Ero motivata… non volevo deluderti."},
    {speaker: "???", text: "Ricordo ancora il tuo primo incarico. Ti tremavano le mani."},
    {speaker: "Scimmia", text: "E io tremo ancora un po', ma ora so cosa fare."},
    {speaker: "???", text: "Hai sempre avuto la testa sulle spalle, anche da piccola."},
    {speaker: "Scimmia", text: "Grazie... Significa molto per me."}
];

// === FUNZIONE ATTIVA DIALOGO ===
function activateSecretDialog() {
    if (dialogShownThisSession) return;

    secretDialogActive = true;
    currentDialogIndex = 0;

    const darkOverlay = document.querySelector('.dark-overlay');
    const dialogElement = document.querySelector('.secret-dialog');

    darkOverlay.style.display = 'block';
    setTimeout(() => darkOverlay.classList.add('active'), 100);

    dialogElement.style.display = 'flex';
    setTimeout(() => dialogElement.classList.add('active'), 100);

    dialogShownThisSession = true;
    
    // Attiva la musica segreta solo se l'utente ha già interagito con la pagina
    if (!secretMusicActive) {
        secretMusicActive = true;
        if (audioSystem.currentTrack || document.querySelector('body').classList.contains('user-interacted')) {
            audioSystem.playSecretTrack();
        }
    }
}

// === RESET TOTALE DIALOGO SEGRETO ===
window.resetSecretDialog = function() {
    // Reset flag e stato
    secretDialogActive = false;
    dialogShownThisSession = false;
    currentDialogIndex = 0;
    typingInProgress = false;
    inputLocked = false;

    // Ripristina overlay e contenuto UI
    const dialogElement = document.querySelector('.secret-dialog');
    const darkOverlay = document.querySelector('.dark-overlay');
    const dialogText = document.querySelector('.dialog-text');
    const dialogContinueHint = document.querySelector('.dialog-continue-hint');

    if (dialogElement) {
        dialogElement.classList.remove('active');
        dialogElement.style.display = 'none';
    }
    if (darkOverlay) {
        darkOverlay.classList.remove('active');
        darkOverlay.style.display = 'none';
    }
    if (dialogText) {
        dialogText.innerHTML = '';
    }
    if (dialogContinueHint) {
        dialogContinueHint.style.display = 'none';
    }

    // Musica segreta non persiste se torniamo al menu o moriamo
    secretMusicActive = false;
};

// === FUNZIONE TERMINA DIALOGO ===
function endSecretDialog() {
    secretDialogActive = false;

    const dialogElement = document.querySelector('.secret-dialog');
    const darkOverlay = document.querySelector('.dark-overlay');

    dialogElement.classList.remove('active');
    darkOverlay.classList.remove('active');

    setTimeout(() => {
        dialogElement.style.display = 'none';
        darkOverlay.style.display = 'none';
    }, 1000);
    
    // Torna alla musica principale se non siamo in gioco
    if (!gameActive) {
        secretMusicActive = false;
        if (audioSystem.currentTrack || document.querySelector('body').classList.contains('user-interacted')) {
            audioSystem.playMainTheme();
        }
    }
}

// === MOSTRA TESTO LETTERA PER LETTERA ===
function typeDialogText(dialogObj) {
    const dialogText = document.querySelector('.dialog-text');
    const dialogContinueHint = document.querySelector('.dialog-continue-hint');
    let index = 0;

    dialogContinueHint.style.display = 'none';
    typingInProgress = true;
    inputLocked = true;

    // Controllo: ogni 2 dialoghi vecchi, eliminare tutti
    const lines = Array.from(dialogText.querySelectorAll('.dialog-line'));
    if (lines.length >= 2) {
        lines.forEach(line => line.remove());
    }
    
    // Ottieni il nome del giocatore dal localStorage
    const playerName = localStorage.getItem('playerName') || "Bobo";
    
    // Genera nuovo paragrafo dall'alto
    const newParagraph = document.createElement('p');
    newParagraph.className = 'dialog-line';
    
    // Sostituisci "Scimmia" con il nome del giocatore
    const speakerName = dialogObj.speaker === "Scimmia" ? playerName : dialogObj.speaker;
    newParagraph.innerHTML = `<strong>${speakerName}:</strong> `;
    dialogText.appendChild(newParagraph);

    function addNextLetter() {
        if (index < dialogObj.text.length) {
            newParagraph.textContent += dialogObj.text.charAt(index);
            index++;
            setTimeout(addNextLetter, typingSpeed);
        } else {
            typingInProgress = false;
            dialogContinueHint.style.display = 'block';
            newParagraph.classList.add('active');
            inputLocked = false;
        }
    }

    addNextLetter();
}

// === AVANZA DIALOGO ===
function advanceDialog() {
    if (typingInProgress || inputLocked) return;
    inputLocked = true;

    const dialogText = document.querySelector('.dialog-text');

    // Primo dialogo speciale
    if (currentDialogIndex === 0 && dialogText.children.length === 0) {
        typeDialogText(secretDialogs[currentDialogIndex]);
        return;
    }

    currentDialogIndex++;
    if (currentDialogIndex >= secretDialogs.length) {
        endSecretDialog();
        inputLocked = false;
        return;
    }

    setTimeout(() => typeDialogText(secretDialogs[currentDialogIndex]), 200);
}

// === EVENTI PRINCIPALI ===
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', (e) => {
        // Quando il dialogo segreto è attivo, permetti solo l'avanzamento con SPAZIO
        if (secretDialogActive) {
            if (e.code === 'Space' && !typingInProgress && !inputLocked) {
                advanceDialog();
                e.preventDefault();
                inputLocked = true;
            }
            return;
        }
        // Nessuna gestione del Konami Code qui: l'attivazione avviene in main.js con gating corretto
    });
});
