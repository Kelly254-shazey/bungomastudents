'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export function Footer() {
  const currentYear = new Date().getFullYear()

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

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <footer className="bg-primary text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full section-padding">
        <motion.div className="grid md:grid-cols-4 gap-8" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {/* Brand Section */}
          <motion.div className="md:col-span-2" variants={itemVariants}>
            <motion.h3
              className="text-2xl font-heading font-bold mb-4"
              whileHover={{ scale: 1.05 }}
            >
              BUCCUSA
            </motion.h3>
            <p className="text-gray-300 mb-4 max-w-md">
              Rooted in Bungoma. Rising Beyond. A youth-led institution promoting leadership,
              mentorship, and community development across Bungoma County and beyond.
            </p>
            <div className="flex space-x-4">
              <motion.a
                href="https://twitter.com/buccusa"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-colors duration-200"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </motion.a>
              <motion.a
                href="https://www.instagram.com/bu_ccusa?igsh=MzNlNGNkZWQ4Mg=="
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-colors duration-200"
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C8.396 0 7.996.014 6.79.067 5.584.12 4.775.302 4.084.605c-.713.309-1.318.905-1.618 1.62C2.167 2.94 2.005 3.75 1.96 4.956 1.915 6.162 1.9 6.562 1.9 10.183s.015 4.021.055 5.227c.045 1.206.207 2.016.512 2.727.3.714.905 1.318 1.62 1.618.711.303 1.52.485 2.726.54 1.206.055 1.606.07 5.227.07s4.021-.015 5.227-.07c1.206-.045 2.016-.207 2.727-.512.714-.3 1.318-.905 1.618-1.62.305-.711.487-1.52.54-2.726.06-1.206.07-1.606.07-5.227s-.01-4.021-.07-5.227c-.045-1.206-.207-2.016-.512-2.727-.3-.714-.905-1.318-1.62-1.618C19.06.302 18.25.12 17.044.067 15.838.014 15.438 0 11.817 0zM9.868 2.182c1.086 0 1.926.84 1.926 1.926s-.84 1.926-1.926 1.926-1.926-.84-1.926-1.926.84-1.926 1.926-1.926zm3.135 2.182c1.086 0 1.926.84 1.926 1.926s-.84 1.926-1.926 1.926-1.926-.84-1.926-1.926.84-1.926 1.926-1.926z"/>
                </svg>
              </motion.a>
              <motion.a
                href="https://www.facebook.com/share/1C3BXYhxmY/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-colors duration-200"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.962.925-1.962 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </motion.a>
              <motion.a
                href="https://chat.whatsapp.com/DkRvNQ5wY3FKJ6L2SdmWte"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-colors duration-200"
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm2.232-1.778l5.103-1.361.271.161c1.47.87 3.153 1.329 4.86 1.329 5.197 0 9.425-4.229 9.428-9.428.003-5.197-4.23-9.429-9.428-9.429-5.203 0-9.429 4.232-9.429 9.429 0 1.745.476 3.478 1.381 4.99l.162.27-1.348 5.039zM17.107 17.5c-.3.754-1.616 1.413-2.217 1.495-.587.079-1.253.077-2.015-.223-2.306-.906-3.836-3.306-3.953-3.475-.117-.168-1.186-1.592-1.186-3.037 0-1.445.752-2.16 1.017-2.45.265-.291.574-.365.765-.365.191 0 .383.001.548.011.175.01.41.065.64.621.241.583.823 2.009.894 2.155.071.146.118.322.018.523-.099.201-.15.323-.294.495-.144.172-.303.383-.431.514-.144.145-.296.303-.127.591.169.288.75 1.244 1.611 2.011 1.107.968 2.042 1.267 2.331 1.413.29.146.459.125.63-.071.17-.196.736-.855.93-1.147.193-.292.386-.245.645-.147.259.098 1.648.775 1.93.915.282.14.471.21.539.327.068.117.068.68-.234 1.434z"/>
                </svg>
              </motion.a>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants}>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <motion.a
                  href="#about"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                  whileHover={{ x: 5 }}
                >
                  About Us
                </motion.a>
              </li>
              <li>
                <motion.a
                  href="#programs"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                  whileHover={{ x: 5 }}
                >
                  Our Programs
                </motion.a>
              </li>
              <li>
                <motion.a
                  href="#impact"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                  whileHover={{ x: 5 }}
                >
                  Our Impact
                </motion.a>
              </li>
              <li>
                <motion.a
                  href="#contact"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                  whileHover={{ x: 5 }}
                >
                  Contact
                </motion.a>
              </li>
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={itemVariants}>
            <h4 className="font-semibold mb-4">Contact Info</h4>
            <ul className="space-y-2 text-gray-300">
              <li>Bungoma County, Kenya</li>
              <li>bungomastudents@gmail.com</li>
              <li>+254 112 956937</li>
            </ul>
          </motion.div>
        </motion.div>

        <motion.div
          className="border-t border-white border-opacity-20 mt-8 pt-8 text-center text-gray-300"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <p>&copy; {currentYear} BUCCUSA. All rights reserved. Rooted in Bungoma. Rising Beyond.</p>
          <p>by kellyflotechonologies  gmail:kelly123simiyu@gmail.com</p>
        </motion.div>
      </div>
    </footer>
  )
}
