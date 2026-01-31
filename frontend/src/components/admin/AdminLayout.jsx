'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { clearAuth, getAdminUser } from '@/lib/auth'

export function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminUser, setAdminUser] = useState(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Don't redirect on login page
    if (pathname === '/admin/login') {
      return
    }
    
    const user = getAdminUser()
    if (!user) {
      router.push('/admin/login')
    } else {
      setAdminUser(user)
    }
  }, [router, pathname])

  const handleLogout = () => {
    clearAuth()
    router.push('/admin/login')
  }

  const menuItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/programs', label: 'Programs', icon: '📚' },
    { href: '/admin/events', label: 'Events', icon: '📅' },
    { href: '/admin/leaders', label: 'Officials', icon: '👔' },
    { href: '/admin/messages', label: 'Messages', icon: '💬' },
    { href: '/admin/announcements', label: 'Announcements', icon: '📢' },
    { href: '/admin/testimonials', label: 'Testimonials', icon: '⭐' },
    { href: '/admin/stats', label: 'Impact Stats', icon: '📈' },
  ]

  // Don't render layout on login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Show loading while checking authentication
  if (!adminUser && pathname !== '/admin/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-950">
        <div className="text-center">
          <div className="text-white mb-2">Loading...</div>
          <div className="text-sm text-gray-300">Checking authentication...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-950 overflow-x-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-heading font-bold text-lg">BUCCUSA Admin</span>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-primary text-white shadow-lg z-40 flex-col">
        <div className="p-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <Link href="/admin/dashboard" className="flex items-center space-x-2 mb-8">
            <h1 className="text-2xl font-heading font-bold">BUCCUSA Admin</h1>
          </Link>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-accent text-primary font-bold shadow-md transform scale-[1.02]'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-white/10 bg-primary/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="overflow-hidden">
              <p className="font-semibold truncate">{adminUser?.username}</p>
              <p className="text-xs text-gray-400 truncate">{adminUser?.email || 'Admin'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white border border-red-500/30 px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <span>Logout</span>
          </button>
          <Link
            href="/"
            target="_blank"
            className="block mt-3 text-center text-xs text-gray-400 hover:text-accent transition-colors"
          >
            View Website →
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="fixed left-0 top-0 h-full w-72 bg-primary text-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-heading font-bold">BUCCUSA Admin</h1>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-white">
                  ✕
                </button>
              </div>
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-accent text-primary font-bold shadow-md'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="p-6 border-t border-white/10 bg-primary/50">
              <div className="flex items-center justify-between mb-4">
                <div className="overflow-hidden">
                  <p className="font-semibold truncate">{adminUser?.username}</p>
                  <p className="text-xs text-gray-400 truncate">{adminUser?.email || 'Admin'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white border border-red-500/30 px-4 py-2 rounded-lg transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen transition-all duration-300">
        {children}
      </main>
    </div>
  )
}
