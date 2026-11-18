import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

// OpenAI-compatible providers share one format. Add more here as needed.
const PROVIDERS = {
  openai:     { type: "openai", url: "https://api.openai.com/v1/chat/completions", keyEnv: "OPENAI_API_KEY", model: "gpt-4o-mini" },
  groq:       { type: "openai", url: "https://api.groq.com/openai/v1/chat/completions", keyEnv: "GROQ_API_KEY", model: "llama-3.3-70b-versatile" },
  deepseek:   { type: "openai", url: "https://api.deepseek.com/chat/completions", keyEnv: "DEEPSEEK_API_KEY", model: "deepseek-chat" },
  openrouter: { type: "openai", url: "https://openrouter.ai/api/v1/chat/completions", keyEnv: "OPENROUTER_API_KEY", model: "openai/gpt-4o-mini" },
  anthropic:  { type: "anthropic", url: "https://api.anthropic.com/v1/messages", keyEnv: "ANTHROPIC_API_KEY", model: "claude-sonnet-4-5" },
  gemini:     { type: "gemini", url: "https://generativelanguage.googleapis.com/v1beta/models", keyEnv: "GEMINI_API_KEY", model: "gemini-2.0-flash" },
};

// Optional password protection (set APP_PASSWORD on Render)
function auth(req, res, next) {
  const pw = process.env.APP_PASSWORD;
  if (pw && req.get("x-app-password") !== pw) return res.status(401).json({ error: "wrong password" });
  next();
}

app.get("/api/providers", auth, (_req, res) => {
  res.json(Object.entries(PROVIDERS).map(([id, p]) => ({
    id, model: p.model, available: !!process.env[p.keyEnv],
  })));
});

async function callProvider(p, model, messages, system) {
  const key = process.env[p.keyEnv];
  if (!key) throw new Error(`${p.keyEnv} is not set`);

  if (p.type === "openai") {
    const msgs = system ? [{ role: "system", content: system }, ...messages] : messages;
    const r = await fetch(p.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: msgs }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || JSON.stringify(d));
    return d.choices?.[0]?.message?.content ?? "";
  }

  if (p.type === "anthropic") {
    const r = await fetch(p.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 2048, system: system || undefined, messages }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || JSON.stringify(d));
    return (d.content || []).map((b) => b.text || "").join("");
  }

  if (p.type === "gemini") {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const body = { contents };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    const r = await fetch(`${p.url}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || JSON.stringify(d));
    return (d.candidates?.[0]?.content?.parts || []).map((x) => x.text || "").join("");
  }
}

app.post("/api/chat", auth, async (req, res) => {
  try {
    const { provider, model, messages, system } = req.body;
    const p = PROVIDERS[provider];
    if (!p) return res.status(400).json({ error: "unknown provider" });
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "messages required" });
    const text = await callProvider(p, model || p.model, messages, system);
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log("running on", port));
