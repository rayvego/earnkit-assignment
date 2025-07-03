export interface EarnKitConfig {
	agentId: string;
	baseUrl?: string;
}

interface TrackParams {
	walletAddress: string;
	idempotencyKey?: string;
	creditsToDeduct?: number;
}

interface TrackSuccessResponse {
	data: { eventId: string };
	success: boolean;
}

interface CaptureParams {
	eventId: string;
}

interface CaptureSuccessResponse {
	success: boolean;
	eventId: string;
}

interface ReleaseParams {
	eventId: string;
}

interface ReleaseSuccessResponse {
	success: boolean;
	eventId: string;
}

export interface TopUpOption {
	label: string;
	amountInEth: string;
	to: string;
	value: string; // Amount in WEI
	creditsToTopUp?: number;
}

export interface UserBalance {
	eth: string;
	credits: string;
}

interface SubmitTopUpParams {
	txHash: string;
	walletAddress: string;
	amountInEth: string;
	creditsToTopUp?: number;
}

interface SubmitTopUpResponse {
	status: string;
	message: string;
}

interface TopUpDetailsResponse {
	options: TopUpOption[];
}

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

interface PollingParams {
	walletAddress: string;
	initialBalance: UserBalance;
	onConfirmation: (newBalance: UserBalance) => void;
	onTimeout?: () => void; // Make timeout handler optional
	pollInterval?: number; // Allow overriding the interval
	maxPolls?: number; // Allow overriding the timeout
}

interface ApiErrorResponse {
	message: string;
	success: boolean;
}

/**
 * The main EarnKit SDK class.
 * Provides methods to interact with the EarnKit monetization platform.
 */
export class EarnKit {
	private agentId: string | null = null;
	private baseUrl: string = "http://localhost:3000";

	constructor() {
		console.log("EarnKit SDK instance created!");
	}

	/**
	 * Initializes the EarnKit SDK with a specific agent configuration.
	 * This method must be called once before any other SDK methods are used.
	 * Validates the agentId is a non-empty CUID string
	 * Store the agentId in the instance for future use (as a private property)
	 * Synchronous operation - no network calls
	 *
	 * @param {EarnKitConfig} config - The configuration object for the SDK.
	 * @param {string} config.agentId - The unique ID for your agent, found on the EarnKit dashboard.
	 * @param {string} [config.baseUrl] - The base URL of the EarnKit API. Defaults to http://localhost:3000.
	 * @returns {void}
	 */
	public initialize(config: EarnKitConfig): void {
		// input validation
		if (
			!config ||
			typeof config.agentId !== "string" ||
			config.agentId.trim() === ""
		) {
			throw new Error(
				"EarnKit Error: `agentId` provided to initialize() is invalid. Please provide a valid string.",
			);
		}

		if (config.baseUrl) {
			try {
				// validate that it's a valid URL
				new URL(config.baseUrl);
				this.baseUrl = config.baseUrl;
			} catch (_error) {
				throw new Error(
					"EarnKit Error: `baseUrl` provided to initialize() is not a valid URL.",
				);
			}
		}

		// store the validated agentId in the class instance for later use by other methods
		this.agentId = config.agentId;
		console.log(`EarnKit SDK initialized for agent: ${this.agentId}`);
		console.log(`Using API base URL: ${this.baseUrl}`);
	}

	/**
	 * Initiates a trackable event. This should be called before running the core AI logic.
	 * The developer is responsible for passing in the correct wallet address of the end user. This is done to avoid tightly coupling the SDK to a specific wallet provider.
	 * It checks for sufficient funds/credits and provisionally deducts them.
	 * Checks if the SDK is initialized
	 * Sends a POST request to the /api/track endpoint
	 * On success, returns the eventId
	 * On error, throws an error
	 *
	 * @param {TrackParams} params - The parameters for the track event.
	 * @returns {Promise<{ eventId: string }>} A promise that resolves with the unique event ID.
	 * @throws {Error} Throws an error if the request fails (e.g., insufficient funds).
	 */
	public async track(params: TrackParams): Promise<{ eventId: string }> {
		// check for initialization
		if (!this.agentId) {
			throw new Error(
				"EarnKit Error: SDK not initialized. Please call initialize() before using track().",
			);
		}

		// input validation
		if (
			!params ||
			typeof params.walletAddress !== "string" ||
			!params.walletAddress.startsWith("0x")
		) {
			throw new Error(
				"EarnKit Error: `walletAddress` is required and must be a valid string.",
			);
		}

		// send POST request to the /api/track endpoint
		const body = {
			agentId: this.agentId,
			walletAddress: params.walletAddress,
			idempotencyKey: params.idempotencyKey,
			creditsToDeduct: params.creditsToDeduct,
		};

		try {
			const response = await fetch(`${this.baseUrl}/api/track`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const errorData: ApiErrorResponse = await response.json();
				throw new Error(
					errorData.message ||
						`API Error: ${response.status} ${response.statusText}`,
				);
			}

			const successData: TrackSuccessResponse = await response.json();

			if (successData?.data?.eventId) {
				return { eventId: successData.data.eventId };
			} else {
				throw new Error(
					"EarnKit Error: Received an unexpected response format from the server.",
				);
			}
		} catch (error) {
			// re-throw any network or API errors for the developer to handle
			throw error;
		}
	}

