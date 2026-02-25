import { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminClient';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { admin } = useAdminAuth();

  const load = async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggleRole = async (user: any) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await adminApi.updateUserRole(user.id, newRole);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await adminApi.deleteUser(id);
    await load();
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Utilisateurs</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inscrit le</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 text-sm text-gray-900">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {u.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(u.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleToggleRole(u)} className="text-indigo-600 hover:text-indigo-900 text-sm">
                    {u.role === 'admin' ? 'Retirer admin' : 'Rendre admin'}
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-900 text-sm">
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Aucun utilisateur</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
