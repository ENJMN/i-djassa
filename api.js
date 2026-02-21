// ============================================================
// I-DJASSA — CLIENT API CENTRALISÉ
// Toutes les pages HTML importent ce fichier
// ============================================================

const API_URL = 'https://i-djassa-api-production.up.railway.app';

// ============================================================
// UTILITAIRES DE BASE
// ============================================================

function getToken() {
  return sessionStorage.getItem('idjassa_token');
}

function getUser() {
  try { return JSON.parse(sessionStorage.getItem('idjassa_user')); } catch { return null; }
}

function saveSession(token, user) {
  sessionStorage.setItem('idjassa_token', token);
  sessionStorage.setItem('idjassa_user', JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem('idjassa_token');
  sessionStorage.removeItem('idjassa_user');
}

function isLoggedIn() {
  return !!getToken() && !!getUser();
}

// Requête HTTP générique
async function apiRequest(method, path, body = null, requireAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const token = getToken();
    if (!token) {
      window.location.href = '/inscription.html?next=' + encodeURIComponent(window.location.pathname);
      return;
    }
    headers['Authorization'] = 'Bearer ' + token;
  }

  try {
    const res = await fetch(API_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Erreur serveur');
    }
    return data;

  } catch (err) {
    console.error(`[API] ${method} ${path} →`, err.message);
    throw err;
  }
}

