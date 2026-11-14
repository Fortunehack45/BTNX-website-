import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { setupRemoteMcp } from "../server/src/mcp.js";
import path from "path";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve brand vectors if requested
app.get("/logo.svg", (_req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), "public/btnx-logo.svg"));
});

// Mount Remote MCP Server
setupRemoteMcp(app);

// Standalone Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "BTNX Remote MCP Server (Vercel Serverless)",
    endpoint: "/mcp",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req: Request, res: Response) => {
  res.redirect("/mcp");
});

export const config = {
  maxDuration: 60,
};

export default app;
