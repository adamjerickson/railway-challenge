const WebSocket = require("ws");
import("node-fetch");

const state = {
  resumeGatewayUrl: null,
  sessionId: null,
  sequence: 0,
  token: process.env.DISCORD_TOKEN,
  ws: null,
  running: true,
  heartbeatInterval: 20000, // Default value. Will be updated by the server.
};

const DEFAULT_IDENTIFY_PARAMS = {
  token: state.token ?? null,
  intents: 512, // Listen for messages only.
  version: 10,
  properties: {
    $os: "linux",
    $browser: "chrome",
    $device: "chrome",
  },
};

async function startDiscordClient() {
  await connectToDiscord();
  await connectToLocalServer();
}

async function stopDiscordClient() {
  closeWs();
  closeLocalWs();
}

async function connectToLocalServer() {
  const mode = process.env.MODE;

  const url =
    mode === "development"
      ? "ws://localhost:3000/websocket"
      : `ws://0.0.0.0:${process.env.PORT}/websocket`;

  const ws = new WebSocket(url);

  ws.addEventListener("open", function open() {
    console.log("Connected to local server");
  });

  ws.addEventListener("error", function (event) {
    console.error("WebSocket error:", event);
  });

  ws.addEventListener("close", function (event) {
    console.log("WebSocket connection closed");
  });

  state.localWs = ws;
}

async function sendToServer(message) {
  state.localWs?.send(message);
}

async function closeLocalWs() {
  state.localWs?.close();
  state.localWs = null;
}

async function getLocalWs() {
  if (state.localWs) {
    return state.localWs;
  } else {
    await connectToLocalServer();
    return state.localWs;
  }
}

async function connectToDiscord() {
  const ws = await getDiscordWs();

  identifyPayload = {
    op: 2,
    d: DEFAULT_IDENTIFY_PARAMS,
  };

  ws.addEventListener("open", async function open() {
    await ws.send(JSON.stringify(identifyPayload));
    await setupMessageHandling(ws);
    console.log("Connected to Discord.");
  });

  //$$$$  Keep the script running.
  setInterval(() => {
    if (ws.readyState !== 1) {
      console.log("Discord websocket not connected. Will not send heartbeat.");
      return;
    } else {
      ws.send(JSON.stringify({ op: 1, d: null })); // opcode 1 is for heartbeat.
    }
    ws.send(JSON.stringify({ op: 1, d: null })); // opcode 1 is for heartbeat.
  }, state.heartbeatInterval);
}

async function getDiscordWs() {
  if (state.ws) {
    return state.ws;
  } else {
    await connectToGateway();
    return state.ws;
  }
}

function closeWs() {
  state.ws?.close();
  state.ws = null;
}

async function getGatewayUrl() {
  const response = await fetch("https://discord.com/api/v10/gateway");
  const data = await response.json();
  state.resumeGatewayUrl = data.url;
  return data.url;
}

async function connectToGateway(onOpenCallback) {
  state.ws?.close();
  state.ws = null;

  const gateway = await getGatewayUrl();
  ws = new WebSocket(gateway);

  ws.onopen = () => {
    console.log("Connected to gateway");
  };

  if (onOpenCallback) {
    onOpenCallback(state.ws);
  }

  ws.onclose = async ({ code }) => {
    console.log("Disconnected from gateway");
    switch (code) {
      case 4000:
        console.log(
          "Gateway connection closed with code 4000. Trying to resume."
        );
        await resume();
    }
  };

  state.ws = ws;
}

async function resume() {
  if (state.ws.readyState === 1) {
    // Already connected. Don't do anything.
    return;
  }

  if (state.reconnectUrl) {
    state.ws?.close();
    state.ws = null;

    const newWs = new WebSocket(state.reconnectUrl);

    newWs.onopen = () => {
      newWs.send(
        JSON.stringify({
          op: 6,
          d: {
            token: state.token,
            session_id: state.sessionId,
            seq: state.sequence,
          },
        })
      );
      console.log(
        "Reopened gateway connection from sequence: ",
        state.sequence
      );
    };

    newWs.onclose = async ({ code }) => {
      console.log("Disconnected from gateway");
      switch (code) {
        case 4000:
          console.log(
            "Gateway connection closed with code 4000. Trying to resume."
          );
          await resume();
          break;
        case 4007:
          console.log(
            "Tried to reconnect to gateway with invalid session. Reconnecting with new session."
          );
          await connectToGateway();
          break;
        case 4009:
          console.log(
            "Gateway connection timed out.  Reconnecting with new session."
          );
          await connectToGateway();
          break;
      }
    };

    state.ws = newWs;
  } else {
    await connectToGateway(() => {
      console.log("Reconnected to gateway with new connection.");
    });
  }

  return;
}

async function setupMessageHandling() {
  ws = await getDiscordWs();

  if (ws.readyState !== 1) {
    console.log("Websocket not connected. Will not listen for messages.");
    return;
  }

  ws.addEventListener("message", function incoming(data) {
    var payload = JSON.parse(data.data);

    const { t, op, d } = payload;

    switch (op) {
      // Server asks us to reconnect. Try to resume.
      case 7:
        ws.close();
        resume();
        break;

      // Hello message:  Gives us the heartbeat interval.
      case 10:
        state.heartbeatInterval = d.heartbeat_interval;
        break;
    }

    switch (t) {
      case "READY":
        state.sessionId = d.session_id;
        break;

      // IF MESSAGE IS CREATED, IT WILL LOG IN THE CONSOLE
      case "MESSAGE_CREATE":
        sendToServer(
          JSON.stringify({
            author: d.author.global_name,
            content: d.content,
            timestamp: d.timestamp,
          })
        );
    }
  });
}

module.exports = {
  startDiscordClient,
  stopDiscordClient,
};
