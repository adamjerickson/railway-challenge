let mode = location.href.includes("localhost") ? "development" : "production";

const url =
  mode === "development"
    ? "ws://localhost:3000/websocket"
    : "ws://railway-challenge-production.up.railway.app/websocket";

const socket = new WebSocket(url);

socket.addEventListener("open", function (event) {
  console.log("Connected to WebSocket server");
});

socket.addEventListener("message", function (event) {
  const { author, content, timestamp } = JSON.parse(event.data);

  // Remove the placeholder if it exists
  const placeholder = document.getElementById("placeholder");
  if (placeholder) {
    placeholder.remove();
  }

  const messagesList = document.getElementById("messages");
  const contentSpan = document.createElement("span");
  contentSpan.className = "message-content";
  contentSpan.textContent = content;

  const authorAndContent = document.createElement("div");

  const authorSpan = document.createElement("span");
  authorSpan.className = "message-author";
  authorSpan.textContent = `${author}: `;

  const messageItem = document.createElement("div");
  messageItem.className = "message";
  authorAndContent.appendChild(authorSpan);
  authorAndContent.appendChild(contentSpan);

  const timeSpan = document.createElement("span");
  timeSpan.className = "message-time";
  const date = new Date(timestamp);
  const ampm = date.getHours() > 12 ? "PM" : "AM";
  timeSpan.textContent = dateFns.format(date, "h:mm") + " " + ampm;

  messageItem.appendChild(authorAndContent);
  messageItem.appendChild(timeSpan);

  messagesList.appendChild(messageItem);
});

socket.addEventListener("error", function (event) {
  console.error("WebSocket error:", event);
});

socket.addEventListener("close", function (event) {
  console.log("WebSocket connection closed");
});

setInterval(() => {
  console.log("client running");
}, 10_000);
