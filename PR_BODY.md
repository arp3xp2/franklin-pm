feat: next.js app + gemini quiz + tailwind v4 + fancy UI

Änderungen
- Next.js App mit API-Route /api/generate-quiz (Gemini 1.5 Flash)
- Serverside Key-Nutzung über Env (GEMINI_API_KEY)
- UI an index.html angelehnt (Cards, Gradient-Header, Spinner, Results)
- Tailwind v4 via @tailwindcss/postcss
- .gitignore erweitert (.next, .vercel, .DS_Store)

QA
- Lokal getestet: Input → Generate → Quiz → Summary
- Key bleibt serverseitig

Nach Merge
- Vercel Deploy anstoßen und Env setzen
