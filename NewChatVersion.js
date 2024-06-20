// Code for the new version of the chat (beta).

// User and Chat IDs
const usuarioID = 'paste_ID_here'; // Paste the user ID to track here. You can obtain it with getPlayers().
const token = 'paste_token_here'; // Telegram bot token.
const chatIDUsuario = 'paste_ID_here'; // Chat ID for notifications on the channel (public)
const chatIDChat = 'paste_ID_here'; // Personal chat ID for chat messages (private)
// Note: If you prefer to receive all notifications through the same channel, simply paste the same ChatID in both variables.

// Wrapper to cleanly inject the code and pass the gameSpace context to the developer. We keep the wrapper for future breaking updates
function wrapper(fn) {
  fn(gameSpace);
}

/**
 * Get the current possiton as an object of the form
 * {
 *  x: int,
 *  y: int,
 *  mapId: string
 * }
 */
function position() {
  let position
  wrapper((gameSpace) => {
    const { x, y } = gameSpace.gameState[gameSpace.id]
    position = { x, y, mapId: gameSpace.mapId }
  })
  return position
}

/* returns an array of players online
 * [
 *   {
 *      id: <player id>
 *      name: <player name>
 *      emojiStatus: <players emojiStatus if available
 *      map: <player current map name>
 *      x: <position X>
 *      y: <position Y>
 *   }
 * ]
 */
function getPlayers() {
  let players = []
  wrapper((gameSpace) => {
    players = Object.keys(gameSpace.gameState)
      .map(id => {
        const p = gameSpace.gameState[id]
        return {
          id,
          name: p.name,
          emojiStatus: p.emojiStatus,
          map: p.map,
          x: p.x,
          y: p.y,
        }
      })
  })
  return players
}

// Store the last known position of the user, their connection status
let ultimaPosicion = { x: null, y: null };
let estadoConectado = null;
let intervalo;
let chatBoxesState = new Map(); // Variable to store the status of chat boxes

// Define zones as an array of objects
const zonas = [
  { nombre: "Room 1", superiorIzquierda: { x: 16, y: 52 }, inferiorDerecha: { x: 22, y: 61 } },
  { nombre: "Room 2", superiorIzquierda: { x: 24, y: 52 }, inferiorDerecha: { x: 36, y: 61 } },
   // You can add more zones. Note: any area outside of these rooms will be considered "Outside".
];

// Helper Functions
function determinarZona(x, y) {
  const zonaEncontrada = zonas.find(zona => 
    x >= zona.superiorIzquierda.x && x <= zona.inferiorDerecha.x &&
    y >= zona.superiorIzquierda.y && y <= zona.inferiorDerecha.y);

  return zonaEncontrada ? zonaEncontrada.nombre : "Outside";
}

function enviarMensajeTelegram(mensaje, chatID) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const params = {
    chat_id: chatID,
    text: mensaje,
    parse_mode: 'HTML'
  };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  })
  .then(response => response.json())
  .then(data => console.log('Message sent to Telegram:', data))
  .catch(error => console.error('Error sending message to Telegram:', error));
}

// Function to verify the user's status and position
function verificarUsuario(enviarEstadoInicial = false) {
  const jugadores = getPlayers(); // Gets the player list
  const usuario = jugadores.find(jugador => jugador.id === usuarioID);
  
  if (usuario) {
    const zonaActual = determinarZona(usuario.x, usuario.y);
    
    if (enviarEstadoInicial) {
      enviarMensajeTelegram(`🟢 Initial state: The user is <b>connected</b> in ${zonaActual} (${usuario.x}, ${usuario.y}).`, chatIDUsuario);
    } else if (!estadoConectado) {
      enviarMensajeTelegram(`🟢 <b>The user has connected</b> in ${zonaActual} (${usuario.x}, ${usuario.y}).`, chatIDUsuario);
    } else if (zonaActual !== ultimaPosicion.zona) {
      enviarMensajeTelegram(`🚶 The user has moved to the zone <b>${zonaActual}</b> (${usuario.x}, ${usuario.y}).`, chatIDUsuario);
    }
    
    estadoConectado = true;
    ultimaPosicion = { x: usuario.x, y: usuario.y, zona: zonaActual };
  } else {
    if (enviarEstadoInicial) {
      enviarMensajeTelegram(`🔴 Initial state: The user is <b>disconnected</b>.`, chatIDUsuario);
    } else if (estadoConectado) {
      enviarMensajeTelegram(`🔴 <b>The user has disconnected.</b>`, chatIDUsuario);
    }
    estadoConectado = false;
    ultimaPosicion = { x: null, y: null, zona: null };
  }
}

function iniciarMonitoreo() {
  if (intervalo) clearInterval(intervalo);
  intervalo = setInterval(verificarUsuario, 15000);
  console.log('User monitoring started.');
  verificarUsuario(true);
}

function detenerMonitoreo() {
  clearInterval(intervalo);
  
  let mensajeDespedida = "⏸️ Tracker stopped.";

  // Send the farewell message
  enviarMensajeTelegram(mensajeDespedida, chatIDUsuario);

  console.log('User monitoring stopped.');
}

