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
var EarnKit = class {
  // A private property to store the agentId.
  agentId = null;
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
   * @returns {void}
   */
  initialize(config) {
    if (!config || typeof config.agentId !== "string" || config.agentId.trim() === "") {
      throw new Error(
        "EarnKit Error: `agentId` provided to initialize() is invalid. Please provide a valid string."
      );
    }
    this.agentId = config.agentId;
    console.log(`EarnKit SDK initialized for agent: ${this.agentId}`);
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
    if (!this.agentId) {
      throw new Error(
        "EarnKit Error: SDK not initialized. Please call initialize() before using track()."
      );
    }
    if (!params || typeof params.walletAddress !== "string" || !params.walletAddress.startsWith("0x")) {
      throw new Error(
        "EarnKit Error: `walletAddress` is required and must be a valid string."
      );
    }
    const body = {
      agentId: this.agentId,
      walletAddress: params.walletAddress,
      idempotencyKey: params.idempotencyKey,
      creditsToDeduct: params.creditsToDeduct
    };
    try {
      const response = await fetch(`http://localhost:3000/api/earnkit/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `API Error: ${response.status} ${response.statusText}`
        );
      }
      const successData = await response.json();
      if ((_a = successData == null ? void 0 : successData.data) == null ? void 0 : _a.eventId) {
        return { eventId: successData.data.eventId };
      } else {
        throw new Error(
          "EarnKit Error: Received an unexpected response format from the server."
        );
      }
    } catch (error) {
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
  async capture(params) {
    if (!params || typeof params.eventId !== "string" || params.eventId.trim() === "") {
      throw new Error(
        "EarnKit Error: `eventId` is required and must be a valid string."
      );
    }
    const body = {
      eventId: params.eventId
    };
    try {
      const response = await fetch(`http://localhost:3000/api/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `API Error: ${response.status} ${response.statusText}`
        );
      }
      const successData = await response.json();
      return { success: successData.success };
    } catch (error) {
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
  async release(params) {
    if (!params || typeof params.eventId !== "string" || params.eventId.trim() === "") {
      throw new Error(
        "EarnKit Error: `eventId` is required for release() and must be a valid string."
      );
    }
    const body = {
      eventId: params.eventId
    };
    try {
      const response = await fetch(`http://localhost:3000/api/release`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `API Error: ${response.status} ${response.statusText}`
        );
      }
      const successData = await response.json();
      return { success: successData.success };
    } catch (error) {
      throw error;
    }
  }
  /**
   * Fetches the pre-configured top-up options for the current agent.
   * @returns {Promise<{ options: TopUpOption[] }>} A promise that resolves with the purchase options.
   */
  async getTopUpDetails() {
    if (!this.agentId) throw new Error("EarnKit: Not initialized.");
    const url = new URL(
      "http://localhost:3000/api/top-up-details",
      window.location.origin
    );
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
  async submitTopUpTransaction(params) {
    if (!this.agentId) throw new Error("EarnKit: Not initialized.");
    const response = await fetch("/api/earnkit/top-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: this.agentId,
        ...params
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to submit top-up transaction."
      );
    }
    return response.json();
  }
  /**
   * Fetches the current ETH and credit balance for a user.
   * @param {{ walletAddress: string }} params - The user's wallet address.
   * @returns {Promise<UserBalance>} A promise that resolves with the user's balances.
   */
  async getBalance(params) {
    if (!this.agentId) throw new Error("EarnKit: Not initialized.");
    const url = new URL("/api/earnkit/balance", window.location.origin);
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
        console.warn(
          `EarnKit: Polling for balance update timed out after ${maxPolls * pollInterval / 1e3} seconds.`
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
          console.log("EarnKit: Balance update detected!");
          onConfirmation(currentBalance);
        }
      } catch (error) {
        console.error("EarnKit: Error during polling, stopping.", error);
        clearInterval(intervalId);
      }
    }, pollInterval);
  }
};
var earnkit = new EarnKit();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EarnKit,
  earnkit
});
