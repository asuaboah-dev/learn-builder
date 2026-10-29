module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  const prompt = req.body && req.body.prompt;
  if (typeof prompt !== "string" || prompt.length < 20 || prompt.length > 14000)
    return res.status(400).json({ error: "Bad prompt" });
  try {
    const model = process.env.MODEL || "gemini-2.5-flash";
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You write learning questions. Reply with ONLY a valid JSON array, no markdown, no commentary." }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 8000, responseMimeType: "application/json" },
        }),
      }
    );
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ error: (d.error && d.error.message) || "AI error" });
    let t = ((d.candidates && d.candidates[0] && d.candidates[0].content.parts) || [])
      .map((p) => p.text || "").join("").replace(/```json|```/g, "");
    const a = t.indexOf("["), b = t.lastIndexOf("]");
    let out;
    try { out = JSON.parse(t.slice(a, b + 1)); }
    catch (e) { const c = t.lastIndexOf("},"); out = JSON.parse(t.slice(a, c + 1) + "]"); }
    return res.status(200).json({ result: out });
  } catch (e) {
    return res.status(502).json({ error: "Could not read the AI reply" });
  }
};
