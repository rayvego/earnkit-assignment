import { verifyPrivyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

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

		const developer = await prisma.developer.findUnique({
			where: {
				privyId,
			},
		});

		if (!developer) {
			return NextResponse.json(
				{ success: false, message: "Developer not found" },
				{ status: 404 },
			);
		}

		const agents = await prisma.agent.findMany({
			where: {
				developerId: developer.id,
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

		const developer = await prisma.developer.findUnique({
			where: {
				privyId,
			},
		});

		if (!developer) {
			return NextResponse.json(
				{ success: false, message: "Developer not found" },
				{ status: 404 },
			);
		}

		const { name, feeModelType, feeModelConfig } = await request.json();

		const agent = await prisma.agent.create({
			data: {
				developerId: developer.id,
				name,
				feeModelType,
				feeModelConfig,
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
