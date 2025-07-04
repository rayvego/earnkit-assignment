import {
	EarnKitApiError,
	EarnKitInitializationError,
	EarnKitInputError,
} from "./error";

export interface EarnKitConfig {
	agentId: string;
	baseUrl?: string;
	debug?: boolean;
	requestTimeoutMs?: number;
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

const MAX_RETRIES = 2; // 1 initial attempt + 2 retries

/**
 * The main EarnKit SDK class.
 * Provides methods to interact with the EarnKit monetization platform.
 */
export class EarnKit {
	private agentId: string;
	private baseUrl: string = "http://localhost:3000";
	private debug: boolean = false;
	private requestTimeoutMs: number = 30_000;

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
	 * @param {boolean} [config.debug] - Whether to enable debug logging. Defaults to false.
	 * @param {number} [config.requestTimeoutMs] - The request timeout in milliseconds. Defaults to 30000.
	 * @returns {void}
	 */
	constructor(config: EarnKitConfig) {
		// input validation
		if (
			!config ||
			typeof config.agentId !== "string" ||
			config.agentId.trim() === ""
		) {
			throw new EarnKitInitializationError(
				"`agentId` provided to the constructor is invalid. Please provide a valid string.",
			);
		}

		if (config.baseUrl) {
			try {
				// validate that it's a valid URL
				new URL(config.baseUrl);
				this.baseUrl = config.baseUrl;
			} catch (_error) {
				throw new EarnKitInitializationError(
					"`baseUrl` provided to the constructor is not a valid URL.",
				);
			}
		}

		this.debug = config.debug ?? false;
		this.requestTimeoutMs = config.requestTimeoutMs ?? 30_000;

		// store the validated agentId in the class instance for later use by other methods
		this.agentId = config.agentId;
		this._log(`SDK instance created for agent: ${this.agentId}`);
		this._log(`Using API base URL: ${this.baseUrl}`);
		this._log(`Request timeout set to: ${this.requestTimeoutMs}ms`);
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
		if (
			!params ||
			typeof params.walletAddress !== "string" ||
			!params.walletAddress.startsWith("0x")
		) {
			throw new EarnKitInputError(
				"`walletAddress` is required and must be a valid string.",
			);
		}

		const body = {
			agentId: this.agentId,
			walletAddress: params.walletAddress,
			idempotencyKey: params.idempotencyKey,
			creditsToDeduct: params.creditsToDeduct,
		};

		const response = await this._apiCall<TrackSuccessResponse>("/track", {
			method: "POST",
			body: JSON.stringify(body),
		});

		if (response.data?.eventId) {
			return { eventId: response.data.eventId };
		} else {
			throw new EarnKitApiError(
				"Received an unexpected response format from the server.",
				500,
				response,
			);
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
			throw new EarnKitInputError(
				"`eventId` is required and must be a valid string.",
			);
		}

		const body = {
			eventId: params.eventId,
		};

		const response = await this._apiCall<CaptureSuccessResponse>("/capture", {
			method: "POST",
			body: JSON.stringify(body),
		});

		return { success: response.success };
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
		if (
			!params ||
			typeof params.eventId !== "string" ||
			params.eventId.trim() === ""
		) {
			throw new EarnKitInputError(
				"`eventId` is required for release() and must be a valid string.",
			);
		}

		const body = {
			eventId: params.eventId,
		};

		const response = await this._apiCall<ReleaseSuccessResponse>("/release", {
			method: "POST",
			body: JSON.stringify(body),
		});

		return { success: response.success };
	}

	/**
	 * Fetches the pre-configured top-up options for the current agent.
	 * @returns {Promise<{ options: TopUpOption[] }>} A promise that resolves with the purchase options.
	 */
	public async getTopUpDetails(): Promise<TopUpDetailsResponse> {
		const url = new URL(`${this.baseUrl}/api/top-up-details`);
		url.searchParams.set("agentId", this.agentId);

		return this._apiCall<TopUpDetailsResponse>(url.toString());
	}

