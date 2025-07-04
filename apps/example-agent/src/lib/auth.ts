import { PrivyClient } from "@privy-io/server-auth";
import type { NextRequest } from "next/server";

export async function verifyPrivyToken(
	req: NextRequest,
): Promise<string | null> {
	const accessToken = req.cookies.get("privy-token")?.value;

	if (!accessToken) {
		console.log("No access token found");
		return null;
	}

	if (
		!process.env.NEXT_PUBLIC_PRIVY_APP_ID ||
		!process.env.PRIVY_SECRET ||
		!process.env.PRIVY_VERIFICATION_KEY
	) {
		throw new Error("Missing Privy environment variables");
	}

	const privy = new PrivyClient(
		process.env.NEXT_PUBLIC_PRIVY_APP_ID,
		process.env.PRIVY_SECRET,
	);

	try {
		const verifiedClaims = await privy.verifyAuthToken(
			accessToken,
			process.env.PRIVY_VERIFICATION_KEY,
		);
		return verifiedClaims.userId;
	} catch (error) {
		console.log(`JWT verification failed with error ${error}.`);
		return null;
	}
}
