/**
 * The base error class for all errors thrown by the EarnKit SDK.
 * This allows developers to catch all SDK-specific errors using `catch (e) { if (e instanceof EarnKitError) { ... } }`.
 */
declare class EarnKitError extends Error {
    constructor(message: string);
}
/**
 * Thrown when the SDK is not properly initialized before use,
 * or when initialization is attempted with invalid configuration.
 */ declare class EarnKitInitializationError extends EarnKitError {
    constructor(message: string);
}
/**
 * Thrown when a method is called with invalid or missing parameters.
 * This error indicates a problem with the developer's input to the SDK method.
 */
declare class EarnKitInputError extends EarnKitError {
    constructor(message: string);
}
/**
 * Thrown when an API call to the EarnKit backend fails.
 * It contains the HTTP status code and the response body for debugging.
 */
declare class EarnKitApiError extends EarnKitError {
    readonly status: number;
    readonly responseBody: unknown;
    constructor(message: string, status: number, responseBody?: unknown);
}

interface EarnKitConfig {
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
interface CaptureParams {
    eventId: string;
}
interface ReleaseParams {
    eventId: string;
}
interface TopUpOption {
    label: string;
    amountInEth: string;
    to: string;
    value: string;
    creditsToTopUp?: number;
}
interface UserBalance {
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
type FreeTierConfig = {
    threshold: number;
    rate: number;
};
type CreditBasedConfig = {
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
    onTimeout?: () => void;
    pollInterval?: number;
    maxPolls?: number;
}
/**
 * The main EarnKit SDK class.
 * Provides methods to interact with the EarnKit monetization platform.
 */
declare class EarnKit {
    private agentId;
    private baseUrl;
    private debug;
    private requestTimeoutMs;
    /**
     * Initializes the EarnKit SDK with a specific agent configuration.
     * Validates the agentId is a non-empty CUID string
     * Store the agentId in the instance for future use (as a private property)
     * Synchronous operation - no network calls
     *
     * @param {EarnKitConfig} config - The configuration object for the SDK.
     * @param {string} config.agentId - The unique ID for your agent, found on the EarnKit dashboard.
     * @param {string} [config.baseUrl] - The base URL of the EarnKit Backend API. Defaults to http://localhost:3000.
     * @param {boolean} [config.debug] - Whether to enable debug logging. Defaults to false.
     * @param {number} [config.requestTimeoutMs] - The maximum global request timeout in milliseconds. Defaults to 30000.
     * @returns {void}
     * @throws {EarnKitInitializationError} Throws an error if the initialization fails.
     */
    constructor(config: EarnKitConfig);
    /**
     * Initiates a trackable event. This should be called before running the core AI logic.
     * The developer is responsible for passing in the correct wallet address of the end user. This is done to avoid tightly coupling the SDK to a specific wallet provider.
     * It checks for sufficient funds/credits and provisionally deducts them.
     * Sends a POST request to the /api/track endpoint and returns the eventId.
     *
     * @param {TrackParams} params - The parameters for the track event.
     * @param {string} params.walletAddress - The wallet address of the end user.
     * @param {string} [params.idempotencyKey] - A unique identifier for the event.
     * @param {number} [params.creditsToDeduct] - The number of credits to deduct from the user's balance.
     * @returns {Promise<{ eventId: string }>} A promise that resolves with the unique event ID.
     * @throws {EarnKitInputError | EarnKitApiError} Throws an error if the request fails (e.g., insufficient funds).
     */
    track(params: TrackParams): Promise<{
        eventId: string;
    }>;
    /**
     * Captures a previously tracked event, finalizing the charge.
     * This should be called after the core AI logic has successfully completed.
     * Sends a POST request to the /api/capture endpoint and returns the success status.
     *
     * @param {CaptureParams} params - The parameters for the capture event.
     * @param {string} params.eventId - The eventId of the tracked event to capture.
     * @returns {Promise<{ success: boolean }>} A promise that resolves indicating success.
     * @throws {EarnKitInputError | EarnKitApiError} Throws an error if the event cannot be captured (e.g., not found or not pending).
     */
    capture(params: CaptureParams): Promise<{
        success: boolean;
    }>;
    /**
     * Releases a previously tracked event, refunding any provisionally held funds.
     * This should be called in a catch block if the core AI logic fails after a successful track() call.
     * Sends a POST request to the /api/release endpoint and returns the success status.
     *
     * @param {ReleaseParams} params - The parameters for the release event.
     * @param {string} params.eventId - The eventId of the tracked event to release.
     * @returns {Promise<{ success: boolean }>} A promise that resolves indicating success.
     * @throws {EarnKitInputError | EarnKitApiError} Throws an error if the event cannot be released.
     */
    release(params: ReleaseParams): Promise<{
        success: boolean;
    }>;
    /**
     * Fetches the pre-configured top-up options for the current agent.
     * Sends a GET request to the /api/top-up-details endpoint and returns the top-up options.
     * @returns {Promise<{ options: TopUpOption[] }>} A promise that resolves with the purchase options.
     * @throws {EarnKitApiError} Throws an error if the request fails.
     */
    getTopUpDetails(): Promise<TopUpDetailsResponse>;
    /**
     * Submits a transaction hash to the backend for monitoring.
     * Sends a POST request to the /api/top-up-details endpoint and returns the backend's confirmation response.
     * @param {SubmitTopUpParams} params - The details of the submitted transaction.
     * @param {string} params.txHash - The transaction hash of the top-up.
     * @param {string} params.walletAddress - The wallet address of the end user.
     * @param {string} params.amountInEth - The amount of ETH to top up.
     * @param {number} [params.creditsToTopUp] - The number of credits to top up.
     * @returns {Promise<SubmitTopUpResponse>} A promise that resolves with the backend's confirmation response.
     * @throws {EarnKitApiError} Throws an error if the request fails.
     */
    submitTopUpTransaction(params: SubmitTopUpParams): Promise<SubmitTopUpResponse>;
    /**
     * Fetches the current ETH and credit balance for a user.
     * Sends a GET request to the /api/balance endpoint and returns the user's balances.
     * @param {{ walletAddress: string }} params - The user's wallet address.
     * @returns {Promise<UserBalance>} A promise that resolves with the user's balances.
     * @throws {EarnKitApiError} Throws an error if the request fails.
     */
    getBalance(params: {
        walletAddress: string;
    }): Promise<UserBalance>;
    /**
     * Polls the backend to check for a balance update after a top-up.
     * This is a utility function to simplify the developer's workflow.
     * Sends a GET request repeatedly to the /api/balance endpoint and returns the user's balances.
     * @param {PollingParams} params - Configuration for the polling process.
     * @param {string} params.walletAddress - The wallet address of the end user.
     * @param {UserBalance} params.initialBalance - The initial balance of the user.
     * @param {function} params.onConfirmation - A callback function to be called when the balance is updated.
     * @param {function} [params.onTimeout] - A callback function to be called when the polling times out.
     * @param {number} [params.pollInterval] - The interval in milliseconds at which to poll the balance. Defaults to 10 seconds.
     * @param {number} [params.maxPolls] - The maximum number of polls to make. Defaults to 30.
     * @returns {void}
     * @throws {EarnKitApiError} Throws an error if the polling times out.
     */
    pollForBalanceUpdate(params: PollingParams): void;
    /**
     * Logs a message to the console if debug mode is enabled.
     * @param {string} message - The message to log.
     * @param {unknown[]} args - The arguments to log.
     */
    private _log;
    /**
     * Validates that a string parameter meets the specified criteria.
     * @param {unknown} value - The value to validate.
     * @param {string} paramName - The name of the parameter for error messages.
     * @param {object} options - Validation options.
     * @param {boolean} [options.required=true] - Whether the parameter is required.
     * @param {boolean} [options.allowEmpty=false] - Whether empty strings are allowed.
     * @param {string} [options.startsWith] - Required prefix for the string.
     * @param {typeof EarnKitInputError | typeof EarnKitInitializationError} [options.errorType=EarnKitInputError] - The type of error to throw.
     * @throws {EarnKitInputError | EarnKitInitializationError} Throws an error if validation fails.
     */
    private _validateString;
    /**
     * Makes an API call to the backend with retry and timeout logic.
     * @param {string} path - The path of the API call.
     * @param {RequestInit} options - The options for the API call.
     * @returns {Promise<T>} A promise that resolves with the API call response.
     * @throws {EarnKitApiError | Error} Throws an error if the request fails.
     */
    private _apiCall;
    /**
     * Determines if an error is retryable.
     * @param {unknown} error - The error to check.
     * @returns {boolean} True if the error is retryable, false otherwise.
     */
    private isErrorRetryable;
}

export { type CreditBasedConfig, EarnKit, EarnKitApiError, type EarnKitConfig, EarnKitInitializationError, EarnKitInputError, type FreeTierConfig, type TopUpOption, type UserBalance };
