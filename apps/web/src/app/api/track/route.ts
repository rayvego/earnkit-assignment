import { prisma } from "@/lib/prisma";
import { FeeModelType, Prisma } from "@prisma/client";
import type { CreditBasedConfig, FreeTierConfig } from "earnkit-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

const trackRequestBodySchema = z.object({
	agentId: z.string().cuid(),
	walletAddress: z.string().startsWith("0x").length(42),
	idempotencyKey: z.string().uuid().optional(), // Recommend UUID for idempotency keys
	creditsToDeduct: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const validation = trackRequestBodySchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ message: "Invalid request body", errors: validation.error.issues },
				{ status: 400 },
			);
		}

		const { agentId, walletAddress, idempotencyKey, creditsToDeduct } =
			validation.data;

		const eventId = await prisma.$transaction(async (tx) => {
			// fetch agent and check idempotency in parallel
			const [agent, existingEvent] = await Promise.all([
				tx.agent.findUnique({
					where: { id: agentId },
					select: {
						id: true,
						feeModelType: true,
						feeModelConfig: true,
					},
				}),
				idempotencyKey
					? tx.usageEvent.findUnique({
							where: { agentId_idempotencyKey: { agentId, idempotencyKey } },
							select: {
								id: true,
							},
						})
					: null,
			]);

			if (!agent) {
				throw new Error("Agent not found", { cause: 404 });
			}

			// handle idempotency
			if (existingEvent) {
				return { eventId: existingEvent.id };
			}

			// core fee logic
			let feeToDeduct: Prisma.Decimal | null = null;
			let creditsCost: bigint | null = null;

			if (agent.feeModelType === FeeModelType.FREE_TIER) {
				// free tier logic
				const config = agent.feeModelConfig as FreeTierConfig;
				// check if the user has exceeded the threshold
				const usageCount = await tx.usageEvent.count({
					where: {
						agentId,
						userWalletAddress: walletAddress,
						status: "CAPTURED",
					},
				});

				// if the user has exceeded the threshold, deduct the fee
				if (usageCount >= config.threshold) {
					feeToDeduct = new Prisma.Decimal(config.rate);
					try {
						// deduct the fee from the user's balance
						await tx.userBalance.update({
							where: {
								userWalletAddress_agentId: {
									userWalletAddress: walletAddress,
									agentId,
								},
								ethBalance: { gte: feeToDeduct },
							},
							data: {
								ethBalance: { decrement: feeToDeduct },
							},
							select: {
								userWalletAddress: true,
								agentId: true,
							},
						});
					} catch (error) {
						// if the user's balance is too low, throw an error
						if (
							error instanceof Prisma.PrismaClientKnownRequestError &&
							error.code === "P2025"
						) {
							throw new Error(
								"Insufficient funds. Please top up your balance.",
								{ cause: 402 },
							);
						}
						// re-throw other unexpected database errors
						throw error;
					}
				}
			}
			// credit based logic
			else if (agent.feeModelType === FeeModelType.CREDIT_BASED) {
				const config = agent.feeModelConfig as CreditBasedConfig;
				creditsCost = BigInt(creditsToDeduct ?? config.creditsPerPrompt);
				try {
					// deduct the credits from the user's balance
					await tx.userBalance.update({
						where: {
							userWalletAddress_agentId: {
								userWalletAddress: walletAddress,
								agentId,
							},
							creditBalance: { gte: creditsCost },
						},
						data: {
							creditBalance: { decrement: creditsCost },
						},
						select: {
							userWalletAddress: true,
							agentId: true,
						},
					});
				} catch (error) {
					// if the user's balance is too low, throw an error
					if (
						error instanceof Prisma.PrismaClientKnownRequestError &&
						error.code === "P2025"
					) {
						throw new Error("Insufficient credits. Please buy more.", {
							cause: 402,
						});
					}
					throw error;
				}
			}

			// create pending usage event
			const newEvent = await tx.usageEvent.create({
				data: {
					agentId,
					userWalletAddress: walletAddress,
					status: "PENDING",
					feeDeducted: feeToDeduct,
					creditsDeducted: creditsCost,
					idempotencyKey,
				},
				select: {
					id: true,
				},
			});

			return newEvent.id;
		});

		// return the eventId
		return NextResponse.json({ data: { eventId } }, { status: 200 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Invalid request body", errors: error.issues },
				{ status: 400 },
			);
		}
		// handle potential unique constraint errors for idempotency keys if two requests arrive at the exact same time
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return NextResponse.json(
				{ message: "Idempotency key conflict." },
				{ status: 409 },
			);
		}

		if (error instanceof Error) {
			return NextResponse.json(
				{ message: error.message },
				{ status: typeof error.cause === "number" ? error.cause : 400 },
			);
		}

		console.error("Track API Error: ", error);
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