// ============================================================
// AUTH
// ============================================================
const Auth = {

  // Envoyer le code OTP par SMS
  async sendOtp(telephone) {
    return apiRequest('POST', '/api/auth/send-otp', { telephone });
  },

  // Vérifier OTP — connexion ou inscription
  async verifyOtp({ telephone, code, prenom, nom }) {
    const data = await apiRequest('POST', '/api/auth/verify-otp', { telephone, code, prenom, nom });
    if (data.token) saveSession(data.token, data.user);
    return data;
  },

  // Récupérer le profil connecté
  async me() {
    return apiRequest('GET', '/api/auth/me', null, true);
  },

  logout() {
    clearSession();
    window.location.href = '/index.html';
  },

  // Rediriger si non connecté
  requireLogin() {
    if (!isLoggedIn()) {
      window.location.href = '/inscription.html?next=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  }
};

// ============================================================
// CATÉGORIES
// ============================================================
const Categories = {

  async getAll() {
    return apiRequest('GET', '/api/categories');
  }
};

// ============================================================
// ANNONCES
// ============================================================
const Annonces = {

  // Lister avec filtres
  async getAll({ cat, ville, q, min_prix, max_prix, badge, sort, page } = {}) {
    const params = new URLSearchParams();
    if (cat)      params.set('cat', cat);
    if (ville)    params.set('ville', ville);
    if (q)        params.set('q', q);
    if (min_prix) params.set('min_prix', min_prix);
    if (max_prix) params.set('max_prix', max_prix);
    if (badge)    params.set('badge', badge);
    if (sort)     params.set('sort', sort);
    if (page)     params.set('page', page);
    return apiRequest('GET', '/api/annonces?' + params.toString());
  },

  // Détail d'une annonce
  async getById(id) {
    return apiRequest('GET', '/api/annonces/' + id);
  },

  // Créer une annonce
  async create(data) {
    return apiRequest('POST', '/api/annonces', data, true);
  }
};

// ============================================================
// RENDEZ-VOUS
// ============================================================
const Rdv = {

  async getMesRdv() {
    return apiRequest('GET', '/api/rdv/mes-rdv', null, true);
  },

  async proposer({ annonce_id, date_rdv, heure_rdv, lieu, note_rdv }) {
    return apiRequest('POST', '/api/rdv', { annonce_id, date_rdv, heure_rdv, lieu, note_rdv }, true);
  },

  async confirmer(rdv_id) {
    return apiRequest('PATCH', `/api/rdv/${rdv_id}/confirmer`, {}, true);
  },

  async conclure(rdv_id, { type_eval, note, commentaire, motif, detail_motif }) {
    return apiRequest('POST', `/api/rdv/${rdv_id}/conclure`, { type_eval, note, commentaire, motif, detail_motif }, true);
  }
};

// ============================================================
// NOTIFICATIONS
// ============================================================
const Notifications = {

  async getAll() {
    return apiRequest('GET', '/api/notifications', null, true);
  },

  async markAllRead() {
    return apiRequest('PATCH', '/api/notifications/read-all', {}, true);
  }
};

// ============================================================
// ADMIN
// ============================================================
const Admin = {

  async getStats() {
    return apiRequest('GET', '/api/admin/stats', null, true);
  },

  async getCategories() {
    return apiRequest('GET', '/api/admin/categories', null, true);
  },

  async toggleCategorie(id) {
    return apiRequest('PATCH', `/api/admin/categories/${id}/toggle`, {}, true);
  },

  async getUsers({ q, badge, kyc, banned, page } = {}) {
    const params = new URLSearchParams();
    if (q)       params.set('q', q);
    if (badge)   params.set('badge', badge);
    if (kyc)     params.set('kyc', kyc);
    if (banned !== undefined) params.set('banned', banned);
    if (page)    params.set('page', page);
    return apiRequest('GET', '/api/admin/users?' + params.toString(), null, true);
  },

  async banUser(id, { ban, reason }) {
    return apiRequest('PATCH', `/api/admin/users/${id}/ban`, { ban, reason }, true);
  },

  async updateKyc(id, status) {
    return apiRequest('PATCH', `/api/admin/users/${id}/kyc`, { status }, true);
  },

  async getSignalements(statut = 'pending') {
    return apiRequest('GET', `/api/admin/signalements?statut=${statut}`, null, true);
  },

  async traiterSignalement(id, { statut, action_prise }) {
    return apiRequest('PATCH', `/api/admin/signalements/${id}`, { statut, action_prise }, true);
  },

  async supprimerAnnonce(id, reason) {
    return apiRequest('DELETE', `/api/admin/annonces/${id}`, { reason }, true);
  }
};

// ============================================================
// HELPERS UI — réutilisables dans toutes les pages
// ============================================================

// Initialise la navbar selon l'état de connexion
function initNav() {
  const user = getUser();
  const navGuest = document.getElementById('nav-guest');
  const navUser  = document.getElementById('nav-user');
  const navUsername = document.getElementById('nav-username');

  if (user) {
    if (navGuest) navGuest.style.display = 'none';
    if (navUser)  navUser.style.display = 'flex';
    if (navUsername) navUsername.textContent = user.prenom;
  } else {
    if (navGuest) navGuest.style.display = 'flex';
    if (navUser)  navUser.style.display = 'none';
  }
}

// Formate un prix en FCFA
function formatPrix(n) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

// Formate une date relative
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'À l\'instant';
  if (m < 60) return `Il y a ${m}min`;
  if (h < 24) return `Il y a ${h}h`;
  if (d < 7)  return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// Badge HTML selon le niveau
function badgeHtml(badge) {
  const map = {
    gold:   { emoji: '🥇', label: 'Certifié',  cls: 'badge-gold' },
    silver: { emoji: '🥈', label: 'Vérifié',   cls: 'badge-silver' },
    bronze: { emoji: '🥉', label: 'Bronze',    cls: 'badge-bronze' }
  };
  const b = map[badge] || map.bronze;
  return `<span class="badge-pill ${b.cls}">${b.emoji} ${b.label}</span>`;
}

// Toast de notification
function showToast(msg, type = 'success') {
  let toast = document.getElementById('idjassa-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'idjassa-toast';
    toast.style.cssText = `
      position:fixed;bottom:2rem;right:2rem;z-index:9999;
      background:#1C1A16;border:1px solid rgba(255,255,255,0.1);
      border-radius:12px;padding:0.9rem 1.2rem;
      display:flex;align-items:center;gap:0.7rem;
      font-family:'DM Sans',sans-serif;font-size:0.88rem;color:#fff;
      min-width:280px;box-shadow:0 8px 30px rgba(0,0,0,0.4);
      animation:toastIn 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
  const borderColor = type === 'success' ? 'rgba(26,122,74,0.4)' : type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)';
  toast.style.borderColor = borderColor;
  toast.style.display = 'flex';
  toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// Init automatique de la nav au chargement
document.addEventListener('DOMContentLoaded', initNav);
