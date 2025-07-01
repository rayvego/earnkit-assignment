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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EarnKit,
  earnkit
});
