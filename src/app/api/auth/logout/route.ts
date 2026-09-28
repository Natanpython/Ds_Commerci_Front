import { NextRequest, NextResponse } from "next/server";
import { apiFailure, checkOrigin, sessionCookie } from "@/lib/server";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const response = NextResponse.json({ success: true });
    response.cookies.delete(sessionCookie);
    return response;
  } catch (error) { return apiFailure(error); }
}
