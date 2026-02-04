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
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Prisma client with enhanced error handling for serverless

app.set('trust proxy', 1); // Trust first proxy

let prisma = null;
let prismaInitError = null;

const initializePrisma = () => {
  try {
    // List of potential environment variables for the database connection
    const candidates = [
      process.env.STORAGE_DATABASE_DATABASE_URL,
      process.env.STORAGE_DATABASE_POSTGRES_URL,
      process.env.STORAGE_DATABASE_URL,
      process.env.DATABASE_URL,
      process.env.POSTGRES_URL
    ];

    // Strictly find a direct Postgres connection (ignoring Accelerate/Proxy URLs)
    const directUrl = candidates.find(url => 
      url && 
      (url.startsWith('postgres://') || url.startsWith('postgresql://')) &&
      !url.startsWith('prisma://') &&
      !url.startsWith('prisma+postgres://')
    );

    // Fallback to Accelerate URL if no direct connection is found
    const accelUrl = candidates.find(url => 
      url && (url.startsWith('prisma://') || url.startsWith('prisma+postgres://'))
    );

    const connectionUrl = directUrl || accelUrl;
    
    console.log(`🔌 Database Init: Using ${directUrl ? 'Direct Connection' : (accelUrl ? 'Accelerate Proxy' : 'None')}`);

    if (!connectionUrl) {
      prismaInitError = 'Database not configured - No valid connection string found';
      return false;
    }

    prisma = new PrismaClient({
      datasources: { db: { url: connectionUrl } }
    });
    
    return true;
  } catch (error) {
    prismaInitError = error.message;
    return false;
  }
};

// Initialize Prisma on startup
initializePrisma();

// Helper function to check if Prisma is available
const isPrismaAvailable = () => prisma !== null;

// Helper function to handle database errors gracefully
const handlePrismaError = (error) => {
  const isConnectionError = error?.code === 'P1001' || 
                           error?.message?.includes('connect') || 
                           error?.message?.includes('database') ||
                           error?.message?.includes('ECONNREFUSED');
  
  // Handle Prisma Accelerate Invalid API Key error (P6002)
  if (error?.code === 'P6002' || (error?.message && error.message.includes('P6002'))) {
    console.error('❌ CRITICAL DATABASE ERROR: Invalid API Key for Prisma Accelerate/Postgres.');
    console.error('   Please rotate your API Key in the Prisma Console and update Vercel Environment Variables.');
    return { isConnectionError: true };
  }

  if (isConnectionError) {
    console.warn('⚠️  Database connection error:', error.message);
    return { isConnectionError: true };
  }
  
  console.error('❌ Database error:', error.message);
  return { isConnectionError: false, error };
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "blob:"],
      "img-src": ["'self'", "data:", "https:", "blob:", "res.cloudinary.com"],
    },
  },
}));
app.use(cors({
  origin: ['https://bgfront.vercel.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
  max: 100, // limit each IP to 100 requests per windowMs
  validate: { xForwardedForHeader: false } // Disable validation to prevent Vercel proxy errors
});
app.use('/api/', limiter);

// File upload configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dqdyjocsq',
  api_key: process.env.CLOUDINARY_API_KEY || '927174813129114',
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log(`📂 Storage Mode: ${process.env.CLOUDINARY_API_SECRET ? 'Cloudinary' : 'Local Disk (Ephemeral)'}`);

const storage = process.env.CLOUDINARY_API_SECRET
  ? new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'bungoma-uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
      },
    })
  : multer.diskStorage({
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

// Debug route to check environment and connection status
app.get('/api/debug', (req, res) => {
  res.json({
    status: 'Debug Endpoint',
    env: {
      has_database_url: !!process.env.DATABASE_URL,
      has_storage_url: !!process.env.STORAGE_DATABASE_DATABASE_URL,
      node_env: process.env.NODE_ENV
    },
    prisma: {
      initialized: isPrismaAvailable(),
      init_error: prismaInitError
    }
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
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
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
    res.status(statusCode).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message, stack: error.stack });
  }
});

app.get('/api/leaders', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }

    const leaders = await prisma.leader.findMany({
      orderBy: {
        order_position: 'asc'
      }
    });
    res.json(leaders);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message, stack: error.stack });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }

    const events = await prisma.event.findMany({
      orderBy: {
        event_date: 'desc'
      }
    });
    res.json(events);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message, stack: error.stack });
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
      error: error.message,
      stack: error.stack
    });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }

    const posts = await prisma.post.findMany({
      where: {
        published: true
      },
      orderBy: {
        published_at: 'desc'
      }
    });
    res.json(posts);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message, stack: error.stack });
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
      error: error.message,
      stack: error.stack
    });
  }
});

app.get('/api/impact-stats', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }

    const impactStats = await prisma.impactStat.findMany(); // Assuming model name is ImpactStat from seed.js
    res.json(impactStats);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message, stack: error.stack });
  }
});

