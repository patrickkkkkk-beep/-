# Multi-AI

اجرای محلی: `npm install && node server.js`

## دیپلوی روی Render
1. این پوشه را در یک ریپوی GitHub بگذار.
2. Render → New → Web Service (یا Blueprint) → ریپو را انتخاب کن.
3. Build: `npm install` ، Start: `node server.js`
4. در Environment کلیدها را اضافه کن: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY (هرکدام را که داری)
5. حتماً APP_PASSWORD را هم بگذار تا کسی از کلیدهای تو استفاده نکند.

API: `POST /api/chat` با بدنه `{provider, model, messages:[{role,content}]}`
