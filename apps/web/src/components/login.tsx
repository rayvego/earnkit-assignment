// /apps/web/src/components/LoginButton.tsx (create this new component)
"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export default function LoginButton() {
	const { ready, authenticated, user, login, logout } = usePrivy();

	const handleLogin = async () => {
		await login();
	};

	useEffect(() => {
		if (ready && authenticated) {
			toast.success("Logged in successfully!");
			console.log(user?.wallet?.address);
		}
	}, [ready, authenticated, user?.wallet?.address]);

	const handleLogout = async () => {
		await logout();
		toast.success("Logged out successfully!");
	};

	if (!ready) {
		return <Skeleton className="w-24 h-10" />;
	}

	return (
		<div>
			{authenticated ? (
				<div>
					<Button onClick={handleLogout}>Logout</Button>
				</div>
			) : (
				<Button onClick={handleLogin}>Login</Button>
			)}
		</div>
	);
}
