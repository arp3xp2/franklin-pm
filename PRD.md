# PRD – MVP Lernapp für angehende Product Manager

## 1. Ziel
Eine minimalistische Web-App, in der Nutzer eigenes PM-Lernmaterial als Text einfügen können.  
Die App generiert daraus automatisch Multiple-Choice-Fragen und ermöglicht es, diese sofort zu beantworten.  
Fokus: schneller Prototyp mit PM-Flair, klar differenziert von generischen AI-Lernkarten-Tools.

---

## 2. Zielgruppe
- **Primär:** Berufseinsteiger und Quereinsteiger, die sich auf PM-Interviews, Zertifizierungen oder interne Assessments vorbereiten.
- **Sekundär:** Trainer/Coaches, die schnell aus eigenem Content prüfungsähnliche Fragen generieren wollen.

---

## 3. Problem Statement
Bestehende Lösungen wie ChatGPT oder acemate.ai sind zu generisch oder erfordern viel manuelles Prompten.  
Angehende PMs brauchen:
- Kontextspezifische Fragen im PM-Stil
- Einen reibungslosen, fokussierten Workflow
- Kein Overhead mit Accounts, langen Onboardings oder komplexen Dashboards

---

## 4. Scope – MVP Features
**Muss enthalten:**
1. **Material-Input:** Freitextfeld zum Einfügen von Lernmaterial (Paste Text oder URL als Plaintext).
2. **KI-Generierung:** GPT-API erstellt 3–5 praxisnahe Multiple-Choice-Fragen aus dem Input.
3. **Quiz-Ansicht:** 
   - Darstellung einer Frage mit 4 Antwortoptionen
   - Sofort-Feedback (Richtig/Falsch) nach Klick
   - Kurze Erklärung zur richtigen Antwort
4. **Abschluss-Summary:** Score in %, Zeitbedarf, 1 PM-spezifischer Verbesserungshinweis
5. **PM-Style-UI:** Einfaches Dashboard-Look-and-Feel (Farben/Typo angelehnt an Jira/Trello)

**Nicht enthalten:**
- User-Login/Accounts
- Fortschrittsspeicherung
- Dateiupload/PDF-Parsing
- Themenkategorisierung
- Adaptive Lernlogik

---

## 5. User Flow (Happy Path)
1. User öffnet die App → Sieht Eingabefeld „Füge hier dein PM-Lernmaterial ein“.
2. User fügt Text ein → Klickt auf „Fragen generieren“.
3. App zeigt Quiz mit 3–5 Multiple-Choice-Fragen.
4. User klickt Antworten → bekommt Sofort-Feedback.
5. Nach letzter Frage erscheint Zusammenfassung mit Score + Verbesserungshinweis.

---

## 6. Beispiel-Prompt für GPT

Du bist ein Trainer für angehende Product Manager.
Aus folgendem Text:
"{USER_INPUT}"

Erstelle 3 Multiple-Choice-Fragen mit je 1 richtigen und 3 falschen Antworten.
Kennzeichne die richtige Antwort und formuliere die Fragen so, dass sie praxisnah sind.
Format: JSON [{frage:..., optionen:[...], richtige_index:..., erklaerung:...}]


---

## 7. Tech Stack
- **Frontend:** React + Tailwind (alternativ Next.js)
- **Backend:** Kein eigenes Backend im MVP, API-Calls direkt aus dem Frontend an GPT
- **Hosting:** Vercel oder Netlify (Push = Live)

---

## 8. Zeitplan für Bau
- **0,5h** Setup Projektstruktur + API-Key Integration
- **1,5h** UI bauen (Input → Loading → Quiz → Summary)
- **1h** GPT-API-Integration + Frage-Rendering
- **0,5h** Styling im PM-Tool-Look

---

## 9. Erfolgskriterium für MVP
- User kann in <2 Minuten vom Text-Input zu fertigen Fragen gelangen
- Fragen wirken PM-spezifisch, nicht generisch
- App läuft stabil live, ohne Setup-Hürden
