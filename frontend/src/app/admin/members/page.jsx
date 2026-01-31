'use client'

import { useState, useEffect } from 'react'
import { getApiHeaders, getApiUrl } from '@/lib/auth'
import { motion } from 'framer-motion'

export default function AdminMembers() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    photo_url: '',
    bio: ''
  })

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/members`, {
        headers: getApiHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const apiUrl = getApiUrl()
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId 
        ? `${apiUrl}/api/admin/members/${editingId}`
        : `${apiUrl}/api/admin/members`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getApiHeaders(),
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchMembers()
        resetForm()
      }
    } catch (error) {
      console.error('Error saving member:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/members/${id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      })

      if (response.ok) {
        fetchMembers()
      }
    } catch (error) {
      console.error('Error deleting member:', error)
    }
  }

  const handleEdit = (member) => {
    setFormData(member)
    setEditingId(member.id)
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      photo_url: '',
      bio: ''
    })
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold text-primary">Members Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? 'Cancel' : '+ Add Member'}
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-lg p-6 space-y-4"
        >
          <h2 className="text-xl font-bold text-primary">
            {editingId ? 'Edit Member' : 'Add New Member'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input-field"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input-field"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone"
              value={formData.phone}
              onChange={handleChange}
              className="input-field"
            />
            <input
              type="text"
              name="position"
              placeholder="Position"
              value={formData.position}
              onChange={handleChange}
              className="input-field"
            />
            <input
              type="text"
              name="department"
              placeholder="Department"
              value={formData.department}
              onChange={handleChange}
              className="input-field"
            />
            <input
              type="text"
              name="photo_url"
              placeholder="Photo URL"
              value={formData.photo_url}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <textarea
            name="bio"
            placeholder="Bio"
            value={formData.bio}
            onChange={handleChange}
            className="input-field w-full"
            rows="4"
          />

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              {editingId ? 'Update Member' : 'Add Member'}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
          >
            {member.photo_url && (
              <img src={member.photo_url} alt={member.name} className="w-full h-48 object-cover" />
            )}
            <div className="p-4">
              <h3 className="font-bold text-lg text-primary">{member.name}</h3>
              <p className="text-sm text-secondary font-semibold">{member.position}</p>
              <p className="text-sm text-gray-600 mb-2">{member.department}</p>
              
              {member.phone && <p className="text-sm text-gray-600">📱 {member.phone}</p>}
              {member.email && <p className="text-sm text-gray-600">✉️ {member.email}</p>}
              
              {member.bio && (
                <p className="text-sm text-gray-700 mt-2 line-clamp-2">{member.bio}</p>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(member)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded transition-colors text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {members.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500 mb-4">No members yet. Add one to get started!</p>
        </div>
      )}
    </div>
  )
}
