'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

export function About() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <section id="about" className="section-padding bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="grid lg:grid-cols-2 gap-12 items-center"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-6">
              About BUCCUSA
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                The Bungoma County College and University Students Association (BUCCUSA) is a
                dynamic youth-led institution dedicated to fostering leadership, mentorship, and
                community development across Bungoma County.
              </p>
              <p>
                Founded with the vision of empowering the next generation, BUCCUSA serves as a
                bridge between academic institutions and community development, creating pathways
                for students to make meaningful contributions to their communities.
              </p>
              <p>
                Through our comprehensive programs in leadership development, mentorship, mental
                health awareness, and anti-drug campaigns, we are building a stronger, more
                resilient Bungoma County.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-xl p-8 text-white transform hover:scale-[1.02] transition-transform duration-300">
              <h3 className="text-2xl font-heading font-bold mb-4">Our Mission</h3>
              <p className="mb-6">
                To empower youth through education, leadership development, and community service,
                creating sustainable positive change in Bungoma County and beyond.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">2500+</div>
                  <div className="text-sm">Students Mentored</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">10+</div>
                  <div className="text-sm">Years of Service</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
