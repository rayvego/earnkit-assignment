import { verifyPrivyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

// update an agent for a developer
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ agentId: string }> },
) {
	try {
		const privyId = await verifyPrivyToken(request);

		if (!privyId) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { agentId } = await params;

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

		const agent = await prisma.agent.update({
			where: { id: agentId },
			data: { name, feeModelType, feeModelConfig },
		});

		return NextResponse.json(
			{ success: true, data: agent, message: "Agent updated successfully" },
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error updating agent: ", error);
		return NextResponse.json(
			{ success: false, message: "Internal server error" },
			{ status: 500 },
		);
	}
}

// delete an agent for a developer
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ agentId: string }> },
) {
	try {
		const privyId = await verifyPrivyToken(request);

		if (!privyId) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { agentId } = await params;

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

		// delete in a transaction for atomicity
		const agent = await prisma.$transaction(async (tx) => {
			await tx.userBalance.deleteMany({
				where: {
					agentId,
				},
			});

			await tx.usageEvent.deleteMany({
				where: {
					agentId,
				},
			});

			const deletedAgent = await tx.agent.delete({
				where: { id: agentId },
			});

			return deletedAgent;
		});

		return NextResponse.json(
			{ success: true, data: agent, message: "Agent deleted successfully" },
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error deleting agent: ", error);
		return NextResponse.json(
			{ success: false, message: "Internal server error" },
			{ status: 500 },
		);
	}
}
