const http = require("http");
const { listAmrs, simulateUsage } = require("./simulator");

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

  if (req.method === "GET" && url.pathname === "/") {
    sendJson(res, 200, {
      service: "model-c2-amr-emulator",
      usage_url: "/amrs/C2M-000409/usage",
      amrs_url: "/amrs"
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/amrs") {
    sendJson(res, 200, { amrs: listAmrs() });
    return;
  }

  const usageMatch = url.pathname.match(/^\/amrs\/([^/]+)\/usage$/);
  if (req.method === "GET" && usageMatch) {
    const usage = simulateUsage(decodeURIComponent(usageMatch[1]));

    if (!usage) {
      sendJson(res, 404, {
        error: "amr_not_found",
        message: "Unknown AMR ID."
      });
      return;
    }

    sendJson(res, 200, usage);
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, {
    error: "not_found",
    message: "Use GET /amrs/{amr_id}/usage for AMR usage telemetry."
  });
});

server.listen(PORT, () => {
  console.log(`Model C2 AMR emulator listening on port ${PORT}`);
});
