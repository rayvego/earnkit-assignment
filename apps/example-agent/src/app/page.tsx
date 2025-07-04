"use client";

import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const { ready, authenticated, login } = usePrivy();
	const router = useRouter();

	const handleLogin = () => {
		if (ready && authenticated) {
			router.push("/dashboard");
		} else {
			login();
		}
	};

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-white">
			<div className="flex flex-col items-center gap-8">
				<h1 className="text-5xl font-mono tracking-tighter">
					EarnKit Example Agent
				</h1>
				<p className="text-neutral-500 max-w-md text-center">
					The easiest way to monetize your AI agent with usage-based fees and a
					credit system.
				</p>
				<Button
					size={"lg"}
					className="rounded-full"
					variant={"outline"}
					onClick={handleLogin}
					disabled={!ready}
				>
					Go to Dashboard
				</Button>
			</div>
		</main>
	);
}
