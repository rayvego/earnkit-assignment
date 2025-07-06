import { Footer, Layout, Navbar } from "nextra-theme-docs";
import "nextra-theme-docs/style.css";
import { getPageMap } from "nextra/page-map";

export const metadata = {
	title: "EarnKit Documentation",
	description: "EarnKit Documentation",
};

const navbar = (
	<Navbar logo={<span className="font-mono text-2xl">EarnKit</span>} />
);
const footer = <Footer>MIT {new Date().getFullYear()} © Nextra.</Footer>;

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" dir="ltr" suppressHydrationWarning>
			<body>
				<Layout
					navbar={navbar}
					pageMap={await getPageMap()}
					docsRepositoryBase="https://github.com/rayvego/earnkit-assignment/tree/main/apps/web"
					footer={footer}
				>
					{children}
				</Layout>
			</body>
		</html>
	);
}
