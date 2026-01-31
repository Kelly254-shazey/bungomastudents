'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getApiHeaders, getApiUrl } from '@/lib/auth'
import { ConfirmDialog } from '@/components/admin/Dialog'

export default function AdminMessages() {
  const [messages, setMessages] = useState([])
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [isReplying, setIsReplying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/messages`, {
        headers: getApiHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data.sort((a, b) => {
          if (a.is_read === b.is_read) {
            return new Date(b.created_at) - new Date(a.created_at)
          }
          return a.is_read ? 1 : -1
        }))
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) {
      setError('Reply cannot be empty')
      return
    }

    setIsReplying(true)
    setError('')
    setSuccess('')

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(
        `${apiUrl}/api/admin/messages/${selectedMessage.id}/reply`,
        {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({ reply_text: replyText }),
        }
      )

      if (response.ok) {
        setSuccess('Reply sent successfully!')
        setReplyText('')
        setSelectedMessage(null)
        fetchMessages()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to send reply')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while sending reply')
    } finally {
      setIsReplying(false)
    }
  }

  const handleDelete = async (id) => {
    setMessageToDelete(messages.find(m => m.id === id))
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/admin/messages/${messageToDelete.id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      })

      if (response.ok) {
        setSuccess('Message deleted successfully!')
        if (selectedMessage?.id === messageToDelete.id) {
          setSelectedMessage(null)
        }
        fetchMessages()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to delete message')
        setTimeout(() => setError(''), 3000)
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while deleting')
      setTimeout(() => setError(''), 3000)
    }
    setMessageToDelete(null)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <div className="w-full min-h-screen bg-blue-950 space-y-8 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Contact Messages</h1>
        <p className="text-gray-300">
          Manage messages received from your website. 
          {unreadCount > 0 && <span className="ml-2 font-semibold text-accent">{unreadCount} unread</span>}
        </p>
      </motion.div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Messages List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6"
        >
          <h2 className="text-lg font-bold text-primary mb-4">Messages ({messages.length})</h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No messages yet</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <motion.button
                  key={message.id}
                  whileHover={{ x: 5 }}
                  onClick={() => setSelectedMessage(message)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedMessage?.id === message.id
                      ? 'bg-primary bg-opacity-10 border-primary'
                      : 'border-gray-200 hover:border-primary'
                  } ${!message.is_read ? 'font-semibold' : ''}`}
                >
                  <p className="font-semibold text-sm truncate">{message.name}</p>
                  <p className="text-xs text-gray-600 truncate">{message.subject}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(message.created_at)}</p>
                  {!message.is_read && (
                    <span className="inline-block mt-2 px-2 py-1 bg-accent text-white text-xs rounded-full">
                      Unread
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Message Details & Reply */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6"
        >
          {selectedMessage ? (
            <>
              {/* Message Header */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-primary mb-1">{selectedMessage.name}</h2>
                    <p className="text-sm text-gray-600">{selectedMessage.email}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedMessage.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    Delete Message
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-xs text-gray-600 mb-1">Subject</p>
                  <p className="font-semibold text-gray-800">{selectedMessage.subject}</p>
                </div>

                <p className="text-xs text-gray-500">
                  Received: {formatDate(selectedMessage.created_at)}
                </p>
              </div>

              {/* Message Content */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              {/* Previous Replies */}
              {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-primary mb-3">Previous Replies</h3>
                  <div className="space-y-3">
                    {selectedMessage.replies.map((reply, idx) => (
                      <div key={idx} className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">{reply}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply Form */}
              <form onSubmit={handleReply} className="space-y-4 pt-6 border-t border-gray-200">
                <h3 className="font-bold text-primary">Send Reply via Email</h3>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Type your reply message here. It will be sent to the sender's email address."
                />

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isReplying || !replyText.trim()}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {isReplying ? 'Sending...' : 'Send Reply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMessage(null)}
                    className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <p className="text-center">
                Select a message from the list to view details and reply
              </p>
            </div>
          )}
        </motion.div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Message"
        message={`Are you sure you want to delete the message from "${messageToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  )
}
