module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });
  const prompt = req.body && req.body.prompt;
  if (typeof prompt !== "string" || prompt.length < 20 || prompt.length > 14000)
    return res.status(400).json({ error: "Bad prompt" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.MODEL || "claude-sonnet-5-5",
        max_tokens: 8000,
        system: "You write learning questions. Reply with ONLY valid JSON, no markdown fences, no commentary.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: (d.error && d.error.message) || "AI error" });
    let t = (d.content || []).map((b) => b.text || "").join("").replace(/```json|```/g, "");
    const a = t.indexOf("["), b = t.lastIndexOf("]");
    let out;
    try { out = JSON.parse(t.slice(a, b + 1)); }
    catch (e) { const c = t.lastIndexOf("},"); out = JSON.parse(t.slice(a, c + 1) + "]"); }
    return res.status(200).json({ result: out });
  } catch (e) {
    return res.status(502).json({ error: "Could not read the AI reply" });
  }
};
