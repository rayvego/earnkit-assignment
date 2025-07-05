"use client";

import { AgentDetailsForm } from "@/components/agent-details-form";
import { AgentLogsTable } from "@/components/agent-logs-table";
import { DeleteAgentDialog } from "@/components/delete-agent-dialog";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import type { Agent, ApiResponse } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

async function getAgent(agentId: string): Promise<ApiResponse<Agent>> {
	const res = await fetch(`/api/agents/${agentId}`);
	if (!res.ok) {
		throw new Error("Failed to fetch agent");
	}
	return res.json();
}

async function getAgentLogs(agentId: string) {
	const res = await fetch(`/api/agents/${agentId}/logs`);
	if (!res.ok) {
		throw new Error("Failed to fetch agent logs");
	}
	return res.json();
}

export default function AgentPage() {
	const { agentId } = useParams<{ agentId: string }>();

	const {
		data: agentData,
		isLoading: isAgentLoading,
		error: agentError,
	} = useQuery<ApiResponse<Agent>>({
		queryKey: ["agent", agentId],
		queryFn: () => getAgent(agentId),
	});

	const {
		data: logsData,
		isLoading: areLogsLoading,
		error: logsError,
	} = useQuery({
		queryKey: ["logs", agentId],
		queryFn: () => getAgentLogs(agentId),
	});

	if (isAgentLoading || areLogsLoading) return <FullPageLoader />;
	if (agentError || logsError)
		return (
			<p className="text-red-500 text-center p-8">Error loading agent data.</p>
		);

	return (
		<div className="container mx-auto p-4 md:p-8">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-mono">{agentData?.data.name}</h1>
				<DeleteAgentDialog agentId={agentId} />
			</div>

			{agentData?.data && (
				<div className="space-y-8">
					<div>
						<h2 className="text-2xl font-mono mb-4">Details</h2>
						<AgentDetailsForm agent={agentData.data} />
					</div>
					<div>
						<h2 className="text-2xl font-mono mb-4">Logs</h2>
						<AgentLogsTable logs={logsData?.data} />
					</div>
				</div>
			)}
		</div>
	);
}
