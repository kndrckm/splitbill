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

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

  // WebSocket logic
  const rooms = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws) => {
    let currentRoom: string | null = null;

    ws.on("message", (message) => {
      try {
        const payload = JSON.parse(message.toString());
        
        if (payload.type === "join") {
          const { roomId } = payload;
          currentRoom = roomId;
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          rooms.get(roomId)!.add(ws);
          console.log(`User joined room: ${roomId}`);
        } else if (payload.type === "update") {
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
      }
    });

    ws.on("close", () => {
      if (currentRoom && rooms.has(currentRoom)) {
        rooms.get(currentRoom)!.delete(ws);
        if (rooms.get(currentRoom)!.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    });
  });

  // API routes
  app.get("/api/bills", (req, res) => {
    const bills = db.prepare("SELECT * FROM bills ORDER BY created_at DESC").all();
    res.json(bills.map((b: any) => ({ ...b, data: JSON.parse(b.data) })));
  });

  app.get("/api/bills/:id", (req, res) => {
    const bill = db.prepare("SELECT * FROM bills WHERE id = ?").get(req.params.id);
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    res.json({ ...bill, data: JSON.parse((bill as any).data) });
  });

  app.post("/api/bills", (req, res) => {
    const { id, name, data } = req.body;
    db.prepare("INSERT OR REPLACE INTO bills (id, name, data) VALUES (?, ?, ?)").run(
      id,
      name,
      JSON.stringify(data)
    );
    res.json({ success: true });
  });

  app.delete("/api/bills/:id", (req, res) => {
    db.prepare("DELETE FROM bills WHERE id = ?").run(req.params.id);
    res.json({ success: true });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
