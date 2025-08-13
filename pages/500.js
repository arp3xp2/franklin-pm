export default function ErrorPage() {
	return (
		<div className="container" style={{ paddingTop: 40 }}>
			<div className="card">
				<div className="card-header">Serverfehler (500)</div>
				<div className="card-body">
					<p>Da ist etwas schiefgelaufen. Bitte versuche es später erneut.</p>
					<a className="btn" href="/" style={{ display: 'inline-block', marginTop: 12 }}>Zur Startseite</a>
				</div>
			</div>
		</div>
	);
}
