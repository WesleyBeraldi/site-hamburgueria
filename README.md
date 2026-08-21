# Sistema da Hamburgueria

Aplicação responsiva com cliente, painel administrativo e módulo do garçom. O projeto usa React no frontend e uma API Node.js com SQLite no backend.

## O que já usa o backend

- Login administrativo com senha protegida por `scrypt` e sessões de duração limitada.
- Produtos, categorias e adicionais salvos no SQLite.
- Vínculo dos adicionais permitidos em cada produto.
- Upload de fotos WebP/JPG/PNG para o servidor.
- Mesmo cardápio compartilhado pelo cliente, administrador e garçom.
- Operações administrativas protegidas por token.
- Pedidos delivery, itens e adicionais salvos no SQLite.
- Preços, pedido mínimo, taxa de entrega e total calculados pelo servidor.
- Acompanhamento do pedido pelo cliente com token individual.
- Atualização de status no painel administrativo.
- Configurações da loja compartilhadas pelo backend.

Promoções, funcionários, mesas e comandas ainda usam o `localStorage`. Eles serão migrados nas próximas etapas sem alterar o desenho das telas.

## Requisitos

- Node.js 22.13 ou superior, necessário para o SQLite nativo.
- npm.

## Executar localmente

Instale as dependências já declaradas no projeto:

```bash
npm install
```

Crie a configuração local no PowerShell:

```powershell
Copy-Item .env.example .env
```

Abra o arquivo `.env` e defina uma senha em `ADMIN_PASSWORD`. Depois execute:

```bash
npm run dev
```

Esse comando inicia a API e o site juntos. O terminal mostrará o endereço do frontend, normalmente `http://localhost:5173`.

Sem um arquivo `.env`, o ambiente de desenvolvimento usa temporariamente:

- Usuário: `admin`
- Senha: `admin123`

Nunca use essa senha em produção.

## Banco e imagens

- Banco local: `server/data/hamburgueria.sqlite`
- Fotos enviadas: `server/uploads/`
- Configurações disponíveis: `.env.example`

Esses dados não entram no Git. Para que fotos e alterações apareçam para todos os clientes, o backend deve ser hospedado e todos devem acessar a mesma instalação do sistema.

## Comandos

```bash
npm run dev       # frontend e backend
npm run dev:web   # somente frontend
npm run dev:api   # somente backend
npm run lint      # análise do código
npm test          # testes de integração da API
npm run build     # gera o frontend de produção
npm start         # serve API, uploads e frontend já compilado
```

Em produção, defina `NODE_ENV=production` e `ADMIN_PASSWORD`. O servidor recusa iniciar em produção sem a senha administrativa.

## Rotas principais da API

- `GET /api/saude`
- `GET /api/catalogo`
- `POST /api/pedidos`
- `GET /api/pedidos/:codigo/acompanhamento?token=...`
- `POST /api/admin/login`
- `GET|DELETE /api/admin/sessao`
- `GET /api/admin/pedidos`
- `GET /api/admin/pedidos/:codigo`
- `PATCH /api/admin/pedidos/:codigo/status`
- `PUT /api/admin/configuracao`
- `POST /api/admin/produtos`
- `PUT|DELETE /api/admin/produtos/:id`
- `PATCH /api/admin/produtos/:id/status`
- `POST /api/admin/adicionais`
- `PUT|DELETE /api/admin/adicionais/:id`
- `PATCH /api/admin/adicionais/:id/status`

## Acessos da demonstração

- Cliente: `/`
- Administrador: `/admin/login`
- Garçom Carlos: `/garcom/acesso/carlos-7f3a9d2c` — PIN `1234`
- Garçom Ana: `/garcom/acesso/ana-4b8e1c6f` — PIN `5678`

O QR Code do garçom guarda apenas o token de acesso. O PIN é informado separadamente.
