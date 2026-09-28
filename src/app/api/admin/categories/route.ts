import { NextResponse } from "next/server";
import { apiFailure, backend } from "@/lib/server";
import { requireAdmin } from "@/lib/admin-server";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await (await backend("/categories", {}, true)).json());
  } catch (error) { return apiFailure(error); }
}
