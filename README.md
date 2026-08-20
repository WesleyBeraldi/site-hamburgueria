# Sistema da Hamburgueria

Aplicacao React responsiva com tres fluxos integrados: atendimento ao cliente, painel administrativo e modulo do garcom. Nesta versao demonstrativa, os dados ficam persistidos no `localStorage` do navegador.

## Executar localmente

```bash
npm install
npm run dev
```

Para validar uma versao de producao:

```bash
npm run lint
npm run build
```

## Acessos de demonstracao

- Cliente: `/`
- Administrador: `/admin/login`
  - Usuario: `admin`
  - Senha: `admin123`
- Garcom Carlos: `/garcom/acesso/carlos-7f3a9d2c`
  - PIN: `1234`
- Garcom Ana: `/garcom/acesso/ana-4b8e1c6f`
  - PIN: `5678`

O QR Code do garcom guarda apenas o link com o token. O PIN e informado separadamente no acesso.

## Recursos implementados

- Cardapio, promocoes, personalizacao, carrinho, checkout e acompanhamento do pedido.
- Dashboard, pedidos, produtos, promocoes, funcionarios, QR Codes, mesas, relatorios e configuracoes.
- Login protegido do administrador e sessao protegida do garcom.
- Abertura de mesa, montagem de comanda, envio para a cozinha e fechamento de conta.
- Catalogo e estados compartilhados entre os tres ambientes.

## Persistencia

A estrutura esta pronta para receber uma API. Enquanto nao existe backend, produtos, pedidos, comandas e configuracoes sao salvos localmente no navegador. Use o botao **Restaurar dados de demonstracao** em Configuracoes para limpar o estado salvo.

