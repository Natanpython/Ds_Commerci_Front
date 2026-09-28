export type Product = {
  id: number;
  name: string;
  price: number;
  imgUrl: string;
  description?: string;
  categories?: { id: number; name: string }[];
};

export type Catalog = {
  content: Product[];
  totalElements: number;
  totalPages: number;
  number: number;
  demo: boolean;
};

export type User = { id: number; name: string; email: string; roles: string[] };
export type CartItem = Product & { quantity: number };
export type Order = {
  id: number;
  moment: string;
  status: string;
  total: number;
  client?: { id: number; name: string };
  payment?: { id: number; moment: string } | null;
  items: { productId: number; name: string; quantity: number; price: number; subTotal: number }[];
};

export type Page<T> = { content: T[]; totalElements: number; totalPages: number; number: number };
export type Category = { id: number; name: string };
