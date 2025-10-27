import express from "express";
import { generatePrices } from "./priceSimulator.js";
import { REDIS_URL, UPDATE_INTERVAL, PORT } from "./config.js";
import http from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*" },
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6,
  });

  // Redis adapter
  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();
  await pubClient.connect();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  app.get("/health", (req, res) => res.json({ ok: true }));
  app.use(express.static(path.resolve(__dirname, "../client")));

  io.on("connection", (socket) => {
    console.log("client connected", socket.id);

    socket.on("subscribe", (symbols = []) => {
      // Join rooms per symbol
      socket.data.subscriptions = symbols;
      symbols.forEach((s) => socket.join(roomName(s)));
    });

    socket.on("disconnect", (reason) => {
      console.log("client disconnected", socket.id, reason);
    });
  });

  // Broadcast loop
  setInterval(() => {
    const ticks = generatePrices();
    // publish per-room to reduce unnecessary network noise
    ticks.forEach((tick) => {
      io.to(roomName(tick.symbol)).emit("crypto:update", tick);
    });
  }, UPDATE_INTERVAL);

  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

function roomName(symbol) {
  return `sym:${symbol}`;
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
