# Natan Commerce

Loja de tecnologia em Next.js (App Router), React e TypeScript. Esta pasta é independente do projeto Java: pode ser movida ou publicada em outro repositório com todos os seus arquivos, incluindo os arquivos que começam com ponto.

## Rodar localmente

Requer Node.js 22 ou superior e npm.

```bash
npm ci
npm run dev
```

Abra http://localhost:3000. Nesta cópia local, `.env.local` já aponta para o Railway informado pelo proprietário. Esse arquivo é ignorado pelo Git; ao mover/publicar o projeto, configure as variáveis novamente.

Para entrar na cópia de demonstração conectada ao banco de exemplo, use uma destas contas compartilhadas:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Cliente | `maria@gmail.com` | `123456` |
| Administrador | `alex@gmail.com` | `123456` |

Essas contas também aparecem no dataset de exemplo do back. Na loja pública qualquer pessoa pode tentar entrar com elas; a conta de administrador pode alterar e excluir produtos. Use-as somente para demonstrar este portfólio com dados de exemplo. Não reutilize a senha em outras contas e não associe dados pessoais ou uma base privada a essas credenciais.

Sem `BACKEND_URL`, a loja exibe um catálogo ilustrativo explicitamente marcado como demonstração. Carrinho, busca, coleções, ordenação e detalhes funcionam; login e pedidos reais ficam desativados.

## Conectar ao DSCommerce no Railway

Copie `.env.example` para `.env.local` e configure:

```dotenv
BACKEND_URL=
OAUTH_CLIENT_ID=myclientid
OAUTH_CLIENT_SECRET=myclientsecret
```

Preencha `BACKEND_URL` com a URL HTTPS atual do seu serviço no Railway, somente em `.env.local` ou nas variáveis de ambiente da Netlify. Os valores OAuth precisam corresponder às variáveis `CLIENT_ID` e `CLIENT_SECRET` do Spring. Os valores OAuth acima são os padrões de desenvolvimento do projeto; se foram alterados no Railway, use os valores configurados lá. Reinicie o servidor Next.js depois de editar variáveis.

Não coloque credenciais do PostgreSQL no front. Não use prefixo `NEXT_PUBLIC_` nas variáveis acima nem versione `.env.local`.

### Comunicação

Navegador → rotas `/api` do Next.js → Spring no Railway → PostgreSQL.

O Next.js envia o segredo OAuth apenas pelo servidor, mantém o token em cookie HttpOnly (Secure em produção, SameSite=Lax) e encaminha o Bearer token nas chamadas autenticadas. Login, logout e criação de pedido verificam a origem da requisição. O navegador não chama o Spring diretamente neste projeto; portanto, esse fluxo não depende de CORS entre o navegador e o Railway. A configuração de CORS do back continua útil para outros clientes que chamem a API diretamente.

Endpoints utilizados:

| Spring | Uso |
| --- | --- |
| `GET /products?name=&page=&size=8&sort=` | Busca, ordenação e paginação |
| `GET /products/{id}` | Detalhes |
| `POST /oauth2/token` | Login com o grant password existente no back |
| `GET /users/me` | Conta autenticada |
| `POST /orders` | Registrar pedido com `productId` e `quantity` |
| `GET /orders?status=&page=&size=10` | Listar e filtrar pedidos para administrador (requer publicar a nova rota no back) |
| `GET /orders/{id}` | Consultar pedido autorizado pelo back |
| `POST/PUT/DELETE /products[/{id}]` | CRUD de produtos para administrador |
| `GET /categories` | Categorias do formulário de produtos |

O total do pedido é calculado pelo back; preços no carrinho são uma estimativa. Se a API real ficar indisponível, a loja mostra um erro, sem substituir os dados por produtos demonstrativos. Carrinhos de demonstração e de integração ficam separados no armazenamento local.

As coleções usam a busca textual disponível no endpoint do projeto. No catálogo real, “Notebooks” busca “Macbook”, “Áudio” busca “Head”, “Periféricos” busca “Mouse”, “Monitores” busca “Monitor” e “PC Gamer” busca “PC Gamer”. Para filtros reais por categoria, será necessário estender o endpoint do back. Adapte esses atalhos ao seu catálogo em `src/components/storefront.tsx`.

