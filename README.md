## Socket.IO Crypto Feed Demo

### Overview
Real‑time crypto price feed demo using Node.js, Socket.IO, Redis pub/sub adapter, and Nginx as a WebSocket‑aware load balancer. The stack is containerized with Docker Compose and runs two app replicas behind Nginx.

### Why this project
- **WebSockets at scale**: Demonstrates horizontal scaling of Socket.IO with a Redis adapter so events are fanned out across replicas.
- **Load balancing**: Nginx provides a single entrypoint and handles WebSocket upgrades.

---

## Architecture
- `nginx` listens on `:8080` and load balances to `app1:3000` and `app2:3001` with sticky sessions (`ip_hash`).
- `app1` and `app2` are identical Node.js servers publishing simulated ticks to per‑symbol rooms.
- `redis` is used by `@socket.io/redis-adapter` so messages emitted on any instance reach all subscribed clients.

Flow:
1. Browser connects to `http://localhost:8080/socket.io/` via Nginx
2. Nginx proxies the connection to one of the app instances and upgrades to WebSocket
3. App instances broadcast ticks to rooms; Redis adapter forwards between instances

---

## Tech stack and docs
- **Node.js 20**: runtime for the server. [Docs](https://nodejs.org/en/docs)
- **Express 4**: HTTP server and static file hosting. [Docs](https://expressjs.com/)
- **Socket.IO 4**: real‑time engine (WebSocket + fallbacks). [Docs](https://socket.io/docs/v4)
- **@socket.io/redis-adapter**: cross‑node pub/sub. [Docs](https://socket.io/docs/v4/redis-adapter/)
- **Redis 7**: message broker. [Docs](https://redis.io/docs/latest/)
- **Nginx 1.27‑alpine**: reverse proxy and load balancer. [Docs](https://nginx.org/en/docs/)
- **Docker Compose v2**: one‑command local stack. [Docs](https://docs.docker.com/compose/)
- **Artillery**: YAML‑based load testing with a Socket.IO engine. [Docs](https://www.artillery.io/docs)

---

## Repository layout
- `server/`
  - `index.js`: Express + Socket.IO server, Redis adapter wiring
  - `config.js`: env parsing for `PORT`, `REDIS_URL`, `UPDATE_INTERVAL`
  - `priceSimulator.js`: generates random price ticks
  - `Dockerfile`: Node 20 image for the server
- `client/`
  - `index.html`, `style.css`, `app.js`: simple UI subscribing to tick updates
- `nginx/nginx.conf`: upstream, WebSocket upgrade headers, and proxy rules
- `docker-compose.yml`: services for `redis`, two app replicas, and `nginx`

---

## How it works (server)
The server exposes HTTP and a Socket.IO endpoint.
- On connect, the client emits `subscribe` with an array of symbols.
- The server puts each socket into a room (one per symbol) and starts broadcasting ticks on an interval to those rooms.
- With the Redis adapter enabled, room emits are propagated across all app instances.

Socket.IO options in use:
- `cors: { origin: "*" }` (relax for local dev; restrict in prod)
- `pingInterval: 25000`, `pingTimeout: 60000`
- `maxHttpBufferSize: 1e6`

---

## Prerequisites
- Docker Desktop (or Docker Engine + Compose). [Install guide](https://docs.docker.com/get-docker/)
- Git (to clone/push). [Install guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

---

## Quick start (Docker)
1. Start the stack:
```bash
docker compose up --build
```
2. Open the app in your browser:
```
http://localhost:8080
```
3. Health check (proxied to one app instance):
```
http://localhost:8080/health
```

Compose services:
- `redis:7` (no host port exposed)
- `app1` (`PORT=3000`) and `app2` (`PORT=3001`)
- `nginx` exposed on host `:8080`

Environment variables (set in `docker-compose.yml`):
- `PORT`: per‑container HTTP port (internal only)
- `REDIS_HOST`: hostname for Redis (default `redis`)
- `UPDATE_INTERVAL`: tick broadcast interval in ms (default `500`)

---

## Load testing
Use the YAML-based test with Artillery’s Socket.IO engine.

1) Ensure the stack is running:
```bash
docker compose up --build
```

2) Run Artillery from the repository root:
```bash
# Preferred (no global install):
npx artillery@latest run socketio-load-testing.yml

# Or with global install:
npm install -g artillery
artillery run socketio-load-testing.yml
```

What it does
- Connects to `http://localhost:8080` using Socket.IO (forced WebSocket transport).
- Emits `subscribe` with the default symbols.
- Holds the connection to receive tick events.

Tuning
- Edit `socketio-load-testing.yml`:
  - `config.target`: change URL if needed
  - `config.phases`: increase `arrivalRate` and `duration` to scale up
  - `config.engineOptions.socketio`: transports, reconnection, timeouts (already tuned for WS-only)
  - `config.variables.symbols`: adjust subscribed symbols

Sample output (console excerpt)
```
--------------------------------------
Metrics for period to: 12:34:56 (width: 10.0s)
--------------------------------------
socketio.emit: ......................................................... 200
socketio.emit_rate: .................................................... 20/sec
vusers.created: ........................................................ 200
vusers.created_by_name.Socket.IO subscribe and receive ticks: .......... 200
```

Tips:
- Ensure Docker stack is running first.
- Prefer `transports=["websocket"]` (this harness forces WS) for consistent results.
- Increase `clients` gradually; monitor CPU/memory of `app` and `nginx` containers.

---

## Running without Docker (optional)
1. Start Redis locally (choose one):
   - Homebrew: `brew install redis && brew services start redis`
   - Docker: `docker run --rm -p 6379:6379 redis:7`
2. Run the server:
```bash
cd server
npm install
PORT=3000 REDIS_HOST=localhost node index.js
```
3. Open:
```
http://localhost:3000
```

---

## Nginx load balancing notes
- Config: `nginx/nginx.conf`
- Upstream `socketio_upstream` -> `app1:3000`, `app2:3001`
- WebSocket upgrade in `/socket.io/` location via `Upgrade` and `Connection: upgrade`
- Sticky sessions with `ip_hash`

---

## Configuration tips
- Restrict CORS (Socket.IO `cors.origin`) to your exact origin(s) in production.
- Tune `UPDATE_INTERVAL` and consider batching when symbols or clients grow.
- Add auth and rate limiting for the `subscribe` event.
- Add graceful shutdown: close Redis connections and `io.close()`.