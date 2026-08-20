import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    LayoutDashboard,
    ClipboardList,
    Package,
    BadgePercent,
    UtensilsCrossed,
    Users,
    BarChart3,
    Settings,
    LogOut,
    Search,
    Menu,
    X,
    ShoppingBag,
    ChefHat,
    Bike,
    Store,
    Eye,
    Pencil,
    ChevronDown,
    UserRound,
    MapPin,
    CreditCard,
    Banknote,
    Smartphone,
    Clock3,
    Phone,
    Check,
    CircleX,
    ReceiptText
} from 'lucide-react';

import styles from './index.module.css';


function PedidosAdmin() {

    const navigate = useNavigate();

    const [menuAberto, setMenuAberto] = useState(false);

    const [busca, setBusca] = useState('');

    const [filtroStatus, setFiltroStatus] = useState('Todos');

    const [filtroOrigem, setFiltroOrigem] = useState('Todos');

    const [pedidoSelecionado, setPedidoSelecionado] = useState(null);


    /* ======================================= */
    /* MENU */
    /* ======================================= */

    const menu = [
        {
            nome: 'Dashboard',
            icone: LayoutDashboard,
            rota: '/admin/dashboard'
        },
        {
            nome: 'Pedidos',
            icone: ClipboardList,
            rota: '/admin/pedidos'
        },
        {
            nome: 'Cardápio',
            icone: Package,
            rota: '/admin/cardapio'
        },
        {
            nome: 'Promoções',
            icone: BadgePercent,
            rota: '/admin/promocoes'
        },
        {
            nome: 'Mesas / Comandas',
            icone: UtensilsCrossed,
            rota: '/admin/mesas'
        },
        {
            nome: 'Funcionários',
            icone: Users,
            rota: '/admin/funcionarios'
        },
        {
            nome: 'Relatórios',
            icone: BarChart3,
            rota: '/admin/relatorios'
        },
        {
            nome: 'Configurações',
            icone: Settings,
            rota: '/admin/configuracoes'
        }
    ];


    /* ======================================= */
    /* PEDIDOS TEMPORÁRIOS */
    /* ======================================= */

    const pedidos = [
        {
            id: '#PED1028',
            cliente: 'Rafael Oliveira',
            telefone: '(11) 98765-4321',

            origem: 'Delivery',

            itensResumo: 'X-Bacon, Batata e Coca-Cola',

            itens: [
                {
                    nome: 'X-Bacon',
                    quantidade: 1,
                    preco: 34.90
                },
                {
                    nome: 'Batata com Cheddar',
                    quantidade: 1,
                    preco: 24.90
                },
                {
                    nome: 'Coca-Cola 350ml',
                    quantidade: 1,
                    preco: 7.90
                }
            ],

            pagamento: 'Cartão',

            status: 'Em preparo',

            horario: '19:32',

            total: 67.70,

            endereco: {
                rua: 'Rua das Palmeiras',
                numero: '123',
                bairro: 'Vila Madalena',
                complemento: 'Casa 2',
                referencia: 'Próximo à padaria'
            }
        },

        {
            id: '#PED1027',
            cliente: 'Juliana Santos',
            telefone: '(11) 99654-3210',

            origem: 'Mesa 07',

            itensResumo: 'Combo Duplo e Batata',

            itens: [
                {
                    nome: 'Combo Duplo',
                    quantidade: 1,
                    preco: 49.90
                },
                {
                    nome: 'Batata Frita',
                    quantidade: 1,
                    preco: 12.90
                }
            ],

            pagamento: 'Pix',

            status: 'Recebido',

            horario: '19:28',

            total: 62.80,

            garcom: 'Carlos Silva'
        },

        {
            id: '#PED1026',
            cliente: 'Marcos Lima',
            telefone: '(11) 99543-2340',

            origem: 'Delivery',

            itensResumo: 'X-Bacon e Coca-Cola',

            itens: [
                {
                    nome: 'X-Bacon',
                    quantidade: 1,
                    preco: 34.90
                },
                {
                    nome: 'Coca-Cola',
                    quantidade: 2,
                    preco: 7.90
                }
            ],

            pagamento: 'Cartão',

            status: 'Em preparo',

            horario: '19:25',

            total: 50.70,

            endereco: {
                rua: 'Rua São Paulo',
                numero: '456',
                bairro: 'Centro',
                complemento: '',
                referencia: ''
            }
        },

        {
            id: '#PED1025',
            cliente: 'Beatriz Costa',
            telefone: '(11) 99452-1010',

            origem: 'Mesa 03',

            itensResumo: 'Combo X-Bacon e Refrigerante',

            itens: [
                {
                    nome: 'Combo X-Bacon',
                    quantidade: 1,
                    preco: 53.90
                },
                {
                    nome: 'Refrigerante',
                    quantidade: 2,
                    preco: 7.90
                }
            ],

            pagamento: 'Pix',

            status: 'Pronto',

            horario: '18:58',

            total: 69.70,

            garcom: 'Lucas Santos'
        },

        {
            id: '#PED1024',
            cliente: 'Lucas Almeida',
            telefone: '(11) 99321-9876',

            origem: 'Delivery',

            itensResumo: 'X-Salada e Suco',

            itens: [
                {
                    nome: 'X-Salada',
                    quantidade: 1,
                    preco: 29.90
                },
                {
                    nome: 'Suco',
                    quantidade: 1,
                    preco: 9.90
                }
            ],

            pagamento: 'Dinheiro',

            status: 'Saiu para entrega',

            horario: '18:42',

            total: 39.80,

            endereco: {
                rua: 'Av. Brasil',
                numero: '985',
                bairro: 'Jardim América',
                complemento: '',
                referencia: 'Portão branco'
            }
        },

        {
            id: '#PED1023',
            cliente: 'Fernanda Silva',
            telefone: '(11) 98210-4567',

            origem: 'Delivery',

            itensResumo: 'X-Bacon e Batata',

            itens: [
                {
                    nome: 'X-Bacon',
                    quantidade: 1,
                    preco: 34.90
                },
                {
                    nome: 'Batata',
                    quantidade: 1,
                    preco: 12.90
                }
            ],

            pagamento: 'Cartão',

            status: 'Entregue',

            horario: '18:30',

            total: 47.80,

            endereco: {
                rua: 'Rua das Flores',
                numero: '80',
                bairro: 'Centro',
                complemento: '',
                referencia: ''
            }
        },

        {
            id: '#PED1022',
            cliente: 'Thiago Ferreira',
            telefone: '(11) 98120-8765',

            origem: 'Mesa 11',

            itensResumo: 'Combo Duplo e Refrigerante',

            itens: [
                {
                    nome: 'Combo Duplo',
                    quantidade: 1,
                    preco: 49.90
                },
                {
                    nome: 'Refrigerante',
                    quantidade: 1,
                    preco: 7.90
                }
            ],

            pagamento: 'Pix',

            status: 'Entregue na mesa',

            horario: '18:12',

            total: 57.80,

            garcom: 'Carlos Silva'
        },

        {
            id: '#PED1021',
            cliente: 'Amanda Rocha',
            telefone: '(11) 98897-5432',

            origem: 'Delivery',

            itensResumo: 'X-Salada',

            itens: [
                {
                    nome: 'X-Salada',
                    quantidade: 1,
                    preco: 29.90
                }
            ],

            pagamento: 'Pix',

            status: 'Cancelado',

            horario: '17:20',

            total: 29.90,

            endereco: {
                rua: 'Rua Paraná',
                numero: '71',
                bairro: 'Centro',
                complemento: '',
                referencia: ''
            }
        }
    ];


    /* ======================================= */
    /* FILTROS */
    /* ======================================= */

    const pedidosFiltrados = pedidos.filter((pedido) => {
        const textoBusca = busca.toLowerCase();

        const correspondeBusca =
            pedido.id.toLowerCase().includes(textoBusca) ||
            pedido.cliente.toLowerCase().includes(textoBusca) ||
            pedido.itensResumo.toLowerCase().includes(textoBusca);


        let correspondeStatus = true;

        if (filtroStatus === 'Recebidos') {
            correspondeStatus = pedido.status === 'Recebido';
        }

        if (filtroStatus === 'Em preparo') {
            correspondeStatus = pedido.status === 'Em preparo';
        }

        if (filtroStatus === 'Prontos') {
            correspondeStatus =
                pedido.status === 'Pronto' ||
                pedido.status === 'Saiu para entrega';
        }

        if (filtroStatus === 'Entregues') {
            correspondeStatus =
                pedido.status === 'Entregue' ||
                pedido.status === 'Entregue na mesa';
        }

        if (filtroStatus === 'Cancelados') {
            correspondeStatus = pedido.status === 'Cancelado';
        }


        let correspondeOrigem = true;

        if (filtroOrigem === 'Delivery') {
            correspondeOrigem = pedido.origem === 'Delivery';
        }

        if (filtroOrigem === 'Salão') {
            correspondeOrigem = pedido.origem !== 'Delivery';
        }


        return (
            correspondeBusca &&
            correspondeStatus &&
            correspondeOrigem
        );

    });


    /* ======================================= */
    /* CONTADORES */
    /* ======================================= */

    const totalPedidos = pedidos.length;

    const totalPreparo = pedidos.filter(
        pedido => pedido.status === 'Em preparo'
    ).length;

    const totalDelivery = pedidos.filter(
        pedido => pedido.origem === 'Delivery'
    ).length;

    const totalSalao = pedidos.filter(
        pedido => pedido.origem !== 'Delivery'
    ).length;


    /* ======================================= */
    /* FUNÇÕES */
    /* ======================================= */

    function navegar(rota) {

        navigate(rota);

        setMenuAberto(false);
    }


    function sair() {

        navigate('/admin/login');
    }


    function formatarPreco(valor) {

        return valor.toLocaleString(
            'pt-BR',
            {
                style: 'currency',
                currency: 'BRL'
            }
        );
    }


    function classeStatus(status) {

        if (status === 'Recebido') {
            return styles.statusRecebido;
        }

        if (status === 'Em preparo') {
            return styles.statusPreparo;
        }

        if (
            status === 'Saiu para entrega' ||
            status === 'Pronto'
        ) {
            return styles.statusCaminho;
        }

        if (
            status === 'Entregue' ||
            status === 'Entregue na mesa'
        ) {
            return styles.statusEntregue;
        }

        if (status === 'Cancelado') {
            return styles.statusCancelado;
        }

        return '';
    }


    function iconePagamento(pagamento) {

        if (pagamento === 'Pix') {
            return <Smartphone size={17} />;
        }

        if (pagamento === 'Dinheiro') {
            return <Banknote size={17} />;
        }

        return <CreditCard size={17} />;
    }


    return (

        <div className={styles.pagina}>

            {/* ====================================== */}
            {/* SIDEBAR */}
            {/* ====================================== */}

            <aside
                className={`${styles.sidebar} ${
                    menuAberto
                        ? styles.sidebarAberta
                        : ''
                }`}
            >

                <div className={styles.logoArea}>

                    <div className={styles.logoIcone}>
                        <UtensilsCrossed size={25} />
                    </div>


                    <div className={styles.logoTexto}>

                        <strong>Logo</strong>

                        <span>ADMIN</span>

                    </div>


                    <button
                        className={styles.fecharMenu}
                        onClick={() => setMenuAberto(false)}
                    >
                        <X size={21} />
                    </button>

                </div>


                <nav className={styles.menu}>

                    {menu.map((item) => {

                        const Icone = item.icone;

                        return (

                            <button
                                key={item.nome}
                                className={`${styles.itemMenu} ${
                                    item.nome === 'Pedidos'
                                        ? styles.itemAtivo
                                        : ''
                                }`}
                                onClick={() => navegar(item.rota)}
                            >

                                <Icone size={20} />

                                <span>
                                    {item.nome}
                                </span>

                            </button>

                        );

                    })}

                </nav>


                <div className={styles.sidebarRodape}>

                    <button
                        className={styles.botaoSair}
                        onClick={sair}
                    >

                        <LogOut size={19} />

                        Sair

                    </button>

                </div>

            </aside>


            {menuAberto && (

                <div
                    className={styles.overlay}
                    onClick={() => setMenuAberto(false)}
                />

            )}


            {/* ====================================== */}
            {/* CONTEÚDO */}
            {/* ====================================== */}

            <main className={styles.conteudo}>

                {/* CABEÇALHO */}

                <header className={styles.header}>

                    <div className={styles.headerEsquerda}>

                        <button
                            className={styles.botaoMenu}
                            onClick={() => setMenuAberto(true)}
                        >
                            <Menu size={21} />
                        </button>


                        <div>

                            <h1>Gerenciar pedidos</h1>

                            <p>
                                Acompanhe e gerencie os pedidos da lanchonete.
                            </p>

                        </div>

                    </div>


                    <div className={styles.usuario}>

                        <div className={styles.avatar}>
                            A
                        </div>

                        <div className={styles.usuarioTexto}>

                            <strong>Admin</strong>

                            <span>Administrador</span>

                        </div>

                        <ChevronDown size={17} />

                    </div>

                </header>


                {/* ====================================== */}
                {/* RESUMO */}
                {/* ====================================== */}

                <section className={styles.cardsResumo}>

                    <div className={styles.cardResumo}>

                        <div className={styles.iconeResumo}>
                            <ShoppingBag size={24} />
                        </div>

                        <div>

                            <span>Total de pedidos</span>

                            <strong>{totalPedidos}</strong>

                            <small>Pedidos registrados hoje</small>

                        </div>

                    </div>


                    <div className={styles.cardResumo}>

                        <div className={styles.iconeResumo}>
                            <ChefHat size={24} />
                        </div>

                        <div>

                            <span>Em preparo</span>

                            <strong>{totalPreparo}</strong>

                            <small>Aguardando finalização</small>

                        </div>

                    </div>


                    <div className={styles.cardResumo}>

                        <div className={styles.iconeResumo}>
                            <Bike size={24} />
                        </div>

                        <div>

                            <span>Delivery</span>

                            <strong>{totalDelivery}</strong>

                            <small>Pedidos para entrega</small>

                        </div>

                    </div>


                    <div className={styles.cardResumo}>

                        <div className={styles.iconeResumo}>
                            <Store size={24} />
                        </div>

                        <div>

                            <span>Salão</span>

                            <strong>{totalSalao}</strong>

                            <small>Pedidos realizados em mesas</small>

                        </div>

                    </div>

                </section>


                {/* ====================================== */}
                {/* FILTROS */}
                {/* ====================================== */}

                <section className={styles.filtros}>

                    <div className={styles.busca}>

                        <Search size={17} />

                        <input
                            type="text"
                            placeholder="Buscar pedido, cliente ou item..."
                            value={busca}
                            onChange={(event) =>
                                setBusca(event.target.value)
                            }
                        />

                    </div>


                    <div className={styles.grupoFiltros}>

                        <div className={styles.filtroOrigem}>

                            <button
                                className={
                                    filtroOrigem === 'Todos'
                                        ? styles.filtroAtivo
                                        : ''
                                }
                                onClick={() => setFiltroOrigem('Todos')}
                            >
                                Todos
                            </button>

                            <button
                                className={
                                    filtroOrigem === 'Delivery'
                                        ? styles.filtroAtivo
                                        : ''
                                }
                                onClick={() => setFiltroOrigem('Delivery')}
                            >
                                Delivery
                            </button>

                            <button
                                className={
                                    filtroOrigem === 'Salão'
                                        ? styles.filtroAtivo
                                        : ''
                                }
                                onClick={() => setFiltroOrigem('Salão')}
                            >
                                Salão
                            </button>

                        </div>


                        <div className={styles.divisorFiltro}></div>


                        <div className={styles.filtroStatus}>

                            {[
                                'Todos',
                                'Recebidos',
                                'Em preparo',
                                'Prontos',
                                'Entregues',
                                'Cancelados'
                            ].map((status) => (

                                <button
                                    key={status}
                                    className={
                                        filtroStatus === status
                                            ? styles.statusFiltroAtivo
                                            : ''
                                    }
                                    onClick={() =>
                                        setFiltroStatus(status)
                                    }
                                >
                                    {status}
                                </button>

                            ))}

                        </div>

                    </div>

                </section>


                {/* ====================================== */}
                {/* TABELA */}
                {/* ====================================== */}

                <section className={styles.cardTabela}>

                    <div className={styles.tabelaContainer}>

                        <table className={styles.tabela}>

                            <thead>

                                <tr>

                                    <th>Pedido</th>

                                    <th>Cliente</th>

                                    <th>Origem</th>

                                    <th>Itens</th>

                                    <th>Pagamento</th>

                                    <th>Status</th>

                                    <th>Horário</th>

                                    <th>Total</th>

                                    <th>Ações</th>

                                </tr>

                            </thead>


                            <tbody>

                                {pedidosFiltrados.map((pedido) => (

                                    <tr
                                        key={pedido.id}
                                        className={
                                            pedidoSelecionado?.id === pedido.id
                                                ? styles.linhaSelecionada
                                                : ''
                                        }
                                    >

                                        <td className={styles.numeroPedido}>
                                            {pedido.id}
                                        </td>


                                        <td>

                                            <div className={styles.clienteTabela}>

                                                <strong>
                                                    {pedido.cliente}
                                                </strong>

                                                <span>
                                                    {pedido.telefone}
                                                </span>

                                            </div>

                                        </td>


                                        <td>

                                            <span
                                                className={
                                                    pedido.origem === 'Delivery'
                                                        ? styles.origemDelivery
                                                        : styles.origemMesa
                                                }
                                            >
                                                {pedido.origem}
                                            </span>

                                        </td>


                                        <td>

                                            <div className={styles.itensTabela}>

                                                <strong>
                                                    {pedido.itens.length}
                                                    {' '}
                                                    {pedido.itens.length === 1
                                                        ? 'item'
                                                        : 'itens'
                                                    }
                                                </strong>

                                                <span>
                                                    {pedido.itensResumo}
                                                </span>

                                            </div>

                                        </td>


                                        <td>

                                            <div className={styles.pagamentoTabela}>

                                                {iconePagamento(pedido.pagamento)}

                                                <span>
                                                    {pedido.pagamento}
                                                </span>

                                            </div>

                                        </td>


                                        <td>

                                            <span
                                                className={`
                                                    ${styles.status}
                                                    ${classeStatus(pedido.status)}
                                                `}
                                            >
                                                {pedido.status}
                                            </span>

                                        </td>


                                        <td className={styles.horario}>

                                            <Clock3 size={14} />

                                            {pedido.horario}

                                        </td>


                                        <td className={styles.total}>
                                            {formatarPreco(pedido.total)}
                                        </td>


                                        <td>

                                            <div className={styles.acoes}>

                                                <button
                                                    title="Visualizar pedido"
                                                    onClick={() =>
                                                        setPedidoSelecionado(pedido)
                                                    }
                                                >
                                                    <Eye size={16} />
                                                </button>


                                                <button
                                                    title="Alterar pedido"
                                                    onClick={() =>
                                                        setPedidoSelecionado(pedido)
                                                    }
                                                >
                                                    <Pencil size={15} />
                                                </button>

                                            </div>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>


                        {pedidosFiltrados.length === 0 && (

                            <div className={styles.semPedidos}>

                                <ReceiptText size={35} />

                                <strong>Nenhum pedido encontrado</strong>

                                <span>
                                    Tente alterar os filtros ou a busca.
                                </span>

                            </div>

                        )}

                    </div>


                    <div className={styles.rodapeTabela}>

                        <span>
                            Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos
                        </span>

                    </div>

                </section>

            </main>


            {/* ====================================== */}
            {/* DETALHES DO PEDIDO */}
            {/* ====================================== */}

            {pedidoSelecionado && (

                <>

                    <div
                        className={styles.fundoDetalhes}
                        onClick={() => setPedidoSelecionado(null)}
                    />


                    <aside className={styles.painelDetalhes}>

                        <div className={styles.topoDetalhes}>

                            <div>

                                <span>Pedido</span>

                                <h2>
                                    {pedidoSelecionado.id}
                                </h2>

                            </div>


                            <button
                                onClick={() =>
                                    setPedidoSelecionado(null)
                                }
                            >
                                <X size={20} />
                            </button>

                        </div>


                        <div className={styles.statusDetalhe}>

                            <span
                                className={`
                                    ${styles.status}
                                    ${classeStatus(pedidoSelecionado.status)}
                                `}
                            >
                                {pedidoSelecionado.status}
                            </span>

                            <small>
                                Realizado às {pedidoSelecionado.horario}
                            </small>

                        </div>


                        {/* CLIENTE */}

                        <div className={styles.secaoDetalhes}>

                            <div className={styles.tituloSecao}>

                                <UserRound size={18} />

                                <span>Cliente</span>

                            </div>


                            <strong className={styles.valorPrincipal}>
                                {pedidoSelecionado.cliente}
                            </strong>


                            <div className={styles.telefone}>

                                <Phone size={14} />

                                {pedidoSelecionado.telefone}

                            </div>

                        </div>


                        {/* DELIVERY */}

                        {pedidoSelecionado.origem === 'Delivery' && (

                            <div className={styles.secaoDetalhes}>

                                <div className={styles.tituloSecao}>

                                    <MapPin size={18} />

                                    <span>Endereço de entrega</span>

                                </div>


                                <strong className={styles.valorPrincipal}>

                                    {pedidoSelecionado.endereco.rua},
                                    {' '}
                                    {pedidoSelecionado.endereco.numero}

                                </strong>


                                <p>
                                    {pedidoSelecionado.endereco.bairro}
                                </p>


                                {pedidoSelecionado.endereco.complemento && (

                                    <p>
                                        Complemento: {' '}
                                        {pedidoSelecionado.endereco.complemento}
                                    </p>

                                )}


                                {pedidoSelecionado.endereco.referencia && (

                                    <p>
                                        Referência: {' '}
                                        {pedidoSelecionado.endereco.referencia}
                                    </p>

                                )}

                            </div>

                        )}


                        {/* SALÃO */}

                        {pedidoSelecionado.origem !== 'Delivery' && (

                            <div className={styles.secaoDetalhes}>

                                <div className={styles.tituloSecao}>

                                    <Store size={18} />

                                    <span>Atendimento no salão</span>

                                </div>


                                <strong className={styles.valorPrincipal}>
                                    {pedidoSelecionado.origem}
                                </strong>


                                <p>
                                    Garçom: {pedidoSelecionado.garcom}
                                </p>

                            </div>

                        )}


                        {/* ITENS */}

                        <div className={styles.secaoDetalhes}>

                            <div className={styles.tituloSecao}>

                                <ShoppingBag size={18} />

                                <span>
                                    Itens do pedido ({pedidoSelecionado.itens.length})
                                </span>

                            </div>


                            <div className={styles.listaItens}>

                                {pedidoSelecionado.itens.map(
                                    (item, index) => (

                                        <div
                                            className={styles.itemDetalhe}
                                            key={`${item.nome}-${index}`}
                                        >

                                            <div className={styles.iconeProduto}>
                                                <Package size={17} />
                                            </div>


                                            <div className={styles.nomeItem}>

                                                <strong>
                                                    {item.nome}
                                                </strong>

                                                <span>
                                                    {item.quantidade}x
                                                </span>

                                            </div>


                                            <strong className={styles.precoItem}>
                                                {formatarPreco(
                                                    item.preco * item.quantidade
                                                )}
                                            </strong>

                                        </div>

                                    )
                                )}

                            </div>

                        </div>


                        {/* PAGAMENTO */}

                        <div className={styles.secaoDetalhes}>

                            <div className={styles.tituloSecao}>

                                {iconePagamento(
                                    pedidoSelecionado.pagamento
                                )}

                                <span>Pagamento</span>

                            </div>


                            <strong className={styles.valorPrincipal}>
                                {pedidoSelecionado.pagamento}
                            </strong>

                        </div>


                        {/* TOTAL */}

                        <div className={styles.totalDetalhes}>

                            <span>Total do pedido</span>

                            <strong>
                                {formatarPreco(
                                    pedidoSelecionado.total
                                )}
                            </strong>

                        </div>


                        {/* BOTÕES */}

                        <div className={styles.botoesDetalhes}>

                            {pedidoSelecionado.status === 'Recebido' && (

                                <button className={styles.aceitarPedido}>

                                    <Check size={18} />

                                    Aceitar pedido

                                </button>

                            )}


                            <button className={styles.mudarStatus}>

                                <ChefHat size={17} />

                                Mudar status

                                <ChevronDown size={17} />

                            </button>


                            <button className={styles.cancelarPedido}>

                                <CircleX size={17} />

                                Cancelar pedido

                            </button>

                        </div>

                    </aside>

                </>

            )}

        </div>
    );
}

export default PedidosAdmin;
