'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! 👋 I'm BUCCUSA's Assistant. I can help you with information about our website, programs, events, and more. What would you like to know?",
      sender: 'bot',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const pathname = usePathname()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Don't render chatbot on admin routes (including /admin/login)
  if (pathname && pathname.startsWith('/admin')) return null

  const websiteKnowledge = {
    greetings: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    about: ['about', 'who are you', 'what is buccusa', 'tell me about'],
    programs: ['programs', 'what do you offer', 'activities', 'what programs'],
    leaders: ['leaders', 'officials', 'team', 'staff', 'who runs'],
    events: ['events', 'upcoming', 'activities', 'when is', 'event'],
    announcements: ['announcement', 'news', 'latest', 'update'],
    contact: ['contact', 'email', 'reach out', 'get in touch', 'phone'],
    apply: ['apply', 'join', 'membership', 'how to join', 'register'],
    impact: ['impact', 'achievements', 'results', 'statistics'],
  }

  const getResponse = (userMessage) => {
    const message = userMessage.toLowerCase().trim()

    // Check for greetings
    if (websiteKnowledge.greetings.some(word => message.includes(word))) {
      return "Hello! Welcome to BUCCUSA! 😊 I can help you with information about our organization, programs, events, leaders, and more. What would you like to know?"
    }

    // About BUCCUSA
    if (websiteKnowledge.about.some(word => message.includes(word))) {
      return "BUCCUSA is the Bungoma County College and University Students Association - a youth-led institution rooted in Bungoma and rising beyond. We promote leadership, mentorship, and community development through various programs and initiatives. Is there something specific you'd like to know?"
    }

    // Programs
    if (websiteKnowledge.programs.some(word => message.includes(word))) {
      return "We offer several programs including leadership development, mentorship initiatives, community service projects, and educational workshops. Visit our Programs section on the website to learn more about each program in detail."
    }

    // Leaders/Team
    if (websiteKnowledge.leaders.some(word => message.includes(word))) {
      return "Our organization is led by dedicated officials from various counties and institutions. Check out our Leaders section on the homepage to meet the team members and learn about their roles and backgrounds."
    }

    // Events
    if (websiteKnowledge.events.some(word => message.includes(word))) {
      return "We regularly organize events and activities to engage with our members and community. Visit our Events section to see upcoming activities, dates, locations, and details about what we have planned!"
    }

    // Announcements
    if (websiteKnowledge.announcements.some(word => message.includes(word))) {
      return "For the latest news and announcements from BUCCUSA, check our Announcements section on the homepage. We keep our community updated with important information and exciting news!"
    }

    // Contact
    if (websiteKnowledge.contact.some(word => message.includes(word))) {
      return "You can reach us through our Contact page where you'll find our contact form, email, and other ways to get in touch with us. Our team is always ready to help!"
    }

    // Apply/Join
    if (websiteKnowledge.apply.some(word => message.includes(word))) {
      return "We'd love to have you join BUCCUSA! Please visit our Contact page to reach out with your interest in joining or get more information about membership requirements."
    }

    // Impact
    if (websiteKnowledge.impact.some(word => message.includes(word))) {
      return "BUCCUSA has made significant impact in our communities through various initiatives. Visit our Impact section on the homepage to see our achievements, statistics, and the difference we're making!"
    }

    // Default - redirect to contact
    return "I'm specialized in answering questions about our website and BUCCUSA. For more detailed inquiries or topics beyond our website, please visit our Contact page where our team can assist you better. 😊"
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: input,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate bot thinking
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: getResponse(input),
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botResponse])
      setIsTyping(false)
    }, 500)
  }

  return (
    <>
      {/* Chat Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-primary hover:bg-opacity-90 text-white rounded-full p-3 sm:p-4 shadow-lg transition-all duration-300"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-6rem)] sm:max-h-[600px]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-secondary text-white p-3 sm:p-4 rounded-t-lg flex justify-between items-center gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base sm:text-lg truncate">BUCCUSA Assistant</h3>
                <p className="text-xs sm:text-sm text-gray-200">Website Support</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs sm:max-w-sm px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-sm break-words ${
                        message.sender === 'user'
                          ? 'bg-primary text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                      }`}
                    >
                      <p className="text-xs sm:text-sm">{message.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white text-gray-800 border border-gray-200 px-4 py-2 rounded-lg rounded-bl-none">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length === 1 && (
              <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-white">
                <p className="text-xs text-gray-600 mb-2">Quick topics:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['About BUCCUSA', 'Programs', 'Events', 'Contact Us'].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => {
                        setInput(topic)
                        setTimeout(() => {
                          const form = document.querySelector('form')
                          form?.dispatchEvent(new Event('submit', { bubbles: true }))
                        }, 0)
                      }}
                      className="text-xs bg-gray-100 hover:bg-primary hover:text-white text-gray-700 px-2 py-1 rounded transition-colors truncate"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-gray-200 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-primary hover:bg-opacity-90 disabled:opacity-50 text-white px-3 sm:px-4 py-2 rounded-lg transition-all flex-shrink-0"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>

            {/* Footer */}
            <div className="px-3 sm:px-4 py-2 bg-gray-50 border-t border-gray-200 rounded-b-lg text-center text-xs text-gray-600">
              For more help, visit our{' '}
              <Link href="#contact" className="text-primary hover:underline font-semibold">
                Contact page
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
