"use client";
import { PrivyProvider } from "@privy-io/react-auth";

if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
	throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
}

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

export default function PrivyAuthProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<PrivyProvider
			appId={privyAppId}
			clientId={privyClientId}
			config={{
				loginMethods: ["wallet"],
				appearance: {
					theme: "light",
				},
				embeddedWallets: {
					createOnLogin: "off",
				},
			}}
		>
			{children}
		</PrivyProvider>
	);
}
