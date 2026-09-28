import "server-only";
import { ApiError, backend } from "./server";
import type { User } from "./types";

export async function requireAdmin(): Promise<User> {
  const user: User = await (await backend("/users/me", {}, true)).json();
  if (!user.roles?.includes("ROLE_ADMIN")) throw new ApiError("Acesso restrito aos administradores da loja.", 403);
  return user;
}

export function productPayload(body: unknown) {
  if (!body || typeof body !== "object") throw new ApiError("Dados do produto inválidos.", 400);
  const product = body as Record<string, unknown>;
  const name = typeof product.name === "string" ? product.name.trim() : "";
  const description = typeof product.description === "string" ? product.description.trim() : "";
  const price = product.price;
  const imgUrl = typeof product.imgUrl === "string" ? product.imgUrl.trim() : "";
  if (name.length < 3 || name.length > 80) throw new ApiError("O nome deve ter entre 3 e 80 caracteres.", 422);
  if (description.length < 10) throw new ApiError("A descrição deve ter pelo menos 10 caracteres.", 422);
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) throw new ApiError("Informe um preço maior que zero.", 422);
  try { if (!["https:", "http:"].includes(new URL(imgUrl).protocol)) throw new Error(); }
  catch { throw new ApiError("Informe uma URL de imagem HTTP ou HTTPS válida.", 422); }
  if (!Array.isArray(product.categories) || !product.categories.length || product.categories.some(category => !Number.isSafeInteger(category?.id) || category.id < 1)) throw new ApiError("Selecione pelo menos uma categoria.", 422);
  return { name, description, price, imgUrl, categories: product.categories.map(category => ({ id: category.id })) };
}

export function validId(id: string) {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) throw new ApiError("Identificador inválido.", 400);
  return id;
}
