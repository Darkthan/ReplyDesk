import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { appName, logoUrl } = useAppSettings();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                {logoUrl && <img src={logoUrl} alt={appName} className="w-7 h-7 object-contain" />}
                <span className="text-xl font-bold text-indigo-600">{appName}</span>
              </Link>
              <Link to="/" className="text-gray-700 hover:text-indigo-600">
                Tableau de bord
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-gray-700 hover:text-indigo-600">
                  Administration
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
