import { NextRequest, NextResponse } from "next/server";
import { apiFailure, backend, isDemo } from "@/lib/server";
import { demoProducts } from "@/lib/demo";

export async function GET(request: NextRequest) {
  try {
    const name = (request.nextUrl.searchParams.get("name") || "").slice(0, 100);
    const page = Math.max(0, Number(request.nextUrl.searchParams.get("page")) || 0);
    const allowedSorts = ["name,asc", "price,asc", "price,desc", "id,desc"];
    const sort = request.nextUrl.searchParams.get("sort") || "id,desc";
    const safeSort = allowedSorts.includes(sort) ? sort : "id,desc";
    if (isDemo()) {
      const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const products = demoProducts.filter(p => normalize(`${p.name} ${p.categories?.map(c => c.name).join(" ")}`).includes(normalize(name)));
      if (safeSort === "price,asc") products.sort((a, b) => a.price - b.price);
      if (safeSort === "price,desc") products.sort((a, b) => b.price - a.price);
      if (safeSort === "name,asc") products.sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ content: products.slice(page * 8, page * 8 + 8), totalElements: products.length, totalPages: Math.ceil(products.length / 8), number: page, demo: true });
    }
    const query = new URLSearchParams({ name, page: String(page), size: "8", sort: safeSort });
    const response = await backend(`/products?${query}`);
    return NextResponse.json({ ...await response.json(), demo: false });
  } catch (error) { return apiFailure(error); }
}
