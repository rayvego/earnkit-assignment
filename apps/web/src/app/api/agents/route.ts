import { verifyPrivyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeeModelType } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import * as z from "zod";

const createAgentSchema = z.object({
	name: z.string().min(1),
	feeModelType: z.nativeEnum(FeeModelType),
	feeModelConfig: z.union([
		z.object({
			threshold: z.number(),
			rate: z.number(),
		}),
		z.object({
			creditsPerPrompt: z.number(),
			topUpOptions: z.array(
				z.object({
					creditAmount: z.number(),
					pricePerCredit: z.number(),
				}),
			),
		}),
	]),
});

// get all agents for a developer
export async function GET(request: NextRequest) {
	try {
		const privyId = await verifyPrivyToken(request);

		if (!privyId) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const agents = await prisma.agent.findMany({
			where: {
				developer: {
					privyId,
				},
			},
			select: {
				id: true,
				name: true,
				feeModelType: true,
				feeModelConfig: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		return NextResponse.json(
			{ success: true, data: agents, message: "Agents fetched successfully" },
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error getting agents: ", error);
		return NextResponse.json(
			{ success: false, message: "Internal server error" },
			{ status: 500 },
		);
	}
}

// create an agent for a developer
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

		const validation = createAgentSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					success: false,
					message: `Invalid request body: ${JSON.stringify(validation.error.errors)}`,
				},
				{ status: 400 },
			);
		}

		const { name, feeModelType, feeModelConfig } = validation.data;

		const agent = await prisma.agent.create({
			data: {
				developer: {
					connect: {
						privyId,
					},
				},
				name,
				feeModelType,
				feeModelConfig,
			},
			select: {
				id: true,
				name: true,
				feeModelType: true,
				feeModelConfig: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		return NextResponse.json(
			{ success: true, data: agent, message: "Agent created successfully" },
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating agent: ", error);
		return NextResponse.json(
			{ success: false, message: "Internal server error" },
			{ status: 500 },
		);
	}
}
