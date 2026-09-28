import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Somente leitura: não faz login nem cria pedidos no Railway.
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", error => console.error("Browser:", error.message));
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.locator(".product-card").first().waitFor({ timeout: 30000 });
  const response = await page.request.get("http://localhost:3000/api/products");
  const catalog = await response.json();
  if (!response.ok() || catalog.demo || !catalog.content?.length) throw new Error("Catálogo real indisponível.");
  await page.locator("img").evaluateAll(images => Promise.all(images.map(image => {
    image.loading = "eager";
    return image.decode().catch(() => undefined);
  })));
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/railway-desktop.png", fullPage: true, animations: "disabled" });
  await page.locator(".product-image-button").first().click();
  await page.locator(".product-detail h3").waitFor();
  console.log(JSON.stringify({ status: response.status(), demo: catalog.demo, totalProducts: catalog.totalElements, productDetail: await page.locator(".product-detail h3").innerText() }));
  await page.getByLabel("Fechar janela").click();
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error("Overflow no mobile.");
  await page.screenshot({ path: "test-results/railway-mobile.png", fullPage: true });
} finally {
  await browser.close();
}
