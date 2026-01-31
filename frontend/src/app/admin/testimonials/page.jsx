'use client'

import { useState, useEffect } from 'react'
import { getApiHeaders, getApiUrl } from '@/lib/auth'
import { Dialog, ConfirmDialog } from '@/components/admin/Dialog'

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTestimonial, setEditingTestimonial] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [testimonialToDelete, setTestimonialToDelete] = useState(null)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    content: '',
    image: ''
  })

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const fetchTestimonials = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/testimonials`, {
        headers: getApiHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setTestimonials(Array.isArray(data) ? data : [])
      } else if (response.status === 401) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        window.location.href = '/admin/members/login'
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error)
      setTestimonials([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (testimonial) => {
    setEditingTestimonial(testimonial)
    setFormData({
      name: testimonial.name,
      role: testimonial.role,
      content: testimonial.content,
      image: testimonial.image || ''
    })
    setShowForm(true)
  }

  const handleDeleteClick = (testimonial) => {
    setTestimonialToDelete(testimonial)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/testimonials/${testimonialToDelete.id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      })

      if (response.ok) {
        setMessage('Testimonial deleted successfully!')
        fetchTestimonials()
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error deleting testimonial:', error)
      setMessage('Error deleting testimonial')
      setTimeout(() => setMessage(''), 3000)
    }
    setTestimonialToDelete(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const apiUrl = getApiUrl()
    const url = editingTestimonial
      ? `${apiUrl}/api/admin/testimonials/${editingTestimonial.id}`
      : `${apiUrl}/api/admin/testimonials`

    try {
      const response = await fetch(url, {
        method: editingTestimonial ? 'PUT' : 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setMessage(editingTestimonial ? 'Testimonial updated successfully!' : 'Testimonial created successfully!')
        fetchTestimonials()
        setShowForm(false)
        setEditingTestimonial(null)
        setFormData({ name: '', role: '', content: '', image: '' })
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error saving testimonial:', error)
      setMessage('Error saving testimonial')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-white">Loading...</div>
  }

  return (
    <div className="w-full min-h-screen bg-blue-950 space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-white">Testimonials Management</h1>
        <button
          onClick={() => {
            setShowForm(true)
            setEditingTestimonial(null)
            setFormData({ name: '', role: '', content: '', image: '' })
          }}
          className="btn-primary"
        >
          + Add Testimonial
        </button>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-primary mb-1">{testimonial.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{testimonial.role}</p>
            <p className="text-gray-700 italic mb-4">"{testimonial.content}"</p>
            <div className="flex space-x-2">
              <button
                onClick={() => handleEdit(testimonial)}
                className="btn-outline text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteClick(testimonial)}
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
          setEditingTestimonial(null)
        }}
        title={editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex space-x-4">
            <button type="submit" className="btn-primary">
              {editingTestimonial ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingTestimonial(null)
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
        title="Delete Testimonial"
        message={`Are you sure you want to delete the testimonial by "${testimonialToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  )
}
