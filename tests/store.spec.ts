import { test, expect } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const response = await request.post("http://127.0.0.1:3901/__reset", { headers: { "x-playwright-reset": "local-fixture" } });
  expect(response.status()).toBe(204);
});

test("catálogo demonstrativo, busca, detalhes e carrinho persistente", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Catálogo de demonstração ·")).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(6);
  await page.screenshot({ path: "test-results/loja-desktop.png", fullPage: true });
  await page.getByLabel("Buscar produtos").fill("Orbit");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Ver detalhes de Headphone Orbit Pro" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Headphone Orbit Pro", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click();
  await page.getByRole("button", { name: "Ver meu carrinho" }).click();
  await page.getByLabel("Aumentar quantidade de Headphone Orbit Pro").click();
  await expect(page.locator(".quantity")).toContainText("2");
  await expect(page.getByText("pedidos reais estão desativados", { exact: false })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Abrir carrinho, 2 itens" }).click();
  await expect(page.locator(".quantity")).toContainText("2");
  await page.getByLabel("Remover Headphone Orbit Pro").click();
  await expect(page.getByText("Espaço para novas possibilidades.")).toBeVisible();
});

test("layout mobile sem overflow e navegação acessível", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".product-card")).toHaveCount(6);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/loja-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Notebooks", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Adicionar Notebook Horizon 14 ao carrinho" }).click();
  await page.getByRole("button", { name: "Abrir carrinho, 1 itens" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test.describe("integração com contrato Spring", () => {
  test.use({ baseURL: "http://localhost:3101" });

  test("login, sessão, pedido com preço do servidor, consulta e logout", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.locator(".product-card")).toHaveCount(8);
    await expect(page.getByText("Catálogo de demonstração ·")).not.toBeVisible();
    await page.getByRole("button", { name: "Adicionar Headphone Orbit Pro ao carrinho" }).click();
    await page.getByRole("button", { name: "Abrir carrinho, 1 itens" }).click();
    await page.getByRole("button", { name: "Entrar para continuar" }).click();
    await page.getByLabel("E-mail", { exact: true }).fill("teste@example.com");
    await page.getByLabel("Senha", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Entrar na minha conta", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Confira seu e-mail e sua senha");
    await page.getByLabel("Senha", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "Entrar na minha conta", exact: true }).click();
    await expect(page.getByRole("button", { name: "Registrar pedido", exact: true })).toBeVisible();
    const cookie = (await context.cookies()).find(item => item.name === "natan_session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain("test-session-token");
    await page.getByRole("button", { name: "Registrar pedido", exact: true }).click();
    await expect(page.locator(".order-status")).toContainText("Aguardando pagamento");
    await expect(page.locator(".order-total")).toContainText("899,00");
    const heading = await page.locator("#dialog-title").innerText();
    const orderId = heading.replace("Pedido #", "");
    await page.getByLabel("Fechar janela").click();
    await expect(page.getByRole("button", { name: "Abrir carrinho, 0 itens" })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Olá, Cliente Minha conta" }).click();
    await page.getByLabel("Número do pedido").fill(orderId);
    await page.getByRole("button", { name: "Consultar pedido", exact: true }).click();
    await expect(page.locator("#dialog-title")).toHaveText(`Pedido #${orderId}`);
    await page.getByLabel("Fechar janela").click();
    await page.getByRole("button", { name: "Olá, Cliente Minha conta" }).click();
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page.getByRole("button", { name: "Olá, explorador Entre na sua conta" })).toBeVisible();
    expect((await context.cookies()).some(item => item.name === "natan_session")).toBe(false);
  });

  test("paginação, ordenação, busca vazia e indisponibilidade sem catálogo falso", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".product-card")).toHaveCount(8);
    await page.getByLabel("Próxima página").click();
    await expect(page.locator(".product-card")).toHaveCount(2);
    await page.getByLabel("Ordenar produtos").selectOption("price,desc");
    await expect(page.locator(".product-title").first()).toHaveText("Notebook Teste 10");
    await page.getByLabel("Buscar produtos").fill("inexistente");
    await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
    await expect(page.getByText("Ainda não encontramos essa combinação.")).toBeVisible();
    await page.getByLabel("Buscar produtos").fill("offline");
    await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
    await expect(page.locator(".empty-state[role='alert']")).toContainText("A conexão deu uma pausa.");
    await expect(page.locator(".product-card")).toHaveCount(0);
  });

  test("bloqueia pedidos sem sessão, quantidades inválidas e origens externas", async ({ request }) => {
    const origin = "http://localhost:3101";
    const unauthenticated = await request.post("/api/orders", { headers: { origin }, data: { items: [{ productId: 1, quantity: 1 }] } });
    expect(unauthenticated.status()).toBe(401);
    const invalid = await request.post("/api/orders", { headers: { origin }, data: { items: [{ productId: 1, quantity: -1 }] } });
    expect(invalid.status()).toBe(400);
    const crossOrigin = await request.post("/api/auth/logout", { headers: { origin: "https://untrusted.example" } });
    expect(crossOrigin.status()).toBe(403);
  });
});
