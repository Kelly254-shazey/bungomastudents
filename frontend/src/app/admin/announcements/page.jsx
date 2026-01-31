'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getApiHeaders, getApiUrl } from '@/lib/auth'
import { Dialog, ConfirmDialog } from '@/components/admin/Dialog'

export default function AdminAnnouncements() {
  const [posts, setPosts] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    image_url: '',
    published: false
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [postToDelete, setPostToDelete] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/posts`, {
        headers: getApiHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setPosts(data)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      setError('Failed to load announcements')
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
        ? `${apiUrl}/api/admin/posts/${editingId}`
        : `${apiUrl}/api/admin/posts`

      const response = await fetch(url, {
        method,
        headers: getApiHeaders(),
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess(editingId ? 'Announcement updated!' : 'Announcement created!')
        setFormData({
          title: '',
          content: '',
          excerpt: '',
          image_url: '',
          published: false
        })
        setImagePreview(null)
        setEditingId(null)
        setShowForm(false)
        fetchPosts()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to save announcement')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while saving')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (post) => {
    setFormData({
      title: post.title,
      content: post.content || '',
      excerpt: post.excerpt || '',
      image_url: post.image_url || '',
      published: post.published
    })
    setImagePreview(post.image_url)
    setEditingId(post.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    setPostToDelete(posts.find(p => p.id === id))
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/posts/${postToDelete.id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      })

      if (response.ok) {
        setSuccess('Announcement deleted!')
        fetchPosts()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to delete announcement')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while deleting')
      setTimeout(() => setError(''), 3000)
    }
    setPostToDelete(null)
  }

  const handleCancel = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      image_url: '',
      published: false
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Manage Announcements</h1>
            <p className="text-sm sm:text-base text-gray-300">Post news and announcements to your website</p>
          </div>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
              setFormData({
                title: '',
                content: '',
                excerpt: '',
                image_url: '',
                published: false
              })
              setImagePreview(null)
            }}
            className="btn-primary"
          >
            + Add Announcement
          </button>
        </div>
      </motion.div>

      {/* Form Section */}
      <Dialog
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit Announcement' : 'Post New Announcement'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Announcement title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              rows="2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Brief summary (shown on homepage)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows="6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Full announcement content"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="published"
                checked={formData.published}
                onChange={handleChange}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">Publish Now</span>
            </label>
            <span className="text-sm text-gray-500">
              {formData.published ? '✓ Will be visible on website' : '○ Will be saved as draft'}
            </span>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingId ? 'Update Announcement' : 'Post Announcement'}
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

      {/* Posts List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8"
      >
        <h2 className="text-lg sm:text-xl font-bold text-primary mb-4 sm:mb-6">Announcements ({posts.length})</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm sm:text-base">Loading announcements...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm sm:text-base">No announcements yet. Create one above!</div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                whileHover={{ x: 5 }}
                className="w-full border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-lg transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
                  {post.image_url && (
                    <div className="w-full h-32 sm:h-40 md:h-32 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className={post.image_url ? 'md:col-span-3' : 'md:col-span-4'}>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <h3 className="font-bold text-primary text-base sm:text-lg break-words">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {post.published && (
                          <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold whitespace-nowrap">
                            Published
                          </span>
                        )}
                        {!post.published && (
                          <span className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold whitespace-nowrap">
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                    {post.excerpt && (
                      <p className="text-gray-700 text-xs sm:text-sm mb-2 line-clamp-2">{post.excerpt}</p>
                    )}
                    {!post.excerpt && post.content && (
                      <p className="text-gray-700 text-xs sm:text-sm mb-2 line-clamp-2">{post.content}</p>
                    )}
                    <p className="text-gray-500 text-xs mb-3 sm:mb-4">
                      📅 {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleEdit(post)}
                        className="flex-1 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors text-xs sm:text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="flex-1 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs sm:text-sm font-medium"
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
        title="Delete Announcement"
        message={`Are you sure you want to delete "${postToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  )
}
