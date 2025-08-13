import { GoogleGenerativeAI } from '@google/generative-ai';

// Simple in-memory rate limit per IP (MVP only)
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_MAX_REQUESTS = 10; // per window
const ipToUsage = new Map();

function getClientIp(req) {
	const xfwd = req.headers['x-forwarded-for'];
	if (typeof xfwd === 'string' && xfwd.length > 0) return xfwd.split(',')[0].trim();
	return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(req, res) {
	const ip = getClientIp(req);
	const now = Date.now();
	const usage = ipToUsage.get(ip) || { count: 0, start: now };
	if (now - usage.start >= RATE_WINDOW_MS) {
		usage.count = 0;
		usage.start = now;
	}
	usage.count += 1;
	ipToUsage.set(ip, usage);
	const remaining = Math.max(0, RATE_MAX_REQUESTS - usage.count);
	res.setHeader('X-RateLimit-Limit', RATE_MAX_REQUESTS.toString());
	res.setHeader('X-RateLimit-Remaining', remaining.toString());
	if (usage.count > RATE_MAX_REQUESTS) {
		const retryAfterSec = Math.ceil((usage.start + RATE_WINDOW_MS - now) / 1000);
		res.setHeader('Retry-After', retryAfterSec.toString());
		res.status(429).json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' });
		return false;
	}
	return true;
}

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
	if (!checkRateLimit(req, res)) return;
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
