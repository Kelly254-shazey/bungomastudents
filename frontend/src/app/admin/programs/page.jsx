'use client'

import { useState, useEffect } from 'react'
import { getApiHeaders, getApiUrl } from '@/lib/auth'
import { Dialog, ConfirmDialog } from '@/components/admin/Dialog'

export default function AdminPrograms() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProgram, setEditingProgram] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [programToDelete, setProgramToDelete] = useState(null)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'users',
    image: ''
  })

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/programs`, {
        headers: getApiHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setPrograms(Array.isArray(data) ? data : [])
      } else if (response.status === 401) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        window.location.href = '/admin/members/login'
      }
    } catch (error) {
      console.error('Error fetching programs:', error)
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const apiUrl = getApiUrl()
    const url = editingProgram
      ? `${apiUrl}/api/admin/programs/${editingProgram.id}`
      : `${apiUrl}/api/admin/programs`

    try {
      const response = await fetch(url, {
        method: editingProgram ? 'PUT' : 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage(editingProgram ? 'Program updated successfully!' : 'Program created successfully!')
        fetchPrograms()
        setShowForm(false)
        setEditingProgram(null)
        setFormData({ title: '', description: '', icon: 'users', image: '' })
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error saving program:', error)
      setMessage('Error saving program')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleEdit = (program) => {
    setEditingProgram(program)
    setFormData({
      title: program.title,
      description: program.description,
      icon: program.icon || 'users',
      image: program.image || ''
    })
    setShowForm(true)
  }

  const handleDeleteClick = (program) => {
    setProgramToDelete(program)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/programs/${programToDelete.id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      })

      if (response.ok) {
        setMessage('Program deleted successfully!')
        fetchPrograms()
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error deleting program:', error)
      setMessage('Error deleting program')
      setTimeout(() => setMessage(''), 3000)
    }
    setProgramToDelete(null)
  }

  if (loading) {
    return <div className="text-center py-8 text-white">Loading...</div>
  }

  return (
    <div className="w-full min-h-screen bg-blue-950 space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-white">Programs Management</h1>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingProgram(null)
            setFormData({ title: '', description: '', icon: 'users', image: '' })
          }}
          className="btn-primary"
        >
          + Add Program
        </button>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div key={program.id} className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-primary mb-2">{program.title}</h3>
            <p className="text-gray-600 mb-4">{program.description}</p>
            <div className="flex space-x-2">
              <button
                onClick={() => handleEdit(program)}
                className="btn-outline text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteClick(program)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
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
          setEditingProgram(null)
        }}
        title={editingProgram ? 'Edit Program' : 'Add New Program'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
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
              <option value="crown">Crown</option>
              <option value="heart">Heart</option>
              <option value="shield">Shield</option>
              <option value="leaf">Leaf</option>
              <option value="trophy">Trophy</option>
            </select>
          </div>
          <div className="flex space-x-4">
            <button type="submit" className="btn-primary">
              {editingProgram ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingProgram(null)
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
        title="Delete Program"
        message={`Are you sure you want to delete "${programToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  )
}