// Function to start monitoring chat boxes
function iniciarMonitoreoDeMensajes() {
  verificarMensajes(true); // Initialize state without notifying
  enviarMensajeTelegram(`🔍 Tracker online. Time to work!`, chatIDUsuario);
  setInterval(() => verificarMensajes(false), 10000); // Check every 10 seconds
}

// Function to verify and notify changes in messages
function verificarMensajes(inicial) {
  const cajasDeChat = document.querySelectorAll('.css-6unyhe');

  // If there are 0 or 1 chat box, simply return without doing anything.
  if (cajasDeChat.length <= 1) {
    console.log(`${cajasDeChat.length} chat box(es) detected, no action taken.`);
    return;
  }

  const cajasActuales = new Map();

  cajasDeChat.forEach((caja, index) => {
    const isLocalChat = caja.querySelector('.css-1i34mb') !== null; // Detect if it's a local chat
    const elementoMensaje = caja.querySelector(isLocalChat ? '.css-1i34mb' : '.css-h8a3ow');
    const elementoUsuario = caja.querySelector('.css-ih3mjt');
    const icono = caja.querySelector('path');
    const ultimoMensaje = elementoMensaje ? elementoMensaje.textContent : 'Message not available';
    const remitente = elementoUsuario ? elementoUsuario.textContent : 'Unknown user';

    // Only store the initial state without notifying
    if (inicial) {
      chatBoxesState.set(caja, ultimoMensaje);
    } else {
      // Check for new messages or chat boxes
      const mensajePrevio = chatBoxesState.get(caja);
      if (mensajePrevio !== ultimoMensaje) {
        let tipoDeChat, chatID;
        if (icono) {
          const dPath = icono.getAttribute('d');
          if (dPath === "M18.583 3.223c1.21 0 2.194.982 2.194 2.194v13.166c0 1.21-.984 2.194-2.194 2.194H5.417a2.195 2.195 0 01-2.194-2.194V9.806c0-1.21.982-2.195 2.194-2.195h4.389V5.417c0-1.212.984-2.194 2.194-2.194h6.583zM5.417 14.743a.55.55 0 00.549.548h1.097a.55.55 0 00.548-.548v-1.098a.55.55 0 00-.548-.548H5.966a.55.55 0 00-.55.549v1.097zm8.229-.549a.55.55 0 00.548-.549v-1.097a.55.55 0 00-.549-.548h-1.097a.55.55 0 00-.548.548v1.098a.55.55 0 00.548.548h1.098zm2.742-.549a.55.55 0 00.549.55h1.097a.55.55 0 00.549-.55v-1.097a.55.55 0 00-.549-.548h-1.097a.55.55 0 00-.549.548v1.098zM5.966 9.806a.55.55 0 00-.55.55v1.096a.55.55 0 00.55.549h1.097a.55.55 0 00.548-.549v-1.097a.55.55 0 00-.548-.548H5.966zM12 7.064a.55.55 0 00.548.548h1.098a.55.55 0 00.548-.548V5.966a.55.55 0 00-.549-.55h-1.097a.55.55 0 00-.548.55v1.097zm4.937-1.646a.55.55 0 00-.549.549v1.097a.55.55 0 00.549.548h1.097a.55.55 0 00.549-.548V5.966a.55.55 0 00-.549-.55h-1.097zM12 10.354a.55.55 0 00.548.549h1.098a.55.55 0 00.548-.549V9.257a.55.55 0 00-.549-.549h-1.097a.55.55 0 00-.548.549v1.097zm6.034.549a.55.55 0 00.549-.549V9.257a.55.55 0 00-.549-.549h-1.097a.55.55 0 00-.549.549v1.097a.55.55 0 00.549.549h1.097z") {
            tipoDeChat = '🌍 Public';
            chatID = chatIDUsuario;
          } else if (dPath === "M9.436 17.019c-4.152-6.018-4.922-6.636-4.922-8.848a5.486 5.486 0 1110.971 0c0 2.212-.77 2.83-4.922 8.848a.686.686 0 01-1.127 0zm.563-6.562a2.286 2.286 0 100-4.571 2.286 2.286 0 000 4.571z") {
            tipoDeChat = '👫 Local';
            chatID = chatIDUsuario;
          } else {
            tipoDeChat = '🔒 Private Message';
            chatID = chatIDChat;
          }
        } else {
          tipoDeChat = '🔒 Private Message';
          chatID = chatIDChat;
        }
        const texto = `📢 New chat message 📢\n👤 ${remitente}\n${tipoDeChat}\n\n💬 <b>${ultimoMensaje}</b>`;
        enviarMensajeTelegram(texto, chatID);
      }
      // Update the current state with the new message
      cajasActuales.set(caja, ultimoMensaje);
    }
  });

  // Only update the complete state if chat boxes were detected and it's not initial
  if (!inicial) {
    chatBoxesState = cajasActuales;
  }
}

//Start scripts immediately upon pasting
iniciarMonitoreo()
iniciarMonitoreoDeMensajes()