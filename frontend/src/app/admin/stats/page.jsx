'use client'

import { useState, useEffect } from 'react'
import { getApiHeaders, getApiUrl } from '@/lib/auth'
import { Dialog, ConfirmDialog } from '@/components/admin/Dialog'

export default function AdminStats() {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStat, setEditingStat] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [statToDelete, setStatToDelete] = useState(null)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    number: '',
    label: '',
    icon: 'users'
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/impact-stats`, {
        headers: getApiHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setStats(Array.isArray(data) ? data : [])
      } else if (response.status === 401) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        window.location.href = '/admin/login'
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const apiUrl = getApiUrl()
    const url = editingStat
      ? `${apiUrl}/api/admin/impact-stats/${editingStat.id}`
      : `${apiUrl}/api/admin/impact-stats`

    try {
      const response = await fetch(url, {
        method: editingStat ? 'PUT' : 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage(editingStat ? 'Stat updated successfully!' : 'Stat created successfully!')
        fetchStats()
        setShowForm(false)
        setEditingStat(null)
        setFormData({ number: '', label: '', icon: 'users' })
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error saving stat:', error)
      setMessage('Error saving stat')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleEdit = (stat) => {
    setEditingStat(stat)
    setFormData({
      number: stat.number,
      label: stat.label,
      icon: stat.icon || 'users'
    })
    setShowForm(true)
  }

  const handleDeleteClick = (stat) => {
    setStatToDelete(stat)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/impact-stats/${statToDelete.id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      })

      if (response.ok) {
        setMessage('Stat deleted successfully!')
        fetchStats()
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error deleting stat:', error)
      setMessage('Error deleting stat')
      setTimeout(() => setMessage(''), 3000)
    }
    setStatToDelete(null)
  }

  if (loading) {
    return <div className="text-center py-8 text-white">Loading...</div>
  }

  return (
    <div className="w-full min-h-screen bg-blue-950 space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-white">Impact Statistics</h1>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingStat(null)
            setFormData({ number: '', label: '', icon: 'users' })
          }}
          className="btn-primary"
        >
          + Add Stat
        </button>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">{stat.number}</div>
            <div className="text-gray-600 mb-4">{stat.label}</div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleEdit(stat)}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteClick(stat)}
                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingStat(null)
        }}
        title={editingStat ? 'Edit Stat' : 'Add New Stat'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number</label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              required
              placeholder="e.g., 2500+"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              required
              placeholder="e.g., Students Mentored"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <select
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="users">Users</option>
              <option value="building">Building</option>
              <option value="crown">Crown</option>
              <option value="calendar">Calendar</option>
            </select>
          </div>
          <div className="flex space-x-4">
            <button type="submit" className="btn-primary">
              {editingStat ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingStat(null)
              }}
              className="btn-outline"
            >
              Cancel
            </button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Statistic"
        message={`Are you sure you want to delete "${statToDelete?.label}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  )
}
