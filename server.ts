import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("splitbill.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    name TEXT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// --- Validation helpers ---

const isValidId = (id: unknown): id is string =>
  typeof id === "string" && id.length > 0 && id.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(id);

const isValidName = (name: unknown): name is string =>
  typeof name === "string" && name.length > 0 && name.length <= 200;

const isValidData = (data: unknown): boolean =>
  data !== null && typeof data === "object";

// --- Rate limiter for WebSocket ---

class RateLimiter {
  private timestamps: Map<WebSocket, number[]> = new Map();
  private maxMessages: number;
  private windowMs: number;

  constructor(maxMessages: number = 30, windowMs: number = 10000) {
    this.maxMessages = maxMessages;
    this.windowMs = windowMs;
  }

  isAllowed(ws: WebSocket): boolean {
    const now = Date.now();
    if (!this.timestamps.has(ws)) {
      this.timestamps.set(ws, []);
    }
    const times = this.timestamps.get(ws)!;
    // Remove timestamps outside the window
    const filtered = times.filter(t => now - t < this.windowMs);
    this.timestamps.set(ws, filtered);

    if (filtered.length >= this.maxMessages) {
      return false;
    }
    filtered.push(now);
    return true;
  }

  remove(ws: WebSocket): void {
    this.timestamps.delete(ws);
  }
}

const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const rateLimiter = new RateLimiter();
  const PORT = 3000;

  app.use(express.json({ limit: "1mb" }));

  // WebSocket logic
  const rooms = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws) => {
    let currentRoom: string | null = null;

    ws.on("message", (message) => {
      try {
        // Rate limiting
        if (!rateLimiter.isAllowed(ws)) {
          ws.send(JSON.stringify({ type: "error", message: "Rate limit exceeded. Please slow down." }));
          return;
        }

        // Payload size check
        const messageStr = message.toString();
        if (messageStr.length > MAX_PAYLOAD_SIZE) {
          ws.send(JSON.stringify({ type: "error", message: "Payload too large." }));
          return;
        }

        const payload = JSON.parse(messageStr);

        if (payload.type === "join") {
          const { roomId } = payload;
          // Validate roomId
          if (!isValidId(roomId)) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid room ID." }));
            return;
          }
          currentRoom = roomId;
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          rooms.get(roomId)!.add(ws);
          console.log(`User joined room: ${roomId}`);
        } else if (payload.type === "update") {
          if (!payload.data || typeof payload.data !== "object") {
            ws.send(JSON.stringify({ type: "error", message: "Invalid update data." }));
            return;
          }
          if (currentRoom && rooms.has(currentRoom)) {
            // Broadcast to everyone else in the room
            rooms.get(currentRoom)!.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(payload));
              }
            });
          }
        }
      } catch (e) {
        console.error("WS Message Error:", e);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format." }));
      }
    });

    ws.on("close", () => {
      rateLimiter.remove(ws);
      if (currentRoom && rooms.has(currentRoom)) {
        rooms.get(currentRoom)!.delete(ws);
        if (rooms.get(currentRoom)!.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    });
  });

  // API routes
  app.get("/api/bills", (_req, res) => {
    try {
      const bills = db.prepare("SELECT * FROM bills ORDER BY created_at DESC").all();
      res.json(bills.map((b: any) => ({ ...b, data: JSON.parse(b.data) })));
    } catch (e) {
      console.error("Failed to fetch bills:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/bills/:id", (req, res) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Invalid bill ID format" });
    }
    try {
      const bill = db.prepare("SELECT * FROM bills WHERE id = ?").get(req.params.id);
      if (!bill) return res.status(404).json({ error: "Bill not found" });
      res.json({ ...bill, data: JSON.parse((bill as any).data) });
    } catch (e) {
      console.error("Failed to fetch bill:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/bills", (req, res) => {
    const { id, name, data } = req.body;

    // Input validation
    if (!isValidId(id)) {
      return res.status(400).json({ error: "Invalid or missing 'id'. Must be 1-50 alphanumeric characters." });
    }
    if (!isValidName(name)) {
      return res.status(400).json({ error: "Invalid or missing 'name'. Must be 1-200 characters." });
    }
    if (!isValidData(data)) {
      return res.status(400).json({ error: "Invalid or missing 'data'. Must be a valid object." });
    }

    try {
      db.prepare("INSERT OR REPLACE INTO bills (id, name, data) VALUES (?, ?, ?)").run(
        id,
        name,
        JSON.stringify(data)
      );
      res.json({ success: true });
    } catch (e) {
      console.error("Failed to save bill:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/bills/:id", (req, res) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: "Invalid bill ID format" });
    }
    try {
      db.prepare("DELETE FROM bills WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      console.error("Failed to delete bill:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
