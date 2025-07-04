'use client';

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function Navbar() {
	const { logout } = usePrivy();
	const router = useRouter();

	const handleLogout = async () => {
		await logout();
		router.push("/");
	};

	return (
		<header className="border-b">
			<div className="container mx-auto flex justify-between items-center p-4">
				<h1 className="text-2xl font-mono tracking-tighter">EarnKit AI</h1>
				<div className="flex items-center gap-4">
					<span className="text-neutral-500">|</span>
					<Button variant="ghost" onClick={handleLogout}>
						Logout
					</Button>
				</div>
			</div>
		</header>
	);
}
