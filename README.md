# Pizzeria Interspaziale Aromatica 🚀🍕

**Gioco arcade web con estetica retro**: pilota una navicella, supera livelli e sfida la modalità infinita. Musica e SFX originali, controlli semplici e interfaccia vivace.

## 🎮 Demo

* **Online (GitHub Pages)**:
  `https://manikino.github.io/Pizzeria_Interspaziale_Aromatica` sulla barra di ricerca del tuo browser
* **In locale**: apri `index.html` o utilizza un server statico.

## 💻 Avvio in locale

### Metodo rapido

Apri `index.html` con un browser moderno.

### Metodo consigliato (per problemi audio/autoplay)

Usa un server statico:

* **Node.js**: `npx serve .`
* **Python 3**: `python -m http.server 5500`
* **VS Code**: estensione **Live Server**

## 🕹 Controlli

* **Movimento**: frecce (`ArrowUp/Down/Left/Right`) o `W/A/S/D`
* **Scatto/Dash**: `Space` solo in modalità infinita
* **Onda d’urto / AOE**: `O`
* **Sparo**: `P`
* **Pausa/Menu**: `Esc` (menu con **Riprendi** e **Torna al menù**) > Tornando in gioco parte un breve countdown.

## 🏁 Modalità di gioco

* **Selezione livelli**: `Livello 1` → `Livello 6`
* **Modalità infinita**: sopravvivi il più a lungo possibile
* **Schermate di stato**: `Game Over`, `Level Complete`, `Level Select`
* **Musica dinamica**: tracce diverse per ogni livello, tema principale nel menu, brano “Secret” in eventi particolari

## 🔊 Audio

* Cartelle: `Songs/` (musica) e `SFX/` (effetti sonori)
* Volume e transizioni gestite dinamicamente (fade-in/fade-out)
* Audio parte solo dopo un’interazione dell’utente (click su **“Sono pronto”**)

## 💾 Salvataggi

Memorizzati tramite `localStorage`:

* `highScore`: punteggio massimo
* `highestPhase`: massimo livello/fase raggiunta
* `playerName`: nome del giocatore

## 📂 Struttura del progetto

* `index.html` → entry point
* `css/style.css` → stile e interfaccia
* `js/main.js` → logica di gioco, input, loop, UI
* `js/dialog.js` → dialoghi e UI testuale
* `js/secret-dialog.js` → eventi/dialoghi segreti
* `img/` → sfondi, sprite, UI
* `Songs/` → musica dei livelli e temi
* `SFX/` → effetti sonori
* `fonts/Press_Start_2P/PressStart2P-Regular.ttf` → font retro

## ⚙️ Requisiti

* Browser moderno (Chrome, Firefox, Edge, Safari)
* Consigliato server statico per evitare limitazioni su `file://`

## 🚀 Roadmap

* Miglioramento bilanciamento livelli
* Effetti particellari aggiuntivi
* Ottimizzazione performance su dispositivi mobili

## 🤝 Contributi

* Issue e PR sono benvenuti
* Prima di contribuire, apri una **issue** descrivendo la modifica proposta
