import "server-only";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const sessionCookie = "natan_session";
export const isDemo = () => !process.env.BACKEND_URL?.trim();

export class ApiError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    throw new ApiError("Origem da solicitação inválida. Recarregue a página.", 403);
  }
}

export async function backend(path: string, init: RequestInit = {}, authenticated = false) {
  const base = process.env.BACKEND_URL?.trim().replace(/\/$/, "");
  if (!base) throw new ApiError("Esta é uma loja de demonstração. Login e pedidos precisam da conexão com a loja.", 503);
  const headers = new Headers(init.headers);
  if (authenticated) {
    const token = (await cookies()).get(sessionCookie)?.value;
    if (!token) throw new ApiError("Entre na sua conta para continuar.", 401);
    headers.set("Authorization", `Bearer ${token}`);
  }
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(20000) });
  } catch {
    throw new ApiError("Não foi possível conectar à loja. Tente novamente em instantes.", 502);
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "Confira os dados informados e tente novamente.",
      401: "Sua sessão expirou. Entre novamente para continuar.",
      403: "Sua conta não tem permissão para esta ação.",
      404: "Não encontramos o item solicitado.",
      422: "Confira os dados informados e tente novamente.",
    };
    throw new ApiError(messages[response.status] || "A loja está indisponível no momento. Tente novamente.", response.status);
  }
  return response;
}

export function apiFailure(error: unknown) {
  return NextResponse.json({ message: error instanceof ApiError ? error.message : "Não foi possível concluir a solicitação." }, { status: error instanceof ApiError ? error.status : 500 });
}
