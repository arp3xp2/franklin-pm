import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
	return (
		<Html lang="de">
			<Head>
				<meta name="robots" content="noindex, nofollow" />
				<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='0.9em' font-size='90'%3E%E2%9C%A8%3C/text%3E%3C/svg%3E" />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