	/**
	 * Submits a transaction hash to the backend for monitoring.
	 * @param {SubmitTopUpParams} params - The details of the submitted transaction.
	 * @returns {Promise<any>} A promise that resolves with the backend's confirmation response.
	 */
	public async submitTopUpTransaction(
		params: SubmitTopUpParams,
	): Promise<SubmitTopUpResponse> {
		const response = await this._apiCall<SubmitTopUpResponse>(
			"/top-up-details",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					agentId: this.agentId,
					...params,
				}),
			},
		);

		return response;
	}

	/**
	 * Fetches the current ETH and credit balance for a user.
	 * @param {{ walletAddress: string }} params - The user's wallet address.
	 * @returns {Promise<UserBalance>} A promise that resolves with the user's balances.
	 */
	public async getBalance(params: {
		walletAddress: string;
	}): Promise<UserBalance> {
		const url = new URL(`${this.baseUrl}/api/balance`);
		url.searchParams.set("agentId", this.agentId);
		url.searchParams.set("walletAddress", params.walletAddress);

		return this._apiCall<UserBalance>(url.toString());
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
				this._log(
					`Polling for balance update timed out after ${(maxPolls * pollInterval) / 1000} seconds.`,
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
					this._log("Balance update detected!");
					onConfirmation(currentBalance);
				}
			} catch (error) {
				console.error("EarnKit: Error during polling, stopping.", error);
				clearInterval(intervalId);
				// Don't call onTimeout here, as this was an unexpected error.
			}
		}, pollInterval);
	}

	private _log(message: string, ...args: unknown[]): void {
		if (this.debug) {
			console.log(`[EarnKit-SDK] ${message}`, ...args);
		}
	}

	private async _apiCall<T>(
		path: string,
		options: RequestInit = {},
	): Promise<T> {
		const controller = new AbortController();
		const timeoutId = setTimeout(
			() => controller.abort(),
			this.requestTimeoutMs,
		);

		let lastError: Error | null = null;

		for (let i = 0; i <= MAX_RETRIES; i++) {
			try {
				const url = path.startsWith("http")
					? path
					: `${this.baseUrl}/api${path}`;

				const defaultOptions: RequestInit = {
					headers: {
						"Content-Type": "application/json",
					},
					signal: controller.signal,
				};

				const mergedOptions = { ...defaultOptions, ...options };

				this._log(
					`Making API call (attempt ${i + 1}/${MAX_RETRIES + 1}) to ${mergedOptions.method || "GET"} ${url}`,
				);

				const response = await fetch(url, mergedOptions);

				if (!response.ok) {
					const errorData: ApiErrorResponse = await response.json();
					throw new EarnKitApiError(
						errorData.message || `HTTP Error: ${response.status}`,
						response.status,
						errorData,
					);
				}

				clearTimeout(timeoutId);
				return (await response.json()) as T;
			} catch (error) {
				lastError = error as Error;

				// decide if we should retry
				const isRetryable = this.isErrorRetryable(error);
				if (!isRetryable || i === MAX_RETRIES) {
					break; // exit loop to throw the error
				}

				const delay = 1000 * 2 ** i; // 1s, 2s, 4s, ...
				this._log(`Request failed, retrying in ${delay}ms...`, error);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		clearTimeout(timeoutId);

		// re-throw the last captured error
		if (lastError instanceof EarnKitApiError) {
			throw lastError;
		}

		if (lastError instanceof Error && lastError.name === "AbortError") {
			throw new EarnKitApiError(
				`Request timed out after ${this.requestTimeoutMs}ms`,
				408, // Request Timeout
				lastError,
			);
		}

		throw new EarnKitApiError(
			`Network request failed: ${lastError instanceof Error ? lastError.message : "Unknown error"}`,
			0, // Use 0 for status when it's a network error
			lastError,
		);
	}

	private isErrorRetryable(error: unknown): boolean {
		if (!(error instanceof EarnKitApiError)) {
			// network errors or AbortError are retryable
			return true;
		}

		const status = error.status;

		// retry on server errors (5xx) and timeouts (408)
		const isServerError = status >= 500 && status <= 599;
		const isTimeout = status === 408;

		return isServerError || isTimeout;
	}
}
