const http = require("http");
const { simulateUsage } = require("./simulator");

const PORT = Number(process.env.PORT || 3000);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);

  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*"
  });
  res.end(`${body}\n`);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/usage")) {
    sendJson(res, 200, simulateUsage());
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, {
    error: "not_found",
    message: "Use GET /usage for AMR usage telemetry."
  });
});

server.listen(PORT, () => {
  console.log(`Model C2 AMR emulator listening on port ${PORT}`);
});
