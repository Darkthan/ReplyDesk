import { useState } from 'react';

interface ServerFormProps {
  initial?: {
    domain: string;
    display_name: string;
    imap_host: string;
    imap_port: number;
    imap_secure: 'ssl' | 'starttls' | 'none';
    smtp_host: string;
    smtp_port: number;
    smtp_secure: 'ssl' | 'starttls' | 'none';
    smtp_user: string;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function ServerForm({ initial, onSubmit, onCancel }: ServerFormProps) {
  const [form, setForm] = useState({
    domain: initial?.domain || '',
    display_name: initial?.display_name || '',
    imap_host: initial?.imap_host || '',
    imap_port: initial?.imap_port || 993,
    imap_secure: initial?.imap_secure ?? 'ssl',
    smtp_host: initial?.smtp_host || '',
    smtp_port: initial?.smtp_port || 587,
    smtp_secure: initial?.smtp_secure ?? 'none',
    smtp_user: initial?.smtp_user || '',
    smtp_password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = !!initial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // En édition, n'envoyer smtp_password que s'il est renseigné
      const payload: any = { ...form };
      if (isEdit && !payload.smtp_password) {
        delete payload.smtp_password;
      }
      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      {/* Identité du serveur */}
      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Identité</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Domaine</label>
            <input
              type="text"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder="example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom d'affichage</label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder="Serveur Example"
              required
            />
          </div>
        </div>
      </div>

      {/* Configuration IMAP */}
      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">IMAP (lecture des emails entrants)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Hôte IMAP</label>
            <input
              type="text"
              value={form.imap_host}
              onChange={(e) => setForm({ ...form, imap_host: e.target.value })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder="imap.example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Port IMAP</label>
            <input
              type="number"
              value={form.imap_port}
              onChange={(e) => setForm({ ...form, imap_port: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Sécurité de connexion IMAP</label>
            <select
              value={form.imap_secure}
              onChange={(e) => setForm({ ...form, imap_secure: e.target.value as 'ssl' | 'starttls' | 'none' })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            >
              <option value="ssl">SSL/TLS (port 993)</option>
              <option value="starttls">STARTTLS (port 143)</option>
              <option value="none">Aucun chiffrement (non recommandé)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Configuration SMTP */}
      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">SMTP (envoi des auto-réponses)</h4>
        <p className="text-xs text-gray-400 mb-3">
          Ce compte envoie les emails au nom de chaque utilisateur. Le champ <em>De</em> affiché sera l'adresse de l'utilisateur.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Hôte SMTP</label>
            <input
              type="text"
              value={form.smtp_host}
              onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder="smtp.example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Port SMTP</label>
            <input
              type="number"
              value={form.smtp_port}
              onChange={(e) => setForm({ ...form, smtp_port: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Compte SMTP (login)</label>
            <input
              type="text"
              value={form.smtp_user}
              onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder="noreply@example.com"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mot de passe SMTP
              {isEdit && <span className="ml-1 text-gray-400 font-normal">(laisser vide pour conserver)</span>}
            </label>
            <input
              type="password"
              value={form.smtp_password}
              onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder={isEdit ? '••••••••' : 'Mot de passe'}
              autoComplete="new-password"
              required={!isEdit}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Sécurité de connexion SMTP</label>
            <select
              value={form.smtp_secure}
              onChange={(e) => setForm({ ...form, smtp_secure: e.target.value as 'ssl' | 'starttls' | 'none' })}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            >
              <option value="ssl">SSL/TLS (port 465)</option>
              <option value="starttls">STARTTLS (port 587)</option>
              <option value="none">Aucun chiffrement (non recommandé)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50">
          Annuler
        </button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
