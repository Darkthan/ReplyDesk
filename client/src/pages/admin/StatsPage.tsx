import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminApi } from '../../api/adminClient';

type TimeRange = 7 | 14 | 30 | 90;

interface DayPoint {
  day: string;
  count: number;
}

interface HourPoint {
  hour: number;
  label: string;
  count: number;
}

interface TopUser {
  id: string;
  email: string;
  count: number;
}

interface User {
  id: string;
  email: string;
}

function fillHours(data: { hour: number; count: number }[]): HourPoint[] {
  const map = new Map(data.map((d) => [d.hour, d.count]));
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, '0')}h`,
    count: map.get(h) ?? 0,
  }));
}

function formatDayLabel(day: string, range: TimeRange): string {
  // Pour les longues périodes, n'afficher que jour/mois
  const date = new Date(day);
  if (range <= 14) {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function StatsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [dailyData, setDailyData] = useState<DayPoint[]>([]);
  const [hourlyData, setHourlyData] = useState<HourPoint[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getStatsUsers()
      .then((data: User[]) => setUsers(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  const loadChartData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        days: timeRange,
        user_id: selectedUserId || undefined,
      };
      const [daily, hourly, top] = await Promise.all([
        adminApi.getRepliesPerDay(params),
        adminApi.getRepliesPerHour(params),
        adminApi.getTopUsers({ days: timeRange }),
      ]);
      setDailyData(daily);
      setHourlyData(fillHours(hourly));
      setTopUsers(top);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedUserId]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const totalReplies = dailyData.reduce((sum, d) => sum + d.count, 0);

  const formattedDailyData = dailyData.map((d) => ({
    ...d,
    label: formatDayLabel(d.day, timeRange),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Statistiques des réponses automatiques
      </h1>

      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value) as TimeRange)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={7}>7 derniers jours</option>
            <option value={14}>14 derniers jours</option>
            <option value={30}>30 derniers jours</option>
            <option value={90}>90 derniers jours</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filtrer par utilisateur
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px]"
          >
            <option value="">Tous les utilisateurs</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Carte total */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Total sur la période</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{loading ? '–' : totalReplies}</p>
          <p className="text-sm text-gray-400 mt-1">réponses automatiques envoyées</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Moyenne par jour</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">
            {loading || dailyData.length === 0
              ? '–'
              : (totalReplies / timeRange).toFixed(1)}
          </p>
          <p className="text-sm text-gray-400 mt-1">réponses / jour</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-sm text-gray-500">Pic horaire</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">
            {loading || hourlyData.length === 0
              ? '–'
              : (() => {
                  const peak = [...hourlyData].sort((a, b) => b.count - a.count)[0];
                  return peak.count > 0 ? peak.label : '–';
                })()}
          </p>
          <p className="text-sm text-gray-400 mt-1">heure la plus active</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Graphique par jour */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Réponses envoyées par jour
            </h2>
            {dailyData.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Aucune donnée sur cette période</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={formattedDailyData}
                  margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    interval={timeRange > 30 ? 6 : timeRange > 14 ? 3 : 0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [value, 'Réponses']}
                    labelFormatter={(label) => `Jour : ${label}`}
                  />
                  <Bar
                    dataKey="count"
                    name="Réponses"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Graphique par heure de la journée */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Distribution par heure de la journée
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Répartition horaire sur les {timeRange} derniers jours
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={hourlyData}
                margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [value, 'Réponses']}
                  labelFormatter={(label) => `Heure : ${label}`}
                />
                <Bar
                  dataKey="count"
                  name="Réponses"
                  fill="#818cf8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top utilisateurs (masqué si filtre actif) */}
          {!selectedUserId && topUsers.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Top utilisateurs sur la période
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Réponses
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topUsers.map((u, i) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500">{i + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{u.email}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-indigo-600">
                          {u.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
