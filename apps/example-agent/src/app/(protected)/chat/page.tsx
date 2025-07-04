"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";

type Message = {
	role: "user" | "assistant";
	content: string;
	id: string;
};

export default function ChatPage() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

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

	return (
		<div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-full overflow-hidden">
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
