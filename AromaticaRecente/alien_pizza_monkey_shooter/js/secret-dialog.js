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

// === ARRAY DIALOGHI PROTAGONISTA/ CAPO ===
const secretDialogs = [
    {speaker: "Capo", text: "Ehi piccola, quando hai iniziato a lavorare qui?"},
    {speaker: "Scimmia", text: "Credo qualche anno fa, ma sembra ieri che ero piccola e inesperta."},
    {speaker: "Capo", text: "Ah sì? Ricordo quando ti ho vista per la prima volta, con quella curiosità infinita."},
    {speaker: "Scimmia", text: "Sì, volevo capire tutto subito, anche se facevo pasticci."},
    {speaker: "Capo", text: "Eppure hai imparato veloce, più di quanto immaginassi."},
    {speaker: "Scimmia", text: "Ero motivata… non volevo deluderti."},
    {speaker: "Capo", text: "Ricordo ancora il tuo primo incarico. Ti tremavano le mani."},
    {speaker: "Scimmia", text: "E io tremo ancora un po', ma ora so cosa fare."},
    {speaker: "Capo", text: "Hai sempre avuto la testa sulle spalle, anche da piccola."},
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
}

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
}

// === MOSTRA TESTO LETTERA PER LETTERA ===
function typeDialogText(dialogObj) {
    const dialogElement = document.querySelector('.secret-dialog');
    const dialogText = dialogElement.querySelector('.dialog-text');
    const dialogContinueHint = dialogElement.querySelector('.dialog-continue-hint');
    let index = 0;

    dialogContinueHint.style.display = 'none';
    typingInProgress = true;
    inputLocked = true;

    // Controllo: ogni 2 dialoghi vecchi, eliminare tutti
    const lines = Array.from(dialogText.querySelectorAll('.dialog-line'));
    if (lines.length >= 2) {
        lines.forEach(line => line.remove());
    }

    // Genera nuovo paragrafo dall'alto
    const newParagraph = document.createElement('p');
    newParagraph.className = 'dialog-line';
    newParagraph.innerHTML = `<strong>${dialogObj.speaker}:</strong> `;
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

    const dialogElement = document.querySelector('.secret-dialog');
    const dialogText = dialogElement.querySelector('.dialog-text');

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
        if (secretDialogActive) {
            if (e.code === 'Space' && !typingInProgress && !inputLocked) {
                advanceDialog();
                e.preventDefault();
                inputLocked = true;
            }
            return;
        }

        // Gestione Konami Code
        if (e.key === konamiSequence[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiSequence.length) {
                konamiIndex = 0;
                activateSecretDialog();
            }
        } else {
            konamiIndex = 0;
        }
    });
});
