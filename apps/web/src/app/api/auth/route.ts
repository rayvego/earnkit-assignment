import { verifyPrivyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import * as z from "zod";

const signUpSchema = z.object({
	walletAddress: z.string().min(1).optional(),
});

// sign up a developer
export async function POST(request: NextRequest) {
	try {
		const privyId = await verifyPrivyToken(request);

		if (!privyId) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const body = await request.json();

		const validation = signUpSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					success: false,
					message: `Invalid request body: ${JSON.stringify(validation.error.errors)}`,
				},
				{ status: 400 },
			);
		}

		const { walletAddress } = validation.data;

		let user = await prisma.developer.findUnique({
			where: {
				privyId,
			},
			select: {
				id: true,
				privyId: true,
				walletAddress: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			if (!walletAddress) {
				return NextResponse.json(
					{ success: false, message: "Wallet address is required" },
					{ status: 400 },
				);
			}

			user = await prisma.developer.create({
				data: {
					privyId,
					walletAddress,
				},
				select: {
					id: true,
					privyId: true,
					walletAddress: true,
					createdAt: true,
					updatedAt: true,
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
