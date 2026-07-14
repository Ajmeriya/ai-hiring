const API_BASE = 'http://localhost:8080/api/auth'

/**
 * Register a new user
 */
export async function register(fullName, email, password, role) {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password, role })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Registration failed')
  }

  return response.json()
}

/**
 * Login user
 */
export async function login(email, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Login failed')
  }

  return response.json()
}

/**
 * Logout user
 */
export async function logout(token) {
  const response = await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })

  if (!response.ok) {
    console.error('Logout failed')
  }
}

/**
 * Get current user profile
 */
export async function getMe(token) {
  const response = await fetch(`${API_BASE}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  return response.json()
}

/**
 * Make authenticated API request with JWT token
 */
export async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('ai-hiring-platform-auth-token')
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers = {
    ...options.headers
  }

  if (!isFormData && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('ai-hiring-platform-auth-token')
    localStorage.removeItem('ai-hiring-platform-user-role')
    localStorage.removeItem('ai-hiring-platform-user-profile')
    window.location.href = '/login'
    throw new Error('Session expired. Please login again.')
  }

  return response
}
