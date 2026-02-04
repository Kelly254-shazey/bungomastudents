'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { getApiUrl } from '@/lib/auth'

export function Events() {
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/events`)
      if (response.ok) {
        const data = await response.json()
        // Filter upcoming events and sort by date
        const upcomingEvents = data.filter(e => e.is_upcoming).sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
        setEvents(upcomingEvents)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section id="events" className="py-20 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading font-bold text-primary mb-4">Events & Activities</h2>
            <p className="text-lg text-gray-600">Loading...</p>
          </div>
        </div>
      </section>
    )
  }

  if (events.length === 0) {
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
    <section id="events" className="py-20 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-heading font-bold text-primary mb-4">Events & Activities</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join us for upcoming events and activities designed to build leadership and create positive impact.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {events.map((event) => {
            const imageUrl = event.image_url

            return (
            <motion.div
              key={event.id}
              variants={cardVariants}
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group"
            >
              {/* Event Image */}
              {imageUrl && (
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={imageUrl}
                    alt={event.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}

              {/* Event Details */}
              <div className="p-6 flex flex-col flex-grow">
                <motion.h3
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold text-primary mb-3"
                >
                  {event.title}
                </motion.h3>
                
                <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className="text-accent font-semibold">📅</span>
                    <span>{formatDate(event.event_date)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center space-x-2">
                      <span className="text-accent font-semibold">📍</span>
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>

                {event.description && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">{event.description}</p>
                )}

                <button 
                  onClick={() => setSelectedEvent(event)}
                  className="inline-flex items-center text-accent font-semibold hover:text-primary transition-colors group/link mt-auto self-start"
                >
                  Learn More
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

      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEvent(null)}
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
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {selectedEvent.image_url && (
                <div className="relative h-64 w-full">
                  <Image
                    src={selectedEvent.image_url.startsWith('/') ? `${getApiUrl()}${selectedEvent.image_url}` : selectedEvent.image_url}
                    alt={selectedEvent.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="p-8">
                <h3 className="text-3xl font-bold text-primary mb-2">{selectedEvent.title}</h3>
                <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className="text-accent font-semibold">📅</span>
                    <span>{formatDate(selectedEvent.event_date)}</span>
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center space-x-2">
                      <span className="text-accent font-semibold">📍</span>
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                </div>
                
                <div className="prose prose-blue max-w-none text-gray-700">
                  <p className="whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
