var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  EarnKit: () => EarnKit,
  earnkit: () => earnkit
});
module.exports = __toCommonJS(index_exports);

// src/error.ts
var EarnKitError = class extends Error {
  constructor(message) {
    super(`[EarnKitError] ${message}`);
    this.name = "EarnKitError";
  }
};
var EarnKitInitializationError = class extends EarnKitError {
  constructor(message) {
    super(message);
    this.name = "EarnKitInitializationError";
  }
};
var EarnKitInputError = class extends EarnKitError {
  constructor(message) {
    super(message);
    this.name = "EarnKitInputError";
  }
};
var EarnKitApiError = class extends EarnKitError {
  status;
  responseBody;
  constructor(message, status, responseBody = null) {
    super(`API Error: ${message}`);
    this.name = "EarnKitApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
};

// src/index.ts
var MAX_RETRIES = 2;
var EarnKit = class {
  agentId = null;
  baseUrl = "http://localhost:3000";
  debug = false;
  requestTimeoutMs = 3e4;
  constructor() {
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
   * @param {boolean} [config.debug] - Whether to enable debug logging. Defaults to false.
   * @param {number} [config.requestTimeoutMs] - The request timeout in milliseconds. Defaults to 30000.
   * @returns {void}
   */
  initialize(config) {
    if (!config || typeof config.agentId !== "string" || config.agentId.trim() === "") {
      throw new EarnKitInitializationError(
        "`agentId` provided to initialize() is invalid. Please provide a valid string."
      );
    }
    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
        this.baseUrl = config.baseUrl;
      } catch (error) {
        throw new EarnKitInitializationError(
          "`baseUrl` provided to initialize() is not a valid URL."
        );
      }
    }
    this.debug = config.debug ?? false;
    this.requestTimeoutMs = config.requestTimeoutMs ?? 3e4;
    this.agentId = config.agentId;
    this._log(`SDK initialized for agent: ${this.agentId}`);
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
  async track(params) {
    var _a;
    this.assertInitialized();
    if (!params || typeof params.walletAddress !== "string" || !params.walletAddress.startsWith("0x")) {
      throw new EarnKitInputError(
        "`walletAddress` is required and must be a valid string."
      );
    }
    const body = {
      agentId: this.agentId,
      walletAddress: params.walletAddress,
      idempotencyKey: params.idempotencyKey,
      creditsToDeduct: params.creditsToDeduct
    };
    const response = await this._apiCall("/track", {
      method: "POST",
      body: JSON.stringify(body)
    });
    if ((_a = response.data) == null ? void 0 : _a.eventId) {
      return { eventId: response.data.eventId };
    } else {
      throw new EarnKitApiError(
        "Received an unexpected response format from the server.",
        500,
        response
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
  async capture(params) {
    if (!params || typeof params.eventId !== "string" || params.eventId.trim() === "") {
      throw new EarnKitInputError(
        "`eventId` is required and must be a valid string."
      );
    }
    const body = {
      eventId: params.eventId
    };
    const response = await this._apiCall("/capture", {
      method: "POST",
      body: JSON.stringify(body)
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
  async release(params) {
    if (!params || typeof params.eventId !== "string" || params.eventId.trim() === "") {
      throw new EarnKitInputError(
        "`eventId` is required for release() and must be a valid string."
      );
    }
    const body = {
      eventId: params.eventId
    };
    const response = await this._apiCall("/release", {
      method: "POST",
      body: JSON.stringify(body)
    });
    return { success: response.success };
  }
  /**
   * Fetches the pre-configured top-up options for the current agent.
   * @returns {Promise<{ options: TopUpOption[] }>} A promise that resolves with the purchase options.
   */
  async getTopUpDetails() {
    this.assertInitialized();
    const url = new URL(`${this.baseUrl}/api/top-up-details`);
    url.searchParams.set("agentId", this.agentId);
    return this._apiCall(url.toString());
  }
  /**
   * Submits a transaction hash to the backend for monitoring.
   * @param {SubmitTopUpParams} params - The details of the submitted transaction.
   * @returns {Promise<any>} A promise that resolves with the backend's confirmation response.
   */
  async submitTopUpTransaction(params) {
    this.assertInitialized();
    const response = await this._apiCall(
      "/top-up-details",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: this.agentId,
          ...params
        })
      }
    );
    return response;
  }
  /**
   * Fetches the current ETH and credit balance for a user.
   * @param {{ walletAddress: string }} params - The user's wallet address.
   * @returns {Promise<UserBalance>} A promise that resolves with the user's balances.
   */
  async getBalance(params) {
    this.assertInitialized();
    const url = new URL(`${this.baseUrl}/api/balance`);
    url.searchParams.set("agentId", this.agentId);
    url.searchParams.set("walletAddress", params.walletAddress);
    return this._apiCall(url.toString());
  }
  /**
   * Polls the backend to check for a balance update after a top-up.
   * This is a utility function to simplify the developer's workflow.
   * @param {PollingParams} params - Configuration for the polling process.
   */
  pollForBalanceUpdate(params) {
    const {
      walletAddress,
      initialBalance,
      onConfirmation,
      onTimeout,
      pollInterval = 1e4,
      // Default to 10 seconds
      maxPolls = 30
      // Default to 5 minutes (30 polls * 10s)
    } = params;
    let pollCount = 0;
    const intervalId = setInterval(async () => {
      if (pollCount >= maxPolls) {
        clearInterval(intervalId);
        this._log(
          `Polling for balance update timed out after ${maxPolls * pollInterval / 1e3} seconds.`
        );
        if (onTimeout) onTimeout();
        return;
      }
      pollCount++;
      try {
        const currentBalance = await this.getBalance({ walletAddress });
        const ethIncreased = parseFloat(currentBalance.eth) > parseFloat(initialBalance.eth);
        const creditsIncreased = BigInt(currentBalance.credits) > BigInt(initialBalance.credits);
        if (ethIncreased || creditsIncreased) {
          clearInterval(intervalId);
          this._log("Balance update detected!");
          onConfirmation(currentBalance);
        }
      } catch (error) {
        console.error("EarnKit: Error during polling, stopping.", error);
        clearInterval(intervalId);
      }
    }, pollInterval);
  }
  assertInitialized() {
    if (!this.agentId) {
      throw new EarnKitInitializationError(
        "SDK not initialized. Please call initialize() before using this method."
      );
    }
  }
  _log(message, ...args) {
    if (this.debug) {
      console.log(`[EarnKit-SDK] ${message}`, ...args);
    }
  }
  async _apiCall(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.requestTimeoutMs
    );
    let lastError = null;
    for (let i = 0; i <= MAX_RETRIES; i++) {
      try {
        const url = path.startsWith("http") ? path : `${this.baseUrl}/api${path}`;
        const defaultOptions = {
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal
        };
        const mergedOptions = { ...defaultOptions, ...options };
        this._log(
          `Making API call (attempt ${i + 1}/${MAX_RETRIES + 1}) to ${mergedOptions.method || "GET"} ${url}`
        );
        const response = await fetch(url, mergedOptions);
        if (!response.ok) {
          const errorData = await response.json();
          throw new EarnKitApiError(
            errorData.message || `HTTP Error: ${response.status}`,
            response.status,
            errorData
          );
        }
        clearTimeout(timeoutId);
        return await response.json();
      } catch (error) {
        lastError = error;
        const isRetryable = this.isErrorRetryable(error);
        if (!isRetryable || i === MAX_RETRIES) {
          break;
        }
        const delay = 1e3 * 2 ** i;
        this._log(`Request failed, retrying in ${delay}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    clearTimeout(timeoutId);
    if (lastError instanceof EarnKitApiError) {
      throw lastError;
    }
    if (lastError instanceof Error && lastError.name === "AbortError") {
      throw new EarnKitApiError(
        `Request timed out after ${this.requestTimeoutMs}ms`,
        408,
        // Request Timeout
        lastError
      );
    }
    throw new EarnKitApiError(
      `Network request failed: ${lastError instanceof Error ? lastError.message : "Unknown error"}`,
      0,
      // Use 0 for status when it's a network error
      lastError
    );
  }
  isErrorRetryable(error) {
    if (!(error instanceof EarnKitApiError)) {
      return true;
    }
    const status = error.status;
    const isServerError = status >= 500 && status <= 599;
    const isTimeout = status === 408;
    return isServerError || isTimeout;
  }
};
var earnkit = new EarnKit();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EarnKit,
  earnkit
});
