'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getApiHeaders, getApiUrl } from '@/lib/auth'

export default function AdminLeaders() {
  const [leaders, setLeaders] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    bio: '',
    photo_url: ''
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showEditConfirm, setShowEditConfirm] = useState(null)

  useEffect(() => {
    fetchLeaders()
  }, [])

  const fetchLeaders = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/leaders`, {
        headers: getApiHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setLeaders(data.sort((a, b) => a.name.localeCompare(b.name)))
      }
    } catch (error) {
      console.error('Error fetching leaders:', error)
      setError('Failed to load officials')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Update image preview when photo_url changes
    if (name === 'photo_url' && value) {
      setImagePreview(value);
    } else if (name === 'photo_url' && !value) {
      setImagePreview(null);
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setError('Please upload a JPEG, PNG, or GIF image')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target?.result)
    }
    reader.readAsDataURL(file)

    // Upload file
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
        setFormData(prev => ({ ...prev, photo_url: data.url }))
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
        ? `${apiUrl}/api/admin/leaders/${editingId}`
        : `${apiUrl}/api/admin/leaders`

      const response = await fetch(url, {
        method,
        headers: getApiHeaders(),
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSuccess(editingId ? 'Official updated successfully!' : 'Official added successfully!')
        setFormData({ name: '', title: '', bio: '', photo_url: '' })
        setEditingId(null)
        setShowForm(false)
        fetchLeaders()
      } else {
        const errorData = await response.json()
        setError(errorData.error || errorData.message || 'Failed to save official')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while saving')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (leader) => {
    setShowEditConfirm(leader)
  }

  const confirmEdit = () => {
    const leader = showEditConfirm
    setFormData({
      name: leader.name,
      title: leader.title,
      bio: leader.bio || '',
      photo_url: leader.photo_url || ''
    })
    
    if (leader.photo_url) {
      if (leader.photo_url.startsWith('http://') || leader.photo_url.startsWith('https://')) {
        setImagePreview(leader.photo_url);
      } else {
        const cleanPath = leader.photo_url.replace(/^\/+/, '');
        setImagePreview(`${getApiUrl()}/${cleanPath}`);
      }
    } else {
      setImagePreview(null);
    }
    
    setShowForm(true)
    setEditingId(leader.id)
    setSuccess('')
    setError('')
    setShowEditConfirm(null)
  }

  const handleDelete = async (id) => {
    if (!id) return

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/leaders/${id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      })

      if (response.ok) {
        setSuccess('Official deleted successfully!')
        fetchLeaders()
        setShowDeleteConfirm(null)
      } else {
        setError('Failed to delete official')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while deleting')
    }
  }

  const handleCancel = () => {
    setFormData({ name: '', title: '', bio: '', photo_url: '' })
    setImagePreview(null)
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="w-full min-h-screen bg-blue-950 space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Manage Officials</h1>
        <p className="text-sm sm:text-base text-gray-300">Add, edit, or remove officials displayed on the main website</p>
      </motion.div>
      
      <div className="flex justify-end">
        <button onClick={() => { setEditingId(null); setFormData({ name: '', title: '', bio: '', photo_url: '' }); setImagePreview(null); setSuccess(''); setError(''); setShowForm(true); }} className="btn-primary">+ Add Official</button>
      </div>

      {/* Global Notifications */}
      {(success || error) && !showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${success ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}
        >
          {success || error}
        </motion.div>
      )}

      <AnimatePresence>
        {showEditConfirm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-8 text-center" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-primary mb-4">Edit Official?</h3>
              <p className="text-gray-600 mb-6">Do you want to edit this official's information?</p>
              <div className="flex gap-4">
                <button onClick={() => setShowEditConfirm(null)} className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={confirmEdit} className="flex-1 btn-primary">Edit</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <h2 className="text-lg sm:text-xl font-bold text-primary mb-4 sm:mb-6">
                {editingId ? 'Edit Official' : 'Add New Official'}
              </h2>

              {(success || error) && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {success || error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Official's name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Position/Title" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea name="bio" value={formData.bio} onChange={handleChange} rows="4" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Brief biography" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                  <div className="space-y-3">
                    {imagePreview && (
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-primary">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => { setImagePreview(null); setFormData(prev => ({ ...prev, photo_url: '' })); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600">✕</button>
                      </div>
                    )}
                    {!imagePreview && (
                    <div 
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                      onDrop={(e) => {
                        e.preventDefault();
                        const files = e.dataTransfer.files;
                        if (files.length > 0) {
                          handleImageUpload({ target: { files } });
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnter={(e) => e.preventDefault()}
                      onClick={() => document.getElementById('file-input').click()}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 text-primary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <p className="text-xs sm:text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <input 
                        id="file-input"
                        type="file" 
                        className="hidden" 
                        accept="image/jpeg,image/png,image/gif" 
                        onChange={handleImageUpload} 
                        disabled={uploadingImage} 
                      />
                    </div>
                    )}
                    {uploadingImage && <div className="text-center text-sm text-blue-600">Uploading image...</div>}
                    <div className="text-sm text-gray-500 border-t pt-3">
                      <p className="mb-2">Or paste image URL:</p>
                      <input 
                        type="text" 
                        name="photo_url" 
                        value={formData.photo_url} 
                        onChange={handleChange} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" 
                        placeholder="https://example.com/photo.jpg" 
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary disabled:opacity-50">{isSubmitting ? 'Saving...' : editingId ? 'Update Official' : 'Add Official'}</button>
                  <button type="button" onClick={handleCancel} className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-8 text-center" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <h3 className="text-xl font-bold text-primary mb-4">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this official? This action cannot be undone.</p>
              <div className="flex gap-4">
                <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 btn-danger">Yes, Delete</button>
                <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 btn-outline">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaders List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-lg p-8"
      >
        <h2 className="text-xl font-bold text-primary mb-6">Current Officials ({leaders.length})</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading officials...</div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No officials yet. Add one above!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaders.map((leader) => {
              // Handle image URL properly
              let displayImageUrl = null;
              if (leader.photo_url) {
                if (leader.photo_url.startsWith('http://') || leader.photo_url.startsWith('https://')) {
                  displayImageUrl = leader.photo_url;
                } else {
                  // Remove leading slashes and ensure proper path
                  const cleanPath = leader.photo_url.replace(/^\/+/, '');
                  displayImageUrl = `${getApiUrl()}/${cleanPath}`;
                }
              }
              
              return (
                <motion.div
                  key={leader.id}
                  whileHover={{ y: -5 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  {displayImageUrl && (
                    <img
                      src={displayImageUrl}
                      alt={leader.name}
                      className="w-full h-40 object-cover rounded-lg mb-4"
                      onError={(e) => {
                        console.error('Image failed to load:', displayImageUrl);
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <h3 className="font-bold text-primary text-lg mb-1">{leader.name}</h3>
                  <p className="text-accent font-semibold text-sm mb-3">{leader.title}</p>
                  {leader.bio && <p className="text-gray-600 text-sm mb-4 line-clamp-3">{leader.bio}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(leader)}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(leader.id)}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
