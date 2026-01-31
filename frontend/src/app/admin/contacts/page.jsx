'use client'

import { useState, useEffect } from 'react'
import { getApiHeaders, getApiUrl } from '@/lib/auth'

export default function AdminContacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const apiUrl = getApiUrl()
      // Note: You'll need to add this endpoint to your backend
      const response = await fetch(`${apiUrl}/api/admin/contacts`, {
        headers: getApiHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setContacts(Array.isArray(data) ? data : [])
      } else if (response.status === 401) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        window.location.href = '/admin/members/login'
      } else {
        // Fallback: try to get from dashboard
        try {
          const fallbackResponse = await fetch(`${apiUrl}/api/admin/dashboard`, {
            headers: getApiHeaders(),
          })
          if (fallbackResponse.ok) {
            const dashboardData = await fallbackResponse.json()
            setContacts(Array.isArray(dashboardData.recentContacts) ? dashboardData.recentContacts : [])
          }
        } catch (fallbackError) {
          console.error('Fallback fetch error:', fallbackError)
          setContacts([])
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      setContacts([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = filter === 'all' 
    ? contacts 
    : contacts.filter(c => c.type === filter)

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-primary">Contact Submissions</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All</option>
          <option value="contact">Contact</option>
          <option value="partnership">Partnership</option>
          <option value="volunteer">Volunteer</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-6 text-gray-700 font-semibold">Name</th>
              <th className="text-left py-3 px-6 text-gray-700 font-semibold">Email</th>
              <th className="text-left py-3 px-6 text-gray-700 font-semibold">Subject</th>
              <th className="text-left py-3 px-6 text-gray-700 font-semibold">Type</th>
              <th className="text-left py-3 px-6 text-gray-700 font-semibold">Date</th>
              <th className="text-left py-3 px-6 text-gray-700 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <tr key={contact.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-6">{contact.name}</td>
                  <td className="py-4 px-6">{contact.email}</td>
                  <td className="py-4 px-6">{contact.subject || 'N/A'}</td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {contact.type || 'contact'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {new Date(contact.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => {
                        alert(`Message: ${contact.message || 'No message'}`)
                      }}
                      className="text-primary hover:text-accent"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No contact submissions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

