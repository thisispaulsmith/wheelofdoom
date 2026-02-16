// API base URL - uses relative path
// In development: Proxied by Vite to local Functions (localhost:7071)
// In production: Proxied by Static Web App to linked Function App backend
const API_BASE = '/api';

export async function fetchEntries() {
  const response = await fetch(`${API_BASE}/entries`);
  if (!response.ok) {
    throw new Error('Failed to fetch entries');
  }
  return response.json();
}

export async function addEntry(name) {
  const response = await fetch(`${API_BASE}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error('Failed to add entry');
  }
  return response.json();
}

export async function deleteEntry(name) {
  const response = await fetch(`${API_BASE}/entries/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete entry');
  }
}

export async function fetchResults() {
  const response = await fetch(`${API_BASE}/results`);
  if (!response.ok) {
    throw new Error('Failed to fetch results');
  }
  return response.json();
}

export async function saveResult(name) {
  const response = await fetch(`${API_BASE}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error('Failed to save result');
  }
  return response.json();
}

export async function fetchUserInfo() {
  const response = await fetch('/.auth/me');
  if (!response.ok) {
    throw new Error('Not authenticated');
  }
  const data = await response.json();
  return data.clientPrincipal; // Azure SWA wraps user in clientPrincipal
}
