// Centralized API utility with error handling
import { getApiHeaders, getApiUrl, clearAuth } from '@/lib/auth'

export const apiRequest = async (endpoint, options = {}) => {
  const apiUrl = getApiUrl()
  const url = `${apiUrl}${endpoint}`
  
  const defaultOptions = {
    headers: getApiHeaders(),
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)
    
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      clearAuth()
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login'
      }
      throw new Error('Unauthorized')
    }

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Request failed')
    }
    
    return data
  } catch (error) {
    console.error('API request error:', error)
    throw error
  }
}

