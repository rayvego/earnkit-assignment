import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const captureRequestBodySchema = z.object({
	eventId: z.string().cuid(),
});

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const validation = captureRequestBodySchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					message: "Invalid request body",
					errors: validation.error.issues,
				},
				{ status: 400 },
			);
		}

		const { eventId } = validation.data;

		const capturedEvent = await prisma.usageEvent.update({
			where: {
				id: eventId,
				status: "PENDING",
			},
			data: {
				status: "CAPTURED",
			},
			select: {
				id: true,
			},
		});

		return NextResponse.json({ success: true, eventId: capturedEvent.id });
	} catch (error) {
		// handle prisma's 2025 error which arises when the record is not found
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return NextResponse.json(
				{
					message: "Event not found or not in a capturable state.",
				},
				{ status: 404 },
			);
		}

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Invalid request body", errors: error.issues },
				{ status: 400 },
			);
		}

		console.error("Capture API Error:", error);
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
