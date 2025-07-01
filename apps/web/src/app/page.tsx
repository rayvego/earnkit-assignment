// apps/web/src/app/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { earnkit } from "earnkit-sdk"; // It just works!
import { useEffect } from "react";

export default function Home() {
	useEffect(() => {
		// Initialize the SDK when the component mounts
		earnkit.initializeAgent("agent-123-test");
	}, []);

	async function handleClick() {
		try {
			await earnkit.trackPrompt({ walletAddress: "0xabc...123" });
			alert("Prompt tracked successfully!");
		} catch (error) {
			console.error(error);
			alert("Failed to track prompt.");
		}
	}

	return (
		<main>
			<h1>My AI Agent</h1>
			<Button onClick={handleClick}>Track a Fake Prompt</Button>
		</main>
	);
}
