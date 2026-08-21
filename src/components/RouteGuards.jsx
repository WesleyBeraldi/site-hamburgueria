import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useApp } from '../context/appContext';

export function RequireAdmin() {
  const { adminSessao, sessaoAdminCarregando } = useApp();
  const location = useLocation();

  if (sessaoAdminCarregando) return null;

  if (!adminSessao) {
    return <Navigate to="/admin/login" replace state={{ origem: location.pathname }} />;
  }

  return <Outlet />;
}

export function RequireGarcom() {
  const { garcomSessao } = useApp();

  if (!garcomSessao) {
    return <Navigate to="/garcom/acesso" replace />;
  }

  return <Outlet />;
}
