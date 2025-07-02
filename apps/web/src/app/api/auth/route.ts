import { verifyPrivyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const privyId = await verifyPrivyToken(request);

		if (!privyId) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { walletAddress } = await request.json();

		let user = await prisma.developer.findUnique({
			where: {
				privyId,
			},
		});

		if (!user) {
			user = await prisma.developer.create({
				data: {
					privyId,
					walletAddress,
				},
			});
		}

		return NextResponse.json(
			{
				data: user,
				success: true,
				message: "Developer signed up successfully",
			},
			{ status: 200 },
		);
	} catch (error) {
		console.log("Error signing up: ", error);
		return NextResponse.json(
			{
				success: false,
				message: "Internal server error",
			},
			{ status: 500 },
		);
	}
}
