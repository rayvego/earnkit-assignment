interface EarnKitConfig {
    agentId: string;
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
    constructor();
    /**
     * Initializes the EarnKit SDK with a specific agent configuration.
     * This method must be called once before any other SDK methods are used.
     * Validates the agentId is a non-empty CUID string
     * Store the agentId in the instance for future use (as a private property)
     * Synchronous operation - no network calls
     *
     * @param {EarnKitConfig} config - The configuration object for the SDK.
     * @param {string} config.agentId - The unique ID for your agent, found on the EarnKit dashboard.
     * @returns {void}
     */
    initialize(config: EarnKitConfig): void;
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
    track(params: TrackParams): Promise<{
        eventId: string;
    }>;
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
    capture(params: CaptureParams): Promise<{
        success: boolean;
    }>;
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
    release(params: ReleaseParams): Promise<{
        success: boolean;
    }>;
    /**
     * Fetches the pre-configured top-up options for the current agent.
     * @returns {Promise<{ options: TopUpOption[] }>} A promise that resolves with the purchase options.
     */
    getTopUpDetails(): Promise<{
        options: TopUpOption[];
    }>;
    /**
     * Submits a transaction hash to the backend for monitoring.
     * @param {SubmitTopUpParams} params - The details of the submitted transaction.
     * @returns {Promise<any>} A promise that resolves with the backend's confirmation response.
     */
    submitTopUpTransaction(params: SubmitTopUpParams): Promise<any>;
    /**
     * Fetches the current ETH and credit balance for a user.
     * @param {{ walletAddress: string }} params - The user's wallet address.
     * @returns {Promise<UserBalance>} A promise that resolves with the user's balances.
     */
    getBalance(params: {
        walletAddress: string;
    }): Promise<UserBalance>;
    /**
     * Polls the backend to check for a balance update after a top-up.
     * This is a utility function to simplify the developer's workflow.
     * @param {PollingParams} params - Configuration for the polling process.
     */
    pollForBalanceUpdate(params: PollingParams): void;
}
declare const earnkit: EarnKit;

export { type CreditBasedConfig, EarnKit, type EarnKitConfig, type FreeTierConfig, type TopUpOption, type UserBalance, earnkit };
