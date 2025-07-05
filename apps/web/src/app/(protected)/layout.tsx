"use client";

import { Navbar } from "@/components/navbar";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { ready, authenticated } = usePrivy();
	const router = useRouter();

	useEffect(() => {
		if (ready && !authenticated) {
			router.push("/");
		}
	}, [ready, authenticated, router]);

	if (!ready || !authenticated) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="animate-spin" />
			</div>
		);
	}

	return (
		<div>
			<Navbar />
			<main>{children}</main>
		</div>
	);
}
