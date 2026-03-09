const API_URL = '/api';

export const adminApi = {
  // Helper pour les requêtes authentifiées
  async request(endpoint: string, options: RequestInit = {}, noRedirect = false) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Envoie le cookie admin_token automatiquement
    });

    if (response.status === 401) {
      if (!noRedirect) {
        window.location.href = '/admin/login';
      }
      throw new Error('Session expirée');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      throw new Error(error.error || 'Erreur serveur');
    }

    if (response.status === 204) {
      return null;
    }

    return response.json().catch(() => { throw new Error('Réponse serveur invalide'); });
  },

  // Auth
  async login(username: string, password: string) {
    const response = await fetch(`${API_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      throw new Error(error.error || 'Échec de la connexion');
    }

    return response.json().catch(() => { throw new Error('Réponse serveur invalide'); });
  },

  async logout() {
    await fetch(`${API_URL}/admin/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  async getMe() {
    return this.request('/admin/auth/me', {}, true);
  },

  // Serveurs
  async getServers() {
    return this.request('/admin/servers');
  },

  async createServer(data: any) {
    return this.request('/admin/servers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateServer(id: string, data: any) {
    return this.request(`/admin/servers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteServer(id: string) {
    return this.request(`/admin/servers/${id}`, {
      method: 'DELETE',
    });
  },

  async testServer(id: string) {
    return this.request(`/admin/servers/${id}/test`);
  },

  // Périodes de fermeture
  async getClosures() {
    return this.request('/admin/closures');
  },

  async createClosure(data: any) {
    return this.request('/admin/closures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClosure(id: string, data: any) {
    return this.request(`/admin/closures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteClosure(id: string) {
    return this.request(`/admin/closures/${id}`, {
      method: 'DELETE',
    });
  },

  // Utilisateurs
  async getUsers() {
    return this.request('/admin/users');
  },

  async updateUserRole(id: string, role: string) {
    return this.request(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async deleteUser(id: string) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Sécurité
  async getSecuritySettings() {
    return this.request('/admin/security/settings');
  },

  async updateSecuritySettings(data: { max_attempts?: number; lockout_duration_minutes?: number }) {
    return this.request('/admin/security/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getIpRules() {
    return this.request('/admin/security/ip-rules');
  },

  async createIpRule(data: { ip: string; type: 'whitelist' | 'blacklist'; note?: string }) {
    return this.request('/admin/security/ip-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteIpRule(id: string) {
    return this.request(`/admin/security/ip-rules/${id}`, { method: 'DELETE' });
  },

  async getConnectionLogs(params?: { limit?: number; offset?: number; login_type?: string; success?: string }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.login_type) qs.set('login_type', params.login_type);
    if (params?.success !== undefined) qs.set('success', params.success);
    const query = qs.toString();
    return this.request(`/admin/security/logs${query ? `?${query}` : ''}`);
  },

  async clearConnectionLogs() {
    return this.request('/admin/security/logs', { method: 'DELETE' });
  },
};
