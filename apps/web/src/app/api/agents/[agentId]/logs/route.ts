import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

// get all logs for an agent
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ agentId: string }> },
) {
	try {
		const { agentId } = await params;

		const logs = await prisma.usageEvent.findMany({
			where: { agentId },
			orderBy: { createdAt: "desc" },
		});

		return NextResponse.json(
			{ success: true, data: logs, message: "Logs fetched successfully" },
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error fetching agent logs: ", error);
		return NextResponse.json(
			{ success: false, message: "Internal server error" },
			{ status: 500 },
		);
	}
}
