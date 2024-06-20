// Code for the old version of the chat.

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

// Store the last known position of the user, their connection status, and the last chat message sent
let ultimaPosicion = { x: null, y: null };
let estadoConectado = null;
let ultimoMensajeChat = '';
let intervalo;

// Define zones as an array of objects
const zonas = [
  { nombre: "Room 1", superiorIzquierda: { x: 16, y: 52 }, inferiorDerecha: { x: 22, y: 61 } },
  { nombre: "Room 2", superiorIzquierda: { x: 24, y: 52 }, inferiorDerecha: { x: 36, y: 61 } },

  // You can add more zones. Note: any zone outside of these rooms will be considered "Outside".
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

// Function to check the user's status and position
function verificarUsuario(enviarEstadoInicial = false) {
  const jugadores = getPlayers(); // Retrieve the player list
  const usuario = jugadores.find(jugador => jugador.id === usuarioID);
  
  if (usuario) {
    const zonaActual = determinarZona(usuario.x, usuario.y);
    
    if (enviarEstadoInicial) {
      // Notify the initial state with the current position
      enviarMensajeTelegram(`🟢 Initial state: User is <b>connected</b> at ${zonaActual} (${usuario.x}, ${usuario.y}).`, chatIDUsuario);
    } else if (!estadoConectado) {
      // Notify only if there is a zone change
      enviarMensajeTelegram(`🟢 <b>User has connected</b> at ${zonaActual} (${usuario.x}, ${usuario.y}).`, chatIDUsuario);
    } else if (zonaActual !== ultimaZona) {
      // Notify the initial state when the user is offline
      enviarMensajeTelegram(`🚶 User has moved to zone <b>${zonaActual}</b> (${usuario.x}, ${usuario.y}).`, chatIDUsuario);
    }
    
    estadoConectado = true;
    ultimaPosicion = { x: usuario.x, y: usuario.y };
    ultimaZona = zonaActual;
  } else {
    if (enviarEstadoInicial) {
      // Notify the initial state when the user is offline
      enviarMensajeTelegram(`🔴 Initial state: User is <b>offline</b>.`, chatIDUsuario);
    } else if (estadoConectado) {
      // Notify that the user has disconnected
      enviarMensajeTelegram(`🔴 <b>User has disconnected.</b>`, chatIDUsuario);
    }
    estadoConectado = false;
    ultimaPosicion = { x: null, y: null };
    ultimaZona = null;
  }
}

// Variables to store the message history and whether it is the first time checking the chat
let ultimosMensajesEnviados = [];
let esPrimeraVerificacion = true;

// Function to verify and send the latest chat messages
function verificarMensajesChat() {
  const contenedoresMensajes = document.querySelectorAll('.Layout.css-1ij6c7');
  let mensajesActuales = [];

  // Iterates through message containers
  contenedoresMensajes.forEach((contenedor, index) => {
    // Checks only the last 15 messages
    if (index >= contenedoresMensajes.length - 15) {
      const remitente = contenedor.querySelector('.css-s434ht a')?.textContent || 'Unknown';
      const esMensajePrivado = !!contenedor.querySelector('.css-1w6g1uq');
      let prioridad = esMensajePrivado ? "Private Message" : contenedor.querySelector('.css-ztarek, .css-1g827kj')?.textContent || 'No priority';
      const contenido = contenedor.querySelector('.css-1etycw')?.textContent || 'No content';
      
      const mensaje = `${remitente}\n${prioridad}\n${contenido}`;
      mensajesActuales.push(mensaje);
    }
  });

  if (esPrimeraVerificacion) {
    // Only captures current messages without sending notifications
    ultimosMensajesEnviados = [...mensajesActuales];
    esPrimeraVerificacion = false; // Prevent future notifications for the initial load
  } else {
    // Checks if the user has moved to a private zone
    const estaEnZonaPrivada = ultimosMensajesEnviados.length > 0 && !mensajesActuales.some(mensaje => ultimosMensajesEnviados.includes(mensaje));

    if (!estaEnZonaPrivada) {
      // Determines which messages are new by comparing with the last messages sent
      let mensajesNuevos = mensajesActuales.filter(mensaje => !ultimosMensajesEnviados.includes(mensaje));

      // Sends each new message to the corresponding chatID
      mensajesNuevos.forEach(mensaje => {
        let [remitente, prioridad, contenido] = mensaje.split('\n');
        const chatIDFinal = (prioridad === "Everyone" || prioridad === "Nearby") ? chatIDUsuario : chatIDChat;

        // Selects the priority emoji based on the type of priority
        let emojiPrioridad;
        switch (prioridad) {
          case "Everyone":
            emojiPrioridad = "🌍 Everyone";
            break;
          case "Nearby":
            emojiPrioridad = "👫 Nearby";
            break;
          case "Private Message":
            emojiPrioridad = "🔒 Private Message";
            break;
          default:
            emojiPrioridad = "🔖 " + prioridad;
        }

        const texto = `📢 New chat message 📢\n👤 ${remitente}\n${emojiPrioridad}\n\n💬 <b>${contenido}</b>`;
        enviarMensajeTelegram(texto, chatIDFinal);
      });

      // Updates the list of last messages sent only if not in a private zone
      ultimosMensajesEnviados = [...mensajesActuales];
    }
  }
}

// Modify the start function to include chat message verification
function iniciarMonitoreo() {
  if (intervalo) clearInterval(intervalo);
  intervalo = setInterval(() => {
    verificarUsuario();
    verificarMensajesChat(); // Add chat message verification to the interval
  }, 15000);
  // Initial message and status check
  enviarMensajeTelegram(`🔍 Tracker online. Time to work!`, chatIDUsuario);
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

//Start scripts immediately upon pasting
iniciarMonitoreo()