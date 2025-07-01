// packages/earnkit-sdk/src/index.ts

export class EarnKit {
	private agentId: string | null = null;

	constructor() {
		console.log("EarnKit SDK instance created!");
	}

	initializeAgent(agentId: string) {
		this.agentId = agentId;
		console.log(`Agent initialized with ID: ${agentId}`);
	}

	async trackPrompt(params: { walletAddress: string }) {
		if (!this.agentId) {
			throw new Error("SDK not initialized. Call initializeAgent() first.");
		}
		console.log(
			`Tracking prompt for wallet ${params.walletAddress} on agent ${this.agentId}`,
		);

		// In the future, this will be a fetch() call to your backend API
		// await fetch('/api/track', { ... });

		return { success: true, message: "Prompt tracked" };
	}
}

// You might also export a singleton instance for ease of use
export const earnkit = new EarnKit();
