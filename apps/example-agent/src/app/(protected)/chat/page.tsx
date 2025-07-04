"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { EarnKit, type UserBalance } from "earnkit-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

type Message = {
	role: "user" | "assistant";
	content: string;
	id: string;
};

// SDK Instantiation - outside component to prevent re-instantiation
const freeTierAgent = new EarnKit({
	agentId: process.env.NEXT_PUBLIC_FREE_TIER_AGENT_ID!,
	debug: true,
});

const creditBasedAgent = new EarnKit({
	agentId: process.env.NEXT_PUBLIC_CREDIT_BASED_AGENT_ID!,
	debug: true,
});

export default function ChatPage() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);

	// Agent state management
	const [activeAgent, setActiveAgent] = useState<EarnKit>(freeTierAgent);
	const [selectedModel, setSelectedModel] = useState("free-tier");

	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Privy hooks for test transaction functionality
	const { user, ready, authenticated } = usePrivy();
	const { wallets } = useWallets();
	const { sendTransaction } = useSendTransaction();

	// Balance fetching with React Query
	const { data: balance } = useQuery<UserBalance>({
		queryKey: ["balance", selectedModel, user?.wallet?.address],
		queryFn: async () => {
			if (!user?.wallet?.address) throw new Error("Wallet not connected");
			return activeAgent.getBalance({ walletAddress: user.wallet.address });
		},
		enabled: !!user?.wallet?.address,
		initialData: { eth: "0", credits: "0" },
	});

	// Agent selection handler
	const handleAgentChange = useCallback((value: string) => {
		setSelectedModel(value);
		if (value === "free-tier") {
			setActiveAgent(freeTierAgent);
		} else {
			setActiveAgent(creditBasedAgent);
		}
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: related to scroll
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!input.trim() || loading) {
			return;
		}

		const userMessage: Message = {
			role: "user",
			content: input,
			id: Date.now().toString() + "-user",
		};
		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setLoading(true);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: input }),
			});

			const data = await response.json();

			if (response.ok) {
				const assistantMessage: Message = {
					role: "assistant",
					content: data.text,
					id: Date.now().toString() + "-assistant",
				};
				setMessages((prev) => [...prev, assistantMessage]);
			} else {
				console.error("API Error:", data.error);
				const errorMessage: Message = {
					role: "assistant",
					content: "Sorry, I encountered an error. Please try again.",
					id: Date.now().toString() + "-error",
				};
				setMessages((prev) => [...prev, errorMessage]);
			}
		} catch (error) {
			console.error("Error:", error);
			const errorMessage: Message = {
				role: "assistant",
				content: "Sorry, I encountered an error. Please try again.",
				id: Date.now().toString() + "-catch-error",
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setLoading(false);
		}
	};

	const handleTestTransaction = async () => {
		// Guard clauses
		if (!ready || !authenticated) {
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

		// Transaction logic
		let txToast: string | undefined;
		try {
			txToast = toast.loading("Sending transaction...");

			const transaction = {
				to: user.wallet.address,
				chainId: 84532, // Base Sepolia - the chainId must be a number here
				value: "0", // The value is a string representing wei
				data: "0x", // Optional, but good practice for value transfers
			};

			// Explicitly specify the wallet address to use
			const { hash } = await sendTransaction(transaction, {
				address: connectedWallet.address,
			});

			toast.success(
				<>
					Transaction successful!
					<br />
					Hash: {hash}
				</>,
				{ id: txToast },
			);
		} catch (error) {
			console.error("Transaction error:", error);
			toast.error("Transaction failed. See console for details.", {
				id: txToast,
			});
		}
	};

	return (
		<div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-full overflow-hidden">
			{/* Agent Selector and Balance Display */}
			<div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Tabs value={selectedModel} onValueChange={handleAgentChange}>
							<TabsList>
								<TabsTrigger value="free-tier">Free Tier</TabsTrigger>
								<TabsTrigger value="credit-based">Credit-Based</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					{/* Balance Display */}
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span>Balance:</span>
						{selectedModel === "free-tier" ? (
							<span className="font-mono font-medium">
								{parseFloat(balance?.eth || "0").toFixed(5)} ETH
							</span>
						) : (
							<span className="font-mono font-medium">
								{balance?.credits || "0"} Credits
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Message display area */}
			<div className="flex-grow overflow-y-auto p-4 space-y-4">
				{messages.map((message) => (
					<div
						key={message.id}
						className={`flex ${
							message.role === "user" ? "justify-end" : "justify-start"
						}`}
					>
						<div
							className={`max-w-[75%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] px-3 py-2 rounded-lg break-words ${
								message.role === "user"
									? "bg-primary text-primary-foreground"
									: "bg-muted"
							}`}
						>
							{message.content}
						</div>
					</div>
				))}
				<div ref={messagesEndRef} />
			</div>

			{/* Chat input area */}
			<form onSubmit={handleSubmit} className="p-4 border-t shrink-0">
				<div className="flex gap-2 w-full">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Type your message..."
						disabled={loading}
						className="flex-1 min-w-0"
					/>
					<Button
						type="button"
						onClick={handleTestTransaction}
						disabled={!ready}
						className="shrink-0"
					>
						Test Tx
					</Button>
					<Button
						type="submit"
						disabled={loading || !input.trim()}
						className="shrink-0"
					>
						{loading ? "Sending..." : "Send"}
					</Button>
				</div>
			</form>
		</div>
	);
}
