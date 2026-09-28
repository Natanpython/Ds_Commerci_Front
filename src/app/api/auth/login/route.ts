import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiFailure, backend, checkOrigin, sessionCookie } from "@/lib/server";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const { email, password } = await request.json();
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password || email.length > 254 || password.length > 256) throw new ApiError("Informe seu e-mail e sua senha.", 400);
    const clientId = process.env.OAUTH_CLIENT_ID;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new ApiError("O acesso à conta ainda não foi configurado nesta loja.", 503);
    let response: Response;
    try {
      response = await backend("/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}` },
        body: new URLSearchParams({ grant_type: "password", username: email.trim(), password }),
      });
    } catch (error) {
      if (error instanceof ApiError && [400, 401].includes(error.status)) throw new ApiError("Não foi possível entrar. Confira seu e-mail e sua senha.", 401);
      throw error;
    }
    const token = await response.json();
    if (typeof token.access_token !== "string") throw new ApiError("Resposta de autenticação inválida.", 502);
    const result = NextResponse.json({ success: true });
    result.cookies.set(sessionCookie, token.access_token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.min(Number(token.expires_in) || 3600, 86400) });
    return result;
  } catch (error) { return apiFailure(error); }
}
