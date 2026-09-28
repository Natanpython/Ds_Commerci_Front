import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiFailure, backend, sessionCookie } from "@/lib/server";

export async function GET() {
  try {
    if (!(await cookies()).has(sessionCookie)) return NextResponse.json({ user: null });
    return NextResponse.json({ user: await (await backend("/users/me", {}, true)).json() });
  } catch (error) { return apiFailure(error); }
}
