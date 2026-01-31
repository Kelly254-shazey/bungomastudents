// Admin layout - separate from public layout (no Navigation component)
import { AdminLayout } from '@/components/admin/AdminLayout'

export const metadata = {
  title: 'BUCCUSA Admin Panel',
  description: 'Admin panel for BUCCUSA website management',
}

export default function AdminLayoutWrapper({ children }) {
  return (
    <AdminLayout>{children}</AdminLayout>
  )
}
