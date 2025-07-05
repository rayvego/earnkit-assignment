import { FeeModelType } from "@prisma/client";
import { z } from "zod";

// Auth schemas
export const signUpSchema = z.object({
	walletAddress: z.string().min(1).optional(),
});

// Agent schemas
export const createAgentSchema = z.object({
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

// Balance schemas
export const getBalanceSchema = z.object({
	agentId: z.string().cuid(),
	walletAddress: z.string().startsWith("0x").length(42),
});

// Track schemas
export const trackRequestBodySchema = z.object({
	agentId: z.string().cuid(),
	walletAddress: z.string().startsWith("0x").length(42),
	idempotencyKey: z.string().uuid().optional(), // Recommend UUID for idempotency keys
	creditsToDeduct: z.number().int().positive().optional(),
});

// Capture schemas
export const captureRequestBodySchema = z.object({
	eventId: z.string().cuid(),
});

// Release schemas
export const releaseRequestBodySchema = z.object({
	eventId: z.string().cuid(),
});

// Top-up schemas
export const getDetailsSchema = z.object({
	agentId: z.string().cuid(),
});

export const submitTopUpSchema = z.object({
	txHash: z.string().startsWith("0x").length(66),
	walletAddress: z.string().startsWith("0x").length(42),
	agentId: z.string().cuid(),
	amountInEth: z.string(),
	creditsToTopUp: z.number().int().positive().optional(),
});
