import formidable from 'formidable';
import fs from 'fs/promises';
import os from 'os';

export const config = {
    api: { bodyParser: false }
};

async function initResumableUpload(apiKey, fileName, mimeType, contentLength) {
    const initUrl = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
    const payload = {
        file: {
            displayName: fileName,
            mimeType
        }
    };
    const resp = await fetch(initUrl, {
        method: 'POST',
        headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': String(contentLength),
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!resp.ok) {
        let msg = 'Upload initialization failed';
        try { const j = await resp.json(); msg = j?.error?.message || msg; } catch {}
        throw new Error(msg);
    }
    const uploadUrl = resp.headers.get('x-goog-upload-url');
    if (!uploadUrl) throw new Error('No upload URL returned by Gemini');
    return uploadUrl;
}

async function uploadBytesToGemini(uploadUrl, buffer) {
    const resp = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize'
        },
        body: buffer
    });
    const text = await resp.text();
    if (!resp.ok) {
        let msg = 'File upload failed';
        try { const j = JSON.parse(text); msg = j?.error?.message || msg; } catch {}
        throw new Error(msg);
    }
    return JSON.parse(text);
}

async function waitForActive(fileId, apiKey, maxAttempts = 10, intervalMs = 2000) {
    const shortId = fileId.replace(/^files\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/files/${encodeURIComponent(shortId)}?key=${encodeURIComponent(apiKey)}`;
    for (let i = 0; i < maxAttempts; i += 1) {
        const resp = await fetch(url, { method: 'GET' });
        const text = await resp.text();
        if (!resp.ok) {
            // return non-fatal; client can poll later
            return { success: false, state: 'UNKNOWN', error: text.slice(0, 200) };
        }
        try {
            const data = JSON.parse(text);
            if (data.state === 'ACTIVE') return { success: true, state: 'ACTIVE' };
            if (data.state === 'FAILED') return { success: false, state: 'FAILED', error: 'processing failed' };
        } catch {}
        if (i < maxAttempts - 1) {
            await new Promise(r => setTimeout(r, intervalMs));
        }
    }
    return { success: false, state: 'PROCESSING' };
}

async function handlePost(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server-Konfiguration fehlt (GEMINI_API_KEY).' });

    const form = formidable({
        multiples: false,
        uploadDir: os.tmpdir(),
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024 // 10MB
    });

    try {
        const { files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, _fields, _files) => {
                if (err) return reject(err);
                resolve({ files: _files });
            });
        });

        const file = files.file || files.upload || files.data || files.attachment;
        if (!file) return res.status(400).json({ error: 'Keine Datei empfangen. Feldname: "file" erwartet.' });
        const f = Array.isArray(file) ? file[0] : file;
        const filepath = f.filepath || f.path;
        const mimeType = f.mimetype || f.type || 'application/octet-stream';
        const fileName = f.originalFilename || f.newFilename || 'upload';
        const size = typeof f.size === 'number' ? f.size : 0;
        if (!filepath) return res.status(400).json({ error: 'Upload fehlgeschlagen.' });
        if (size > 10 * 1024 * 1024) return res.status(400).json({ error: 'Datei zu groß (max 10MB).' });

        const buffer = await fs.readFile(filepath);

        const uploadUrl = await initResumableUpload(apiKey, fileName, mimeType, buffer.length);
        const result = await uploadBytesToGemini(uploadUrl, buffer);

        const fullFileId = result?.file?.name;
        const state = result?.file?.state || 'UNKNOWN';
        const sizeBytes = result?.file?.sizeBytes || buffer.length;
        if (!fullFileId) {
            return res.status(502).json({ error: 'Kein File-ID in der Antwort.' });
        }

        // Best-effort cleanup of temp file
        try { await fs.unlink(filepath); } catch {}

        // brief wait for ACTIVE to mirror original behavior
        const processing = state === 'ACTIVE' ? { success: true, state: 'ACTIVE' } : await waitForActive(fullFileId, apiKey);

        return res.status(200).json({
            success: true,
            geminiFileId: fullFileId,
            state: processing.state || state,
            sizeBytes
        });
    } catch (e) {
        return res.status(500).json({ error: e?.message || 'Gemini Upload fehlgeschlagen' });
    }
}

async function handleDelete(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server-Konfiguration fehlt (GEMINI_API_KEY).' });
    const fileId = req.query?.fileId;
    if (!fileId || typeof fileId !== 'string') return res.status(400).json({ error: 'fileId erforderlich' });
    const encodedId = encodeURIComponent(fileId.replace(/^files\//, ''));
    const url = `https://generativelanguage.googleapis.com/v1beta/files/${encodedId}?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok) {
        const text = await resp.text();
        return res.status(502).json({ error: text.slice(0, 200) });
    }
    return res.status(200).json({ success: true });
}

export default async function handler(req, res) {
    if (req.method === 'POST') return handlePost(req, res);
    if (req.method === 'DELETE') return handleDelete(req, res);
    return res.status(405).json({ error: 'Nur POST oder DELETE' });
}


