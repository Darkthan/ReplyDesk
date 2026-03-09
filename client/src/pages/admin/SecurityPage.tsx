import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/adminClient';

type Tab = 'settings' | 'locks' | 'ip-rules' | 'logs';

interface LockedAccount {
  key: string;
  type: 'user' | 'admin';
  identifier: string;
  lockedUntil: number;
  remainingMs: number;
}
type IpType = 'whitelist' | 'blacklist';

interface SecuritySettings {
  max_attempts: number;
  lockout_duration_minutes: number;
}

interface IpRule {
  id: string;
  ip: string;
  type: IpType;
  note: string | null;
  created_at: string;
}

interface ConnectionLog {
  id: string;
  identifier: string | null;
  ip: string | null;
  login_type: 'user' | 'admin';
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

interface LogsResponse {
  logs: ConnectionLog[];
  total: number;
  pages: number;
}

const LOGS_PER_PAGE = 50;

export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>('settings');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Sécurité</h1>

      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-6">
        {([
          { key: 'settings', label: 'Paramètres' },
          { key: 'locks', label: 'Comptes verrouillés' },
          { key: 'ip-rules', label: 'Règles IP' },
          { key: 'logs', label: 'Journaux de connexion' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'settings' && <SettingsTab />}
      {tab === 'locks' && <LocksTab />}
      {tab === 'ip-rules' && <IpRulesTab />}
      {tab === 'logs' && <LogsTab />}
    </div>
  );
}

// ── Onglet Paramètres ──────────────────────────────────────────────────────────

function SettingsTab() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [form, setForm] = useState({ max_attempts: 5, lockout_duration_minutes: 15 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getSecuritySettings().then((s: SecuritySettings) => {
      setSettings(s);
      setForm({ max_attempts: s.max_attempts, lockout_duration_minutes: s.lockout_duration_minutes });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await adminApi.updateSecuritySettings(form);
      setSettings(updated);
      setMessage('Paramètres enregistrés.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="text-gray-500">Chargement...</div>;

  return (
    <div className="max-w-md space-y-6">
      {message && <div className="bg-green-50 text-green-700 p-3 rounded text-sm">{message}</div>}
      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tentatives max avant verrouillage
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={form.max_attempts}
          onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) || 1 })}
          className="block w-32 rounded border-gray-300 border p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-400">Minimum recommandé : 3. Valeur actuelle en base : {settings.max_attempts}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Durée de verrouillage (minutes)
        </label>
        <input
          type="number"
          min={1}
          max={1440}
          value={form.lockout_duration_minutes}
          onChange={(e) => setForm({ ...form, lockout_duration_minutes: parseInt(e.target.value) || 1 })}
          className="block w-32 rounded border-gray-300 border p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-400">Valeur actuelle : {settings.lockout_duration_minutes} min</p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  );
}

// ── Onglet Comptes verrouillés ────────────────────────────────────────────────

function LocksTab() {
  const [locks, setLocks] = useState<LockedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [unlockingAll, setUnlockingAll] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getLockedAccounts().then((data: LockedAccount[]) => setLocks(data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnlock = async (key: string) => {
    setUnlocking(key);
    try {
      await adminApi.unlockAccount(key);
      load();
    } finally {
      setUnlocking(null);
    }
  };

  const handleUnlockAll = async () => {
    setUnlockingAll(true);
    try {
      await adminApi.unlockAll();
      load();
    } finally {
      setUnlockingAll(false);
    }
  };

  const fmtRemaining = (ms: number) => {
    const m = Math.ceil(ms / 60_000);
    return m < 1 ? 'moins d\'1 min' : `${m} min`;
  };

  if (loading) return <div className="text-gray-500 text-sm">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {locks.length === 0
            ? 'Aucun compte verrouillé actuellement.'
            : `${locks.length} compte${locks.length > 1 ? 's' : ''} verrouillé${locks.length > 1 ? 's' : ''}`}
        </p>
        {locks.length > 0 && (
          <button
            onClick={handleUnlockAll}
            disabled={unlockingAll}
            className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
          >
            {unlockingAll ? 'Déverrouillage...' : 'Tout déverrouiller'}
          </button>
        )}
      </div>

      {locks.length > 0 && (
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Identifiant</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Temps restant</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {locks.map((lock) => (
              <tr key={lock.key} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono text-xs">{lock.identifier}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    lock.type === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {lock.type === 'admin' ? 'Admin' : 'Utilisateur'}
                  </span>
                </td>
                <td className="px-4 py-2 text-orange-600 text-xs font-medium">{fmtRemaining(lock.remainingMs)}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => handleUnlock(lock.key)}
                    disabled={unlocking === lock.key}
                    className="text-indigo-600 hover:text-indigo-800 text-xs disabled:opacity-50"
                  >
                    {unlocking === lock.key ? '...' : 'Déverrouiller'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600">↻ Actualiser</button>
    </div>
  );
}

// ── Onglet Règles IP ───────────────────────────────────────────────────────────

function IpRulesTab() {
  const [rules, setRules] = useState<IpRule[]>([]);
  const [form, setForm] = useState({ ip: '', type: 'blacklist' as IpType, note: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi.getIpRules().then(setRules);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError('');
    try {
      await adminApi.createIpRule({ ip: form.ip, type: form.type, note: form.note || undefined });
      setForm({ ip: '', type: 'blacklist', note: '' });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette règle ?')) return;
    await adminApi.deleteIpRule(id);
    load();
  };

  return (
    <div className="space-y-6">
      {/* Formulaire d'ajout */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Ajouter une règle IP</h3>
        {error && <div className="bg-red-50 text-red-600 p-2 rounded text-sm mb-3">{error}</div>}
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Adresse IP</label>
            <input
              type="text"
              value={form.ip}
              onChange={(e) => setForm({ ...form, ip: e.target.value })}
              className="block rounded border-gray-300 border p-2 text-sm w-44 focus:border-indigo-500"
              placeholder="192.168.1.1"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as IpType })}
              className="block rounded border-gray-300 border p-2 text-sm bg-white focus:border-indigo-500"
            >
              <option value="blacklist">Blacklist (bloquer)</option>
              <option value="whitelist">Whitelist (autoriser)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note (optionnel)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="block rounded border-gray-300 border p-2 text-sm w-48 focus:border-indigo-500"
              placeholder="Poste RH, attaque détectée…"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
          >
            {adding ? 'Ajout...' : 'Ajouter'}
          </button>
        </form>
      </div>

      {/* Table des règles */}
      {rules.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune règle IP configurée.</p>
      ) : (
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">IP</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Note</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Ajoutée le</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-mono">{rule.ip}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    rule.type === 'whitelist'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {rule.type === 'whitelist' ? 'Whitelist' : 'Blacklist'}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">{rule.note ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(rule.created_at).toLocaleString('fr-FR')}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Onglet Journaux ────────────────────────────────────────────────────────────

function LogsTab() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [filterSuccess, setFilterSuccess] = useState('');
  const [clearing, setClearing] = useState(false);

  const load = useCallback(() => {
    const params: any = { limit: LOGS_PER_PAGE, offset: page * LOGS_PER_PAGE };
    if (filterType) params.login_type = filterType;
    if (filterSuccess !== '') params.success = filterSuccess;
    adminApi.getConnectionLogs(params).then(setData);
  }, [page, filterType, filterSuccess]);

  useEffect(() => { load(); }, [load]);

  const handleClear = async () => {
    if (!confirm('Effacer tous les journaux de connexion ?')) return;
    setClearing(true);
    try {
      await adminApi.clearConnectionLogs();
      setPage(0);
      load();
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtres + clear */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => { setPage(0); setFilterType(e.target.value); }}
            className="rounded border-gray-300 border p-2 text-sm bg-white"
          >
            <option value="">Tous les types</option>
            <option value="user">Utilisateur</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={filterSuccess}
            onChange={(e) => { setPage(0); setFilterSuccess(e.target.value); }}
            className="rounded border-gray-300 border p-2 text-sm bg-white"
          >
            <option value="">Succès & Échecs</option>
            <option value="true">Succès uniquement</option>
            <option value="false">Échecs uniquement</option>
          </select>
        </div>
        <button
          onClick={handleClear}
          disabled={clearing}
          className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm disabled:opacity-50"
        >
          {clearing ? 'Effacement...' : 'Effacer les journaux'}
        </button>
      </div>

      {!data ? (
        <div className="text-gray-500 text-sm">Chargement...</div>
      ) : data.logs.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun journal pour ces critères.</p>
      ) : (
        <>
          <div className="text-xs text-gray-400">{data.total} entrée{data.total > 1 ? 's' : ''} au total</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Identifiant</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">IP</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Résultat</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Détail</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id} className={`border-t border-gray-100 hover:bg-gray-50 ${!log.success ? 'bg-red-50/30' : ''}`}>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{log.identifier ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{log.ip ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                        log.login_type === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.login_type === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {log.success ? (
                        <span className="text-green-600 font-medium text-xs">✓ Succès</span>
                      ) : (
                        <span className="text-red-600 font-medium text-xs">✗ Échec</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs max-w-xs truncate">
                      {log.failure_reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                ← Précédent
              </button>
              <span className="text-gray-500">
                Page {page + 1} / {data.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.pages - 1, p + 1))}
                disabled={page >= data.pages - 1}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
