import { prisma } from "@/lib/prisma";
import { getBalanceSchema } from "@/lib/schemas";
import { type NextRequest, NextResponse } from "next/server";

// get the balance for a developer for a specific agent
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);

		const validation = getBalanceSchema.safeParse({
			agentId: searchParams.get("agentId"),
			walletAddress: searchParams.get("walletAddress"),
		});

		if (!validation.success) {
			return NextResponse.json(
				{
					message: `Invalid or missing parameters: ${JSON.stringify(validation.error.errors)}`,
				},
				{ status: 400 },
			);
		}
		const { agentId, walletAddress } = validation.data;

		// Find the user's balance record for the specific agent
		const userBalance = await prisma.userBalance.findUnique({
			where: {
				userWalletAddress_agentId: {
					userWalletAddress: walletAddress,
					agentId,
				},
			},
			select: {
				ethBalance: true,
				creditBalance: true,
			},
		});

		// If no balance record exists, return zero balances.
		if (!userBalance) {
			return NextResponse.json({
				eth: "0",
				credits: "0",
			});
		}

		// Return the balances, converting them to strings for consistent transport
		return NextResponse.json({
			eth: userBalance.ethBalance.toString(),
			credits: userBalance.creditBalance.toString(),
		});
	} catch (error) {
		console.error("Get Balance Error:", error);
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
