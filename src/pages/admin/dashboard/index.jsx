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
    Menu,
    Search,
    ChevronDown,
    ShoppingBag,
    ChefHat,
    Bike,
    Store,
    DollarSign,
    CircleX,
    Trophy,
    Clock3,
    TrendingUp,
    Eye,
    MoreVertical,
    ArrowRight,
    X
} from 'lucide-react';

import styles from './index.module.css';


function DashboardAdmin() {

    const navigate = useNavigate();

    const [menuAberto, setMenuAberto] = useState(false);
    const [busca, setBusca] = useState('');


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


    const pedidosRecentes = [
        {
            id: '#PED1028',
            origem: 'Delivery',
            item: 'X-Bacon + Batata',
            status: 'Em preparo',
            total: 'R$ 54,80'
        },
        {
            id: '#PED1027',
            origem: 'Mesa 07',
            item: 'Combo Duplo',
            status: 'Recebido',
            total: 'R$ 61,80'
        },
        {
            id: '#PED1026',
            origem: 'Delivery',
            item: 'X-Salada',
            status: 'Saiu para entrega',
            total: 'R$ 39,90'
        },
        {
            id: '#PED1025',
            origem: 'Mesa 03',
            item: 'Combo X-Bacon',
            status: 'Entregue',
            total: 'R$ 53,90'
        },
        {
            id: '#PED1024',
            origem: 'Delivery',
            item: 'X-Burger',
            status: 'Cancelado',
            total: 'R$ 34,90'
        }
    ];


    const produtosMaisVendidos = [
        {
            posicao: 1,
            nome: 'Combo X-Bacon',
            vendas: 38,
            valor: 'R$ 53,90'
        },
        {
            posicao: 2,
            nome: 'X-Bacon',
            vendas: 31,
            valor: 'R$ 34,90'
        },
        {
            posicao: 3,
            nome: 'Combo Duplo',
            vendas: 27,
            valor: 'R$ 61,80'
        },
        {
            posicao: 4,
            nome: 'Batata com Cheddar',
            vendas: 24,
            valor: 'R$ 24,90'
        },
        {
            posicao: 5,
            nome: 'X-Salada',
            vendas: 19,
            valor: 'R$ 29,90'
        }
    ];


    function navegar(rota) {

        navigate(rota);
        setMenuAberto(false);
    }


    function sair() {

        /*
            FUTURAMENTE:

            Aqui vamos remover token/sessão
            do administrador.
        */

        navigate('/admin/login');
    }


    function classeStatus(status) {

        if (status === 'Em preparo') {
            return styles.statusPreparo;
        }

        if (status === 'Recebido') {
            return styles.statusRecebido;
        }

        if (status === 'Saiu para entrega') {
            return styles.statusCaminho;
        }

        if (status === 'Entregue') {
            return styles.statusEntregue;
        }

        if (status === 'Cancelado') {
            return styles.statusCancelado;
        }

        return '';
    }


    return (

        <div className={styles.pagina}>

            {/* ========================= */}
            {/* SIDEBAR */}
            {/* ========================= */}

            <aside
                className={`${styles.sidebar} ${
                    menuAberto ? styles.sidebarAberta : ''
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
                        <X size={22} />
                    </button>

                </div>


                <nav className={styles.menu}>

                    {menu.map((item) => {

                        const Icone = item.icone;

                        return (

                            <button
                                key={item.nome}
                                className={`${styles.itemMenu} ${
                                    item.nome === 'Dashboard'
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

                        <span>Sair</span>

                    </button>

                </div>

            </aside>


            {/* FUNDO MOBILE */}

            {menuAberto && (

                <div
                    className={styles.overlay}
                    onClick={() => setMenuAberto(false)}
                />

            )}


            {/* ========================= */}
            {/* CONTEÚDO */}
            {/* ========================= */}

            <div className={styles.conteudo}>

                {/* ========================= */}
                {/* CABEÇALHO */}
                {/* ========================= */}

                <header className={styles.header}>

                    <button
                        className={styles.botaoMenu}
                        onClick={() => setMenuAberto(true)}
                    >
                        <Menu size={22} />
                    </button>


                    <div className={styles.tituloHeader}>

                        <h1>Dashboard ADM</h1>

                        <p>
                            Bem-vindo(a) de volta! Veja o que está acontecendo hoje.
                        </p>

                    </div>


                    <div className={styles.headerDireita}>

                        <div className={styles.busca}>

                            <Search size={18} />

                            <input
                                type="text"
                                placeholder="Buscar pedidos, produtos..."
                                value={busca}
                                onChange={(event) =>
                                    setBusca(event.target.value)
                                }
                            />

                        </div>


                        <div className={styles.usuario}>

                            <div className={styles.avatar}>
                                A
                            </div>

                            <div className={styles.usuarioTexto}>

                                <strong>Admin</strong>

                                <span>Administrador</span>

                            </div>

                            

                        </div>

                    </div>

                </header>


                {/* ========================= */}
                {/* CARDS */}
                {/* ========================= */}

                <section className={styles.cardsResumo}>

                    <div className={styles.cardResumo}>

                        <div className={styles.iconeCard}>
                            <ShoppingBag size={25} />
                        </div>

                        <div className={styles.informacaoCard}>

                            <span>Pedidos hoje</span>

                            <strong>128</strong>

                            <small>
                                <b>+12%</b> em relação a ontem
                            </small>

                        </div>

                    </div>


                    <div className={styles.cardResumo}>

                        <div className={styles.iconeCard}>
                            <DollarSign size={25} />
                        </div>

                        <div className={styles.informacaoCard}>

                            <span>Faturamento</span>

                            <strong>R$ 8.945,50</strong>

                            <small>
                                <b>+15%</b> em relação a ontem
                            </small>

                        </div>

                    </div>


                    <div className={styles.cardResumo}>

                        <div className={styles.iconeCard}>
                            <ChefHat size={25} />
                        </div>

                        <div className={styles.informacaoCard}>

                            <span>Em preparo</span>

                            <strong>42</strong>

                            <small>
                                Pedidos aguardando finalização
                            </small>

                        </div>

                    </div>


                    <div className={styles.cardResumo}>

                        <div className={styles.iconeCard}>
                            <UtensilsCrossed size={25} />
                        </div>

                        <div className={styles.informacaoCard}>

                            <span>Pedidos do salão</span>

                            <strong>36</strong>

                            <small>
                                Pedidos realizados nas mesas
                            </small>

                        </div>

                    </div>

                </section>


                {/* ========================= */}
                {/* VISÃO GERAL */}
                {/* ========================= */}

                <section className={styles.visaoGeral}>

                    <h2>Visão geral de hoje</h2>


                    <div className={styles.visaoGrid}>

                        <div className={styles.visaoColuna}>

                            <div className={styles.linhaVisao}>

                                <div className={styles.labelVisao}>

                                    <ClipboardList size={20} />

                                    <span>Total de pedidos:</span>

                                </div>

                                <strong>128</strong>

                            </div>


                            <div className={styles.linhaVisao}>

                                <div className={styles.labelVisao}>

                                    <DollarSign size={20} />

                                    <span>Faturamento do dia:</span>

                                </div>

                                <strong>R$ 8.945,50</strong>

                            </div>


                            <div className={styles.linhaVisao}>

                                <div className={styles.labelVisao}>

                                    <Store size={20} />

                                    <span>Pedidos do salão:</span>

                                </div>

                                <strong>36</strong>

                            </div>


                            <div className={styles.linhaVisao}>

                                <div className={styles.labelVisao}>

                                    <Bike size={20} />

                                    <span>Pedidos delivery:</span>

                                </div>

                                <strong>92</strong>

                            </div>

                        </div>


                        <div className={styles.visaoColuna}>

                            <div className={styles.linhaVisao}>

                                <div className={styles.labelVisao}>

                                    <CircleX size={20} />

                                    <span>Pedidos cancelados:</span>

                                </div>

                                <strong>5</strong>

                            </div>


                            <div className={styles.linhaVisao}>

                                <div className={styles.labelVisao}>

                                    <Trophy size={20} />

                                    <span>Produto mais vendido:</span>

                                </div>

                                <strong>Combo X-Bacon</strong>

                            </div>


                            <div className={styles.linhaVisao}>

                                <div className={styles.labelVisao}>

                                    <Clock3 size={20} />

                                    <span>Horário de pico:</span>

                                </div>

                                <strong>19h às 21h</strong>

                            </div>


                            <div className={styles.linhaVisao}>

                                <div className={styles.labelVisao}>

                                    <TrendingUp size={20} />

                                    <span>Desempenho da loja:</span>

                                </div>

                                <span className={styles.desempenho}>
                                    Muito bom
                                </span>

                            </div>

                        </div>

                    </div>

                </section>


                {/* ========================= */}
                {/* PARTE INFERIOR */}
                {/* ========================= */}

                <section className={styles.areaInferior}>

                    {/* PEDIDOS RECENTES */}

                    <div className={styles.cardGrande}>

                        <div className={styles.cabecalhoCard}>

                            <h2>Pedidos recentes</h2>

                            <button
                                onClick={() => navigate('/admin/pedidos')}
                            >
                                Ver todos

                                <ArrowRight size={17} />
                            </button>

                        </div>


                        <div className={styles.tabelaContainer}>

                            <table className={styles.tabela}>

                                <thead>

                                    <tr>

                                        <th>Pedido</th>
                                        <th>Origem</th>
                                        <th>Item</th>
                                        <th>Status</th>
                                        <th>Total</th>
                                        <th>Ações</th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {pedidosRecentes.map((pedido) => (

                                        <tr key={pedido.id}>

                                            <td className={styles.numeroPedido}>
                                                {pedido.id}
                                            </td>

                                            <td>
                                                {pedido.origem}
                                            </td>

                                            <td>

                                                <div className={styles.produtoPedido}>

                                                    <div className={styles.miniProduto}>
                                                        <Package size={18} />
                                                    </div>

                                                    <span>
                                                        {pedido.item}
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

                                            <td className={styles.totalPedido}>
                                                {pedido.total}
                                            </td>

                                            <td>

                                                <div className={styles.acoes}>

                                                    <button
                                                        title="Visualizar pedido"
                                                        onClick={() =>
                                                            navigate('/admin/pedidos')
                                                        }
                                                    >
                                                        <Eye size={17} />
                                                    </button>

                                                    <button title="Mais opções">
                                                        <MoreVertical size={17} />
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    </div>


                    {/* PRODUTOS MAIS VENDIDOS */}

                    <div className={styles.cardProdutos}>

                        <div className={styles.cabecalhoCard}>

                            <h2>Produtos mais vendidos</h2>

                            <button
                                onClick={() =>
                                    navigate('/admin/relatorios')
                                }
                            >
                                Ver todos

                                <ArrowRight size={17} />
                            </button>

                        </div>


                        <div className={styles.listaProdutos}>

                            {produtosMaisVendidos.map((produto) => (

                                <div
                                    key={produto.posicao}
                                    className={styles.produtoVendido}
                                >

                                    <span className={styles.posicao}>
                                        {produto.posicao}
                                    </span>


                                    <div className={styles.imagemProduto}>
                                        <Package size={21} />
                                    </div>


                                    <div className={styles.nomeProduto}>

                                        <strong>
                                            {produto.nome}
                                        </strong>

                                        <span>
                                            {produto.vendas} vendas
                                        </span>

                                    </div>


                                    <strong className={styles.precoProduto}>
                                        {produto.valor}
                                    </strong>

                                </div>

                            ))}

                        </div>

                    </div>

                </section>

            </div>

        </div>

    );
}

export default DashboardAdmin;