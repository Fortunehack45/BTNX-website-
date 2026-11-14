import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { setupRemoteMcp } from "./mcp.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../../public");

const app = express();
const PORT = process.env.PORT || process.env.MCP_PORT || 4001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

// Serve official BTNX Brand Vectors
app.get("/logo.svg", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "btnx-logo.svg")));
app.get("/btnx-logo.svg", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "btnx-logo.svg")));
app.get("/logo.png", (_req: Request, res: Response) => res.sendFile(path.join(publicDir, "favicon-512x512.png")));

// Mount Standalone Remote MCP Server
setupRemoteMcp(app);

// Standalone Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "BTNX Remote MCP Server (Standalone)",
    endpoint: "/mcp",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req: Request, res: Response) => {
  res.redirect("/mcp");
});

app.listen(PORT, () => {
  console.log(`[BTNX Remote MCP] Standalone MCP Server running on port ${PORT}`);
  console.log(`[BTNX Remote MCP] SSE Endpoint: http://localhost:${PORT}/mcp`);
  console.log(`[BTNX Remote MCP] Visual Dashboard: http://localhost:${PORT}/mcp`);
});
