// api.js — fetch wrappers para o backend

import { getToken, clearAuth } from './auth.js';

const BASE = '/api';

function authHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
               : { 'Content-Type': 'application/json' };
}

async function _json(res) {
  const data = await res.json();
  if (res.status === 401) { clearAuth(); window.location.href = '/login.html'; throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function apiLogin(email, senha) {
  return _json(await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  }));
}

export async function apiRegister(nome, email, senha) {
  return _json(await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha }),
  }));
}

export async function apiGetMe() {
  return _json(await fetch(`${BASE}/auth/me`, { headers: authHeaders() }));
}

export async function apiUpdateMe(data) {
  return _json(await fetch(`${BASE}/auth/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }));
}

// ── Users (admin) ─────────────────────────────────────────────────────────────

export async function apiGetUsers() {
  return _json(await fetch(`${BASE}/users`, { headers: authHeaders() }));
}

export async function apiGetActiveUsers() {
  return _json(await fetch(`${BASE}/users/active`, { headers: authHeaders() }));
}

export async function apiCreateUser(data) {
  return _json(await fetch(`${BASE}/users`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }));
}

export async function apiUpdateUser(id, data) {
  return _json(await fetch(`${BASE}/users/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }));
}

export async function apiDeleteUser(id) {
  return _json(await fetch(`${BASE}/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }));
}

// ── Games ─────────────────────────────────────────────────────────────────────

export async function saveGame(payload) {
  return _json(await fetch(`${BASE}/games`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }));
}

export async function loadGame(gameId) {
  return _json(await fetch(`${BASE}/games/${gameId}`, { headers: authHeaders() }));
}

export async function listGames() {
  return _json(await fetch(`${BASE}/games`, { headers: authHeaders() }));
}

export async function deleteGame(gameId) {
  return _json(await fetch(`${BASE}/games/${gameId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }));
}

export async function renameGame(gameId, name) {
  return _json(await fetch(`${BASE}/games/${gameId}/name`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  }));
}

export async function getQuestions() {
  return _json(await fetch(`${BASE}/questions`));
}
