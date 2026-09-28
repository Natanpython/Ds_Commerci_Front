import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiFailure, backend, isDemo } from "@/lib/server";
import { demoProducts } from "@/lib/demo";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) throw new ApiError("Produto inválido.", 400);
    if (isDemo()) {
      const product = demoProducts.find(p => p.id === Number(id));
      if (!product) throw new ApiError("Produto não encontrado.", 404);
      return NextResponse.json(product);
    }
    return NextResponse.json(await (await backend(`/products/${id}`)).json());
  } catch (error) { return apiFailure(error); }
}
