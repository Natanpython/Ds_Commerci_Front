import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiFailure, backend, checkOrigin } from "@/lib/server";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { items } = await request.json();
    if (!Array.isArray(items) || !items.length || items.length > 100 || items.some(item => !Number.isSafeInteger(item.productId) || item.productId < 1 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) throw new ApiError("Confira os produtos e quantidades no carrinho.", 400);
    const response = await backend("/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map(({ productId, quantity }) => ({ productId, quantity })) }) }, true);
    return NextResponse.json(await response.json(), { status: 201 });
  } catch (error) { return apiFailure(error); }
}
