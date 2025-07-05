"use client";

import type { Agent } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { FeeModelType } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

const topUpOptionSchema = z.object({
	creditAmount: z.coerce.number().int().positive("Must be a positive number"),
	pricePerCredit: z.coerce.number().positive("Must be a positive number"),
});

const formSchema = z
	.object({
		name: z.string().min(1, "Agent name is required"),
		feeModelType: z.nativeEnum(FeeModelType),
		// Free Tier
		threshold: z.coerce.number().int().optional(),
		rate: z.coerce.number().optional(),
		// Credit Based
		creditsPerPrompt: z.coerce.number().int().optional(),
		topUpOptions: z.array(topUpOptionSchema).optional(),
	})
	.refine(
		(data) => {
			if (data.feeModelType === "FREE_TIER") {
				return (
					data.threshold !== undefined &&
					data.threshold >= 0 &&
					data.rate !== undefined &&
					data.rate > 0
				);
			}
			return true;
		},
		{
			message: "Threshold and Rate are required for the Free Tier model",
			path: ["threshold"],
		},
	)
	.refine(
		(data) => {
			if (data.feeModelType === "CREDIT_BASED") {
				return (
					data.creditsPerPrompt !== undefined &&
					data.creditsPerPrompt > 0 &&
					data.topUpOptions &&
					data.topUpOptions.length > 0
				);
			}
			return true;
		},
		{
			message:
				"Credits per Prompt and at least one Top-up Package are required for the Credit-Based model",
			path: ["creditsPerPrompt"],
		},
	);

type FormValues = z.infer<typeof formSchema>;

interface AgentDetailsFormProps {
	agent: Agent;
}

export function AgentDetailsForm({ agent }: AgentDetailsFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: agent.name,
			feeModelType: agent.feeModelType as FeeModelType,
			threshold: agent.feeModelConfig?.threshold ?? 50,
			rate: agent.feeModelConfig?.rate ?? 0.0001,
			creditsPerPrompt: agent.feeModelConfig?.creditsPerPrompt ?? 10,
			topUpOptions: agent.feeModelConfig?.topUpOptions ?? [
				{ creditAmount: 100, pricePerCredit: 0.001 },
			],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "topUpOptions",
	});

	const feeModelType = form.watch("feeModelType");

	const updateAgentMutation = useMutation({
		mutationFn: async (values: FormValues) => {
			const { name, feeModelType, ...rest } = values;
			let feeModelConfig = {};

			if (feeModelType === "FREE_TIER") {
				feeModelConfig = {
					threshold: rest.threshold,
					rate: rest.rate,
				};
			} else if (feeModelType === "CREDIT_BASED") {
				feeModelConfig = {
					creditsPerPrompt: rest.creditsPerPrompt,
					topUpOptions: rest.topUpOptions,
				};
			}

			const response = await fetch(`/api/agents/${agent.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, feeModelType, feeModelConfig }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to update agent");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["agents", agent.id] });
			queryClient.invalidateQueries({ queryKey: ["agents"] });
			router.refresh();
		},
	});

	const onSubmit = (values: FormValues) => {
		toast.promise(updateAgentMutation.mutateAsync(values), {
			loading: "Updating agent...",
			success: "Agent updated successfully!",
			error: (err) => err.message || "An error occurred",
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Agent Details</CardTitle>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Agent Name</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., Customer Support Bot"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="space-y-2">
							<FormLabel>Agent ID</FormLabel>
							<div className="flex items-center gap-2">
								<Input
									readOnly
									value={agent.id}
									className="font-mono bg-muted"
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										navigator.clipboard.writeText(agent.id);
										toast.success("Agent ID copied!");
									}}
								>
									Copy
								</Button>
							</div>
						</div>

						<FormField
							control={form.control}
							name="feeModelType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Fee Model</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a fee model" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value={FeeModelType.FREE_TIER}>
												Free Tier
											</SelectItem>
											<SelectItem value={FeeModelType.CREDIT_BASED}>
												Credit-Based
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						{feeModelType === FeeModelType.FREE_TIER && (
							<div className="space-y-4 p-4 border rounded-md">
								<h3 className="font-medium">Free Tier Configuration</h3>
								<FormField
									control={form.control}
									name="threshold"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Free Prompt Threshold</FormLabel>
											<FormControl>
												<Input type="number" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="rate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Rate per Prompt (in ETH)</FormLabel>
											<FormControl>
												<Input type="number" step="0.00001" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						{feeModelType === FeeModelType.CREDIT_BASED && (
							<div className="space-y-4 p-4 border rounded-md">
								<h3 className="font-medium">Credit-Based Configuration</h3>
								<FormField
									control={form.control}
									name="creditsPerPrompt"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Credits per Prompt</FormLabel>
											<FormControl>
												<Input type="number" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="space-y-4">
									<FormLabel>Top-up Packages</FormLabel>
									{fields.map((field, index) => (
										<div
											key={field.id}
											className="flex items-end gap-4 p-3 border rounded-md"
										>
											<FormField
												control={form.control}
												name={`topUpOptions.${index}.creditAmount`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Credit Amount</FormLabel>
														<FormControl>
															<Input type="number" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name={`topUpOptions.${index}.pricePerCredit`}
												render={({ field }) => (
													<FormItem>
														<FormLabel>Price/Credit (ETH)</FormLabel>
														<FormControl>
															<Input type="number" step="0.00001" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<Button
												type="button"
												variant="destructive"
												size="sm"
												onClick={() => remove(index)}
											>
												Remove
											</Button>
										</div>
									))}
									<Button
										type="button"
										variant="outline"
										onClick={() =>
											append({ creditAmount: 200, pricePerCredit: 0.0008 })
										}
									>
										Add Package
									</Button>
								</div>
							</div>
						)}

						<Button type="submit" disabled={updateAgentMutation.isPending}>
							{updateAgentMutation.isPending ? "Saving..." : "Save Changes"}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
