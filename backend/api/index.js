const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Prisma client with enhanced error handling for serverless
let prisma = null;
let prismaInitError = null;

const initializePrisma = () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  DATABASE_URL environment variable not set');
      prismaInitError = 'DATABASE_URL not configured';
      return false;
    }

    prisma = new PrismaClient({
      log: ['error', 'warn'],
      errorFormat: 'colorless',
    });
    
    console.log('✅ Prisma client initialized successfully');
    prismaInitError = null;
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Prisma client:', error.message);
    prismaInitError = error.message;
    prisma = null;
    return false;
  }
};

// Initialize Prisma on startup
initializePrisma();

// Helper function to check if Prisma is available
const isPrismaAvailable = () => prisma !== null;

// Helper function to handle database errors gracefully
const handlePrismaError = (error, fallbackData = null) => {
  const isConnectionError = error?.code === 'P1001' || 
                           error?.message?.includes('connect') || 
                           error?.message?.includes('database') ||
                           error?.message?.includes('ECONNREFUSED');
  
  if (isConnectionError) {
    console.warn('⚠️  Database connection error:', error.message);
    return { isConnectionError: true, fallbackData };
  }
  
  console.error('❌ Database error:', error.message);
  return { isConnectionError: false, error };
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: ['https://bgfront.vercel.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Additional CORS headers for serverless compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://bgfront.vercel.app');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Prevent caching to ensure updates show immediately
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// File upload configuration - Note: In serverless, file storage is temporary
// For production, consider using Vercel Blob or cloud storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join('/tmp', 'uploads'); // Use /tmp for serverless
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Email configuration
let transporter = null;
try {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} catch (error) {
  console.warn('Email service not configured. Email notifications will be disabled.');
  transporter = null;
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'BUCCUSA API is running',
    status: 'OK',
    database: isPrismaAvailable() ? 'configured' : 'not configured',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint with detailed status
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      configured: isPrismaAvailable(),
      error: prismaInitError || null
    },
    services: {
      email: transporter !== null ? 'available' : 'unavailable'
    }
  };

  // Try to ping database if available
  if (isPrismaAvailable()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.database.connected = true;
      health.database.latency = 'low';
    } catch (error) {
      health.database.connected = false;
      health.database.error = error.message;
      health.status = 'DEGRADED';
    }
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Routes

