import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

function formatFeeModel(agent: any) {
	const { feeModelType, feeModelConfig } = agent;
	if (feeModelType === "FREE_TIER") {
		return `Free Tier: ${feeModelConfig.threshold} free prompts, then ${feeModelConfig.rate} ETH/prompt`;
	} else if (feeModelType === "CREDIT_BASED") {
		return `Credit Based: ${feeModelConfig.creditsPerPrompt} credits/prompt`;
	}
	return "Unknown Fee Model";
}

export function AgentCard({ agent }: { agent: any }) {
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
