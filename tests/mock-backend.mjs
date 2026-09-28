import { createServer } from "node:http";

const originalProducts = () => Array.from({ length: 10 }, (_, index) => ({ id: index + 1, name: index === 0 ? "Headphone Orbit Pro" : `Notebook Teste ${index + 1}`, price: 899 + index * 100, imgUrl: "/products/headphones.svg", description: "Um produto de teste para validar o contrato do backend.", categories: [{ id: 1, name: "Tecnologia" }] }));
let products = originalProducts();
const user = { id: 1, name: "Cliente Teste", email: "teste@example.com", roles: ["ROLE_CLIENT"] };
const admin = { id: 2, name: "Admin Teste", email: "admin@example.com", roles: ["ROLE_CLIENT", "ROLE_ADMIN"] };
const categories = [{ id: 1, name: "Tecnologia" }, { id: 2, name: "Computadores" }];
const originalOrders = () => new Map([
  [50, { id: 50, moment: "2026-09-28T12:00:00Z", status: "PAID", client: { id: 1, name: "Cliente Teste" }, payment: { id: 50, moment: "2026-09-28T12:10:00Z" }, total: 899, items: [{ productId: 1, name: "Headphone Orbit Pro", quantity: 1, price: 899, subTotal: 899 }] }],
  [51, { id: 51, moment: "2026-09-28T13:00:00Z", status: "WAITING_PAYMENT", client: { id: 1, name: "Cliente Teste" }, payment: null, total: 899, items: [{ productId: 1, name: "Headphone Orbit Pro", quantity: 1, price: 899, subTotal: 899 }] }],
]);
let orders = originalOrders();
let nextId = 100;
let nextProductId = 1000;

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const reply = (status, data) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (url.pathname === "/health") return reply(200, { ok: true });
  if (url.pathname === "/__reset" && req.method === "POST" && req.headers["x-playwright-reset"] === "local-fixture") {
    products = originalProducts(); orders = originalOrders(); nextId = 100; nextProductId = 1000;
    res.writeHead(204); return res.end();
  }
  if (url.pathname === "/oauth2/token") {
    const form = new URLSearchParams(raw);
    if (req.headers.authorization !== `Basic ${Buffer.from("test-client:test-secret").toString("base64")}` || ![user.email, admin.email].includes(form.get("username")) || form.get("password") !== "test-password" || form.get("grant_type") !== "password") return reply(401, { error: "invalid_grant" });
    return reply(200, { access_token: form.get("username") === admin.email ? "test-admin-token" : "test-session-token", expires_in: 3600 });
  }
  if (url.pathname === "/products" && req.method === "GET") {
    const name = url.searchParams.get("name") || "";
    if (name === "offline") return reply(503, { error: "Offline" });
    const list = products.filter(p => p.name.toLowerCase().includes(name.toLowerCase()));
    const sort = url.searchParams.get("sort");
    if (sort === "price,desc") list.sort((a, b) => b.price - a.price);
    if (sort === "price,asc") list.sort((a, b) => a.price - b.price);
    const page = Number(url.searchParams.get("page") || 0);
    const size = Number(url.searchParams.get("size") || 8);
    return reply(200, { content: list.slice(page * size, page * size + size), number: page, totalElements: list.length, totalPages: Math.ceil(list.length / size) });
  }
  if (/^\/products\/\d+$/.test(url.pathname) && req.method === "GET") {
    const product = products.find(p => p.id === Number(url.pathname.split("/").pop()));
    return reply(product ? 200 : 404, product || {});
  }
  const isAdmin = req.headers.authorization === "Bearer test-admin-token";
  if (!isAdmin && req.headers.authorization !== "Bearer test-session-token") return reply(401, {});
  if (url.pathname === "/users/me") return reply(200, isAdmin ? admin : user);
  if (url.pathname === "/categories") return reply(200, categories);
  if (url.pathname.startsWith("/products") && ["POST", "PUT", "DELETE"].includes(req.method)) {
    if (!isAdmin) return reply(403, {});
    if (req.method === "POST") {
      const product = { ...JSON.parse(raw), id: nextProductId++ };
      products.unshift(product);
      return reply(201, product);
    }
    const id = Number(url.pathname.split("/").pop());
    if (!products.some(p => p.id === id)) return reply(404, {});
    if (req.method === "PUT") {
      const updated = { ...JSON.parse(raw), id };
      products = products.map(p => p.id === id ? updated : p);
      return reply(200, updated);
    }
    if (id === 1) return reply(400, { error: "Falha de integridade referencial" });
    products = products.filter(p => p.id !== id);
    res.writeHead(204); return res.end();
  }
  if (url.pathname === "/orders" && req.method === "GET") {
    if (!isAdmin) return reply(403, {});
    const status = url.searchParams.get("status");
    const filtered = [...orders.values()].filter(order => !status || order.status === status).sort((a, b) => b.id - a.id);
    const page = Number(url.searchParams.get("page") || 0);
    const size = Number(url.searchParams.get("size") || 10);
    return reply(200, { content: filtered.slice(page * size, page * size + size), totalElements: filtered.length, totalPages: Math.ceil(filtered.length / size), number: page });
  }
  if (url.pathname === "/orders" && req.method === "POST") {
    const body = JSON.parse(raw);
    const items = body.items.map(item => { const product = products.find(p => p.id === item.productId); return { ...item, name: product.name, price: product.price, subTotal: product.price * item.quantity }; });
    const order = { id: nextId++, moment: new Date().toISOString(), status: "WAITING_PAYMENT", client: { id: user.id, name: user.name }, payment: null, items, total: items.reduce((total, item) => total + item.subTotal, 0) };
    orders.set(order.id, order);
    return reply(201, order);
  }
  if (/^\/orders\/\d+$/.test(url.pathname)) {
    const order = orders.get(Number(url.pathname.split("/").pop()));
    return reply(order ? 200 : 404, order || {});
  }
  reply(404, {});
}).listen(3901, "127.0.0.1");
