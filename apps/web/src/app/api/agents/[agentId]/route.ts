import { verifyPrivyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

// get a single agent for a developer
export async function GET(
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

		const agent = await prisma.agent.findUnique({
			where: { id: agentId, developer: { privyId } }, // ensure the agent belongs to the authenticated developer
			select: {
				id: true,
				name: true,
				feeModelType: true,
				feeModelConfig: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!agent) {
			return NextResponse.json(
				{ success: false, message: "Agent not found or not authorized" },
				{ status: 404 },
			);
		}

		return NextResponse.json(
			{ success: true, data: agent, message: "Agent fetched successfully" },
			{ status: 200 },
		);
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return NextResponse.json(
				{
					message: "Agent not found or not authorized.",
				},
				{ status: 404 },
			);
		}

		console.error("Error fetching agent: ", error);
		return NextResponse.json(
			{ success: false, message: "Internal server error" },
			{ status: 500 },
		);
	}
}

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

		const { name, feeModelType, feeModelConfig } = await request.json();

		const agent = await prisma.agent.update({
			where: { id: agentId, developer: { privyId } }, // ensure the agent belongs to the authenticated developer
			data: { name, feeModelType, feeModelConfig },
			select: {
				id: true,
				name: true,
				feeModelType: true,
				feeModelConfig: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!agent) {
			return NextResponse.json(
				{ success: false, message: "Agent not found or not authorized" },
				{ status: 404 },
			);
		}

		return NextResponse.json(
			{ success: true, data: agent, message: "Agent updated successfully" },
			{ status: 200 },
		);
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return NextResponse.json(
				{
					message: "Agent not found or not authorized.",
				},
				{ status: 404 },
			);
		}
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

		const agent = await prisma.agent.findUnique({
			where: { id: agentId, developer: { privyId } }, // ensure the agent belongs to the authenticated developer
			select: {
				id: true,
			},
		});

		if (!agent) {
			return NextResponse.json(
				{ success: false, message: "Agent not found or not authorized" },
				{ status: 404 },
			);
		}

		// delete in a transaction for atomicity
		const deletedAgent = await prisma.$transaction(async (tx) => {
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

			return await tx.agent.delete({
				where: { id: agentId },
				select: {
					id: true,
					name: true,
					feeModelType: true,
					feeModelConfig: true,
					createdAt: true,
					updatedAt: true,
				},
			});
		});

		return NextResponse.json(
			{
				success: true,
				data: deletedAgent,
				message: "Agent deleted successfully",
			},
			{ status: 200 },
		);
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return NextResponse.json(
				{
					message: "Agent not found or not authorized.",
				},
				{ status: 404 },
			);
		}

		console.error("Error deleting agent: ", error);
		return NextResponse.json(
			{ success: false, message: "Internal server error" },
			{ status: 500 },
		);
	}
}
