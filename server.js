const WebSocket = require("ws");
const { startDiscordClient, stopDiscordClient } = require("./discordClient");

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Main method to handle WebSocket connections
function main() {
  console.log("WebSocket server is running");

  // Event listener for new WebSocket connections
  wss.on("connection", function connection(ws) {
    console.log("A new client connected");

    // Event listener for messages from clients
    ws.on("message", function incoming(message) {
      const { author, content } = JSON.parse(message);

      console.log("Received message from client:", author, content);

      // Send the message to the clients who are listening (client.js)
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(JSON.parse(message)));
        }
      });
    });

    // Event listener for client disconnection
    ws.on("close", function close() {
      console.log("Client disconnected");
    });

    ws.on("closeDiscord", function closeDiscord() {
      console.log("Discord connection closed");
      stopDiscordClient();
    });
  });

  startDiscordClient();
}

// Call the main method
main();
