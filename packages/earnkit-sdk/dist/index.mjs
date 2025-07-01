// src/index.ts
var EarnKit = class {
  agentId = null;
  constructor() {
    console.log("EarnKit SDK instance created!");
  }
  initializeAgent(agentId) {
    this.agentId = agentId;
    console.log(`Agent initialized with ID: ${agentId}`);
  }
  async trackPrompt(params) {
    if (!this.agentId) {
      throw new Error("SDK not initialized. Call initializeAgent() first.");
    }
    console.log(
      `Tracking prompt for wallet ${params.walletAddress} on agent ${this.agentId}`
    );
    return { success: true, message: "Prompt tracked" };
  }
};
var earnkit = new EarnKit();
export {
  EarnKit,
  earnkit
};
