import { useState, useMemo } from 'react';

export default function Home() {
	const [text, setText] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [questions, setQuestions] = useState([]);
	const [idx, setIdx] = useState(0);
	const [selected, setSelected] = useState(null);
	const [score, setScore] = useState(0);
	const [startTs, setStartTs] = useState(null);
	const [endTs, setEndTs] = useState(null);

	const current = questions[idx];
	const elapsed = useMemo(() => endTs && startTs ? Math.round((endTs - startTs) / 1000) : 0, [startTs, endTs]);

	async function generate() {
		setError(''); setQuestions([]); setIdx(0); setSelected(null); setScore(0); setEndTs(null);
		if (!text || text.trim().length < 50) { setError('Bitte mehr Text eingeben (mind. 50 Zeichen).'); return; }
		setLoading(true); setStartTs(Date.now());
		try {
			const res = await fetch('/api/generate-quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
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
				<h1>Franklin 🎓</h1>
				<p>PM-Quiz Generator für deine Lernmaterialien</p>
			</div>

			<div className="card">
				<div className="card-header">Lernmaterial eingeben</div>
				<div className="card-body">
					<div className="form-group">
						<label>Füge hier dein PM-Lernmaterial ein:</label>
						<textarea placeholder="Beispiel: Agile Entwicklung ist ein iterativer Ansatz ..." value={text} onChange={e => setText(e.target.value)} />
					</div>
					<button className="btn" onClick={generate} disabled={loading}>{loading ? 'Generiere…' : 'Fragen generieren'}</button>
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
