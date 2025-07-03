export type FreeTierConfig = {
	threshold: number;
	rate: number;
};

export type CreditBasedConfig = {
	creditsPerPrompt: number;
	topUpOptions: {
		creditAmount: number;
		pricePerCredit: number;
	}[];
};

export type TopUpOption = {
	label: string;
	amountInEth: string;
	to: string;
	value: string;
};

export type FeeModelConfig = FreeTierConfig | CreditBasedConfig;
