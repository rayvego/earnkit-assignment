"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import type { EarnKit, TopUpOption, UserBalance } from "earnkit-sdk";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface TopUpDialogProps {
	activeAgent: EarnKit;
	walletAddress: string;
	feeModelType: "free-tier" | "credit-based";
	onSuccess: (newBalance: UserBalance) => void;
	children: React.ReactNode;
}

export default function TopUpDialog({
	activeAgent,
	walletAddress,
	feeModelType,
	onSuccess,
	children,
}: TopUpDialogProps) {
	const [topUpOptions, setTopUpOptions] = useState<TopUpOption[] | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [open, setOpen] = useState<boolean>(false);
	const [processingOption, setProcessingOption] = useState<string | null>(null);

	const { user, ready, authenticated } = usePrivy();
	const { wallets } = useWallets();
	const { sendTransaction } = useSendTransaction();

	// Data Fetching - fetch top-up details when dialog opens
	useEffect(() => {
		if (open && !topUpOptions) {
			const fetchTopUpDetails = async () => {
				setLoading(true);
				try {
					const response = await activeAgent.getTopUpDetails();
					setTopUpOptions(response.options);
				} catch (error) {
					console.error("Error fetching top-up details:", error);
					toast.error("Failed to load top-up options. Please try again.");
				} finally {
					setLoading(false);
				}
			};

			fetchTopUpDetails();
		}
	}, [open, activeAgent, topUpOptions]);

	// Core Logic - handle top-up transaction
	const handleTopUp = async (option: TopUpOption) => {
		// Always use BigInt to avoid precision loss
		const weiValue = BigInt(option.value);

		console.log("Original value (decimal string):", option.value);
		console.log("Wei as BigInt:", weiValue.toString());
		console.log("Amount in ETH:", option.amountInEth);

		// Guard clauses
		if (!ready || !authenticated) {
			toast.error("Please connect your wallet first");
			return;
		}

		if (!user?.wallet?.address) {
			toast.error("No wallet connected");
			return;
		}

		// Find the connected wallet
		const connectedWallet = wallets.find(
			(wallet) => wallet.address === user.wallet?.address,
		);
		if (!connectedWallet) {
			toast.error("Connected wallet not found");
			return;
		}

		// Set processing state for this specific option
		setProcessingOption(option.label);

		let txToast: string | undefined;
		try {
			txToast = toast.loading("Sending transaction...");

			const transaction = {
				to: option.to,
				chainId: 84532, // Base Sepolia
				value: weiValue, // Amount in WEI as BigInt
				data: "0x",
			};

			console.log("Transaction object:", transaction);

			// Send the transaction
			const { hash } = await sendTransaction(transaction, {
				address: connectedWallet.address,
			});

			toast.success("Transaction sent! Processing...", { id: txToast });

			// Submit transaction to SDK
			await activeAgent.submitTopUpTransaction({
				txHash: hash,
				walletAddress: user.wallet.address,
				amountInEth: option.amountInEth,
				creditsToTopUp: option.creditsToTopUp,
			});

			// Get current balance for polling comparison
			const currentBalance = await activeAgent.getBalance({
				walletAddress: user.wallet.address,
			});

			// Poll for balance update
			activeAgent.pollForBalanceUpdate({
				walletAddress: user.wallet.address,
				initialBalance: currentBalance,
				onConfirmation: (newBalance: UserBalance) => {
					toast.success("Top-up successful! Balance updated.", { id: txToast });
					onSuccess(newBalance);
					setOpen(false);
				},
				onTimeout: () => {
					toast.error(
						"Transaction timeout. Please check your balance manually.",
						{
							id: txToast,
						},
					);
				},
			});
		} catch (error) {
			console.error("Top-up error:", error);
			toast.error("Top-up failed. See console for details.", {
				id: txToast,
			});
		} finally {
			setProcessingOption(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					{feeModelType === "credit-based" ? (
						<>
							<DialogTitle>Buy Credits</DialogTitle>
							<DialogDescription>
								Select a package to add credits to your balance.
							</DialogDescription>
						</>
					) : (
						<>
							<DialogTitle>Add Funds</DialogTitle>
							<DialogDescription>
								Select an amount to add to your ETH balance for this agent.
							</DialogDescription>
						</>
					)}
				</DialogHeader>

				<div className="space-y-4">
					{loading ? (
						<div className="text-center py-4">
							<span className="text-muted-foreground">Loading options...</span>
						</div>
					) : topUpOptions && topUpOptions.length > 0 ? (
						<div className="space-y-3">
							{feeModelType === "credit-based"
								? // Credit-Based Agent UI
									topUpOptions.map((option, index) => (
										<div
											key={`${option.label}-${option.amountInEth}-${index}`}
											className="flex items-center justify-between p-3 border rounded-lg"
										>
											<div className="flex flex-col">
												<span className="font-medium">{option.label}</span>
												<span className="text-sm text-muted-foreground">
													{option.amountInEth} ETH
												</span>
											</div>
											<Button
												onClick={() => handleTopUp(option)}
												disabled={processingOption === option.label}
												className="shrink-0"
											>
												{processingOption === option.label
													? "Processing..."
													: "Buy"}
											</Button>
										</div>
									))
								: // Free-Tier Agent UI
									topUpOptions.map((option, index) => (
										<Button
											key={`${option.label}-${option.amountInEth}-${index}`}
											onClick={() => handleTopUp(option)}
											disabled={processingOption === option.label}
											className="w-full"
											variant="outline"
										>
											{processingOption === option.label
												? "Processing..."
												: option.label}
										</Button>
									))}
						</div>
					) : (
						<div className="text-center py-4">
							<span className="text-muted-foreground">
								No top-up options available.
							</span>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
