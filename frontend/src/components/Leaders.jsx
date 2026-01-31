'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion' 
import { getApiUrl } from '@/lib/auth'

export function Leaders() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    fetchLeaders()
  }, [])

  const fetchLeaders = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/leaders`)
      if (response.ok) {
        const data = await response.json()
        setLeaders(data)
      }
    } catch (error) {
      console.error('Error fetching leaders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-slide effect
  useEffect(() => {
    if (leaders.length === 0) return
    const totalSlides = Math.ceil(leaders.length / 4)
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides)
    }, 5000)
    return () => clearInterval(interval)
  }, [leaders])

  if (loading) {
    return (
      <section id="leaders" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-16 space-y-4">
            <div className="h-10 w-64 bg-gray-200 rounded-lg mx-auto animate-pulse" />
            <div className="h-4 w-96 bg-gray-200 rounded-lg mx-auto animate-pulse max-w-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm h-[300px] animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-16 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (leaders.length === 0) {
    return null
  }

  // Group leaders into slides of 4
  const slides = []
  for (let i = 0; i < leaders.length; i += 4) {
    slides.push(leaders.slice(i, i + 4))
  }

  const totalSlides = slides.length

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.6 
      },
    },
  }

  return (
    <section id="leaders" className="py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-3">
            Our Leadership
          </h2>
          <div className="w-20 h-1 bg-accent mx-auto mb-4" />
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Meet the dedicated individuals leading BUCCUSA's mission to transform communities.
          </p>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {slides[currentSlide].map((leader) => {
                const imageUrl = leader.photo_url
                  ? leader.photo_url.startsWith('http')
                    ? leader.photo_url
                    : `${getApiUrl()}/${leader.photo_url.replace(/^\/+/, '')}`
                  : null

                return (
                  <motion.div
                    key={leader.id}
                    whileHover={{ y: -8 }}
                    className="group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden border border-gray-200"
                  >
                    <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-100">
                {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={leader.name}
                        fill
                        className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white">
                        <span className="text-7xl font-heading font-bold opacity-30">
                          {leader.name.charAt(0)}
                        </span>
                      </div>
                )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <div className="p-4 flex-1 flex flex-col bg-white">
                      <h3 className="text-base font-bold text-primary mb-1">
                        {leader.name}
                      </h3>
                      <p className="text-accent font-semibold text-xs uppercase mb-2">
                        {leader.title}
                      </p>
                      
                      {leader.bio && (
                        <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                          {leader.bio}
                        </p>
                      )}
                    </div>

                    <div className="h-1 bg-accent" />
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-3 mt-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
