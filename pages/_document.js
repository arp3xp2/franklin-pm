import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
	return (
		<Html lang="de">
			<Head>
				<meta name="robots" content="noindex, nofollow" />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
