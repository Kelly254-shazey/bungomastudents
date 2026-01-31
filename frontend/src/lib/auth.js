// Authentication utilities for admin panel

export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

export const getAdminUser = () => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  }
  return null
}

export const setAuthToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token)
  }
}

export const setAdminUser = (user) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user))
  }
}

export const clearAuth = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

export const isAuthenticated = () => {
  return !!getAuthToken()
}

export const getApiHeaders = () => {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'
}