	/**
	 * Captures a previously tracked event, finalizing the charge.
	 * This should be called after the core AI logic has successfully completed.
	 * Sends a POST request to the /api/capture endpoint
	 * On success, returns the success status
	 * On error, throws an error
	 *
	 * @param {CaptureParams} params - The parameters for the capture event.
	 * @returns {Promise<{ success: boolean }>} A promise that resolves indicating success.
	 * @throws {Error} Throws an error if the event cannot be captured (e.g., not found or not pending).
	 */
	public async capture(params: CaptureParams): Promise<{ success: boolean }> {
		if (
			!params ||
			typeof params.eventId !== "string" ||
			params.eventId.trim() === ""
		) {
			throw new Error(
				"EarnKit Error: `eventId` is required and must be a valid string.",
			);
		}

		// send POST request to the /api/capture endpoint
		const body = {
			eventId: params.eventId,
		};

		try {
			const response = await fetch(`${this.baseUrl}/api/capture`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const errorData: ApiErrorResponse = await response.json();
				throw new Error(
					errorData.message ||
						`API Error: ${response.status} ${response.statusText}`,
				);
			}

			const successData: CaptureSuccessResponse = await response.json();

			return { success: successData.success };
		} catch (error) {
			// re-throw any network or API errors for the developer to handle
			throw error;
		}
	}

	/**
	 * Releases a previously tracked event, refunding any provisionally held funds.
	 * This should be called in a catch block if the core AI logic fails after a successful track() call.
	 * Sends a POST request to the /api/release endpoint
	 * On success, returns the success status
	 * On error, throws an error
	 *
	 * @param {ReleaseParams} params - The parameters for the release event.
	 * @returns {Promise<{ success: boolean }>} A promise that resolves indicating success.
	 * @throws {Error} Throws an error if the event cannot be released.
	 */
	public async release(params: ReleaseParams): Promise<{ success: boolean }> {
		// input validation
		if (
			!params ||
			typeof params.eventId !== "string" ||
			params.eventId.trim() === ""
		) {
			throw new Error(
				"EarnKit Error: `eventId` is required for release() and must be a valid string.",
			);
		}

		// send POST request to the /api/release endpoint
		const body = {
			eventId: params.eventId,
		};

		try {
			const response = await fetch(`${this.baseUrl}/api/release`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const errorData: ApiErrorResponse = await response.json();
				throw new Error(
					errorData.message ||
						`API Error: ${response.status} ${response.statusText}`,
				);
			}

			const successData: ReleaseSuccessResponse = await response.json();

			return { success: successData.success };
		} catch (error) {
			// re-throw any network or API errors for the developer to handle
			throw error;
		}
	}

	/**
	 * Fetches the pre-configured top-up options for the current agent.
	 * @returns {Promise<{ options: TopUpOption[] }>} A promise that resolves with the purchase options.
	 */
	public async getTopUpDetails(): Promise<TopUpDetailsResponse> {
		if (!this.agentId) throw new Error("EarnKit: Not initialized.");

		const url = new URL(`${this.baseUrl}/api/top-up-details`);
		url.searchParams.set("agentId", this.agentId);

		const response = await fetch(url.toString());
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || "Failed to fetch top-up details.");
		}
		return response.json();
	}

	/**
	 * Submits a transaction hash to the backend for monitoring.
	 * @param {SubmitTopUpParams} params - The details of the submitted transaction.
	 * @returns {Promise<any>} A promise that resolves with the backend's confirmation response.
	 */
	public async submitTopUpTransaction(
		params: SubmitTopUpParams,
	): Promise<SubmitTopUpResponse> {
		if (!this.agentId) throw new Error("EarnKit: Not initialized.");

		const response = await fetch(`${this.baseUrl}/api/top-up-details`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				agentId: this.agentId,
				...params,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				errorData.message || "Failed to submit top-up transaction.",
			);
		}
		return response.json();
	}

	/**
	 * Fetches the current ETH and credit balance for a user.
	 * @param {{ walletAddress: string }} params - The user's wallet address.
	 * @returns {Promise<UserBalance>} A promise that resolves with the user's balances.
	 */
	public async getBalance(params: {
		walletAddress: string;
	}): Promise<UserBalance> {
		if (!this.agentId) throw new Error("EarnKit: Not initialized.");

		const url = new URL(`${this.baseUrl}/api/balance`);
		url.searchParams.set("agentId", this.agentId);
		url.searchParams.set("walletAddress", params.walletAddress);

		const response = await fetch(url.toString());
		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.message || "Failed to fetch balance.");
		}
		return response.json();
	}

	/**
	 * Polls the backend to check for a balance update after a top-up.
	 * This is a utility function to simplify the developer's workflow.
	 * @param {PollingParams} params - Configuration for the polling process.
	 */
	public pollForBalanceUpdate(params: PollingParams): void {
		const {
			walletAddress,
			initialBalance,
			onConfirmation,
			onTimeout,
			pollInterval = 10000, // Default to 10 seconds
			maxPolls = 30, // Default to 5 minutes (30 polls * 10s)
		} = params;

		let pollCount = 0;

		const intervalId = setInterval(async () => {
			if (pollCount >= maxPolls) {
				clearInterval(intervalId);
				console.warn(
					`EarnKit: Polling for balance update timed out after ${(maxPolls * pollInterval) / 1000} seconds.`,
				);
				if (onTimeout) onTimeout();
				return;
			}
			pollCount++;

			try {
				const currentBalance = await this.getBalance({ walletAddress });

				const ethIncreased =
					parseFloat(currentBalance.eth) > parseFloat(initialBalance.eth);
				const creditsIncreased =
					BigInt(currentBalance.credits) > BigInt(initialBalance.credits);

				if (ethIncreased || creditsIncreased) {
					clearInterval(intervalId);
					console.log("EarnKit: Balance update detected!");
					onConfirmation(currentBalance);
				}
			} catch (error) {
				console.error("EarnKit: Error during polling, stopping.", error);
				clearInterval(intervalId);
				// Don't call onTimeout here, as this was an unexpected error.
			}
		}, pollInterval);
	}
}

export const earnkit = new EarnKit();
