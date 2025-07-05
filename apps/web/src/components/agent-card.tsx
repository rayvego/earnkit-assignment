import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Agent } from "@/types";

function formatFeeModel(agent: Agent) {
	const { feeModelType, feeModelConfig } = agent;
	if (feeModelType === "FREE_TIER") {
		return `Free Tier: ${feeModelConfig.threshold ?? 0} free prompts, then ${feeModelConfig.rate ?? 0} ETH/prompt`;
	} else if (feeModelType === "CREDIT_BASED") {
		return `Credit Based: ${feeModelConfig.creditsPerPrompt ?? 0} credits/prompt`;
	}
	return "Unknown Fee Model";
}

export function AgentCard({ agent }: { agent: Agent }) {
	return (
		<Card className="hover:shadow-md transition-shadow flex flex-col h-full">
			<CardHeader>
				<CardTitle>{agent.name}</CardTitle>
				<CardDescription>{formatFeeModel(agent)}</CardDescription>
			</CardHeader>
			<CardContent className="flex-grow" />
			<CardFooter>
				<p className="text-xs text-neutral-500">
					Created on {new Date(agent.createdAt).toLocaleDateString()}
				</p>
			</CardFooter>
		</Card>
	);
}
