'use client'

import { useState, useEffect } from 'react'
import { getApiHeaders, getApiUrl } from '@/lib/auth'

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/dashboard`, {
        headers: getApiHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      } else if (response.status === 401) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        window.location.href = '/admin/login'
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const stats = dashboardData?.stats || {}
  const recentContacts = dashboardData?.recentContacts || []

  const statCards = [
    { label: 'Total Messages', value: stats.total_messages || 0, unread: stats.unread_messages || 0, color: 'bg-blue-500' },
    { label: 'Published Posts', value: stats.published_posts || 0, total: stats.total_posts || 0, color: 'bg-green-500' },
    { label: 'Total Events', value: stats.total_events || 0, color: 'bg-purple-500' },
    { label: 'Active Programs', value: stats.active_programs || 0, total: stats.total_programs || 0, color: 'bg-orange-500' },
    { label: 'Testimonials', value: stats.total_testimonials || 0, color: 'bg-pink-500' },
    { label: 'Impact Stats', value: stats.total_stats || 0, color: 'bg-indigo-500' },
    { label: 'Active Leaders', value: stats.active_leaders || 0, color: 'bg-red-500' },
    { label: 'Active Members', value: stats.active_members || 0, color: 'bg-teal-500' },
  ]

  return (
    <div className="w-full min-h-screen bg-blue-950 space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8">
      <h1 className="text-3xl font-heading font-bold text-white mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                {stat.unread > 0 && (
                  <p className="text-sm text-red-600 font-semibold">{stat.unread} unread</p>
                )}
                {stat.total && stat.total !== stat.value && (
                  <p className="text-sm text-gray-500">of {stat.total} total</p>
                )}
              </div>
              <div className={`${stat.color} w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl`}>
                📊
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Contacts */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 overflow-hidden">
        <h2 className="text-xl font-heading font-semibold text-primary mb-4">Recent Contact Messages</h2>
        {recentContacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 text-gray-700">Subject</th>
                  <th className="text-left py-3 px-4 text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentContacts.map((contact) => (
                  <tr key={contact.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{contact.name}</td>
                    <td className="py-3 px-4">{contact.email}</td>
                    <td className="py-3 px-4">{contact.subject || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No recent contacts</p>
        )}
      </div>
    </div>
  )
}
