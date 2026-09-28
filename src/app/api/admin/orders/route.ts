import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiFailure, backend } from "@/lib/server";
import { requireAdmin } from "@/lib/admin-server";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const page = Math.max(0, Math.floor(Number(request.nextUrl.searchParams.get("page")) || 0));
    const status = request.nextUrl.searchParams.get("status") || "";
    if (status && !["WAITING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "CANCELED"].includes(status)) throw new ApiError("Status de pedido inválido.", 400);
    const query = new URLSearchParams({ page: String(page), size: "10", sort: "moment,desc" });
    if (status) query.set("status", status);
    try {
      return NextResponse.json(await (await backend(`/orders?${query}`, {}, true)).json());
    } catch (error) {
      if (error instanceof ApiError && [404, 405].includes(error.status)) throw new ApiError("A listagem de pedidos ainda não está disponível no servidor. Publique a atualização do back no Railway para habilitá-la.", 503);
      throw error;
    }
  } catch (error) { return apiFailure(error); }
}
