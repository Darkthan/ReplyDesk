import { Link, Outlet, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/admin/servers', label: 'Serveurs mail' },
  { path: '/admin/closures', label: 'Périodes de fermeture' },
  { path: '/admin/users', label: 'Utilisateurs' },
];

export default function AdminDashboard() {
  const location = useLocation();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Administration</h1>
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`py-2 px-1 border-b-2 text-sm font-medium ${
                location.pathname === tab.path
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
