import { Routes, Route } from 'react-router-dom';

import Home from './pages/home';
import TempoReal01 from './pages/telas/tempo_real';
import Cadastro from './pages/telas/cadastro';
import Login_adm from './pages/telas/login_adm';
import Home_adm from './pages/home_adm';
import Atualizar_adm from './pages/telas/atualizar_veiculo';
import Financeiro_adm from './pages/telas/financeiro';
import OS_adm from './pages/telas/ordem_servico';
import CadastroV from './pages/telas/cadastro_veiculo';
import V_orcamento from './pages/telas/V_orcamento';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tempo_real" element={<TempoReal01 />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/login_adm" element={<Login_adm />} />
      <Route path="/home_adm" element={<Home_adm />} />
      <Route path="/atualizar_veiculo" element={<Atualizar_adm />} />
      <Route path="/financeiro" element={<Financeiro_adm />} />
      <Route path="/os" element={<OS_adm />} />
      <Route path="/cadastroV" element={<CadastroV />} />
      <Route path="/v_orcamento" element={<V_orcamento />} />
    </Routes>
  );
}

export default App;