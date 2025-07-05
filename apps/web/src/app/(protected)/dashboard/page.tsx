"use client";

import { AgentCard } from "@/components/agent-card";
import { CreateAgentDialog } from "@/components/create-agent-dialog";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import type { Agent, ApiResponse } from "@/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

async function getAgents(): Promise<ApiResponse<Agent[]>> {
	const res = await fetch("/api/agents");
	if (!res.ok) {
		throw new Error("Failed to fetch agents");
	}
	return res.json();
}

export default function DashboardPage() {
	const { data, isLoading, error } = useQuery<ApiResponse<Agent[]>>({
		queryKey: ["agents"],
		queryFn: getAgents,
	});

	return (
		<div className="container mx-auto p-4 md:p-8">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-mono">Your Agents</h1>
				<CreateAgentDialog />
			</div>

			{isLoading && <FullPageLoader />}
			{error && <p className="text-red-500">Error fetching agents</p>}

			{data && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{data.data.map((agent: Agent) => (
						<Link href={`/agents/${agent.id}`} key={agent.id}>
							<AgentCard agent={agent} />
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
