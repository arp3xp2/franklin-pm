import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

function safeParseJson(text) {
	try { return JSON.parse(text); } catch { return null; }
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

export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST' });
	const { text } = req.body || {};
	if (!text || typeof text !== 'string' || text.trim().length < 50) {
		return res.status(400).json({ error: 'Bitte ausreichend Lerntext senden.' });
	}
	if (!process.env.GEMINI_API_KEY) {
		return res.status(500).json({ error: 'Server-Konfiguration fehlt (API Key).' });
	}

	const prompt = `Du bist ein Trainer für angehende Product Manager.\nAus folgendem Text:\n"${text}"\n\nErstelle genau 3 Multiple-Choice-Fragen mit je 1 richtigen und 4 falschen Antworten.\nKennzeichne die richtige Antwort und formuliere die Fragen so, dass sie praxisnah sind.\nLiefere ausschliesslich gültiges JSON ohne Erklärtext im Format:\n[{
  "frage": "...",
  "optionen": ["...","...","...","...","..."],
  "richtige_index": 0,
  "erklaerung": "..."
}]`;

	try {
		const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
		const textOut = result.response.text();
		let data = safeParseJson(textOut);
		if (!data) {
			const fixPrompt = `Korrigiere folgende Ausgabe zu gültigem JSON Array im spezifizierten Schema, ohne jeglichen Zusatztext:\n${textOut}`;
			const fix = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: fixPrompt }] }] });
			data = safeParseJson(fix.response.text());
		}
		const err = validate(data);
		if (err) return res.status(502).json({ error: err });
		return res.status(200).json({ questions: data });
	} catch (e) {
		return res.status(503).json({ error: e?.message || 'Fehler bei der Generierung' });
	}
}
