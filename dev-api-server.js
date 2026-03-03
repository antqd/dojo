#!/usr/bin/env node
import http from "http";
import url from "url";

const PORT = 3001;

// Dinamicamente import la funzione handler
const getHandler = async (apiName) => {
  try {
    const module = await import(`../api/${apiName}.js`);
    return module.default;
  } catch (error) {
    console.error(`API ${apiName} not found:`, error.message);
    return null;
  }
};

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (!pathname.startsWith("/api/")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const apiName = pathname.replace("/api/", "").replace("/", "");

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const handler = await getHandler(apiName);

      if (!handler) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "API not found" }));
        return;
      }

      req.body = body ? JSON.parse(body) : {};
      console.log(`[API] ${req.method} /api/${apiName}`);

      const result = await handler(req, res);

      if (result?.statusCode) {
        res.writeHead(result.statusCode, result.headers);
        res.end(result.body);
      }
    } catch (error) {
      console.error(`[API Error] ${apiName}:`, error.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🔌 API Dev Server running on http://localhost:${PORT}`);
});
