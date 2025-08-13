export default function NotFound() {
	return (
		<div className="container" style={{ paddingTop: 40 }}>
			<div className="card">
				<div className="card-header">Seite nicht gefunden (404)</div>
				<div className="card-body">
					<p>Die angeforderte Seite existiert nicht.</p>
					<a className="btn" href="/" style={{ display: 'inline-block', marginTop: 12 }}>Zur Startseite</a>
				</div>
			</div>
		</div>
	);
}
