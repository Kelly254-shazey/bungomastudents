'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { getApiUrl } from '@/lib/auth'

export function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/posts`)
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data)
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section id="announcements" className="py-20 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading font-bold text-primary mb-4">Announcements</h2>
            <p className="text-lg text-gray-600">Loading...</p>
          </div>
        </div>
      </section>
    )
  }

  if (announcements.length === 0) {
    return null
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <section id="announcements" className="py-20 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-heading font-bold text-primary mb-4">Announcements</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Stay updated with the latest news and announcements from BUCCUSA.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {announcements.map((announcement) => {
            const imageUrl = announcement.image_url?.startsWith('/')
              ? `${getApiUrl()}${announcement.image_url}`
              : announcement.image_url

            return (
            <motion.div
              key={announcement.id}
              variants={cardVariants}
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group"
            >
              {/* Image */}
              {imageUrl && (
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={imageUrl}
                    alt={announcement.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-6 flex flex-col flex-grow">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-3"
                >
                  <span className="inline-block text-xs font-semibold text-white bg-accent px-3 py-1 rounded-full">
                    News
                  </span>
                  <p className="text-xs text-gray-500 mt-2">{formatDate(announcement.published_at)}</p>
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold text-primary mb-3"
                >
                  {announcement.title}
                </motion.h3>

                {announcement.excerpt && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {announcement.excerpt}
                  </p>
                )}

                {announcement.content && !announcement.excerpt && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                    {announcement.content}
                  </p>
                )}

                <button
                  onClick={() => setSelectedAnnouncement(announcement)}
                  className="inline-flex items-center text-accent font-semibold hover:text-primary transition-colors group/link mt-auto self-start text-left"
                >
                  Read More
                  <motion.svg 
                    className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </motion.svg>
                </button>
              </div>
            </motion.div>
          )})}
        </motion.div>
      </div>

      {/* Announcement Details Modal */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAnnouncement(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            >
              <button 
                onClick={() => setSelectedAnnouncement(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {selectedAnnouncement.image_url && (
                <div className="relative h-64 w-full">
                  <Image
                    src={selectedAnnouncement.image_url.startsWith('/') ? `${getApiUrl()}${selectedAnnouncement.image_url}` : selectedAnnouncement.image_url}
                    alt={selectedAnnouncement.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="p-8">
                <div className="mb-4">
                  <span className="inline-block text-xs font-semibold text-white bg-accent px-3 py-1 rounded-full mb-2">
                    News
                  </span>
                  <h3 className="text-3xl font-bold text-primary">{selectedAnnouncement.title}</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Published on {formatDate(selectedAnnouncement.published_at)}
                  </p>
                </div>
                
                <div className="prose prose-blue max-w-none text-gray-700">
                  <p className="whitespace-pre-wrap">{selectedAnnouncement.content}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
