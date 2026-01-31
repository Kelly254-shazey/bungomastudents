// Admin login layout - separate from admin panel (no sidebar, no nav, no chatbot)

export const metadata = {
  title: 'BUCCUSA Admin Login',
  description: 'Admin login for BUCCUSA website',
}

export default function AdminLoginLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      {children}
    </div>
  )
}
