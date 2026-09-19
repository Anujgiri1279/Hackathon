# Contributing

1. Create a local `Backend/.env` from `Backend/.env.example`.
2. Never commit API keys, Supabase service-role credentials, or generated
   uploads.
3. Run JavaScript syntax checks before opening a pull request:

   ```powershell
   node --check Backend/server.js
   node --check Backend/routes/upcycle.js
   node --check Backend/gemini.js
   node --check frontend/public/js/script.js
   ```

4. Test validation and fallback paths without repeatedly calling paid AI
   providers.
