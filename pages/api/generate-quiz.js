import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

function safeParseJson(text) {
	try {
		// Remove markdown code blocks if present
		const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
		return JSON.parse(cleaned);
	} catch { return null; }
}

function validate(questions, expectedCount) {
	if (!Array.isArray(questions) || questions.length !== expectedCount) return `Es müssen genau ${expectedCount} Fragen sein.`;
	for (const q of questions) {
		if (!q || typeof q.frage !== 'string' || !Array.isArray(q.optionen) || q.optionen.length !== 5) return 'Jede Frage braucht 5 Optionen.';
		if (typeof q.richtige_index !== 'number' || q.richtige_index < 0 || q.richtige_index > 4) return 'richtige_index muss 0..4 sein.';
		if (typeof q.erklaerung !== 'string' || q.erklaerung.trim().length === 0) return 'Erklärung fehlt.';
	}
	return null;
}

function shuffleCorrectAnswers(questions) {
	return questions.map(q => {
		const newIndex = Math.floor(Math.random() * 5);
		if (newIndex === q.richtige_index) return q;
		
		// Swap correct answer to new position
		const correctAnswer = q.optionen[q.richtige_index];
		const newOptions = [...q.optionen];
		newOptions[q.richtige_index] = newOptions[newIndex];
		newOptions[newIndex] = correctAnswer;
		
		return {
			...q,
			optionen: newOptions,
			richtige_index: newIndex
		};
	});
}

function calculateQuestionCount(textLength) {
	if (textLength < 100) return 1;
	if (textLength < 200) return 2;
	if (textLength < 400) return 3;
	if (textLength < 600) return 4;
	if (textLength < 800) return 5;
	if (textLength < 1000) return 6;
	if (textLength < 1200) return 7;
	if (textLength < 1400) return 8;
	if (textLength < 1600) return 9;
	if (textLength < 1800) return 10;
	if (textLength < 2000) return 11;
	return 12;
}

export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST' });
	// Basic rate limit per IP (MVP): 10 req / 15 min
	globalThis.__RATE__ = globalThis.__RATE__ || { windowMs: 15 * 60 * 1000, max: 10, map: new Map() };
	const { windowMs, max, map } = globalThis.__RATE__;
	const ip = (req.headers['x-forwarded-for']?.toString()?.split(',')[0]?.trim()) || req.socket?.remoteAddress || 'unknown';
	const now = Date.now();
	const entry = map.get(ip) || { count: 0, start: now };
	if (now - entry.start >= windowMs) { entry.count = 0; entry.start = now; }
	entry.count += 1; map.set(ip, entry);
	res.setHeader('X-RateLimit-Limit', String(max));
	res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
	if (entry.count > max) {
		res.setHeader('Retry-After', String(Math.ceil((entry.start + windowMs - now) / 1000)));
		return res.status(429).json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' });
	}
	const { text } = req.body || {};
	if (!text || typeof text !== 'string' || text.trim().length < 50) {
		return res.status(400).json({ error: 'Bitte ausreichend Lerntext senden.' });
	}
	if (!process.env.GEMINI_API_KEY) {
		return res.status(500).json({ error: 'Server-Konfiguration fehlt (API Key).' });
	}

	const questionCount = calculateQuestionCount(text.length);
	const prompt = `Du bist ein Trainer für angehende Product Manager.\nAus folgendem Text:\n"${text}"\n\nErstelle genau ${questionCount} Multiple-Choice-Fragen mit je 1 richtigen und 4 falschen Antworten.\nKennzeichne die richtige Antwort und formuliere die Fragen so, dass sie praxisnah sind.\nLiefere ausschliesslich gültiges JSON ohne Erklärtext im Format:\n[{
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
		const err = validate(data, questionCount);
		if (err) return res.status(502).json({ error: err });
		
		const shuffledQuestions = shuffleCorrectAnswers(data);
		return res.status(200).json({ questions: shuffledQuestions });
	} catch (e) {
		return res.status(503).json({ error: e?.message || 'Fehler bei der Generierung' });
	}
}
