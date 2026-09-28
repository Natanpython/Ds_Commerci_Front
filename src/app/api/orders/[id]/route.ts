import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiFailure, backend } from "@/lib/server";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) throw new ApiError("Informe um número de pedido válido.", 400);
    return NextResponse.json(await (await backend(`/orders/${id}`, {}, true)).json());
  } catch (error) { return apiFailure(error); }
}
