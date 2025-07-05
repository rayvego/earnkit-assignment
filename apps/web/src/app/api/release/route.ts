import { prisma } from "@/lib/prisma";
import { releaseRequestBodySchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// release a pending event
export async function POST(req: Request) {
	try {
		const body = await req.json();
		const validation = releaseRequestBodySchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ message: "Invalid request body", errors: validation.error.errors },
				{ status: 400 },
			);
		}

		const { eventId } = validation.data;

		const releasedEvent = await prisma.$transaction(async (tx) => {
			// find the pending event to be released
			const eventToRelease = await tx.usageEvent.findUnique({
				where: {
					id: eventId,
					status: "PENDING",
				},
				select: {
					id: true,
					feeDeducted: true,
					creditsDeducted: true,
					userWalletAddress: true,
					agentId: true,
				},
			});

			if (!eventToRelease) {
				throw new Error("Event not found or not in a releasable state.", {
					cause: 404,
				});
			}

			// perform the refund (if necessary) and event status update in parallel
			const { feeDeducted, creditsDeducted, userWalletAddress, agentId } =
				eventToRelease;

			const shouldRefund =
				feeDeducted?.gt(0) || (creditsDeducted && creditsDeducted > BigInt(0));

			// Run balance refund and event status update in parallel
			const [, updatedEvent] = await Promise.all([
				shouldRefund
					? tx.userBalance.update({
							where: {
								userWalletAddress_agentId: {
									userWalletAddress,
									agentId,
								},
							},
							data: {
								ethBalance: feeDeducted
									? { increment: feeDeducted }
									: undefined,
								creditBalance: creditsDeducted
									? { increment: creditsDeducted }
									: undefined,
							},
							select: {
								userWalletAddress: true,
								agentId: true,
							},
						})
					: Promise.resolve(null),
				tx.usageEvent.update({
					where: {
						id: eventId,
					},
					data: {
						status: "CANCELLED",
					},
					select: {
						id: true,
					},
				}),
			]);

			return updatedEvent;
		});

		return NextResponse.json({ success: true, eventId: releasedEvent.id });
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2025"
		) {
			return NextResponse.json(
				{ message: "Event not found or not in a releasable state." },
				{ status: 404 },
			);
		}

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Invalid request body", errors: error.errors },
				{ status: 400 },
			);
		}

		if (error instanceof Error) {
			return NextResponse.json(
				{ message: error.message },
				{ status: typeof error.cause === "number" ? error.cause : 400 },
			);
		}

		console.error("Release API Error:", error);
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
