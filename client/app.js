const socket = io();
const feed = document.getElementById("feed");
const stats = document.getElementById("stats");

const symbols = ["BTC", "ETH", "SOL", "ADA", "XRP"];
socket.on("connect", () => {
  stats.innerText = `Connected: ${socket.id}`;
  socket.emit("subscribe", symbols);
});

socket.on("crypto:update", (tick) => {
  let row = document.getElementById(`row-${tick.symbol}`);
  if (!row) {
    row = document.createElement("div");
    row.id = `row-${tick.symbol}`;
    row.className = "row";
    feed.appendChild(row);
  }
  row.innerHTML = `<strong>${tick.symbol}</strong> <span class="price">$${
    tick.price
  }</span> <span class="change">${
    tick.change
  }</span> <span class="ts">${new Date(tick.ts).toLocaleTimeString()}</span>`;
});

socket.on("disconnect", () => {
  stats.innerText = "Disconnected";
});
