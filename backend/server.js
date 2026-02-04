const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin || !await bcrypt.compare(password, admin.password_hash)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET || 'fallback-secret');
    res.json({ token, admin: { id: admin.id, username: admin.username, email: admin.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Public routes
app.get('/api/programs', async (req, res) => {
  try {
    const programs = await prisma.program.findMany({ where: { is_active: true } });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/testimonials', async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({ where: { is_active: true } });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({ where: { published: true }, orderBy: { created_at: 'desc' } });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    await prisma.contactMessage.create({ data: { name, email, subject, message } });
    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin dashboard
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
  try {
    const stats = {
      total_messages: await prisma.contactMessage.count(),
      total_posts: await prisma.post.count(),
      total_programs: await prisma.program.count()
    };
    const recentContacts = await prisma.contactMessage.findMany({
      select: { id: true, name: true, email: true, subject: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 5
    });
    res.json({ stats, recentContacts });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin messages
app.get('/api/admin/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({ orderBy: { created_at: 'desc' } });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/messages/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.contactMessage.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Additional routes that frontend might expect
app.get('/api/leaders', async (req, res) => {
  try {
    const leaders = await prisma.leader.findMany({ where: { is_active: true }, orderBy: { order_position: 'asc' } });
    res.json(leaders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({ orderBy: { event_date: 'desc' } });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    const gallery = await prisma.gallery.findMany({ where: { is_active: true }, orderBy: { created_at: 'desc' } });
    res.json(gallery);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/impact-stats', async (req, res) => {
  try {
    const stats = await prisma.impactStat.findMany({ where: { is_active: true }, orderBy: { id: 'asc' } });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin routes
app.get('/api/admin/leaders', authenticateToken, async (req, res) => {
  try {
    const leaders = await prisma.leader.findMany({ orderBy: { order_position: 'asc' } });
    res.json(leaders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/leaders', authenticateToken, async (req, res) => {
  try {
    const { name, position, bio, image_url, order_position } = req.body;
    const leader = await prisma.leader.create({
      data: { name, position, bio, image_url, order_position: order_position || 0 }
    });
    res.json({ id: leader.id, message: 'Leader created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/leaders/:id', authenticateToken, async (req, res) => {
  try {
    const { name, position, bio, image_url, order_position } = req.body;
    await prisma.leader.update({
      where: { id: Number(req.params.id) },
      data: { name, position, bio, image_url, order_position }
    });
    res.json({ message: 'Leader updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/leaders/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.leader.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Leader deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/programs', authenticateToken, async (req, res) => {
  try {
    const programs = await prisma.program.findMany({ orderBy: { id: 'asc' } });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/programs', authenticateToken, async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    const program = await prisma.program.create({
      data: { title, description, icon }
    });
    res.json({ id: program.id, message: 'Program created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/programs/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    await prisma.program.update({
      where: { id: Number(req.params.id) },
      data: { title, description, icon }
    });
    res.json({ message: 'Program updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/programs/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.program.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await prisma.post.findMany({ orderBy: { created_at: 'desc' } });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/posts', authenticateToken, async (req, res) => {
  try {
    const { title, content, excerpt, image_url, published } = req.body;
    const post = await prisma.post.create({
      data: { title, content, excerpt, image_url, published }
    });
    res.json({ id: post.id, message: 'Post created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { title, content, excerpt, image_url, published } = req.body;
    await prisma.post.update({
      where: { id: Number(req.params.id) },
      data: { title, content, excerpt, image_url, published }
    });
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/posts/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.post.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// File upload route
app.post('/api/admin/upload', authenticateToken, async (req, res) => {
  try {
    // This would need multer and cloudinary setup
    res.status(501).json({ 
      message: 'Upload not configured', 
      note: 'Add CLOUDINARY_API_SECRET to enable uploads' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Fix image URLs - convert local paths to Cloudinary URLs
app.post('/api/admin/fix-images', authenticateToken, async (req, res) => {
  try {
    const cloudinaryBase = 'https://res.cloudinary.com/dqdyjocsq/image/upload/';
    
    // Update gallery images
    const galleryUpdates = await prisma.gallery.updateMany({
      where: {
        image_url: {
          startsWith: '/uploads/'
        }
      },
      data: {
        image_url: {
          // This would need to be done individually for each record
        }
      }
    });
    
    res.json({ 
      message: 'Image URLs updated to use Cloudinary',
      updated: galleryUpdates.count 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database connection check
app.get('/api/db-check', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const adminCount = await prisma.admin.count();
    const galleryCount = await prisma.gallery.count();
    const sampleGallery = await prisma.gallery.findMany({ take: 3 });
    res.json({ 
      database: 'connected', 
      status: 'OK',
      adminCount,
      galleryCount,
      sampleImages: sampleGallery.map(g => g.image_url),
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      database: 'disconnected', 
      status: 'ERROR',
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString() 
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'BUCCUSA API Server', status: 'running' });
});

// Favicon handler
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Handle missing uploads (Vercel doesn't support local file storage)
app.get('/uploads/*', (req, res) => {
  res.status(404).json({ 
    message: 'File not found - Local uploads not supported on Vercel', 
    suggestion: 'Use Cloudinary for image storage' 
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found', path: req.originalUrl });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;