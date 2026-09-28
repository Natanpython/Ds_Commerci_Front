"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Cpu, Headphones, Laptop, LoaderCircle, LogOut, Menu, Minus, Monitor, Package, Plus, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Trash2, UserRound, X, Zap } from "lucide-react";
import type { CartItem, Catalog, Order, Product, User } from "@/lib/types";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const collections = [
  { name: "Todos os produtos", query: "", icon: SlidersHorizontal },
  { name: "Notebooks", query: "Notebook", icon: Laptop },
  { name: "Áudio", query: "Head", icon: Headphones },
  { name: "Periféricos", query: "", icon: Cpu },
  { name: "Monitores", query: "Monitor", icon: Monitor },
  { name: "PC Gamer", query: "PC Gamer", icon: Zap },
];
type Panel = "cart" | "login" | "account" | "product" | "order" | "about" | null;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Não foi possível concluir. Tente novamente.");
  return data;
}

function ProductImage({ product, className = "" }: { product: Pick<Product, "imgUrl" | "name">; className?: string }) {
  const [failed, setFailed] = useState(false);
  const safe = /^https?:\/\//.test(product.imgUrl || "") || product.imgUrl?.startsWith("/products/");
  if (failed || !safe) return <div className={`image-fallback ${className}`}><Package size={48} /><span>Imagem indisponível</span></div>;
  // Imagens do catálogo têm hosts variáveis; não exigimos allowlist de next/image.
  return <img className={className} src={product.imgUrl} alt={product.name} loading="lazy" onError={() => setFailed(true)} />;
}

