// auth.js — helpers de autenticação (localStorage + redirecionamento)

export function getToken() {
  return localStorage.getItem('economia_token');
}

export function setToken(token) {
  localStorage.setItem('economia_token', token);
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('economia_user') || 'null'); }
  catch { return null; }
}

export function setUser(user) {
  localStorage.setItem('economia_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('economia_token');
  localStorage.removeItem('economia_user');
}

export function isLoggedIn() {
  return !!getToken();
}

export function getUserId() {
  return getUser()?.id ?? null;
}

export function isAdmin() {
  return getUser()?.tipo === 'A';
}

// Redireciona para login se não autenticado. Retorna false se redirecionou.
export function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Redireciona para login se não for admin.
export function requireAdmin() {
  if (!requireLogin()) return false;
  if (!isAdmin()) {
    window.location.href = '/';
    return false;
  }
  return true;
}

export function logout() {
  clearAuth();
  localStorage.removeItem('economia_last_game');
  window.location.href = '/login.html';
}
