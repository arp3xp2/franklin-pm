import formidable from 'formidable';
import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import os from 'os';

export const config = {
	api: {
		bodyParser: false
	}
};

function badRequest(res, message) {
	return res.status(400).json({ error: message });
}

export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).json({ error: 'Nur POST' });

	const form = formidable({
		multiples: false,
		uploadDir: os.tmpdir(),
		keepExtensions: true,
		maxFileSize: 5 * 1024 * 1024 // 5MB
	});

	try {
		const { fields, files } = await new Promise((resolve, reject) => {
			form.parse(req, (err, fieldsOut, filesOut) => {
				if (err) return reject(err);
				resolve({ fields: fieldsOut, files: filesOut });
			});
		});

		const file = files.file || files.upload || files.pdf;
		if (!file) return badRequest(res, 'Keine Datei empfangen. Feldname: "file" erwartet.');

		// Formidable may return a File or an array depending on client; normalize
		const f = Array.isArray(file) ? file[0] : file;
		const filepath = f.filepath || f.path;
		const mimetype = f.mimetype || f.type || '';
		const size = typeof f.size === 'number' ? f.size : 0;

		if (!filepath) return badRequest(res, 'Upload fehlgeschlagen.');
		if (size > 5 * 1024 * 1024) return badRequest(res, 'Datei zu groß. Max 5MB.');
		if (!mimetype.includes('pdf')) return badRequest(res, 'Nur PDF-Dateien sind erlaubt.');

		const buffer = await fs.readFile(filepath);
		const result = await pdfParse(buffer);
		const text = (result.text || '').trim();
		if (!text) return badRequest(res, 'Konnte keinen Text aus dem PDF extrahieren.');

		// Best-effort cleanup
		try { await fs.unlink(filepath); } catch {}

		return res.status(200).json({ text });
	} catch (e) {
		if (e?.message?.includes('maxFileSize exceeded')) {
			return badRequest(res, 'Datei zu groß. Max 5MB.');
		}
		return res.status(500).json({ error: e?.message || 'Upload fehlgeschlagen' });
	}
}


