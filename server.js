const http = require("http");
const fs = require("fs");
const path = require("path");

async function parseForm(formUrl) {
  const res = await fetch(formUrl);
  if (!res.ok) throw new Error(`Gagal membuka form (HTTP ${res.status})`);
  const html = await res.text();
  const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/);
  if (!match) throw new Error("Format form tidak dikenali atau form tidak publik.");
  const data = JSON.parse(match[1]);
  const questions = data[1][1] || [];
  return questions.map(q => {
    const title = q[1];
    const item = q[4] && q[4][0];
    if (!item) return null;
    const entryId = item[0];
    const rawOptions = item[1];
    const options = Array.isArray(rawOptions) ? rawOptions.map(o => o[0]) : null;
    return {
      id: `entry.${entryId}`,
      title,
      type: options ? "choice" : "text",
      options
    };
  }).filter(Boolean);
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  if (reqUrl.pathname === "/" || reqUrl.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(path.join(__dirname, "index.html")));
  }

  if (reqUrl.pathname === "/api/inspect") {
    const targetUrl = reqUrl.searchParams.get("url");
    if (!targetUrl) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "URL form wajib diisi." }));
    }
    try {
      const fields = await parseForm(targetUrl);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ fields }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`War GForm server aktif di http://localhost:${PORT}`);
  });
}

module.exports = { server, parseForm };
