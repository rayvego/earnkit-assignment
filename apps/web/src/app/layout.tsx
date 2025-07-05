import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import PrivyAuthProvider from "./privy-provider";
import TanstackQueryProvider from "./tanstack-provider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "EarnKit AI",
	description:
		"The easiest way to monetize your AI agent with usage-based fees and a credit system.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<PrivyAuthProvider>
					<TanstackQueryProvider>
						<Toaster />
						{children}
					</TanstackQueryProvider>
				</PrivyAuthProvider>
			</body>
		</html>
	);
}
