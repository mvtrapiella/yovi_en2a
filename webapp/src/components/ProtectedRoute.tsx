import { Navigate, useLocation } from 'react-router-dom';
import { IsLoggedIn } from '../utils/CookieRetriever';

interface Props {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const isGuest = location.state?.guest === true;

  if (!IsLoggedIn() && !isGuest) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
