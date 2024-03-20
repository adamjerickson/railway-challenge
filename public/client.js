const socket = new WebSocket(`ws://0.0.0.0:${process.env.PORT}`);

socket.addEventListener("open", function (event) {
  console.log("Connected to WebSocket server");
});

socket.addEventListener("message", function (event) {
  const { author, content } = JSON.parse(event.data);

  // Remove the placeholder if it exists
  const placeholder = document.getElementById("placeholder");
  if (placeholder) {
    placeholder.remove();
  }

  const messagesList = document.getElementById("messages");
  const contentSpan = document.createElement("span");
  contentSpan.className = "message-content";
  contentSpan.textContent = content;

  const authorSpan = document.createElement("span");
  authorSpan.className = "message-author";
  authorSpan.textContent = `${author}: `;

  const messageItem = document.createElement("div");
  messageItem.className = "message";
  messageItem.appendChild(authorSpan);
  messageItem.appendChild(contentSpan);

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