export default function Storefront() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("Todos os produtos");
  const [sort, setSort] = useState("id,desc");
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [returnToCart, setReturnToCart] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const demo = catalog?.demo;
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCatalogError("");
    const params = new URLSearchParams({ name: query, sort, page: String(page) });
    request<Catalog>(`/api/products?${params}`, { signal: controller.signal })
      .then(setCatalog)
      .catch(err => { if (!controller.signal.aborted) setCatalogError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, sort, page, retry]);

  useEffect(() => {
    if (demo === undefined) return;
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(`natan-cart-${demo ? "demo" : "live"}`) || "[]");
      if (Array.isArray(stored)) setCart(stored.filter(item => Number.isSafeInteger(item?.id) && typeof item.name === "string" && typeof item.imgUrl === "string" && Number.isFinite(item.price) && item.price > 0 && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99).slice(0, 100));
    } catch { /* Storage pode estar bloqueado pelo navegador. */ }
    setStorageReady(true);
  }, [demo]);

  useEffect(() => {
    if (!storageReady || demo === undefined) return;
    try { localStorage.setItem(`natan-cart-${demo ? "demo" : "live"}`, JSON.stringify(cart)); } catch { /* Carrinho segue disponível nesta sessão. */ }
  }, [cart, demo, storageReady]);

  useEffect(() => { request<{ user: User | null }>("/api/auth/me").then(data => setUser(data.user)).catch(() => setUser(null)); }, []);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); } }, [toast]);

  useEffect(() => {
    if (panel) {
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.current?.close();
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [panel]);

  useEffect(() => {
    if (panel !== "product" || selectedId === null) return;
    const controller = new AbortController();
    setProductLoading(true);
    setProduct(null);
    request<Product>(`/api/products/${selectedId}`, { signal: controller.signal })
      .then(setProduct)
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setProductLoading(false); });
    return () => controller.abort();
  }, [panel, selectedId]);

  function open(next: Panel) { setError(""); setPanel(next); setMobileMenu(false); }
  function browse(name = "Todos os produtos", term = "") {
    setCollection(name); setQuery(term); setSearch(term); setPage(0); setMobileMenu(false);
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
  }
  function addToCart(item: Product) {
    setCart(current => {
      const existing = current.find(p => p.id === item.id);
      return existing ? current.map(p => p.id === item.id ? { ...p, quantity: Math.min(99, p.quantity + 1) } : p) : [...current, { ...item, quantity: 1 }];
    });
    setToast(`${item.name} adicionado ao carrinho`);
  }
  function changeQuantity(id: number, amount: number) {
    setCart(current => current.map(item => item.id === id ? { ...item, quantity: Math.min(99, item.quantity + amount) } : item).filter(item => item.quantity > 0));
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); browse("Busca", search.trim()); }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const data = await request<{ user: User }>("/api/auth/me");
      setUser(data.user); open(returnToCart ? "cart" : "account"); setReturnToCart(false);
      setToast(`Bem-vindo, ${data.user.name.split(" ")[0]}!`);
    } catch (err) { setError((err as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await request("/api/auth/logout", { method: "POST" }); setUser(null); open(null); setOrder(null); setToast("Você saiu da sua conta."); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function checkout() {
    if (!user) { setReturnToCart(true); open("login"); return; }
    if (lock.current || !cart.length || demo) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const data = await request<Order>("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.map(item => ({ productId: item.id, quantity: item.quantity })) }) });
      setOrder(data); setCart([]); open("order");
    } catch (err) { setError((err as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function findOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const id = new FormData(event.currentTarget).get("orderId");
    try { setOrder(await request<Order>(`/api/orders/${id}`)); open("order"); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  const panelTitle = panel === "cart" ? "Seu carrinho" : panel === "login" ? "Bom ter você de volta." : panel === "account" ? "Minha conta" : panel === "product" ? "Conheça de perto" : panel === "order" ? `Pedido #${order?.id || ""}` : "Tecnologia com propósito.";

  return <>
    <a className="skip-link" href="#catalogo">Pular para os produtos</a>
    <div className="announcement"><span><Zap size={13} fill="currentColor" /> DÊ UM UPGRADE NO SEU DIA.</span><a href="#catalogo">Encontre seu próximo favorito <ArrowUpRight size={14} /></a></div>
    <header className="header">
      <div className="header-main shell">
        <a className="brand" href="#" aria-label="Natan Commerce — início"><span className="brand-mark">n<span>↗</span></span><span>natan<span className="brand-sub">COMMERCE</span></span><i /></a>
        <form className="search" onSubmit={submitSearch}><Search size={19} /><input aria-label="Buscar produtos" placeholder="O que você quer explorar hoje?" value={search} onChange={event => setSearch(event.target.value)} /><button aria-label="Pesquisar" type="submit"><ArrowRight size={18} /></button></form>
        <div className="header-actions"><button className="account-button" onClick={() => { setReturnToCart(false); open(user ? "account" : "login"); }}><UserRound size={21} /><span><small>Olá, {user ? user.name.split(" ")[0] : "explorador"}</small>{user ? "Minha conta" : "Entre na sua conta"}</span></button><span className="header-divider" /><button className="bag-button" aria-label={`Abrir carrinho, ${cartCount} itens`} onClick={() => open("cart")}><ShoppingBag size={22} /><span className="cart-count">{cartCount}</span></button><button className="mobile-toggle" aria-label="Abrir navegação" aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button></div>
      </div>
      <nav className={`navigation shell ${mobileMenu ? "is-open" : ""}`} aria-label="Navegação principal"><div><button className="all-categories" onClick={() => browse()}><Menu size={16} /> Explorar produtos</button><button onClick={() => browse("Notebooks", demo ? "Notebook" : "Macbook")}>Notebooks</button><button onClick={() => browse("PC Gamer", "PC Gamer")}>Universo gamer</button><button onClick={() => browse("Áudio", "Head")}>Áudio & som</button><button onClick={() => open("about")}>Sobre a Natan</button></div><span className="nav-caption"><span className="status-dot" /> Conecte-se ao próximo nível</span></nav>
    </header>

    {user?.roles.includes("ROLE_ADMIN") && <div className="admin-entry shell"><ShieldCheck size={15} /><span>Você está conectado como administrador.</span><a href="/admin">Gerenciar loja <ArrowUpRight size={15} /></a></div>}
    <main>
      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero-copy"><div className="eyebrow"><span /> PARA QUEM NUNCA PARA DE EXPLORAR</div><h1 id="hero-title">Seu próximo<br />nível começa<br /><span>aqui.</span><span className="title-asterisk">✳</span></h1><p>Tecnologia que acompanha suas ideias.<br />Encontre o que falta para ir além.</p><button className="button primary" onClick={() => browse()}>Explore a coleção <ArrowUpRight size={20} /></button><div className="hero-footnote"><span className="tiny-line" /> CRIE. JOGUE. CONECTE.</div></div>
        <div className="hero-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="hero-coordinate">NC / FUTURE ESSENTIALS</span><span className="hero-watermark">ORBIT</span><img className="hero-headphones" src="/products/headphones.svg" alt="Headphone grafite com detalhes verdes, conceito Orbit" fetchPriority="high" /><div className="floating-label"><span className="label-icon"><Headphones size={19} /></span><span>Menos ruído.<br /><strong>Mais possibilidades.</strong></span><span className="label-dot" /></div><div className="hero-bottom"><span>DESIGN QUE CONECTA.<br /><strong>ESSENCIAIS PARA O SEU MUNDO.</strong></span><span className="hero-index">01 <span>/ 03</span></span></div></div>
      </section>

      <section className="value-strip shell" aria-label="Experiência Natan"><div><Cpu /><span><strong>Seu setup, sua identidade</strong><small>Escolhas que combinam com você</small></span></div><div><ShieldCheck /><span><strong>Conta protegida</strong><small>Uma experiência de acesso segura</small></span></div><div><Package /><span><strong>Tudo em um só lugar</strong><small>Do primeiro clique ao seu pedido</small></span></div><div><Sparkles /><span><strong>Feito para ir além</strong><small>Tecnologia para novas possibilidades</small></span></div></section>

      <section className="catalog-section shell" id="catalogo" aria-labelledby="catalog-title">
        <div className="section-heading"><div><div className="eyebrow muted">ESCOLHA SEU PRÓXIMO UPGRADE</div><h2 id="catalog-title">Grandes ideias. <span>Ótimas escolhas.</span></h2></div><a className="text-link" href="#products">Explorar produtos <ArrowDown size={16} /></a></div>
        <div className="collection-tabs" aria-label="Coleções">{collections.map(({ name, query: term, icon: Icon }) => <button key={name} className={collection === name ? "active" : ""} onClick={() => browse(name, name === "Notebooks" && !demo ? "Macbook" : name === "Periféricos" ? (demo ? "Periféricos" : "Mouse") : term)}><Icon size={17} />{name}</button>)}</div>
        <div className="catalog-toolbar" id="products"><span>{loading ? "Buscando suas próximas possibilidades…" : `${catalogError ? 0 : catalog?.totalElements || 0} produtos para explorar`}{query && <> · <strong>“{query}”</strong><button className="clear-search" onClick={() => browse()} aria-label="Limpar busca"><X size={14} /></button></>}</span><label>Ordenar por <select aria-label="Ordenar produtos" value={sort} onChange={event => { setSort(event.target.value); setPage(0); }}><option value="id,desc">Destaques</option><option value="price,asc">Menor preço</option><option value="price,desc">Maior preço</option><option value="name,asc">Nome: A–Z</option></select></label></div>
        {demo && <div className="demo-note"><span className="status-dot" /> Catálogo de demonstração · Produtos e valores ilustrativos, sem compras reais.</div>}
        {catalogError ? <div className="empty-state" role="alert"><Package size={36} /><h3>A conexão deu uma pausa.</h3><p>{catalogError}</p><button className="button secondary" onClick={() => setRetry(retry + 1)}>Tentar novamente <ArrowRight size={17} /></button></div> : loading ? <div className="product-grid" aria-label="Carregando produtos" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton-card"><div /><span /><span /></div>)}</div> : !catalog?.content.length ? <div className="empty-state"><Search size={36} /><h3>Ainda não encontramos essa combinação.</h3><p>Tente outro nome ou explore todos os produtos.</p><button className="button secondary" onClick={() => browse()}>Ver todos os produtos <ArrowRight size={17} /></button></div> : <div className="product-grid">{catalog.content.map((item, index) => <article className="product-card" key={item.id}><button className="product-image-button" onClick={() => { setSelectedId(item.id); open("product"); }} aria-label={`Ver detalhes de ${item.name}`}><span className="product-code">NC / {String(item.id).padStart(3, "0")}</span>{index === 0 && !query && <span className="product-tag">Explore</span>}<ProductImage product={item} /><span className="quick-view">Conheça de perto <ArrowUpRight size={16} /></span></button><div className="product-info"><span className="product-category">{item.categories?.map(c => c.name).join(" / ") || "NATAN COLLECTION"}</span><button className="product-title" onClick={() => { setSelectedId(item.id); open("product"); }}>{item.name}</button><div className="product-purchase"><div><strong>{money(item.price)}</strong><small>Preço do produto</small></div><button className="add-button" aria-label={`Adicionar ${item.name} ao carrinho`} onClick={() => addToCart(item)}><Plus size={21} /></button></div></div></article>)}</div>}
        {!loading && !catalogError && !!catalog && catalog.totalPages > 1 && <div className="pagination"><button disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Página anterior"><ChevronLeft size={18} /></button><span>Página {page + 1} de {catalog.totalPages}</span><button disabled={page + 1 >= catalog.totalPages} onClick={() => setPage(page + 1)} aria-label="Próxima página"><ChevronRight size={18} /></button></div>}
      </section>

      <section className="editorial shell"><div className="editorial-copy"><div className="eyebrow">SEU ESPAÇO. SUAS REGRAS.</div><h2>Um setup à altura<br />das suas ideias.</h2><p>Do foco absoluto à próxima partida.<br />Monte um universo que é só seu.</p><button className="button light" onClick={() => browse("PC Gamer", "PC Gamer")}>Encontre seu upgrade <ArrowUpRight size={18} /></button></div><div className="setup-art"><span className="setup-grid" /><img src="/products/monitor.svg" alt="Conceito de monitor com formas verdes na tela" loading="lazy" /><img src="/products/keyboard.svg" alt="Teclado compacto do setup" loading="lazy" /><span className="setup-caption">MADE FOR YOUR NEXT MOVE. ↗</span></div></section>
      <section className="closing shell"><span className="closing-icon"><Sparkles size={26} /></span><div><h2>O futuro tem a sua cara.</h2><p>Encontre a tecnologia para fazer acontecer.</p></div><button className="round-button" aria-label="Voltar ao catálogo" onClick={() => browse()}><ArrowUpRight size={26} /></button></section>
    </main>

    <footer className="footer"><div className="footer-main shell"><div><a className="brand" href="#"><span className="brand-mark">n<span>↗</span></span><span>natan<span className="brand-sub">COMMERCE</span></span><i /></a><p>Tecnologia para o que vem a seguir.</p></div><div><strong>Explore</strong><button onClick={() => browse()}>Todos os produtos</button><button onClick={() => browse("PC Gamer", "PC Gamer")}>Universo gamer</button></div><div><strong>Seu espaço</strong><button onClick={() => { setReturnToCart(false); open(user ? "account" : "login"); }}>Minha conta e pedidos</button><button onClick={() => open("cart")}>Meu carrinho</button></div><div className="footer-note"><span className="status-dot" /> CONSTRUÍDO PARA CONECTAR<p>Uma experiência de e-commerce<br />por Natanael Pereira.</p></div></div><div className="footer-bottom shell"><span>© {new Date().getFullYear()} Natan Commerce · Projeto de portfólio.</span><button onClick={() => open("about")}>Sobre esta experiência <ArrowUpRight size={13} /></button><span>DESIGNED FOR THE NEXT.</span></div></footer>

    {!panel && <CartToast message={toast} onClose={() => setToast("")} />}

    <dialog ref={dialog} className={`store-dialog ${panel === "cart" ? "drawer" : ""}`} aria-labelledby="dialog-title" onCancel={event => { if (busy) event.preventDefault(); else open(null); }} onClick={event => { if (event.target === event.currentTarget && !busy) open(null); }}>
      <div className="dialog-content"><div className="dialog-heading"><div><span className="eyebrow muted">NATAN COMMERCE</span><h2 id="dialog-title">{panelTitle}</h2></div><button className="icon-button" aria-label="Fechar janela" disabled={busy} onClick={() => open(null)}><X /></button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {panel === "account" && user?.roles.includes("ROLE_ADMIN") && <a className="button primary full account-admin-link" href="/admin"><ShieldCheck size={18} />Acessar painel administrativo<ArrowUpRight size={17} /></a>}
        {panel === "cart" && <>{!cart.length ? <div className="empty-state"><ShoppingBag size={42} /><h3>Espaço para novas possibilidades.</h3><p>Seu próximo upgrade está esperando no catálogo.</p><button className="button primary" onClick={() => { open(null); browse(); }}>Explorar produtos <ArrowRight size={18} /></button></div> : <><p className="dialog-subtitle">{cartCount} {cartCount === 1 ? "item selecionado" : "itens selecionados"} para o seu próximo nível.</p><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><ProductImage product={item} /><div><strong>{item.name}</strong><span>{money(item.price)}</span><div className="quantity"><button disabled={busy} aria-label={`Diminuir quantidade de ${item.name}`} onClick={() => changeQuantity(item.id, -1)}><Minus size={14} /></button><span>{item.quantity}</span><button disabled={busy || item.quantity >= 99} aria-label={`Aumentar quantidade de ${item.name}`} onClick={() => changeQuantity(item.id, 1)}><Plus size={14} /></button></div></div><button className="remove-button" disabled={busy} aria-label={`Remover ${item.name}`} onClick={() => setCart(cart.filter(p => p.id !== item.id))}><Trash2 size={17} /></button></div>)}</div><div className="cart-summary"><div><span>Subtotal dos produtos</span><strong>{money(total)}</strong></div><p>O valor final é confirmado pela loja ao registrar o pedido. Esta experiência não realiza cobrança ou entrega.</p>{demo ? <div className="demo-checkout"><Sparkles size={18} /><p>Você está no modo demonstração. Explore o carrinho à vontade; pedidos reais estão desativados.</p></div> : <button className="button primary full" disabled={busy} onClick={checkout}>{busy ? <LoaderCircle className="spin" size={18} /> : <ShoppingBag size={18} />}{busy ? "Registrando pedido…" : user ? "Registrar pedido" : "Entrar para continuar"}<ArrowRight size={18} /></button>}<button className="back-link" disabled={busy} onClick={() => open(null)}><ArrowLeft size={15} />Continuar explorando</button></div></>}</>}
        {panel === "login" && <><p className="dialog-subtitle">Entre para guardar suas próximas conquistas em um pedido.</p>{demo ? <div className="demo-checkout"><Sparkles size={22} /><p>Esta vitrine está em demonstração. O login fica disponível quando a loja estiver conectada ao servidor.</p></div> : <form className="auth-form" onSubmit={login}><label>E-mail<input name="email" type="email" placeholder="voce@exemplo.com" autoComplete="username" required maxLength={254} /></label><label>Senha<input name="password" type="password" placeholder="Sua senha" autoComplete="current-password" required maxLength={256} /></label><button className="button primary full" disabled={busy} type="submit">{busy ? <LoaderCircle className="spin" size={18} /> : <UserRound size={18} />}{busy ? "Entrando…" : "Entrar na minha conta"}<ArrowRight size={18} /></button><p className="form-help">Use uma conta já cadastrada na loja. O cadastro de novas contas ainda não está disponível.</p></form>}<div className="security-note"><ShieldCheck size={18} /> Sua senha não é armazenada no navegador.</div></>}
        {panel === "account" && user && <><div className="user-card"><div className="avatar">{user.name.slice(0, 1)}</div><div><h3>{user.name}</h3><p>{user.email}</p><span>{user.roles.includes("ROLE_ADMIN") ? "Conta de administrador" : "Sua conta Natan"}</span></div></div><div className="order-lookup"><h3><Package size={19} />Consultar pedido</h3><p>Informe o número para acompanhar os detalhes do seu pedido.</p><form onSubmit={findOrder}><label className="sr-only" htmlFor="orderId">Número do pedido</label><input id="orderId" name="orderId" type="number" min="1" step="1" placeholder="Número do pedido" required /><button className="button primary" disabled={busy} type="submit">{busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}<span className="sr-only">Consultar pedido</span></button></form></div><button className="back-link" disabled={busy} onClick={logout}><LogOut size={17} />Sair da conta</button></>}
        {panel === "product" && (productLoading ? <div className="empty-state" aria-busy="true"><LoaderCircle className="spin" />Carregando produto…</div> : product && <div className="product-detail"><div className="detail-image"><ProductImage product={product} /></div><div className="product-category">{product.categories?.map(c => c.name).join(" / ") || "NATAN COLLECTION"}</div><h3>{product.name}</h3><strong className="detail-price">{money(product.price)}</strong><p>{product.description || "Conheça uma nova possibilidade para o seu dia a dia."}</p><button className="button primary full" onClick={() => addToCart(product)}>Adicionar ao carrinho <Plus size={19} /></button><button className="back-link" onClick={() => open("cart")}>Ver meu carrinho <ArrowRight size={16} /></button></div>)}
        {panel === "order" && order && <div className="order-detail"><div className="order-status"><Check size={24} /><span>{({ WAITING_PAYMENT: "Aguardando pagamento", PAID: "Pago", SHIPPED: "Enviado", DELIVERED: "Entregue", CANCELED: "Cancelado" } as Record<string, string>)[order.status] || order.status}</span></div><p>Registrado em {new Date(order.moment).toLocaleString("pt-BR")}. Guarde o número <strong>#{order.id}</strong> para consultar depois.</p>{order.items.map(item => <div className="order-line" key={item.productId}><span>{item.quantity}× {item.name}</span><strong>{money(item.subTotal ?? item.price * item.quantity)}</strong></div>)}<div className="order-total"><span>Total do pedido</span><strong>{money(order.total)}</strong></div><p className="form-help">Pedido registrado na loja. Nenhum pagamento é processado neste site.</p><button className="button primary full" onClick={() => open(null)}>Continuar explorando <ArrowRight size={18} /></button></div>}
        {panel === "about" && <div className="about-content"><span className="about-symbol">n↗</span><p>A Natan Commerce nasceu para conectar pessoas às possibilidades da tecnologia, com uma experiência simples, bonita e acessível.</p><p>Este é um projeto de portfólio de <strong>Natanael Pereira</strong>. Você pode explorar produtos, montar seu carrinho e, quando conectado à loja, entrar com uma conta existente e registrar pedidos.</p><p>Não há cobrança, processamento de pagamentos ou serviço de entrega nesta experiência.</p><button className="button primary full" onClick={() => { open(null); browse(); }}>Vamos explorar <ArrowUpRight size={18} /></button></div>}
      </div>
      {panel && <CartToast message={toast} onClose={() => setToast("")} />}
    </dialog>
  </>;
}

function CartToast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className={`toast ${message ? "visible" : ""}`} role="status" aria-live="polite">{message && <><CheckCircle2 size={19} />{message}<button aria-label="Fechar aviso" onClick={onClose}><X size={16} /></button></>}</div>;
}
