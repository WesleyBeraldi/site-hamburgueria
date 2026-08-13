import { Routes, Route } from 'react-router-dom';

import Home from './pages/home';
import FinalizarPedidos from './pages/telas/finalizarPedido';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/finalizar-pedido" element={<FinalizarPedidos />} />
    </Routes>
  );
}

export default App;