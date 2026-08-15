import { Routes, Route } from 'react-router-dom';

import Home from './pages/home';

import FinalizarPedidos from './pages/telas/finalizarPedido';
import PedidoFinalizado from './pages/telas/pedidoFinalizado';

import LoginAdmin from './pages/admin/login';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/finalizar-pedido" element={<FinalizarPedidos />} />
      <Route path="/pedidoFinalizado" element={<PedidoFinalizado />} />
      <Route path="/admin/login" element={<LoginAdmin />} />
    </Routes>
  );
}

export default App;