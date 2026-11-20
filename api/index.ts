import type { IncomingMessage, ServerResponse } from "http";

export const config = {
  maxDuration: 60,
};

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(
    JSON.stringify({
      status: "healthy",
      service: "BTNX Store Luxury Engine",
      version: "2.5.0",
      timestamp: new Date().toISOString(),
    })
  );
}
