import { NextRequest, NextResponse } from "next/server";
import { apiFailure, backend, checkOrigin } from "@/lib/server";
import { productPayload, requireAdmin } from "@/lib/admin-server";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const page = Math.max(0, Math.floor(Number(request.nextUrl.searchParams.get("page")) || 0));
    const query = new URLSearchParams({ name: (request.nextUrl.searchParams.get("name") || "").slice(0, 100), page: String(page), size: "10", sort: "id,desc" });
    return NextResponse.json(await (await backend(`/products?${query}`, {}, true)).json());
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    await requireAdmin();
    const product = productPayload(await request.json());
    const response = await backend("/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(product) }, true);
    return NextResponse.json(await response.json(), { status: 201 });
  } catch (error) { return apiFailure(error); }
}
