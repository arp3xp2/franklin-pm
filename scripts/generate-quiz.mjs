import fs from 'fs';
import dotenv from 'dotenv';
// .env.local bevorzugen, sonst .env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Fehlender GEMINI_API_KEY. Lege ihn in .env.local an.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const userInput = process.argv.slice(2).join(' ').trim();
if (!userInput) {
  console.error('Gib Lerntext als Argument an. Beispiel: npm run quiz -- "Dein PM-Text"');
  process.exit(1);
}

const prompt = `Du bist ein Trainer für angehende Product Manager.
Aus folgendem Text:
"${userInput}"

Erstelle genau 3 Multiple-Choice-Fragen mit je 1 richtigen und 4 falschen Antworten.

WICHTIGE REGELN für die Fragen:
- Die richtige Antwort muss EINDEUTIG richtig sein basierend auf dem gegebenen Text
- Die falschen Antworten müssen KLAR falsch oder unpassend für den Kontext sein
- Vermeide Antworten, die "auch richtig" sein könnten
- Fokussiere auf spezifische Details aus dem Text, nicht auf allgemeine PM-Prinzipien
- Stelle sicher, dass nur eine Antwort logisch korrekt ist

Liefere ausschließlich gültiges JSON ohne Erklärtext im Format:
[{
  "frage": "...",
  "optionen": ["...","...","...","...","..."],
  "richtige_index": 0,
  "erklaerung": "..."
}]`;

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function validate(questions) {
  if (!Array.isArray(questions) || questions.length !== 3) return 'Es müssen genau 3 Fragen sein.';
  for (const q of questions) {
    if (!q || typeof q.frage !== 'string' || !Array.isArray(q.optionen) || q.optionen.length !== 5) return 'Jede Frage braucht 5 Optionen.';
    if (typeof q.richtige_index !== 'number' || q.richtige_index < 0 || q.richtige_index > 4) return 'richtige_index muss 0..4 sein.';
    if (typeof q.erklaerung !== 'string' || q.erklaerung.trim().length === 0) return 'Erklärung fehlt.';
  }
  return null;
}

async function run() {
  try {
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const text = result.response.text();
    let data = safeParseJson(text);

    if (!data) {
      // einmaliger reparatur-versuch
      const fixPrompt = `Korrigiere folgende Ausgabe zu gültigem JSON Array im spezifizierten Schema, ohne jeglichen Zusatztext:\n${text}`;
      const fix = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: fixPrompt }] }] });
      data = safeParseJson(fix.response.text());
    }

    const err = validate(data);
    if (err) {
      console.error('Fehlerhafte Quiz-Daten:', err);
      process.exit(2);
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fehler bei der Generierung:', e?.message || e);
    process.exit(3);
  }
}

run();
