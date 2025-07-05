import { Loader2 } from "lucide-react";

export function FullPageLoader() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<Loader2 className="animate-spin" />
		</div>
	);
}
