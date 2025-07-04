import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export function AgentLogsTable({ logs }: { logs: any[] }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Timestamp</TableHead>
					<TableHead>Fee/Credits</TableHead>
					<TableHead>Wallet</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{logs?.map((log) => (
					<TableRow key={log.id}>
						<TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
						<TableCell>{log.feeDeducted || log.creditsDeducted}</TableCell>
						<TableCell>{log.userWalletAddress}</TableCell>
						<TableCell>{log.status}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
