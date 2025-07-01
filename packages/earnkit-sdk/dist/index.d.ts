declare class EarnKit {
    private agentId;
    constructor();
    initializeAgent(agentId: string): void;
    trackPrompt(params: {
        walletAddress: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
declare const earnkit: EarnKit;

export { EarnKit, earnkit };
