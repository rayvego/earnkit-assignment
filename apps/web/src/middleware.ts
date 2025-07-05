import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	// Handle CORS preflight requests
	if (request.method === "OPTIONS") {
		return new NextResponse(null, {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
			},
		});
	}

	// Continue with the request
	return NextResponse.next();
}

export const config = {
	matcher: "/api/:path*",
};
