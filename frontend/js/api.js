// api.js — fetch wrappers para o backend

const BASE = '/api';

async function _json(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function saveGame(payload) {
  return _json(await fetch(`${BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

export async function loadGame(userId, gameId) {
  return _json(await fetch(`${BASE}/games/${userId}/${gameId}`));
}

export async function listGames(userId) {
  return _json(await fetch(`${BASE}/games/${userId}`));
}

export async function deleteGame(userId, gameId) {
  return _json(await fetch(`${BASE}/games/${userId}/${gameId}`, { method: 'DELETE' }));
}

export async function renameGame(userId, gameId, name) {
  return _json(await fetch(`${BASE}/games/${userId}/${gameId}/name`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }));
}

export async function getQuestions() {
  return _json(await fetch(`${BASE}/questions`));
}
