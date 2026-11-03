/**
 * PyPaws Frontend API Service
 * Connects React UI to FastAPI Backend & AI Services.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8003';

let _token = localStorage.getItem('pypaws_token') || sessionStorage.getItem('pypaws_token') || '';

function extractErrorMessage(errorData, fallback) {
  const detail = errorData?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => item?.msg || item?.message).filter(Boolean);
    if (messages.length) return messages.join('; ');
  }
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string') return detail.message;
    if (typeof detail.msg === 'string') return detail.msg;
  }
  if (typeof errorData?.message === 'string' && errorData.message.trim()) return errorData.message;
  return fallback;
}

function normalizeUser(user) {
  if (!user) return null;
  return { ...user, id: user.id ?? user.user_id };
}

function cacheUser(user) {
  const normalized = normalizeUser(user);
  if (normalized) localStorage.setItem('pypaws_user', JSON.stringify(normalized));
  else localStorage.removeItem('pypaws_user');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('pypaws_user') || 'null');
  } catch {
    return null;
  }
}

export function getAuthToken() {
  return _token;
}

export function setAuthToken(token, { persist = true, user = undefined } = {}) {
  _token = token || '';
  localStorage.removeItem('pypaws_token');
  sessionStorage.removeItem('pypaws_token');
  if (_token) (persist ? localStorage : sessionStorage).setItem('pypaws_token', _token);
  if (user !== undefined) cacheUser(user);
  if (!_token) cacheUser(null);
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
    throw new Error(extractErrorMessage(err, `Failed to create post (${res.status})`));
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
    const error = new Error(extractErrorMessage(err, 'Không thể tạo tài khoản.'));
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  const normalizedData = { ...data, user: normalizeUser(data.user) };
  setAuthToken(normalizedData.access_token, { persist: true, user: normalizedData.user });
  return normalizedData;
}

/**
 * Get the currently authenticated user.
 */
export async function getMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: getHeaders(false) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(extractErrorMessage(err, res.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Không thể xác thực tài khoản lúc này.'));
    error.status = res.status;
    if (res.status === 401) setAuthToken('');
    throw error;
  }
  const data = await res.json();
  const normalizedUser = normalizeUser(data);
  cacheUser(normalizedUser);
  return normalizedUser;
}

/**
 * Auth login.
 */
export async function login(email, password, rememberMe = true) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(extractErrorMessage(err, 'Email hoặc mật khẩu không chính xác.'));
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const normalizedData = { ...data, user: normalizeUser(data.user) };
  setAuthToken(normalizedData.access_token, { persist: rememberMe, user: normalizedData.user });
  return normalizedData;
}

export { API_BASE };


/**
 * Fetch notifications for the authenticated user.
 */
export async function getNotifications(unreadOnly = false) {
  const params = new URLSearchParams({
    unread_only: String(unreadOnly),
    limit: '100',
  });
  const res = await fetch(`${API_BASE}/api/notifications?${params.toString()}`, {
    headers: getHeaders(false),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch notifications');
  }
  const data = await res.json();
  return data.items || [];
}

/**
 * Mark one notification as read.
 */
export async function markNotificationRead(notificationId) {
  const res = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
    method: 'POST',
    headers: getHeaders(false),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to mark notification as read');
  }
  return await res.json();
}


export function resolveImageUrl(value) {
  if (!value || typeof value !== 'string') return '';
  const url = value.trim();
  if (!url) return '';
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  return `${API_BASE}/${url.replace(/^\/+/, '')}`;
}
