import { useState, useMemo, useRef, useEffect } from 'react';

export default function Home() {
	const [text, setText] = useState('');
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [file, setFile] = useState(null);
	const [error, setError] = useState('');
	const [questions, setQuestions] = useState([]);
	const [idx, setIdx] = useState(0);
	const [selected, setSelected] = useState(null);
	const [score, setScore] = useState(0);
	const [startTs, setStartTs] = useState(null);
	const [endTs, setEndTs] = useState(null);
	const [geminiFiles, setGeminiFiles] = useState([]);
	const dropRef = useRef(null);

	useEffect(() => {
		const el = dropRef.current;
		if (!el) return;
		function prevent(e) { e.preventDefault(); e.stopPropagation(); }
		function onDrop(e) {
			prevent(e);
			const files = Array.from(e.dataTransfer?.files || []);
			if (files.length) handleFiles(files);
		}
		['dragenter','dragover','dragleave','drop'].forEach(ev => el.addEventListener(ev, prevent));
		el.addEventListener('drop', onDrop);
		return () => {
			['dragenter','dragover','dragleave','drop'].forEach(ev => el.removeEventListener(ev, prevent));
			el.removeEventListener('drop', onDrop);
		};
	}, []);

	function estimateTokens(bytes) {
		// very rough; matches order-of-magnitude feel
		return Math.max(1, Math.round(bytes / 4));
	}

	async function uploadToGemini(file) {
		const fd = new FormData();
		fd.append('file', file);
		const res = await fetch('/api/gemini-upload', { method: 'POST', body: fd });
		const data = await res.json();
		if (!res.ok || !data.success) throw new Error(data.error || 'Upload fehlgeschlagen');
		return data;
	}

	function addGeminiFileLocal(f) {
		setGeminiFiles(arr => [{ id: Math.random().toString(36).slice(2), name: f.name, type: f.type, size: f.size, status: 'uploading', geminiFileId: null, tokens: 0 }, ...arr]);
	}

	async function handleFiles(files) {
		setError('');
		for (const f of files) {
			addGeminiFileLocal(f);
			try {
				const data = await uploadToGemini(f);
				setGeminiFiles(arr => arr.map(item => item.name === f.name && item.status === 'uploading' ? { ...item, status: 'ready', geminiFileId: data.geminiFileId, tokens: estimateTokens(data.sizeBytes || f.size) } : item));
			} catch (e) {
				setGeminiFiles(arr => arr.map(item => item.name === f.name && item.status === 'uploading' ? { ...item, status: 'error' } : item));
				setError(e.message);
			}
		}
	}

	async function deleteGeminiFile(geminiFileId) {
		try {
			await fetch(`/api/gemini-upload?fileId=${encodeURIComponent(geminiFileId)}`, { method: 'DELETE' });
		} catch {}
	}

	function removeFile(id) {
		const toDelete = geminiFiles.find(f => f.id === id);
		if (toDelete?.geminiFileId) deleteGeminiFile(toDelete.geminiFileId);
		setGeminiFiles(arr => arr.filter(f => f.id !== id));
	}

	const current = questions[idx];
	const elapsed = useMemo(() => endTs && startTs ? Math.round((endTs - startTs) / 1000) : 0, [startTs, endTs]);

	function onFileChange(e) {
		setError('');
		const f = e.target.files?.[0];
		if (!f) { setFile(null); return; }
		if (!f.type || !f.type.includes('pdf')) { setError('Nur PDF-Dateien erlaubt.'); setFile(null); return; }
		if (f.size > 5 * 1024 * 1024) { setError('Datei zu groß (max 5MB).'); setFile(null); return; }
		setFile(f);
	}

	async function extractFromPdf() {
		if (!file) return;
		setError(''); setUploading(true);
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/upload-pdf', { method: 'POST', body: fd });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Upload-Fehler');
			setText(prev => (prev ? prev + '\n\n' : '') + (data.text || ''));
		} catch (e) {
			setError(e.message);
		} finally {
			setUploading(false);
		}
	}

	async function generate() {
		setError(''); setQuestions([]); setIdx(0); setSelected(null); setScore(0); setEndTs(null);
		const hasValidText = text && text.trim().length >= 50;
		const hasValidFiles = geminiFiles.some(f => f.status === 'ready' && f.geminiFileId);
		
		if (!hasValidText && !hasValidFiles) { 
			setError('Bitte mehr Text eingeben (mind. 50 Zeichen) oder mindestens eine Datei anhängen.'); 
			return; 
		}
		
		setLoading(true); setStartTs(Date.now());
		try {
			const files = geminiFiles
				.filter(f => f.status === 'ready' && f.geminiFileId)
				.map(({ geminiFileId, type }) => ({ geminiFileId, type }));
			
			const res = await fetch('/api/generate-quiz', { 
				method: 'POST', 
				headers: { 'Content-Type': 'application/json' }, 
				body: JSON.stringify({ text, files }) 
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Fehler');
			setQuestions(data.questions || []);
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}

	function selectOption(i) {
		if (selected !== null) return;
		setSelected(i);
		if (i === current?.richtige_index) setScore(s => s + 1);
	}

	function next() {
		if (idx + 1 < questions.length) {
			setIdx(idx + 1); setSelected(null);
		} else {
			setEndTs(Date.now());
		}
	}

	return (
		<div className="container">
			<div className="header">
				<h1>Franklin PM 🎓</h1>
				<p>PM-Quiz Generator für deine Lernmaterialien</p>
			</div>

			<div className="card">
				<div className="card-header">Lernmaterial eingeben</div>
				<div className="card-body">
					<div className="form-group">
						<label>Füge hier dein PM-Lernmaterial ein:</label>
						<textarea placeholder="Beispiel: Agile Entwicklung ist ein iterativer Ansatz ..." value={text} onChange={e => setText(e.target.value)} />
					</div>
					<div className="form-group" style={{ marginTop: 12 }}>
						<label>Oder: Lade hier deine Dateien hoch (drag & drop oder klicken):</label>
						<div ref={dropRef} style={{ border: '2px dashed #999', borderRadius: 8, padding: 16, textAlign: 'center', background: '#fafafa' }}>
							<input id="gemini-file-input" type="file" multiple onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} style={{ display: 'none' }} />
							<button className="btn" onClick={() => document.getElementById('gemini-file-input').click()}>dateien auswählen</button>
							<p style={{ marginTop: 8, color: '#666' }}>unterstützt gängige formate (pdf, bilder, docs). max ~10mb je datei.</p>
						</div>
						{geminiFiles.length > 0 && (
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
								{geminiFiles.map(f => (
									<div key={f.id} style={{ border: '1px solid #ddd', borderRadius: 999, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
										<span>{f.name}</span>
										<small style={{ color: f.status === 'ready' ? '#0a0' : f.status === 'error' ? '#a00' : '#555' }}>
											{f.status === 'uploading' && 'lädt hoch…'}
											{f.status === 'ready' && `bereit (${f.tokens} tokens)`}
											{f.status === 'error' && 'fehler'}
										</small>
										<button className="btn" onClick={() => removeFile(f.id)} style={{ padding: '2px 8px' }}>x</button>
									</div>
								))}
							</div>
						)}
					</div>
					<button className="btn" onClick={generate} disabled={loading || (!text?.trim() || text.trim().length < 50) && !geminiFiles.some(f => f.status === 'ready' && f.geminiFileId)}>{loading ? 'Generiere…' : 'Fragen generieren'}</button>
					{error && <div className="error" style={{ display: 'block', marginTop: 16 }}>{error}</div>}
				</div>
			</div>

			{loading && (
				<div className="loading">
					<div className="spinner" />
					<p>Generiere PM-spezifische Fragen...</p>
				</div>
			)}

			{questions.length > 0 && endTs === null && (
				<div className="quiz-container card" style={{ display: 'block' }}>
					<div className="card-header">Quiz</div>
					<div className="card-body">
						<div className="question">
							<h3>{idx + 1}. {current.frage}</h3>
							<ul className="options">
								{current.optionen.map((opt, i) => {
									const isCorrect = i === current.richtige_index;
									const isChosen = i === selected;
									const cls = selected === null ? '' : (isCorrect ? 'option correct' : (isChosen ? 'option incorrect' : 'option'));
									return (
										<li key={i} className={cls} onClick={() => selectOption(i)}>
											<label>
												<input type="radio" name={`q${idx}`} value={i} readOnly checked={isChosen} />
												{opt}
											</label>
										</li>
									);
								})}
							</ul>
							<div className="explanation" style={{ display: selected !== null ? 'block' : 'none' }}>
								<strong>Erklärung:</strong> {current.erklaerung}
							</div>
						</div>
						<div style={{ marginTop: 12 }}>
							<button className="btn" onClick={next} disabled={selected === null}>weiter</button>
						</div>
					</div>
				</div>
			)}

			{questions.length > 0 && endTs !== null && (
				<div className="results card" style={{ display: 'block' }}>
					<div className="card-header">Dein Ergebnis</div>
					<div className="card-body">
						<div className="score">{Math.round((score / questions.length) * 100)}%</div>
						<div>zeit: {elapsed}s</div>
						<button className="btn" style={{ marginTop: 20 }} onClick={() => { setQuestions([]); setIdx(0); setSelected(null); setScore(0); setEndTs(null); setText(''); }}>Neues Quiz starten</button>
					</div>
				</div>
			)}
		</div>
	);
}
