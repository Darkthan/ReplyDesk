import { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminClient';
import ServerForm from '../../components/ServerForm';

interface TestResult {
  imap: { host: string; port: number; ok: boolean; error?: string };
  smtp: { host: string; port: number; ok: boolean; error?: string };
}

export default function ServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const load = async () => {
    try {
      const data = await adminApi.getServers();
      setServers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (data: any) => {
    await adminApi.createServer(data);
    setShowForm(false);
    await load();
  };

  const handleUpdate = async (data: any) => {
    await adminApi.updateServer(editingServer.id, data);
    setEditingServer(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce serveur ? Les utilisateurs associés seront aussi supprimés.')) return;
    await adminApi.deleteServer(id);
    await load();
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResults(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const result = await adminApi.testServer(id);
      setTestResults(prev => ({ ...prev, [id]: result }));
    } catch {
      setTestResults(prev => ({
        ...prev,
        [id]: {
          imap: { host: '', port: 0, ok: false, error: 'Erreur lors du test' },
          smtp: { host: '', port: 0, ok: false, error: 'Erreur lors du test' },
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Serveurs mail</h2>
        <button
          onClick={() => { setShowForm(true); setEditingServer(null); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
        >
          Ajouter un serveur
        </button>
      </div>

      {(showForm || editingServer) && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-3">{editingServer ? 'Modifier le serveur' : 'Nouveau serveur'}</h3>
          <ServerForm
            initial={editingServer}
            onSubmit={editingServer ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingServer(null); }}
          />
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domaine</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IMAP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SMTP</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {servers.map((s) => {
              const result = testResults[s.id];
              return (
                <>
                  <tr key={s.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.domain}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.display_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.imap_host}:{s.imap_port}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{s.smtp_host}:{s.smtp_port}</div>
                      {s.smtp_user && <div className="text-xs text-gray-400">{s.smtp_user}</div>}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleTest(s.id)}
                        disabled={testingId === s.id}
                        className="text-green-600 hover:text-green-900 text-sm disabled:opacity-50"
                      >
                        {testingId === s.id ? 'Test...' : 'Tester'}
                      </button>
                      <button onClick={() => setEditingServer(s)} className="text-indigo-600 hover:text-indigo-900 text-sm">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900 text-sm">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                  {result && (
                    <tr key={`${s.id}-test`} className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-3">
                        <div className="flex gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${result.imap.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="font-medium text-gray-700">IMAP</span>
                            {result.imap.ok
                              ? <span className="text-green-700">Accessible ({result.imap.host}:{result.imap.port})</span>
                              : <span className="text-red-700">{result.imap.error || 'Inaccessible'}</span>
                            }
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${result.smtp.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="font-medium text-gray-700">SMTP</span>
                            {result.smtp.ok
                              ? <span className="text-green-700">Authentification OK ({result.smtp.host}:{result.smtp.port})</span>
                              : <span className="text-red-700">{result.smtp.error || 'Échec'}</span>
                            }
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {servers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Aucun serveur configuré</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
