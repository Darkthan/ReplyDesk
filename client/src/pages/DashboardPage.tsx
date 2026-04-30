import { useState, useEffect } from 'react';
import { api } from '../api/client';
import ClosureCard from '../components/ClosureCard';
import SubscriptionToggle from '../components/SubscriptionToggle';
import ClosureForm from '../components/ClosureForm';

export default function DashboardPage() {
  const [adminClosures, setAdminClosures] = useState<any[]>([]);
  const [adminHolidays, setAdminHolidays] = useState<any[]>([]);
  const [myClosures, setMyClosures] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire d'édition de mes périodes
  const [showMyForm, setShowMyForm] = useState(false);
  const [editingMyClosure, setEditingMyClosure] = useState<any>(null);

  const load = async () => {
    try {
      const [admin, holidays, mine, subs] = await Promise.all([
        api.getClosures(),
        api.getHolidays(),
        api.getMineClosures(),
        api.getSubscriptions(),
      ]);
      setAdminClosures(admin);
      setAdminHolidays(holidays);
      setMyClosures(mine);
      setSubscriptions(subs);
    } catch {
      // handled by api client
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const subscribedIds = new Set(subscriptions.map((s: any) => s.closure_period_id));

  const handleSubscribe = async (closureId: string) => {
    await api.createSubscription({ closure_period_id: closureId });
    await load();
  };

  const handleUnsubscribe = async (closureId: string) => {
    const sub = subscriptions.find((s: any) => s.closure_period_id === closureId);
    if (sub) { await api.deleteSubscription(sub.id); await load(); }
  };

  const handleSubscribeAll = async () => {
    const unsubscribed = adminHolidays.filter((h: any) => !subscribedIds.has(h.id));
    for (const h of unsubscribed) {
      await api.createSubscription({ closure_period_id: h.id });
    }
    await load();
  };

  const handleUpdateSub = async (id: string, data: any) => {
    await api.updateSubscription(id, data);
    await load();
  };

  const handleDeleteSub = async (id: string) => {
    await api.deleteSubscription(id);
    await load();
  };

  // Mes périodes personnelles
  const handleCreateMy = async (data: any) => {
    await api.createMyClosure(data);
    setShowMyForm(false);
    await load();
  };

  const handleUpdateMy = async (data: any) => {
    await api.updateMyClosure(editingMyClosure.id, data);
    setEditingMyClosure(null);
    await load();
  };

  const handleDeleteMy = async (id: string) => {
    if (!confirm('Supprimer cette période ? Les auto-réponses associées seront désactivées.')) return;
    await api.deleteMyClosure(id);
    await load();
  };

  // Abonnements aux périodes admin uniquement (pour la section souscriptions)
  const adminSubs = subscriptions.filter((s: any) =>
    adminClosures.some((c: any) => c.id === s.closure_period_id)
  );

  const subscribedHolidayCount = adminHolidays.filter((h: any) => subscribedIds.has(h.id)).length;

  if (loading) return <div className="text-center py-8">Chargement...</div>;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>

      {/* ── Mes absences personnelles ─────────────────────────────── */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Mes absences</h2>
          <button
            onClick={() => { setShowMyForm(true); setEditingMyClosure(null); }}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
          >
            + Nouvelle absence
          </button>
        </div>

        {(showMyForm || editingMyClosure) && (
          <div className="bg-gray-50 border rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-3">{editingMyClosure ? 'Modifier la période' : 'Nouvelle période d\'absence'}</h3>
            <ClosureForm
              initial={editingMyClosure}
              onSubmit={editingMyClosure ? handleUpdateMy : handleCreateMy}
              onCancel={() => { setShowMyForm(false); setEditingMyClosure(null); }}
            />
          </div>
        )}

        <div className="space-y-3">
          {myClosures.length === 0 && !showMyForm ? (
            <p className="text-gray-500 text-sm">Aucune période personnelle. Créez-en une pour activer les auto-réponses.</p>
          ) : (
            myClosures.map((c) => {
              const sub = subscriptions.find((s: any) => s.closure_period_id === c.id);
              return (
                <div key={c.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-400">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{c.name}</h3>
                        <StatusBadge start={c.start_date} end={c.end_date} active={c.is_active} />
                      </div>
                      {c.reason && <p className="text-xs text-gray-500 mt-0.5">Motif : {c.reason}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {fmt(c.start_date)} → {fmt(c.end_date)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">{c.default_message}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => { setEditingMyClosure(c); setShowMyForm(false); }} className="text-sm text-indigo-600 hover:text-indigo-800">Modifier</button>
                      <button onClick={() => handleDeleteMy(c.id)} className="text-sm text-red-600 hover:text-red-800">Supprimer</button>
                    </div>
                  </div>
                  {sub && (
                    <div className="mt-3 pt-3 border-t">
                      <SubscriptionToggle
                        subscription={{ ...sub, closure_name: c.name }}
                        onUpdate={handleUpdateSub}
                        onDelete={handleDeleteSub}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Jours fériés ─────────────────────────────────────────── */}
      {adminHolidays.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Jours fériés</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {subscribedHolidayCount}/{adminHolidays.length} abonnement(s) actif(s)
              </p>
            </div>
            {subscribedHolidayCount < adminHolidays.length && (
              <button
                onClick={handleSubscribeAll}
                className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
              >
                S'abonner à tous
              </button>
            )}
          </div>

          <div className="space-y-2">
            {adminHolidays.map((h) => {
              const sub = subscriptions.find((s: any) => s.closure_period_id === h.id);
              const isSubscribed = !!sub;
              return (
                <div key={h.id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${isSubscribed ? 'border-amber-400' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🗓️</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{h.name}</h3>
                          <StatusBadge start={h.start_date} end={h.end_date} active={h.is_active} />
                        </div>
                        <p className="text-xs text-gray-500">{fmtDay(h.start_date)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => isSubscribed ? handleUnsubscribe(h.id) : handleSubscribe(h.id)}
                      className={`text-sm px-3 py-1 rounded ${isSubscribed ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' : 'text-gray-600 bg-gray-50 hover:bg-gray-100'}`}
                    >
                      {isSubscribed ? '✓ Abonné' : 'S\'abonner'}
                    </button>
                  </div>
                  {isSubscribed && sub && (
                    <div className="mt-3 pt-3 border-t">
                      <SubscriptionToggle
                        subscription={{ ...sub, closure_name: h.name }}
                        onUpdate={handleUpdateSub}
                        onDelete={handleDeleteSub}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Périodes de l'administration ─────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Périodes de l'administration</h2>

        {adminClosures.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune période configurée par l'administration.</p>
        ) : (
          <div className="space-y-4">
            {adminClosures.map((c) => (
              <div key={c.id}>
                <ClosureCard
                  closure={c}
                  subscribed={subscribedIds.has(c.id)}
                  onSubscribe={() => handleSubscribe(c.id)}
                  onUnsubscribe={() => handleUnsubscribe(c.id)}
                />
                {subscribedIds.has(c.id) && (
                  <div className="mt-2 pl-4">
                    {adminSubs.filter((s: any) => s.closure_period_id === c.id).map((s: any) => (
                      <SubscriptionToggle
                        key={s.id}
                        subscription={s}
                        onUpdate={handleUpdateSub}
                        onDelete={handleDeleteSub}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDay(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function StatusBadge({ start, end, active }: { start: string; end: string; active: boolean }) {
  const now = new Date();
  const s = new Date(start), e = new Date(end);
  const isActive = active && now >= s && now <= e;
  const isPast = now > e;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : isPast ? 'bg-gray-100 text-gray-500' : 'bg-indigo-100 text-indigo-700'}`}>
      {isActive ? 'En cours' : isPast ? 'Terminée' : 'À venir'}
    </span>
  );
}