// Admin authentication
app.post('/api/admin/login', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const admin = await prisma.admin.findUnique({
      where: { username }
    });

    if (!admin) {
      console.log(`Login failed: Admin user '${username}' not found`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      console.log(`Login failed: Invalid password for '${username}'`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, admin: { id: admin.id, username: admin.username, email: admin.email } });
  } catch (error) {
    console.error('Login error:', error);
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

// Public routes
app.get('/api/programs', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      console.log('Database not available, returning empty programs list');
      return res.json([]);
    }

    const programs = await prisma.program.findMany({
      orderBy: {
        id: 'asc'
      }
    });
    res.json(programs);
  } catch (error) {
    const { isConnectionError, fallbackData } = handlePrismaError(error, []);
    if (isConnectionError) {
      return res.json(fallbackData);
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/leaders', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      console.log('Database not available, returning mock leaders');
      return res.json([
        {
          id: 1,
          name: "John Doe",
          title: "President",
          bio: "Dedicated to serving the BUCCUSA community",
          photoUrl: null,
          orderPosition: 1,
          isActive: true
        }
      ]);
    }

    const leaders = await prisma.leader.findMany({
      orderBy: {
        orderPosition: 'asc'
      }
    });
    res.json(leaders);
  } catch (error) {
    const mockData = [
      {
        id: 1,
        name: "John Doe",
        title: "President",
        bio: "Dedicated to serving the BUCCUSA community",
        photoUrl: null,
        orderPosition: 1,
        isActive: true
      }
    ];
    
    const { isConnectionError } = handlePrismaError(error, mockData);
    if (isConnectionError) {
      return res.json(mockData);
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      console.log('Database not available, returning mock events');
      return res.json([
        {
          id: 1,
          title: "BUCCUSA Orientation",
          description: "Welcome event for new students",
          eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: "Main Campus",
          imageUrl: null,
          isUpcoming: true,
          createdAt: new Date().toISOString()
        }
      ]);
    }

    const events = await prisma.event.findMany({
      orderBy: {
        eventDate: 'desc'
      }
    });
    res.json(events);
  } catch (error) {
    const mockData = [
      {
        id: 1,
        title: "BUCCUSA Orientation",
        description: "Welcome event for new students",
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: "Main Campus",
        imageUrl: null,
        isUpcoming: true,
        createdAt: new Date().toISOString()
      }
    ];

    const { isConnectionError } = handlePrismaError(error, mockData);
    if (isConnectionError) {
      return res.json(mockData);
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const event = await prisma.event.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      console.log('Database not available, returning mock posts');
      return res.json([
        {
          id: 1,
          title: "Welcome to BUCCUSA",
          excerpt: "Welcome to the BUCCUSA Student Association",
          content: "Welcome to the BUCCUSA Student Association website. We're excited to have you here!",
          imageUrl: null,
          published: true,
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      ]);
    }

    const posts = await prisma.post.findMany({
      where: {
        published: true
      },
      orderBy: {
        publishedAt: 'desc'
      }
    });
    res.json(posts);
  } catch (error) {
    const mockData = [
      {
        id: 1,
        title: "Welcome to BUCCUSA",
        excerpt: "Welcome to the BUCCUSA Student Association",
        content: "Welcome to the BUCCUSA Student Association website. We're excited to have you here!",
        imageUrl: null,
        published: true,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];

    const { isConnectionError } = handlePrismaError(error, mockData);
    if (isConnectionError) {
      return res.json(mockData);
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const post = await prisma.post.findFirst({
      where: {
        id: parseInt(req.params.id),
        published: true
      }
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

app.get('/api/impact-stats', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      console.log('Database not available, returning empty impact stats');
      return res.json([]);
    }

    const impactStats = await prisma.impactStat.findMany();
    res.json(impactStats);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error, []);
    if (isConnectionError) {
      return res.json([]);
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/testimonials', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      console.log('Database not available, returning empty testimonials');
      return res.json([]);
    }

    const testimonials = await prisma.testimonial.findMany();
    res.json(testimonials);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error, []);
    if (isConnectionError) {
      return res.json([]);
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      console.log('Database not available, returning empty gallery');
      return res.json([]);
    }

    const gallery = await prisma.gallery.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(gallery);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error, []);
    if (isConnectionError) {
      return res.json([]);
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Contact form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Insert into database if available
    if (isPrismaAvailable()) {
      try {
        await prisma.contactMessage.create({
          data: {
            name,
            email,
            subject,
            message
          }
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        const { isConnectionError } = handlePrismaError(dbError);
        if (!isConnectionError) {
          return res.status(500).json({ message: 'Database error', error: dbError.message });
        }
        // If connection error, continue to send email anyway
      }
    } else {
      console.warn('Database not available, contact message will only be sent via email');
    }

    // Send email notification (optional)
    if (transporter) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: process.env.ADMIN_EMAIL || 'bungomastudent@gmail.com',
          subject: 'New Contact Message - BUCCUSA',
          html: `
            <h3>New Contact Message</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `
        };
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Partnership form
app.post('/api/partnership', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const { organizationName, contactPerson, email, phone, partnershipType, message } = req.body;

    try {
      await prisma.partnershipRequest.create({
        data: {
          organizationName,
          contactPerson,
          email,
          phone,
          partnershipType,
          message
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      const { isConnectionError } = handlePrismaError(dbError);
      if (!isConnectionError) {
        return res.status(500).json({ message: 'Database error', error: dbError.message });
      }
    }

    // Send email notification
    if (transporter) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: process.env.ADMIN_EMAIL || 'bungomastudent@gmail.com',
          subject: 'New Partnership Request - BUCCUSA',
          html: `
            <h3>New Partnership Request</h3>
            <p><strong>Organization:</strong> ${organizationName}</p>
            <p><strong>Contact Person:</strong> ${contactPerson}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Type:</strong> ${partnershipType}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `
        };
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
    }

    res.json({ message: 'Partnership request submitted successfully' });
  } catch (error) {
    console.error('Partnership form error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Volunteer form
app.post('/api/volunteer', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const { name, email, phone, interests, experience } = req.body;

    try {
      await prisma.volunteerSubmission.create({
        data: {
          name,
          email,
          phone,
          interests,
          experience
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      const { isConnectionError } = handlePrismaError(dbError);
      if (!isConnectionError) {
        return res.status(500).json({ message: 'Database error', error: dbError.message });
      }
    }

    // Send email notification
    if (transporter) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: process.env.ADMIN_EMAIL || 'bungomastudent@gmail.com',
          subject: 'New Volunteer Application - BUCCUSA',
          html: `
            <h3>New Volunteer Application</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Interests:</strong> ${interests}</p>
            <p><strong>Experience:</strong></p>
            <p>${experience}</p>
          `
        };
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
    }

    res.json({ message: 'Volunteer application submitted successfully' });
  } catch (error) {
    console.error('Volunteer form error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin routes (protected)
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError,
        stats: {
          unreadMessages: 0,
          totalMessages: 0,
          publishedPosts: 0,
          totalPosts: 0,
          totalEvents: 0,
          activePrograms: 0,
          totalPrograms: 0,
          totalTestimonials: 0,
          totalStats: 0,
          activeLeaders: 0,
          activeMembers: 0
        },
        recentContacts: []
      });
    }

    // Get comprehensive stats using Prisma
    const [
      unreadMessages,
      totalMessages,
      publishedPosts,
      totalPosts,
      totalEvents,
      activePrograms,
      totalPrograms,
      totalTestimonials,
      totalStats,
      activeLeaders,
      activeMembers
    ] = await Promise.all([
      prisma.contactMessage.count({ where: { isRead: false } }),
      prisma.contactMessage.count(),
      prisma.post.count({ where: { published: true } }),
      prisma.post.count(),
      prisma.event.count(),
      prisma.program.count({ where: { isActive: true } }),
      prisma.program.count(),
      prisma.testimonial.count(),
      prisma.impactStat.count(),
      prisma.leader.count({ where: { isActive: true } }),
      prisma.member.count({ where: { isActive: true } })
    ]);

    const stats = {
      unreadMessages,
      totalMessages,
      publishedPosts,
      totalPosts,
      totalEvents,
      activePrograms,
      totalPrograms,
      totalTestimonials,
      totalStats,
      activeLeaders,
      activeMembers
    };

    // Get recent contacts
    const recentContacts = await prisma.contactMessage.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log('Dashboard stats retrieved successfully');

    res.json({
      stats,
      recentContacts
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

// CRUD operations for admin
app.get('/api/admin/programs', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const programs = await prisma.program.findMany({
      orderBy: {
        id: 'asc'
      }
    });
    res.json(programs);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

app.post('/api/admin/programs', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const { title, description, icon } = req.body;
    const program = await prisma.program.create({
      data: {
        title,
        description: description || null,
        icon: icon || null,
        isActive: true
      }
    });
    res.json({ id: program.id, message: 'Program created successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

app.put('/api/admin/programs/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const { title, description, icon, isActive } = req.body;
    await prisma.program.update({
      where: { id: parseInt(req.params.id) },
      data: {
        title,
        description: description || null,
        icon: icon || null,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });
    res.json({ message: 'Program updated successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

app.delete('/api/admin/programs/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    await prisma.program.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

// CRUD for Leaders (Officials)
app.get('/api/admin/leaders', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const leaders = await prisma.leader.findMany({
      orderBy: {
        orderPosition: 'asc'
      }
    });
    res.json(leaders);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

app.post('/api/admin/leaders', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const { name, title, bio, photoUrl } = req.body;

    // Get max order_position
    const maxOrder = await prisma.leader.aggregate({
      _max: {
        orderPosition: true
      }
    });
    const nextOrder = (maxOrder._max.orderPosition || 0) + 1;

    const leader = await prisma.leader.create({
      data: {
        name,
        title,
        bio,
        photoUrl,
        orderPosition: nextOrder,
        isActive: true
      }
    });

    res.json({ id: leader.id, message: 'Official added successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

app.put('/api/admin/leaders/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    const { name, title, bio, photoUrl, orderPosition, isActive } = req.body;

    await prisma.leader.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        title,
        bio,
        photoUrl,
        orderPosition,
        isActive
      }
    });

    res.json({ message: 'Official updated successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});

app.delete('/api/admin/leaders/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ 
        message: 'Database service unavailable',
        error: prismaInitError 
      });
    }

    await prisma.leader.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Official deleted successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ 
      message: isConnectionError ? 'Database connection failed' : 'Server error',
      error: error.message 
    });
  }
});


// CRUD for Members
app.get('/api/admin/members', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const members = await prisma.member.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(members);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.post('/api/admin/members', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { name, email, phone, position, department, photoUrl, bio } = req.body;
    const member = await prisma.member.create({ data: { name, email, phone, position, department, photoUrl, bio } });
    res.json({ id: member.id, message: 'Member added successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.put('/api/admin/members/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { name, email, phone, position, department, photoUrl, bio, isActive } = req.body;
    await prisma.member.update({ where: { id: parseInt(req.params.id) }, data: { name, email, phone, position, department, photoUrl, bio, isActive } });
    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.delete('/api/admin/members/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    await prisma.member.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

// CRUD for Events
app.get('/api/admin/events', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const events = await prisma.event.findMany({ orderBy: { eventDate: 'desc' } });
    res.json(events);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.post('/api/admin/events', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { title, description, eventDate, location, imageUrl, isUpcoming } = req.body;
    const event = await prisma.event.create({ data: { title, description, eventDate: new Date(eventDate), location, imageUrl, isUpcoming } });
    res.json({ id: event.id, message: 'Event created successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.put('/api/admin/events/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { title, description, eventDate, location, imageUrl, isUpcoming } = req.body;
    await prisma.event.update({ where: { id: parseInt(req.params.id) }, data: { title, description, eventDate: eventDate ? new Date(eventDate) : undefined, location, imageUrl, isUpcoming } });
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.delete('/api/admin/events/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    await prisma.event.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

// Contact Messages Management
app.get('/api/admin/messages', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(messages);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.post('/api/admin/messages/:id/reply', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { replyText } = req.body;
    const messageId = parseInt(req.params.id);
    if (!replyText) return res.status(400).json({ message: 'Reply text is required' });

    const message = await prisma.contactMessage.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ message: 'Message not found' });

    await prisma.contactMessage.update({ where: { id: messageId }, data: { isRead: true } });

    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: message.email,
          subject: `Re: ${message.subject}`,
          html: `<h3>Thank you for your message</h3><p>Dear ${message.name},</p><p>${replyText}</p><p>Best regards,<br>BUCCUSA Team</p>`
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
        return res.json({ message: 'Reply saved but email sending failed' });
      }
    }
    res.json({ message: 'Reply sent successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.put('/api/admin/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    await prisma.contactMessage.update({ where: { id: parseInt(req.params.id) }, data: { isRead: true } });
    res.json({ message: 'Message marked as read' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.delete('/api/admin/messages/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    await prisma.contactMessage.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

// CRUD for Posts (Announcements)
app.get('/api/admin/posts', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const posts = await prisma.post.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(posts);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.post('/api/admin/posts', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { title, content, excerpt, imageUrl, published } = req.body;
    const post = await prisma.post.create({ data: { title, content, excerpt, imageUrl, published, publishedAt: published ? new Date() : null } });
    res.json({ id: post.id, message: 'Post created successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.put('/api/admin/posts/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { title, content, excerpt, imageUrl, published } = req.body;
    await prisma.post.update({ where: { id: parseInt(req.params.id) }, data: { title, content, excerpt, imageUrl, published, publishedAt: published ? new Date() : null } });
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.delete('/api/admin/posts/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    await prisma.post.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

// CRUD for Testimonials
app.get('/api/admin/testimonials', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const testimonials = await prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(testimonials);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.post('/api/admin/testimonials', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { name, role, content, image } = req.body;
    const testimonial = await prisma.testimonial.create({ data: { name, role, content, image } });
    res.json({ id: testimonial.id, message: 'Testimonial created successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.put('/api/admin/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { name, role, content, image } = req.body;
    await prisma.testimonial.update({ where: { id: parseInt(req.params.id) }, data: { name, role, content, image } });
    res.json({ message: 'Testimonial updated successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.delete('/api/admin/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    await prisma.testimonial.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

// CRUD for Impact Stats
app.get('/api/admin/impact-stats', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const impactStats = await prisma.impactStat.findMany({ orderBy: { id: 'asc' } });
    res.json(impactStats);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.post('/api/admin/impact-stats', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { number, label, icon } = req.body;
    const impactStat = await prisma.impactStat.create({ data: { number: parseInt(number), label, icon: icon || 'users' } });
    res.json({ id: impactStat.id, message: 'Stat created successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.put('/api/admin/impact-stats/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    const { number, label, icon } = req.body;
    await prisma.impactStat.update({ where: { id: parseInt(req.params.id) }, data: { number: parseInt(number), label, icon: icon || 'users' } });
    res.json({ message: 'Stat updated successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

app.delete('/api/admin/impact-stats/:id', authenticateToken, async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }
    await prisma.impactStat.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Stat deleted successfully' });
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    res.status(isConnectionError ? 503 : 500).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message });
  }
});

// File upload route
app.post('/api/admin/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`
  });
});

// Serve uploaded files - Note: In serverless, static files need special handling
app.use('/uploads', express.static(path.join('/tmp', 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Export the Express app for Vercel
module.exports = app;