app.get('/api/testimonials', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }

    const testimonials = await prisma.testimonial.findMany();
    res.json(testimonials);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message, stack: error.stack });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    if (!isPrismaAvailable()) {
      return res.status(503).json({ message: 'Database service unavailable', error: prismaInitError });
    }

    const gallery = await prisma.gallery.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(gallery);
  } catch (error) {
    const { isConnectionError } = handlePrismaError(error);
    const statusCode = isConnectionError ? 503 : 500;
    res.status(statusCode).json({ message: isConnectionError ? 'Database connection failed' : 'Server error', error: error.message, stack: error.stack });
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
      try { // Assuming model name is ContactMessage from seed.js
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
      await prisma.partnershipRequest.create({ // Assuming model name is PartnershipRequest
        data: {
          organization_name: organizationName,
          contact_person: contactPerson,
          email,
          phone,
          partnership_type: partnershipType,
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
      await prisma.volunteerSubmission.create({ // Assuming model name is VolunteerSubmission
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
        error: prismaInitError 
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
      prisma.contactMessage.count({ where: { is_read: false } }),
      prisma.contactMessage.count(),
      prisma.post.count({ where: { published: true } }),
      prisma.post.count(),
      prisma.event.count(),
      prisma.program.count({ where: { is_active: true } }),
      prisma.program.count(),
      prisma.testimonial.count(),
      prisma.impactStat.count(),
      prisma.leader.count({ where: { is_active: true } }), 
      prisma.member ? prisma.member.count({ where: { is_active: true } }) : 0 // Handle missing Member model
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
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
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
        is_active: true
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

    const { title, description, icon, is_active } = req.body;
    await prisma.program.update({
      where: { id: parseInt(req.params.id) },
      data: {
        title,
        description: description || null,
        icon: icon || null,
        is_active: is_active !== undefined ? is_active : undefined
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
        order_position: 'asc'
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

    const { name, title, bio, photo_url } = req.body;

    // Get max order_position
    const maxOrder = await prisma.leader.aggregate({
      _max: {
        order_position: true
      }
    });
    const nextOrder = (maxOrder._max.order_position || 0) + 1;

    const leader = await prisma.leader.create({
      data: {
        name,
        title,
        bio,
        photo_url,
        order_position: nextOrder,
        is_active: true
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

    const { name, title, bio, photo_url, order_position, is_active } = req.body;

    await prisma.leader.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        title,
        bio,
        photo_url,
        order_position: order_position,
        is_active: is_active
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

    const id = parseInt(req.params.id);
    try {
      await prisma.leader.delete({
        where: { id }
      });
      res.json({ message: 'Official deleted successfully' });
    } catch (dbError) {
      if (dbError.code === 'P2025') {
        return res.status(404).json({ message: 'Official not found' });
      }
      if (dbError.code === 'P2003') {
        return res.status(400).json({ message: 'Cannot delete official because they are referenced by other records.' });
      }
      throw dbError;
    }
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
    const members = await prisma.member.findMany({ orderBy: { created_at: 'desc' } });
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
    const { name, email, phone, position, department, photo_url, bio } = req.body;
    const member = await prisma.member.create({ data: { name, email, phone, position, department, photo_url, bio } });
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
    const { name, email, phone, position, department, photo_url, bio, is_active } = req.body;
    await prisma.member.update({ where: { id: parseInt(req.params.id) }, data: { name, email, phone, position, department, photo_url, bio, is_active } });
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
    const events = await prisma.event.findMany({ orderBy: { event_date: 'desc' } });
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
    const { title, description, event_date, location, image_url, is_upcoming } = req.body;
    const event = await prisma.event.create({ data: { title, description, event_date: new Date(event_date), location, image_url, is_upcoming } });
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
    const { title, description, event_date, location, image_url, is_upcoming } = req.body;
    await prisma.event.update({ where: { id: parseInt(req.params.id) }, data: { title, description, event_date: event_date ? new Date(event_date) : undefined, location, image_url, is_upcoming } });
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
    const messages = await prisma.contactMessage.findMany({ orderBy: { created_at: 'desc' } });
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
    const { reply_text } = req.body;
    const messageId = parseInt(req.params.id);
    if (!reply_text) return res.status(400).json({ message: 'Reply text is required' });

    const message = await prisma.contactMessage.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ message: 'Message not found' });

    await prisma.contactMessage.update({ where: { id: messageId }, data: { is_read: true } });

    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: message.email,
          subject: `Re: ${message.subject}`,
          html: `<h3>Thank you for your message</h3><p>Dear ${message.name},</p><p>${reply_text}</p><p>Best regards,<br>BUCCUSA Team</p>`
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
    await prisma.contactMessage.update({ where: { id: parseInt(req.params.id) }, data: { is_read: true } });
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
    const posts = await prisma.post.findMany({ orderBy: { created_at: 'desc' } });
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
    const { title, content, excerpt, image_url, published } = req.body;
    const post = await prisma.post.create({ data: { title, content, excerpt, image_url, published, published_at: published ? new Date() : null } });
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
    const { title, content, excerpt, image_url, published } = req.body;
    await prisma.post.update({ where: { id: parseInt(req.params.id) }, data: { title, content, excerpt, image_url, published, published_at: published ? new Date() : null } });
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
    const testimonials = await prisma.testimonial.findMany({ orderBy: { created_at: 'desc' } });
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
    const impactStats = await prisma.impactStat.findMany({ orderBy: { id: 'asc' } }); // Assuming model name is ImpactStat
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
app.post('/api/admin/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  let imageUrl;
  if (req.file.path && req.file.path.startsWith('http')) {
    imageUrl = req.file.path; // Cloudinary URL
  } else {
    imageUrl = `/uploads/${req.file.filename}`; // Local URL
  }

  if (isPrismaAvailable()) {
    try {
      await prisma.gallery.create({
        data: { image_url: imageUrl, caption: req.body.caption || req.file.originalname }
      });
    } catch (error) {
      console.error('Error saving to gallery:', error);
      return res.status(500).json({ message: 'Error saving to gallery', error: error.message });
    }
  }

  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    url: imageUrl
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