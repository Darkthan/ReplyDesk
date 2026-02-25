import { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminClient';
import ClosureForm from '../../components/ClosureForm';

export default function ClosuresPage() {
  const [closures, setClosures] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await adminApi.getClosures();
      setClosures(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (data: any) => {
    await adminApi.createClosure(data);
    setShowForm(false);
    await load();
  };

  const handleUpdate = async (data: any) => {
    await adminApi.updateClosure(editing.id, data);
    setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette période ?')) return;
    await adminApi.deleteClosure(id);
    await load();
  };

  const handleToggle = async (closure: any) => {
    await adminApi.updateClosure(closure.id, { is_active: !closure.is_active });
    await load();
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Périodes de fermeture</h2>
        <button
          onClick={() => { setShowForm(true); setEditing(null); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
        >
          Ajouter une période
        </button>
      </div>

      {(showForm || editing) && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-3">{editing ? 'Modifier la période' : 'Nouvelle période'}</h3>
          <ClosureForm
            initial={editing}
            onSubmit={editing ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      <div className="space-y-3">
        {closures.map((c) => (
          <div key={c.id} className="bg-white shadow rounded-lg p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="font-medium text-gray-900">{c.name}</h3>
                <span className={`px-2 py-0.5 text-xs rounded-full ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-500">{formatDate(c.start_date)} - {formatDate(c.end_date)}</p>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => handleToggle(c)} className="text-sm text-gray-600 hover:text-gray-900">
                {c.is_active ? 'Désactiver' : 'Activer'}
              </button>
              <button onClick={() => setEditing(c)} className="text-sm text-indigo-600 hover:text-indigo-900">
                Modifier
              </button>
              <button onClick={() => handleDelete(c.id)} className="text-sm text-red-600 hover:text-red-900">
                Supprimer
              </button>
            </div>
          </div>
        ))}
        {closures.length === 0 && (
          <p className="text-gray-500">Aucune période de fermeture.</p>
        )}
      </div>
    </div>
  );
}
