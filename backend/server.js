const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const router = express.Router();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Storage Configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'bungoma-students',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});
const upload = multer({ storage: storage });

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
router.post('/api/admin/login', async (req, res) => {
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
router.get('/programs', async (req, res) => {
  try {
    const programs = await prisma.program.findMany({ where: { is_active: true } });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/testimonials', async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({ where: { is_active: true } });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({ where: { published: true }, orderBy: { created_at: 'desc' } });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/contact', async (req, res) => {
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
router.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
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

// Admin messages
router.get('/api/admin/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({ orderBy: { created_at: 'desc' } });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/api/admin/messages/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.contactMessage.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Additional routes that frontend might expect
router.get('/leaders', async (req, res) => {
  try {
    const leaders = await prisma.leader.findMany({ where: { is_active: true }, orderBy: { order_position: 'asc' } });
    res.json(leaders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({ orderBy: { event_date: 'desc' } });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin events
router.get('/api/admin/events', authenticateToken, async (req, res) => {
  try {
    const events = await prisma.event.findMany({ orderBy: { event_date: 'desc' } });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/api/admin/events', authenticateToken, async (req, res) => {
  try {
    const { title, description, event_date, location, image_url, is_upcoming } = req.body;
    const event = await prisma.event.create({
      data: { title, description, event_date: new Date(event_date), location, image_url, is_upcoming: is_upcoming ?? true }
    });
    res.json({ id: event.id, message: 'Event created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/api/admin/events/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, event_date, location, image_url, is_upcoming } = req.body;
    await prisma.event.update({
      where: { id: Number(req.params.id) },
      data: { title, description, event_date: new Date(event_date), location, image_url, is_upcoming }
    });
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/api/admin/events/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/gallery', async (req, res) => {
  try {
    const gallery = await prisma.gallery.findMany({ where: { is_active: true }, orderBy: { created_at: 'desc' } });
    res.json(gallery);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/impact-stats', async (req, res) => {
  try {
    const stats = await prisma.impactStat.findMany({ where: { is_active: true }, orderBy: { id: 'asc' } });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin routes
router.get('/api/admin/leaders', authenticateToken, async (req, res) => {
  try {
    const leaders = await prisma.leader.findMany({ orderBy: { order_position: 'asc' } });
    res.json(leaders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/api/admin/leaders', authenticateToken, async (req, res) => {
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

router.put('/api/admin/leaders/:id', authenticateToken, async (req, res) => {
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

router.delete('/api/admin/leaders/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.leader.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Leader deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/api/admin/programs', authenticateToken, async (req, res) => {
  try {
    const programs = await prisma.program.findMany({ orderBy: { id: 'asc' } });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/api/admin/programs', authenticateToken, async (req, res) => {
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

router.put('/api/admin/programs/:id', authenticateToken, async (req, res) => {
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

router.delete('/api/admin/programs/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.program.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/api/admin/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await prisma.post.findMany({ orderBy: { created_at: 'desc' } });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/api/admin/posts', authenticateToken, async (req, res) => {
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

router.put('/api/admin/posts/:id', authenticateToken, async (req, res) => {
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

router.delete('/api/admin/posts/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.post.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin testimonials
router.get('/api/admin/testimonials', authenticateToken, async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({ orderBy: { created_at: 'desc' } });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/api/admin/testimonials', authenticateToken, async (req, res) => {
  try {
    const { name, message, position, photo_url, is_active } = req.body;
    const testimonial = await prisma.testimonial.create({
      data: { name, message, position, photo_url, is_active: is_active ?? true }
    });
    res.json({ id: testimonial.id, message: 'Testimonial created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/api/admin/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    const { name, message, position, photo_url, is_active } = req.body;
    await prisma.testimonial.update({
      where: { id: Number(req.params.id) },
      data: { name, message, position, photo_url, is_active }
    });
    res.json({ message: 'Testimonial updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/api/admin/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.testimonial.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin impact stats
router.get('/api/admin/impact-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await prisma.impactStat.findMany({ orderBy: { id: 'asc' } });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/api/admin/impact-stats', authenticateToken, async (req, res) => {
  try {
    const { label, icon, value, suffix, is_active } = req.body;
    const stat = await prisma.impactStat.create({
      data: { label, icon, value: Number(value), suffix: suffix || '', is_active: is_active ?? true }
    });
    res.json({ id: stat.id, message: 'Impact stat created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/api/admin/impact-stats/:id', authenticateToken, async (req, res) => {
  try {
    const { label, icon, value, suffix, is_active } = req.body;
    await prisma.impactStat.update({
      where: { id: Number(req.params.id) },
      data: { label, icon, value: Number(value), suffix, is_active }
    });
    res.json({ message: 'Impact stat updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/api/admin/impact-stats/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.impactStat.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Impact stat deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// File upload route
router.post('/api/admin/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  res.json({ 
    message: 'File uploaded successfully', 
    url: req.file.path,
    filename: req.file.filename
  });
});



// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database connection check
router.get('/db-check', async (req, res) => {
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
router.get('/', (req, res) => {
  res.json({ 
    message: 'BUCCUSA API Server', 
    status: 'running',
    version: '1.0.1',
    timestamp: new Date().toISOString()
  });
});

// Favicon handler
router.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Handle missing uploads (Vercel doesn't support local file storage)
router.get('/uploads/*', (req, res) => {
  res.status(404).json({ 
    message: 'File not found - Local uploads not supported on Vercel', 
    suggestion: 'Use Cloudinary for image storage' 
  });
});

// Mount the router to handle both /api/* and /* requests
app.use('/api', router);
app.use('/', router);

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