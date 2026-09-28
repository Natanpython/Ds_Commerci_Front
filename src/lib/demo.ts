import type { Product } from "./types";

export const demoProducts: Product[] = [
  { id: 901, name: "Headphone Orbit Pro", price: 899, imgUrl: "/products/headphones.svg", categories: [{ id: 1, name: "Áudio" }], description: "Seu espaço. Seu som. Design over-ear com almofadas macias, conexão sem fio e acabamento em grafite. Produto ilustrativo do catálogo de demonstração." },
  { id: 902, name: "Notebook Horizon 14", price: 5499, imgUrl: "/products/laptop.svg", categories: [{ id: 2, name: "Notebooks" }], description: "Um novo horizonte para suas ideias. Notebook compacto com tela de 14 polegadas e design em alumínio. Produto ilustrativo do catálogo de demonstração." },
  { id: 903, name: "Teclado mecânico Pulse", price: 459, imgUrl: "/products/keyboard.svg", categories: [{ id: 3, name: "Periféricos" }], description: "Precisão em cada toque. Layout compacto, iluminação suave e teclas com perfil confortável para trabalhar e jogar. Produto ilustrativo do catálogo de demonstração." },
  { id: 904, name: "Mouse sem fio Vector", price: 249, imgUrl: "/products/mouse.svg", categories: [{ id: 3, name: "Periféricos" }], description: "Leveza que acompanha seu ritmo. Corpo ergonômico, acabamento fosco e liberdade sem fios. Produto ilustrativo do catálogo de demonstração." },
  { id: 905, name: "Monitor UltraView 27", price: 1899, imgUrl: "/products/monitor.svg", categories: [{ id: 4, name: "Monitores" }], description: "Mais espaço para criar. Tela ampla de 27 polegadas, bordas finas e base minimalista para transformar seu setup. Produto ilustrativo do catálogo de demonstração." },
  { id: 906, name: "PC Gamer Nexus", price: 7299, imgUrl: "/products/desktop.svg", categories: [{ id: 5, name: "PC Gamer" }], description: "O centro do seu próximo setup. Gabinete com painel transparente e iluminação em verde. Produto ilustrativo do catálogo de demonstração." },
];
