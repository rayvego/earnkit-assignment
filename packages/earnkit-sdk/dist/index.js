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
  EarnKitApiError: () => EarnKitApiError,
  EarnKitInitializationError: () => EarnKitInitializationError,
  EarnKitInputError: () => EarnKitInputError
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
  agentId;
  baseUrl = "http://localhost:3000";
  // https://api.earnkit.com
  debug = false;
  requestTimeoutMs = 3e4;
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
  constructor(config) {
    if (!config) {
      throw new EarnKitInitializationError("Configuration object is required.");
    }
    this._validateString(config.agentId, "agentId", {
      errorType: EarnKitInitializationError
    });
    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
        this.baseUrl = config.baseUrl;
      } catch (error) {
        throw new EarnKitInitializationError(
          `baseUrl provided to the constructor is not a valid URL. Error: ${error}`
        );
      }
    }
    this.debug = config.debug ?? false;
    this.requestTimeoutMs = config.requestTimeoutMs ?? 3e4;
    this.agentId = config.agentId;
    this._log(`SDK instance created for agent: ${this.agentId}`);
    this._log(`Using API base URL: ${this.baseUrl}`);
    this._log(`Request timeout set to: ${this.requestTimeoutMs}ms`);
  }
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
  async track(params) {
    var _a;
    if (!params) {
      throw new EarnKitInputError("Parameters object is required.");
    }
    this._validateString(params.walletAddress, "walletAddress", {
      startsWith: "0x"
    });
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
   * Sends a POST request to the /api/capture endpoint and returns the success status.
   *
   * @param {CaptureParams} params - The parameters for the capture event.
   * @param {string} params.eventId - The eventId of the tracked event to capture.
   * @returns {Promise<{ success: boolean }>} A promise that resolves indicating success.
   * @throws {EarnKitInputError | EarnKitApiError} Throws an error if the event cannot be captured (e.g., not found or not pending).
   */
  async capture(params) {
    if (!params) {
      throw new EarnKitInputError("Parameters object is required.");
    }
    this._validateString(params.eventId, "eventId");
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
   * Sends a POST request to the /api/release endpoint and returns the success status.
   *
   * @param {ReleaseParams} params - The parameters for the release event.
   * @param {string} params.eventId - The eventId of the tracked event to release.
   * @returns {Promise<{ success: boolean }>} A promise that resolves indicating success.
   * @throws {EarnKitInputError | EarnKitApiError} Throws an error if the event cannot be released.
   */
  async release(params) {
    if (!params) {
      throw new EarnKitInputError("Parameters object is required.");
    }
    this._validateString(params.eventId, "eventId");
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
   * Sends a GET request to the /api/top-up-details endpoint and returns the top-up options.
   * @returns {Promise<{ options: TopUpOption[] }>} A promise that resolves with the purchase options.
   * @throws {EarnKitApiError} Throws an error if the request fails.
   */
  async getTopUpDetails() {
    const url = new URL(`${this.baseUrl}/api/top-up-details`);
    url.searchParams.set("agentId", this.agentId);
    return this._apiCall(url.toString());
  }
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
  async submitTopUpTransaction(params) {
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
   * Sends a GET request to the /api/balance endpoint and returns the user's balances.
   * @param {{ walletAddress: string }} params - The user's wallet address.
   * @returns {Promise<UserBalance>} A promise that resolves with the user's balances.
   * @throws {EarnKitApiError} Throws an error if the request fails.
   */
  async getBalance(params) {
    const url = new URL(`${this.baseUrl}/api/balance`);
    url.searchParams.set("agentId", this.agentId);
    url.searchParams.set("walletAddress", params.walletAddress);
    return this._apiCall(url.toString());
  }
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
  pollForBalanceUpdate(params) {
    const {
      walletAddress,
      initialBalance,
      onConfirmation,
      onTimeout,
      pollInterval = 1e4,
      maxPolls = 30
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
        this._log("Error during polling, stopping.", error);
        clearInterval(intervalId);
        if (onTimeout) onTimeout();
      }
    }, pollInterval);
  }
  /**
   * Logs a message to the console if debug mode is enabled.
   * @param {string} message - The message to log.
   * @param {unknown[]} args - The arguments to log.
   */
  _log(message, ...args) {
    if (this.debug) {
      console.log(`[EarnKit-SDK] ${message}`, ...args);
    }
  }
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
  _validateString(value, paramName, options = {}) {
    const {
      required = true,
      allowEmpty = false,
      startsWith,
      errorType = EarnKitInputError
    } = options;
    if (!required && (value === void 0 || value === null)) {
      return;
    }
    if (typeof value !== "string") {
      throw new errorType(`\`${paramName}\` must be a valid string.`);
    }
    if (!allowEmpty && value.trim() === "") {
      throw new errorType(`\`${paramName}\` cannot be empty.`);
    }
    if (startsWith && !value.startsWith(startsWith)) {
      throw new errorType(`\`${paramName}\` must start with "${startsWith}".`);
    }
  }
  /**
   * Makes an API call to the backend with retry and timeout logic.
   * @param {string} path - The path of the API call.
   * @param {RequestInit} options - The options for the API call.
   * @returns {Promise<T>} A promise that resolves with the API call response.
   * @throws {EarnKitApiError | Error} Throws an error if the request fails.
   */
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
  /**
   * Determines if an error is retryable.
   * @param {unknown} error - The error to check.
   * @returns {boolean} True if the error is retryable, false otherwise.
   */
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EarnKit,
  EarnKitApiError,
  EarnKitInitializationError,
  EarnKitInputError
});
