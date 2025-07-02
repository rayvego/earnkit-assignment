// /apps/web/src/components/LoginButton.tsx (create this new component)
"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export default function LoginButton() {
	const { ready, authenticated, user, login, logout } = usePrivy();

	// Use mutation for the auth API call
	const authMutation = useMutation({
		mutationFn: async ({ walletAddress }: { walletAddress: string }) => {
			const response = await fetch("/api/auth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					walletAddress,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to authenticate user");
			}

			return response.json();
		},
		onSuccess: (data) => {
			toast.success(data.message || "Developer signed up successfully");
		},
		onError: (error) => {
			console.error("Auth error:", error);
			toast.error("Error signing up");
		},
	});

	// Trigger auth API call when user becomes authenticated
	useEffect(() => {
		if (ready && authenticated && user?.id && user?.wallet?.address) {
			console.log("User authenticated:", user.wallet.address);

			authMutation.mutate({
				walletAddress: user.wallet.address,
			});
		}
	}, [
		ready,
		authenticated,
		user?.id,
		user?.wallet?.address,
		authMutation.mutate,
	]);

	const handleLogin = async () => {
		try {
			await login();
		} catch (error) {
			console.error("Login error:", error);
			toast.error("Failed to login");
		}
	};

	const handleLogout = async () => {
		try {
			await logout();
			toast.success("Logged out successfully!");
		} catch (error) {
			console.error("Logout error:", error);
			toast.error("Failed to logout");
		}
	};

	if (!ready) {
		return <Skeleton className="w-24 h-10" />;
	}

	return (
		<div>
			{authenticated ? (
				<div className="flex items-center gap-2">
					{authMutation.isPending && (
						<span className="text-sm">Setting up account...</span>
					)}
					<Button onClick={handleLogout} disabled={authMutation.isPending}>
						Logout
					</Button>
				</div>
			) : (
				<Button onClick={handleLogin}>Login</Button>
			)}
		</div>
	);
}
