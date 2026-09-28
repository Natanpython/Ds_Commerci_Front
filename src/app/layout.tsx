import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Natan Commerce — Seu próximo nível começa aqui",
  description: "Tecnologia para criar, jogar e ir além. Explore notebooks, áudio e acessórios na Natan Commerce.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
