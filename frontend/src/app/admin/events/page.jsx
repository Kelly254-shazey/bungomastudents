'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getApiHeaders, getApiUrl } from '@/lib/auth'
import { Dialog, ConfirmDialog } from '@/components/admin/Dialog'

export default function AdminEvents() {
  const [events, setEvents] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    image_url: '',
    is_upcoming: true
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [eventToDelete, setEventToDelete] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/events`, {
        headers: getApiHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setEvents(data.sort((a, b) => {
          if (a.is_upcoming === b.is_upcoming) {
            return new Date(b.event_date) - new Date(a.event_date)
          }
          return a.is_upcoming ? -1 : 1
        }))
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setError('Please upload a JPEG, PNG, or GIF image')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target?.result)
    }
    reader.readAsDataURL(file)

    setUploadingImage(true)
    setError('')

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formDataUpload,
      })

      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, image_url: data.url }))
        setSuccess('Image uploaded successfully!')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to upload image')
        setImagePreview(null)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      setError('An error occurred while uploading the image')
      setImagePreview(null)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const apiUrl = getApiUrl()
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId
        ? `${apiUrl}/api/admin/events/${editingId}`
        : `${apiUrl}/api/admin/events`

      const response = await fetch(url, {
        method,
        headers: getApiHeaders(),
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess(editingId ? 'Event updated successfully!' : 'Event created successfully!')
        setFormData({
          title: '',
          description: '',
          event_date: '',
          location: '',
          image_url: '',
          is_upcoming: true
        })
        setImagePreview(null)
        setEditingId(null)
        setShowForm(false)
        fetchEvents()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to save event')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while saving')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (event) => {
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date || '',
      location: event.location || '',
      image_url: event.image_url || '',
      is_upcoming: event.is_upcoming
    })
    setImagePreview(event.image_url)
    setEditingId(event.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    setEventToDelete(events.find(e => e.id === id))
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/events/${eventToDelete.id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      })

      if (response.ok) {
        setSuccess('Event deleted successfully!')
        fetchEvents()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to delete event')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while deleting')
      setTimeout(() => setError(''), 3000)
    }
    setEventToDelete(null)
  }

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      event_date: '',
      location: '',
      image_url: '',
      is_upcoming: true
    })
    setImagePreview(null)
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="w-full min-h-screen bg-blue-950 space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Manage Events</h1>
            <p className="text-sm sm:text-base text-gray-300">Create, edit, or remove events and activities</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
              setFormData({
                title: '',
                description: '',
                event_date: '',
                location: '',
                image_url: '',
                is_upcoming: true
              })
              setImagePreview(null)
            }}
            className="btn-primary"
          >
            + Add Event
          </button>
        </div>
      </motion.div>

      {/* Form Section */}
      <Dialog
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit Event' : 'Create New Event'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Event title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
              <input
                type="datetime-local"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Event location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Event description"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="is_upcoming"
                checked={formData.is_upcoming}
                onChange={handleChange}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">Mark as Upcoming</span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingId ? 'Update Event' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Dialog>

      {/* Events List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-lg p-8"
      >
        <h2 className="text-xl font-bold text-primary mb-6">Events ({events.length})</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No events yet. Create one above!</div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <motion.div
                key={event.id}
                whileHover={{ x: 5 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {event.image_url && (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-32 object-cover rounded-lg md:col-span-1"
                    />
                  )}
                  <div className={event.image_url ? 'md:col-span-3' : 'md:col-span-4'}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-primary text-lg">{event.title}</h3>
                        <p className="text-gray-600 text-sm">{event.location}</p>
                      </div>
                      {event.is_upcoming && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          Upcoming
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm mb-2 line-clamp-2">{event.description}</p>
                    <p className="text-gray-500 text-xs mb-4">
                      📅 {new Date(event.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(event)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Event"
        message={`Are you sure you want to delete "${eventToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  )
}
