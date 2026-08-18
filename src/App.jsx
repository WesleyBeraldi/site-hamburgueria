import { Routes, Route } from 'react-router-dom';

import Home from './pages/home';

import FinalizarPedidos from './pages/telas/finalizarPedido';
import PedidoFinalizado from './pages/telas/pedidoFinalizado';

import LoginAdmin from './pages/admin/login';
import DashboardAdmin from './pages/admin/dashboard';
import PedidosAdmin from './pages/admin/pedidos';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/finalizar-pedido" element={<FinalizarPedidos />} />
      <Route path="/pedidoFinalizado" element={<PedidoFinalizado />} />
      <Route path="/admin/login" element={<LoginAdmin />} />
      <Route path="/admin/dashboard"element={<DashboardAdmin />}/>
      <Route path="/admin/pedidos"element={<PedidosAdmin />}/>
    </Routes>
  );
}

export default App;