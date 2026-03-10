import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useAppSettings } from '../context/AppSettingsContext';

interface MailServer {
  id: string;
  display_name: string;
  domain: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverId, setServerId] = useState('');
  const [servers, setServers] = useState<MailServer[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const { appName, logoUrl } = useAppSettings();
  const navigate = useNavigate();

  // Redirection si déjà connecté
  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    api.getPublicServers()
      .then(setServers)
      .catch(() => {/* silencieux, la sélection reste optionnelle */});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password, serverId || undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          {logoUrl && <img src={logoUrl} alt={appName} className="w-16 h-16 object-contain mx-auto mb-3" />}
          <h1 className="text-2xl font-bold text-indigo-600">{appName}</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion d'auto-réponse email</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {servers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Serveur mail</label>
              <select
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 bg-white"
              >
                <option value="">— Détection automatique par domaine —</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name} ({s.domain})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder="vous@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mot de passe IMAP</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder="Votre mot de passe email"
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Vos identifiants sont vérifiés directement via IMAP
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Vérification...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <Link
            to="/admin/login"
            className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
          >
            Administration
          </Link>
        </div>
      </div>
    </div>
  );
}
