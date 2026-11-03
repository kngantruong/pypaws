/**
 * PyPaws Frontend API Service
 * Connects React UI to FastAPI Backend & AI Services.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8003';

let _token = localStorage.getItem('pypaws_token') || '';

export function getAuthToken() {
  return _token;
}

export function setAuthToken(token) {
  _token = token;
  if (token) {
    localStorage.setItem('pypaws_token', token);
  } else {
    localStorage.removeItem('pypaws_token');
  }
}

function getHeaders(isJson = true) {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }
  return headers;
}

/**
 * AI 1: Calls Gemini 2.5 Flash via /api/ai/describe-pet to extract features from image.
 */
export async function describePetWithAI(file) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE}/api/ai/describe-pet`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || `AI description failed (${res.status})`);
  }

  return await res.json();
}

/**
 * Upload image to backend static storage.
 */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE}/api/posts/upload-image`, {
    method: 'POST',
    headers: getHeaders(false),
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }

  return await res.json();
}

/**
 * Create a new LOST/FOUND post with auto-embedding & matching.
 */
export async function createPost(payload) {
  const res = await fetch(`${API_BASE}/api/posts`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create post (${res.status})`);
  }

  return await res.json();
}

/**
 * Fetch candidates for a LOST post.
 */
export async function getCandidates(postId) {
  const res = await fetch(`${API_BASE}/api/posts/${postId}/candidates`, {
    headers: getHeaders(true),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch candidates (${res.status})`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Run AI matching with optional expanded radius (5, 10, 20 km).
 */
export async function runMatching(postId, radiusKm = null) {
  const url = radiusKm 
    ? `${API_BASE}/api/matching/posts/${postId}?radius_km=${radiusKm}`
    : `${API_BASE}/api/matching/posts/${postId}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(true),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to run matching (${res.status})`);
  }

  return await res.json();
}

/**
 * Contact candidate owner.
 */
export async function contactCandidate(candidateId) {
  const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/contact`, {
    method: 'POST',
    headers: getHeaders(true),
  });

  if (!res.ok) {
    throw new Error('Failed to get contact information');
  }

  return await res.json();
}

/**
 * Reject candidate.
 */
export async function rejectCandidate(candidateId) {
  const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/reject`, {
    method: 'POST',
    headers: getHeaders(true),
  });

  if (!res.ok) {
    throw new Error('Failed to reject candidate');
  }

  return await res.json();
}

/**
 * Resolve LOST/FOUND post.
 */
export async function resolveCandidate(candidateId, lostPostId) {
  const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/resolve?lost_post_id=${lostPostId}`, {
    method: 'POST',
    headers: getHeaders(true),
  });

  if (!res.ok) {
    throw new Error('Failed to resolve report');
  }

  return await res.json();
}

/**
 * Fetch list of posts.
 */
export async function getPosts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_BASE}/api/posts?${query}` : `${API_BASE}/api/posts`;
  const res = await fetch(url, {
    headers: getHeaders(true),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch posts');
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Auth register.
 */
export async function register(fullName, email, phone, password) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: fullName, email, phone: phone || null, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  return data;
}

/**
 * Get the currently authenticated user.
 */
export async function getMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: getHeaders(false) });
  if (!res.ok) {
    setAuthToken('');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Authentication expired');
  }
  return await res.json();
}

/**
 * Auth login.
 */
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }

  const data = await res.json();
  setAuthToken(data.access_token);
  return data;
}

export { API_BASE };