## Funcionalidades e limites

- Interface responsiva, navegação por teclado, modais com foco contido e Escape, feedback de carregamento/erro e imagens alternativas.
- Catálogo, busca, ordenação, paginação, detalhes, carrinho persistente e ajuste de quantidades.
- Login, consulta da conta, logout, criação e consulta de pedidos por número.
- Painel em `/admin`, exclusivo para quem tem `ROLE_ADMIN`: busca e pagina produtos, cria, edita e exclui produtos, e lista pedidos com filtro de status, itens e totais.
- Exclusões de produto referenciado por pedido são recusadas. O pagamento aparece com os dados persistidos pelo back. O painel não altera status nem cria pagamentos.
- O back não oferece cadastro público, recuperação de senha, listagem de pedidos por usuário, frete nem pagamento. Não há botões simulando esses recursos.
- Nenhum pagamento ou entrega é realizado. Pedidos criados ficam com o status retornado pelo Spring, normalmente `WAITING_PAYMENT`.
- O back gera novas chaves JWT ao reiniciar; após um deploy pode ser necessário entrar novamente.

## Publicar na Netlify

1. Mova esta pasta para seu novo repositório, mantendo `package-lock.json`, `.env.example`, `.github/workflows/ci.yml` e `netlify.toml`. Se publicar o back e o front juntos, mantenha-a em `front end/` na raiz.
2. Conecte o repositório na Netlify. Para um repositório só do front, use a raiz como **Base directory**. Se o front permanecer dentro do repositório Java, defina **Base directory** como `front end`.
3. Build: `npm run build`. Publish directory: `.next`. O adaptador Next.js é detectado automaticamente.
4. Configure `BACKEND_URL`, `OAUTH_CLIENT_ID` e `OAUTH_CLIENT_SECRET` nas variáveis de ambiente da Netlify, disponíveis no build e nas Functions/runtime.
5. Publique e escolha `natan-commerce` como nome, se disponível.

Se a Netlify informar `Secret env var "BACKEND_URL"'s value detected`, confira se a URL real foi copiada para arquivos versionados como `.env.example` ou este README. Mantenha o valor apenas nas variáveis de ambiente, envie a correção ao repositório e faça um novo deploy. A verificação de segredos pode permanecer ativa.

É necessário hospedar com suporte ao servidor Next.js (as rotas `/api` não funcionam em exportação estática). Consulte a [documentação oficial da Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

Não foi realizado deploy nem criada uma conta/site na Netlify nesta entrega.

## Validação

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Os testes Playwright usam Chrome instalado e iniciam dois servidores Next.js locais (portas 3100/3101) e um back de teste isolado (3901). Cobrem o catálogo demonstrativo e integrado, busca, ordenação, paginação, mobile, imagens de fallback, carrinho persistente, login com sucesso/erro, cookies protegidos, pedido, consulta, logout, autorização de admin e cliente, CRUD completo com validação de categoria e preço, exclusão protegida por vínculo, lista de pedidos, filtros de status e detalhes de pagamento. Os cenários não usam nem alteram o banco do Railway. O build deve ser executado antes da suíte.

O navegador Google Chrome estável deve estar instalado localmente. Para instalar a cópia gerenciada pelo Playwright em Linux/CI, rode `npx playwright install --with-deps chrome`.

O painel de produtos funciona com as rotas CRUD e de categorias já existentes. Para habilitar a lista de pedidos, publique no Railway a alteração no `OrderController`, `OrderService` e `OrderRepository` deste repositório e confirme que o deploy terminou antes de publicar ou abrir a versão atualizada do front. O painel apresentará uma mensagem explicativa enquanto essa rota ainda não existir na API.

## Organização

- `src/components/storefront.tsx`: interface e interações.
- `src/app/globals.css`: identidade visual e responsividade.
- `src/app/api/`: integração pelo servidor Next.js.
- `src/lib/demo.ts`: catálogo ilustrativo.
- `public/products/`: ilustrações SVG locais, criadas para a loja.
- `.github/workflows/ci.yml`: build do Next.js e testes Playwright em pushes e pull requests.

Fontes DM Sans e Manrope são servidas pelo próprio projeto, via Fontsource. As ilustrações da vitrine também são locais.
