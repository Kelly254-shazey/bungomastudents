// Add missing admin routes
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
  try {
    const stats = {
      unread_messages: await prisma.contactMessage.count({ where: { is_read: false } }),
      total_messages: await prisma.contactMessage.count(),
      published_posts: await prisma.post.count({ where: { published: true } }),
      total_posts: await prisma.post.count(),
      total_events: await prisma.event.count(),
      active_programs: await prisma.program.count({ where: { is_active: true } }),
      total_programs: await prisma.program.count(),
      total_testimonials: await prisma.testimonial.count(),
      total_stats: await prisma.impactStat.count(),
      active_leaders: await prisma.leader.count({ where: { is_active: true } }),
      active_members: await prisma.member.count({ where: { is_active: true } })
    };
    const recentContacts = await prisma.contactMessage.findMany({
      select: { id: true, name: true, email: true, subject: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 5
    });
    res.json({ stats, recentContacts });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;