import LoginButton from "@/components/login";

export default function LoginPage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-white">
			<div className="flex flex-col items-center gap-8">
				<h1 className="text-5xl font-mono tracking-tighter">EarnKit AI</h1>
				<p className="text-neutral-500 max-w-md text-center">
					The easiest way to monetize your AI agent with usage-based fees and a
					credit system.
				</p>
				<LoginButton />
			</div>
		</main>
	);
}
