'use client';

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

async function deleteAgent(agentId: string) {
	const res = await fetch(`/api/agents/${agentId}`, {
		method: "DELETE",
	});
	if (!res.ok) {
		throw new Error("Failed to delete agent");
	}
	return res.json();
}

export function DeleteAgentDialog({ agentId }: { agentId: string }) {
	const queryClient = useQueryClient();
	const router = useRouter();

	const mutation = useMutation({ 
		mutationFn: deleteAgent,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['agents'] });
			toast.success("Agent deleted successfully!");
			router.push("/dashboard");
		},
		onError: () => {
			toast.error("Failed to delete agent.");
		}
	});

	const handleDelete = () => {
		mutation.mutate(agentId);
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="destructive">Delete Agent</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Are you sure?</DialogTitle>
					<DialogDescription>
						This action cannot be undone. This will permanently delete your agent and all of its data.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline">Cancel</Button>
					<Button variant="destructive" onClick={handleDelete} disabled={mutation.isPending}>
						{mutation.isPending ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
