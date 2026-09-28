import { test, expect, type Page } from "@playwright/test";

test.use({ baseURL: "http://localhost:3101" });

test.beforeEach(async ({ request }) => {
  const response = await request.post("http://127.0.0.1:3901/__reset", { headers: { "x-playwright-reset": "local-fixture" } });
  expect(response.status()).toBe(204);
});

async function login(page: Page, email = "admin@example.com") {
  await page.goto("/");
  await page.getByRole("button", { name: "Olá, explorador Entre na sua conta" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Entrar na minha conta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Minha conta", exact: true })).toBeVisible();
}

test("acesso administrativo é negado a visitantes e clientes", async ({ page, request }) => {
  const unauthorized = await request.get("/api/admin/orders");
  expect(unauthorized.status()).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL("http://localhost:3101/");
  await login(page, "teste@example.com");
  await expect(page.getByRole("link", { name: "Acessar painel administrativo" })).not.toBeVisible();
  const forbidden = await page.request.get("/api/admin/orders");
  expect(forbidden.status()).toBe(403);
  const productMutation = await page.request.post("/api/admin/products", { headers: { origin: "http://localhost:3101" }, data: {} });
  expect(productMutation.status()).toBe(403);
  await page.goto("/admin");
  await expect(page).toHaveURL("http://localhost:3101/");
});

test("administrador cadastra, consulta, edita e exclui produto", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Acessar painel administrativo" }).click();
  await expect(page.getByRole("heading", { name: "Seu catálogo, em dia." })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Headphone Orbit Pro", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/admin-produtos.png", fullPage: true });
  await page.getByRole("button", { name: "Novo produto", exact: true }).click();
  await page.getByLabel("Nome do produto", { exact: true }).fill("Monitor Admin E2E");
  await page.getByLabel("Descrição", { exact: true }).fill("Monitor criado pelo teste do painel administrativo.");
  await page.getByLabel("Preço (R$)", { exact: true }).fill("1200.50");
  await page.getByLabel("URL da imagem", { exact: true }).fill("https://example.com/monitor.png");
  await page.getByRole("button", { name: "Cadastrar produto", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Selecione pelo menos uma categoria");
  await page.getByLabel("Computadores", { exact: true }).check();
  await page.getByRole("button", { name: "Cadastrar produto", exact: true }).click();
  await expect(page.locator(".admin-notice")).toContainText("Produto cadastrado com sucesso");
  await page.getByLabel("Próxima página").click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Página anterior").click();
  await page.getByRole("button", { name: "Editar Monitor Admin E2E", exact: true }).click();
  await expect(page.getByLabel("Nome do produto")).toHaveValue("Monitor Admin E2E");
  await expect(page.getByLabel("Computadores", { exact: true })).toBeChecked();
  await page.getByLabel("Nome do produto").fill("Monitor Admin Editado");
  await page.getByLabel("Preço (R$)").fill("1399.90");
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "Monitor Admin Editado" });
  await expect(row).toContainText("1.399,90");
  await page.getByLabel("Buscar produtos no painel").fill("Monitor Admin Editado");
  await page.getByLabel("Buscar no catálogo").click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Excluir Monitor Admin Editado", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: "Excluir Monitor Admin Editado", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar exclusão", exact: true }).click();
  await expect(page.locator(".admin-notice")).toContainText("Produto excluído com sucesso.");
  await expect(page.getByText("Nenhum produto encontrado.")).toBeVisible();
});

test("pedidos mostram cliente, status, total e registro de pagamento", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Acessar painel administrativo" }).click();
  await page.getByRole("navigation", { name: "Administração" }).getByRole("button", { name: "Pedidos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cada pedido importa." })).toBeVisible();
  await expect(page.locator("tbody")).toContainText("Cliente Teste");
  await page.getByLabel("Filtrar pedidos por status").selectOption("PAID");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("Pago");
  await expect(page.locator("tbody")).toContainText("Registrado");
  await page.screenshot({ path: "test-results/admin-pedidos.png", fullPage: true });
  await page.getByRole("button", { name: "Ver pedido 50", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Pagamento registrado");
  await expect(page.getByRole("dialog")).toContainText("Headphone Orbit Pro");
  await expect(page.getByRole("dialog")).toContainText("899,00");
  await page.keyboard.press("Escape");
  await page.getByLabel("Filtrar pedidos por status").selectOption("WAITING_PAYMENT");
  await expect(page.locator("tbody")).toContainText("Não registrado");
  await page.getByLabel("Ver pedido 51", { exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Sem registro de pagamento");
  await page.getByLabel("Fechar janela").click();
  await page.getByLabel("Filtrar pedidos por status").selectOption("CANCELED");
  await expect(page.getByText("Nenhum pedido encontrado.")).toBeVisible();
});

test("exclusão vinculada é explicada e o painel funciona no celular", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Acessar painel administrativo" }).click();
  await page.getByLabel("Excluir Headphone Orbit Pro", { exact: true }).click();
  await page.getByRole("button", { name: "Confirmar exclusão", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("não pode ser excluído");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Headphone Orbit Pro", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/admin-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Novo produto", exact: true }).click();
  await expect(page.getByLabel("Nome do produto")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const invalid = await page.request.post("/api/admin/products", { headers: { origin: "http://localhost:3101" }, data: { name: "AB", price: -1 } });
  expect(invalid.status()).toBe(422);
});
