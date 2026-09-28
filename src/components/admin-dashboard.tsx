"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, ExternalLink, LayoutDashboard, LoaderCircle, Package, Pencil, Plus, RefreshCw, Search, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import type { Category, Order, Page, Product, User } from "@/lib/types";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const statuses: Record<string, string> = { WAITING_PAYMENT: "Aguardando pagamento", PAID: "Pago", SHIPPED: "Enviado", DELIVERED: "Entregue", CANCELED: "Cancelado" };
const blankForm = { name: "", description: "", price: "", imgUrl: "", categories: [] as number[] };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Não foi possível concluir a operação.");
  return data;
}

function Thumbnail({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  return !failed && /^https?:\/\//.test(product.imgUrl || "") ? <img src={product.imgUrl} alt="" onError={() => setFailed(true)} /> : <span><Package size={22} /></span>;
}

function Status({ value }: { value: string }) { return <span className={`order-badge status-${value.toLowerCase()}`}>{statuses[value] || value}</span>; }

function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  return totalPages > 1 ? <div className="pagination"><button aria-label="Página anterior" disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft size={18} /></button><span>Página {page + 1} de {totalPages}</span><button aria-label="Próxima página" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight size={18} /></button></div> : null;
}

export default function AdminDashboard({ user }: { user: User }) {
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<Page<Product> | null>(null);
  const [orders, setOrders] = useState<Page<Order> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"editor" | "delete" | "order" | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [fields, setFields] = useState(blankForm);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), name: query, status });
    const load = tab === "products"
      ? api<Page<Product>>(`/api/admin/products?${params}`, { signal: controller.signal }).then(setProducts)
      : api<Page<Order>>(`/api/admin/orders?${params}`, { signal: controller.signal }).then(setOrders);
    load.catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tab, page, query, status, reload]);

  useEffect(() => {
    api<Category[]>("/api/admin/categories").then(data => { setCategories(data); setCategoriesError(""); }).catch(err => setCategoriesError(err.message));
  }, [reload]);

  useEffect(() => {
    if (modal) { dialog.current?.showModal(); document.body.style.overflow = "hidden"; }
    else { dialog.current?.close(); document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  function switchTab(next: "products" | "orders") { setTab(next); setPage(0); setError(""); setNotice(""); }
  function close() { if (!lock.current) { setModal(null); setActionError(""); } }
  function create() { setSelected(null); setFields(blankForm); setActionError(""); setModal("editor"); }
  async function edit(product: Product) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setActionError(""); setSelected(product); setFields(blankForm); setModal("editor");
    try {
      const full = await api<Product>(`/api/admin/products/${product.id}`);
      setSelected(full); setFields({ name: full.name, description: full.description || "", price: String(full.price), imgUrl: full.imgUrl || "", categories: full.categories?.map(c => c.id) || [] });
    } catch (err) { setModal(null); setError((err as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (!fields.categories.length) { setActionError("Selecione pelo menos uma categoria."); return; }
    lock.current = true; setBusy(true); setActionError("");
    try {
      await api<Product>(selected ? `/api/admin/products/${selected.id}` : "/api/admin/products", {
        method: selected ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, price: Number(fields.price), categories: fields.categories.map(id => ({ id })) }),
      });
      setNotice(selected ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
      setModal(null); setPage(0); setReload(value => value + 1);
    } catch (err) { setActionError((err as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function remove() {
    if (!selected || lock.current) return;
    lock.current = true; setBusy(true); setActionError("");
    try {
      await api<void>(`/api/admin/products/${selected.id}`, { method: "DELETE" });
      setNotice("Produto excluído com sucesso."); setModal(null);
      if (products?.content.length === 1 && page > 0) setPage(page - 1);
      setReload(value => value + 1);
    } catch (err) { setActionError((err as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  const data = tab === "products" ? products : orders;

  return <div className="admin-layout">
    <aside className="admin-sidebar"><a href="/" className="brand"><span className="brand-mark">n<span>↗</span></span><span>natan<span className="brand-sub">COMMERCE</span></span></a><div className="admin-label"><ShieldCheck size={13} /> ADMINISTRAÇÃO</div><nav aria-label="Administração"><button className={tab === "products" ? "active" : ""} aria-current={tab === "products" ? "page" : undefined} onClick={() => switchTab("products")}><Package size={19} />Produtos<ArrowRight size={15} /></button><button className={tab === "orders" ? "active" : ""} aria-current={tab === "orders" ? "page" : undefined} onClick={() => switchTab("orders")}><ShoppingBag size={19} />Pedidos<ArrowRight size={15} /></button></nav><a className="admin-store-link" href="/"><ArrowLeft size={16} />Voltar à loja</a><div className="admin-profile"><span>{user.name.charAt(0)}</span><div><strong>{user.name}</strong><small>Administrador</small></div></div></aside>
    <main className="admin-main"><header className="admin-topbar"><span><LayoutDashboard size={16} />Visão da loja <span>/</span> {tab === "products" ? "Produtos" : "Pedidos"}</span><a href="/">Ver loja <ExternalLink size={14} /></a></header><div className="admin-page-content"><div className="admin-heading"><div><span className="eyebrow muted">SEU NEGÓCIO, EM CADA DETALHE</span><h1>{tab === "products" ? "Seu catálogo, em dia." : "Cada pedido importa."}</h1><p>{tab === "products" ? "Cadastre produtos, ajuste os detalhes e organize suas próximas vendas." : "Acompanhe as compras, seus clientes e a situação de cada pedido."}</p></div>{tab === "products" && <button className="button primary" onClick={create}><Plus size={18} />Novo produto</button>}</div>
    <div className="admin-summary"><span className="admin-summary-icon">{tab === "products" ? <Package /> : <ShoppingBag />}</span><div><strong>{loading || error ? "—" : data?.totalElements || 0}</strong><span>{tab === "products" ? (query ? "produtos encontrados" : "produtos no catálogo") : (status ? `pedidos · ${statuses[status]}` : "pedidos registrados")}</span></div><div className="admin-summary-note"><ShieldCheck size={17} /><span>{tab === "products" ? "Alterações são salvas no catálogo da loja." : "Status e pagamentos consultados diretamente na loja."}</span></div></div>
    {notice && <div className="admin-notice" role="status"><CheckCircle2 size={18} />{notice}<button onClick={() => setNotice("")} aria-label="Fechar mensagem"><X size={16} /></button></div>}
    <section className="admin-list" aria-label={tab === "products" ? "Lista de produtos" : "Lista de pedidos"}><div className="admin-toolbar">{tab === "products" ? <form onSubmit={event => { event.preventDefault(); setPage(0); setQuery(search.trim()); }} className="admin-search"><Search size={17} /><input aria-label="Buscar produtos no painel" placeholder="Buscar por nome do produto" value={search} onChange={event => setSearch(event.target.value)} /><button type="submit" aria-label="Buscar no catálogo"><ArrowRight size={17} /></button></form> : <label className="admin-status-filter">Status do pedido<select aria-label="Filtrar pedidos por status" value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="">Todos os status</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}<button className="admin-refresh" onClick={() => setReload(value => value + 1)} disabled={loading} aria-label="Atualizar lista"><RefreshCw size={16} className={loading ? "spin" : ""} /><span>Atualizar</span></button></div>
      {error ? <div className="empty-state" role="alert"><Package size={32} /><h3>Não foi possível carregar a lista.</h3><p>{error}</p><button className="button secondary" onClick={() => setReload(value => value + 1)}>Tentar novamente</button><a className="text-link" href="/">Voltar à loja para entrar novamente <ArrowRight size={16} /></a></div> : loading ? <div className="empty-state" role="status"><LoaderCircle className="spin" size={28} /><p>Carregando {tab === "products" ? "produtos" : "pedidos"}…</p></div> : !data?.content.length ? <div className="empty-state"><Package size={34} /><h3>{tab === "products" ? "Nenhum produto encontrado." : "Nenhum pedido encontrado."}</h3><p>{tab === "products" ? "Tente outro nome ou cadastre um novo produto." : "Os pedidos aparecerão aqui conforme forem registrados. Você também pode mudar o filtro."}</p></div> : <>
      {tab === "products" ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Produto</th><th>Código</th><th>Preço</th><th className="right">Gerenciar</th></tr></thead><tbody>{products?.content.map(product => <tr key={product.id}><td><div className="admin-product-cell"><div className="admin-thumbnail"><Thumbnail key={`${product.id}-${product.imgUrl}`} product={product} /></div><strong>{product.name}</strong></div></td><td><span className="admin-id">#{product.id}</span></td><td className="admin-price">{money(product.price)}</td><td><div className="admin-row-actions"><button aria-label={`Editar ${product.name}`} onClick={() => edit(product)}><Pencil size={16} /><span>Editar</span></button><button className="delete-action" aria-label={`Excluir ${product.name}`} onClick={() => { setSelected(product); setActionError(""); setModal("delete"); }}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div> : <div className="admin-table-scroll"><table className="admin-table orders-table"><thead><tr><th>Pedido / Data</th><th>Cliente</th><th>Total</th><th>Status</th><th>Pagamento</th><th><span className="sr-only">Detalhes</span></th></tr></thead><tbody>{orders?.content.map(order => <tr key={order.id}><td><strong className="admin-order-id">#{order.id}</strong><small className="admin-date">{date(order.moment)}</small></td><td>{order.client?.name || "Cliente não informado"}</td><td className="admin-price">{money(order.total)}</td><td><Status value={order.status} /></td><td><span className={`payment-state ${order.payment ? "confirmed" : ""}`}><CircleDollarSign size={15} />{order.payment ? "Registrado" : "Não registrado"}</span></td><td><button className="admin-detail-button" aria-label={`Ver pedido ${order.id}`} onClick={() => { setSelectedOrder(order); setModal("order"); }}>Detalhes<ArrowRight size={15} /></button></td></tr>)}</tbody></table></div>}
      <Pager page={page} totalPages={data.totalPages} onPage={setPage} /></>}
    </section>{tab === "orders" && <p className="admin-footnote"><ShieldCheck size={16} />O status do pedido e o registro de pagamento são informações distintas. Este painel consulta os dados; não processa cobranças nem altera status.</p>}<footer className="admin-footer">Natan Commerce <span>PAINEL DO ADMINISTRADOR</span></footer></div></main>
    <dialog ref={dialog} className={`store-dialog admin-dialog ${modal === "editor" ? "editor-dialog" : ""}`} aria-labelledby="admin-dialog-title" onCancel={event => { if (busy) event.preventDefault(); else close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}><div className="dialog-content"><div className="dialog-heading"><div><span className="eyebrow muted">ADMINISTRAÇÃO</span><h2 id="admin-dialog-title">{modal === "editor" ? (selected ? "Editar produto" : "Novo produto") : modal === "delete" ? "Excluir este produto?" : `Pedido #${selectedOrder?.id}`}</h2></div><button className="icon-button" aria-label="Fechar janela" disabled={busy} onClick={close}><X /></button></div>{actionError && <p className="form-error" role="alert">{actionError}</p>}
    {modal === "editor" && (busy && !fields.name && selected ? <div className="empty-state"><LoaderCircle className="spin" />Carregando produto…</div> : <form className="admin-product-form" onSubmit={save}><fieldset disabled={busy}><label>Nome do produto<input name="name" value={fields.name} minLength={3} maxLength={80} required onChange={event => setFields({ ...fields, name: event.target.value })} placeholder="Ex.: Monitor UltraView 27" /></label><label>Descrição<textarea name="description" rows={4} value={fields.description} minLength={10} required onChange={event => setFields({ ...fields, description: event.target.value })} placeholder="Apresente as características e os diferenciais do produto." /></label><div className="admin-form-grid"><label>Preço (R$)<input name="price" type="number" min="0.01" step="0.01" required value={fields.price} onChange={event => setFields({ ...fields, price: event.target.value })} placeholder="0,00" /></label><label>URL da imagem<input name="imgUrl" type="url" required value={fields.imgUrl} onChange={event => setFields({ ...fields, imgUrl: event.target.value })} placeholder="https://…" /></label></div><fieldset className="category-fieldset"><legend>Categorias <span>Selecione ao menos uma</span></legend>{categoriesError ? <p className="form-error" role="alert">Não foi possível carregar categorias. {categoriesError}</p> : !categories.length ? <p className="form-help">Nenhuma categoria disponível. Cadastre as categorias no banco para continuar.</p> : <div className="admin-category-options">{categories.map(category => <label key={category.id}><input type="checkbox" checked={fields.categories.includes(category.id)} onChange={event => setFields({ ...fields, categories: event.target.checked ? [...fields.categories, category.id] : fields.categories.filter(id => id !== category.id) })} />{category.name}</label>)}</div>}</fieldset></fieldset><div className="admin-form-actions"><button className="button secondary" type="button" disabled={busy} onClick={close}>Cancelar</button><button className="button primary" type="submit" disabled={busy || !categories.length || !!categoriesError}>{busy ? <LoaderCircle className="spin" size={17} /> : <CheckCircle2 size={17} />}{busy ? "Salvando…" : selected ? "Salvar alterações" : "Cadastrar produto"}</button></div></form>)}
    {modal === "delete" && selected && <div className="admin-delete-content"><div className="admin-delete-product"><Package size={28} /><div><strong>{selected.name}</strong><span>Produto #{selected.id}</span></div></div><p>O produto será removido do catálogo. Essa ação não pode ser desfeita.</p><p className="form-help">Produtos que já fazem parte de pedidos são preservados pelo banco e não podem ser excluídos.</p><div className="admin-form-actions"><button className="button secondary" disabled={busy} onClick={close}>Cancelar</button><button className="button danger" disabled={busy} onClick={remove}>{busy ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}{busy ? "Excluindo…" : "Confirmar exclusão"}</button></div></div>}
    {modal === "order" && selectedOrder && <div className="admin-order-detail"><div className="admin-order-metadata"><div><small>CLIENTE</small><strong>{selectedOrder.client?.name || "Não informado"}</strong></div><div><small>REGISTRADO EM</small><strong>{date(selectedOrder.moment)}</strong></div></div><Status value={selectedOrder.status} /><div className="admin-payment-card"><CircleDollarSign size={23} /><div><strong>{selectedOrder.payment ? "Pagamento registrado" : "Sem registro de pagamento"}</strong><p>{selectedOrder.payment ? `Registro #${selectedOrder.payment.id} · ${date(selectedOrder.payment.moment)}` : "Não há confirmação de pagamento associada a este pedido."}</p></div></div><h3>Produtos do pedido</h3>{selectedOrder.items.map(item => <div className="order-line" key={item.productId}><span><strong>{item.name}</strong><small>{item.quantity} × {money(item.price)}</small></span><strong>{money(item.subTotal ?? item.quantity * item.price)}</strong></div>)}<div className="order-total"><span>Total</span><strong>{money(selectedOrder.total)}</strong></div><button className="button secondary full" onClick={close}>Voltar aos pedidos</button></div>}
    </div></dialog>
  </div>;
}
