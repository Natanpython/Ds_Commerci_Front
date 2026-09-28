import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiFailure, backend, checkOrigin } from "@/lib/server";
import { productPayload, requireAdmin, validId } from "@/lib/admin-server";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, context: Context) {
  try {
    await requireAdmin();
    const id = validId((await context.params).id);
    return NextResponse.json(await (await backend(`/products/${id}`, {}, true)).json());
  } catch (error) { return apiFailure(error); }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    checkOrigin(request);
    await requireAdmin();
    const id = validId((await context.params).id);
    const product = productPayload(await request.json());
    return NextResponse.json(await (await backend(`/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(product) }, true)).json());
  } catch (error) { return apiFailure(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    checkOrigin(request);
    await requireAdmin();
    const id = validId((await context.params).id);
    try { await backend(`/products/${id}`, { method: "DELETE" }, true); }
    catch (error) {
      if (error instanceof ApiError && [400, 409].includes(error.status)) throw new ApiError("Este produto possui vínculos com outros registros, como pedidos, e não pode ser excluído. Você pode editar seus dados.", 409);
      throw error;
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiFailure(error); }
}
