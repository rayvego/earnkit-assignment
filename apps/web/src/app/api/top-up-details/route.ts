import { prisma } from "@/lib/prisma";
import { getDetailsSchema, submitTopUpSchema } from "@/lib/schemas";
import { FeeModelType, Prisma } from "@prisma/client";
import type { CreditBasedConfig, TopUpOption } from "earnkit-sdk";
import { ethers } from "ethers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// get top-up details for an agent
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);

		const validation = getDetailsSchema.safeParse({
			agentId: searchParams.get("agentId"),
		});

		if (!validation.success) {
			return NextResponse.json(
				{ message: "Invalid or missing agentId" },
				{ status: 400 },
			);
		}
		const { agentId } = validation.data;

		// fetch the agent and its related developer's deposit address
		const agent = await prisma.agent.findUnique({
			where: { id: agentId },
			select: {
				id: true,
				feeModelType: true,
				feeModelConfig: true,
				developer: {
					select: {
						walletAddress: true,
					},
				},
			},
		});

		if (!agent || !agent.developer?.walletAddress) {
			return NextResponse.json(
				{ message: "Agent or developer configuration not found" },
				{ status: 404 },
			);
		}

		let options: TopUpOption[] = [];
		const depositAddress = agent.developer.walletAddress;

		// logic branch based on fee model type
		if (agent.feeModelType === FeeModelType.CREDIT_BASED) {
			// credit based fee model
			const config = agent.feeModelConfig as CreditBasedConfig;

			// ensure topUpOptions exists and is an array before mapping
			if (config.topUpOptions && Array.isArray(config.topUpOptions)) {
				options = config.topUpOptions.map(
					(opt: { creditAmount: number; pricePerCredit: number }) => {
						const totalPrice = opt.creditAmount * opt.pricePerCredit;
						const totalPriceString = totalPrice.toFixed(6);

						return {
							label: `${opt.creditAmount.toLocaleString()} Credits`,
							amountInEth: totalPriceString,
							to: depositAddress,
							value: ethers.parseEther(totalPriceString).toString(),
							creditsToTopUp: opt.creditAmount,
						};
					},
				);
			}
		} else if (agent.feeModelType === FeeModelType.FREE_TIER) {
			// free tier fee model
			const predefinedAmounts = ["0.005", "0.01", "0.025"]; // hardcoded for now

			options = predefinedAmounts.map((amount) => {
				return {
					label: `${amount} ETH`,
					amountInEth: amount,
					to: depositAddress,
					value: ethers.parseEther(amount).toString(),
				};
			});
		}

		// return the formatted options
		return NextResponse.json({ options });
	} catch (error) {
		console.error("Get Top-Up Details Error: ", error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ message: "Invalid request body ", errors: error.issues },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

// submit a top-up transaction
export async function POST(req: Request) {
	try {
		const body = await req.json();
		const validation = submitTopUpSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ message: "Invalid request body", errors: validation.error.errors },
				{ status: 400 },
			);
		}

		const { txHash, walletAddress, agentId, amountInEth, creditsToTopUp } =
			validation.data;

		// create the PENDING record
		// this will fail if the txHash already exists due to the @id constraint,
		// which handles duplicate submissions automatically.
		await prisma.topUpTransaction.create({
			data: {
				txHash,
				status: "PENDING",
				userWalletAddress: walletAddress,
				agentId,
				amountInEth,
				creditsToTopUp: creditsToTopUp ? BigInt(creditsToTopUp) : null,
			},
		});

		// simulate the asynchronous confirmation process
		// we do this AFTER creating the record, but we DON'T wait for it to finish.
		// this is "fire-and-forget".
		// since this is deployed on serverless compute and database, we'll need it to run right now
		// serverless kills all background processes once this function returns
		await simulateTransactionConfirmation(txHash);

		// immediately respond to the client
		return NextResponse.json(
			{
				status: "PENDING_CONFIRMATION",
				message: "Top-up transaction is being monitored.",
			},
			{ status: 202 },
		);
	} catch (error) {
		// handle the case where the txHash is already in the database
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return NextResponse.json(
				{ message: "This transaction hash has already been submitted." },
				{ status: 409 },
			);
		}

		console.error("Submit Top-Up Error:", error);
		return NextResponse.json(
			{ message: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

// this function simulates our background worker
async function simulateTransactionConfirmation(txHash: string) {
	console.log(`[Worker] Started monitoring tx: ${txHash}`);
	await new Promise((resolve) => setTimeout(resolve, 3000));
	console.log(`[Worker] Transaction ${txHash} is "confirmed"!`);

	try {
		const topUpRecord = await prisma.topUpTransaction.findUnique({
			where: { txHash },
			select: {
				txHash: true,
				status: true,
				agentId: true,
				userWalletAddress: true,
				amountInEth: true,
				creditsToTopUp: true,
			},
		});

		if (!topUpRecord || topUpRecord.status !== "PENDING") {
			console.error(
				`[Worker] TopUp record for ${txHash} not found or not pending.`,
			);
			return;
		}

		const { agentId, userWalletAddress, amountInEth, creditsToTopUp } =
			topUpRecord;

		// fetch the agent to determine the fee model
		const agent = await prisma.agent.findUnique({
			where: { id: agentId },
			select: {
				feeModelType: true,
				feeModelConfig: true,
			},
		});
		if (!agent) {
			throw new Error(`Agent ${agentId} not found during confirmation`);
		}

		await prisma.$transaction(async (tx) => {
			// perform the dynamic update and status update in parallel
			await Promise.all([
				tx.userBalance.upsert({
					where: { userWalletAddress_agentId: { userWalletAddress, agentId } },
					create: {
						userWalletAddress,
						agentId,
						ethBalance:
							agent.feeModelType === FeeModelType.FREE_TIER
								? new Prisma.Decimal(amountInEth)
								: 0,
						creditBalance:
							agent.feeModelType === FeeModelType.CREDIT_BASED && creditsToTopUp
								? creditsToTopUp
								: BigInt(0),
					},
					update: {
						ethBalance:
							agent.feeModelType === FeeModelType.FREE_TIER
								? { increment: new Prisma.Decimal(amountInEth) }
								: undefined,
						creditBalance:
							agent.feeModelType === FeeModelType.CREDIT_BASED && creditsToTopUp
								? { increment: creditsToTopUp }
								: undefined,
					},
				}),
				tx.topUpTransaction.update({
					where: { txHash },
					data: { status: "CONFIRMED" },
					select: {
						txHash: true,
					},
				}),
			]);
		});

		console.log(`[Worker] Successfully processed top-up for tx ${txHash}`);
	} catch (error) {
		// if anything goes wrong during confirmation, we mark the transaction as FAILED.
		console.error(
			`[Worker] Failed to process confirmation for ${txHash}:`,
			error,
		);
		await prisma.topUpTransaction.update({
			where: { txHash },
			data: { status: "FAILED", errorMessage: JSON.stringify(error) },
			select: {
				txHash: true,
			},
		});
	}
}
