import type { CreditBasedConfig, FreeTierConfig } from "earnkit-sdk";

export type FeeModelConfig = FreeTierConfig | CreditBasedConfig;

export interface Agent {
	id: string;
	name: string;
	feeModelType: string;
	feeModelConfig: {
		threshold?: number;
		rate?: number;
		creditsPerPrompt?: number;
		topUpOptions?: Array<{
			creditAmount: number;
			pricePerCredit: number;
		}>;
	};
	createdAt: string;
}

// Optional but recommended: A generic API response type
export interface ApiResponse<T> {
	success: boolean;
	data: T;
	message: string;
}
