module.exports = async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "URL form wajib diisi." });
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Gagal membuka form (HTTP ${response.status})` });
    }
    const html = await response.text();
    const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/);
    if (!match) {
      return res.status(400).json({ error: "Format form tidak dikenali atau form tidak publik." });
    }

    const data = JSON.parse(match[1]);
    const questions = data[1][1] || [];
    const fields = questions.map(q => {
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

    return res.status(200).json({ fields });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
