const BASE_URL = '/api';

async function request<T>(path: string, options: RequestInit = {}, noRedirect = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Envoie les cookies HttpOnly automatiquement
  });

  if (res.status === 401) {
    if (!noRedirect && !window.location.pathname.startsWith('/admin')) {
      window.location.href = '/login';
    }
    throw new Error('Non authentifié');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Erreur serveur');
  }

  return data;
}

export const api = {
  // Auth
  login: (email: string, imapPassword: string, server_id?: string) =>
    request<{ user: { id: string; email: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, imapPassword, server_id }),
    }),

  register: (email: string, imapPassword: string, server_id?: string) =>
    request<{ user: { id: string; email: string; role: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, imapPassword, server_id }),
    }),

  logout: () =>
    request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  getPublicServers: () =>
    request<{ id: string; display_name: string; domain: string }[]>('/servers'),

  me: () =>
    request<{ id: string; email: string; role: string; mail_server_id: string; is_active: boolean }>('/auth/me', {}, true),

  // Servers (admin)
  getServers: () => request<any[]>('/admin/servers'),
  createServer: (data: any) =>
    request<any>('/admin/servers', { method: 'POST', body: JSON.stringify(data) }),
  updateServer: (id: string, data: any) =>
    request<any>(`/admin/servers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteServer: (id: string) =>
    request<void>(`/admin/servers/${id}`, { method: 'DELETE' }),

  // Closures admin (pour s'abonner)
  getClosures: () => request<any[]>('/closures'),

  // Mes périodes personnelles
  getMineClosures: () => request<any[]>('/closures/mine'),
  createMyClosure: (data: any) =>
    request<any>('/closures/mine', { method: 'POST', body: JSON.stringify(data) }),
  updateMyClosure: (id: string, data: any) =>
    request<any>(`/closures/mine/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMyClosure: (id: string) =>
    request<void>(`/closures/mine/${id}`, { method: 'DELETE' }),
  createClosure: (data: any) =>
    request<any>('/admin/closures', { method: 'POST', body: JSON.stringify(data) }),
  updateClosure: (id: string, data: any) =>
    request<any>(`/admin/closures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClosure: (id: string) =>
    request<void>(`/admin/closures/${id}`, { method: 'DELETE' }),

  // Users (admin)
  getUsers: () => request<any[]>('/admin/users'),
  updateUser: (id: string, data: any) =>
    request<any>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request<void>(`/admin/users/${id}`, { method: 'DELETE' }),

  // Subscriptions
  getSubscriptions: () => request<any[]>('/subscriptions'),
  createSubscription: (data: any) =>
    request<any>('/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  updateSubscription: (id: string, data: any) =>
    request<any>(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubscription: (id: string) =>
    request<void>(`/subscriptions/${id}`, { method: 'DELETE' }),
};
