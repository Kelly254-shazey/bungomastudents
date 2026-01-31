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

// Initialize Prisma client with error handling for serverless
let prisma;
try {
  if (process.env.DATABASE_URL) {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
    console.log('Prisma client initialized successfully');
  } else {
    console.warn('DATABASE_URL not set, Prisma client not initialized');
    prisma = null;
  }
} catch (error) {
  console.error('Failed to initialize Prisma client:', error);
  prisma = null;
}

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
    database: prisma ? 'configured' : 'not configured',
    timestamp: new Date().toISOString()
  });
});

// Routes

// Admin authentication
app.post('/api/admin/login', async (req, res) => {
  try {
    if (!prisma) {
      console.log('Prisma not available, admin login disabled');
      return res.status(503).json({ message: 'Database not available' });
    }

    const { username, password } = req.body;

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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public routes
app.get('/api/programs', async (req, res) => {
  try {
    const programs = await prisma.program.findMany({
      orderBy: {
        id: 'asc'
      }
    });
    res.json(programs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/leaders', async (req, res) => {
  try {
    if (!prisma) {
      console.log('Prisma not available, returning mock leaders');
      return res.json([
        {
          id: 1,
          name: "John Doe",
          position: "President",
          bio: "Dedicated to serving the BUCCUSA community",
          image_url: null,
          order_position: 1
        }
      ]);
    }

    const leaders = await prisma.leader.findMany({
      orderBy: {
        order_position: 'asc'
      }
    });
    res.json(leaders);
  } catch (error) {
    console.error('Database error:', error);
    // Return mock data if database is not available
    if (error.code === 'P1001' || error.message.includes('connect') || error.message.includes('database')) {
      console.log('Database not available, returning mock leaders');
      res.json([
        {
          id: 1,
          name: "John Doe",
          position: "President",
          bio: "Dedicated to serving the BUCCUSA community",
          image_url: null,
          order_position: 1
        }
      ]);
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

app.get('/api/events', async (req, res) => {
  try {
    if (!prisma) {
      console.log('Prisma not available, returning mock events');
      return res.json([
        {
          id: 1,
          title: "BUCCUSA Orientation",
          description: "Welcome event for new students",
          event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: "Main Campus",
          is_upcoming: true
        }
      ]);
    }

    const events = await prisma.event.findMany({
      orderBy: {
        event_date: 'desc'
      }
    });
    res.json(events);
  } catch (error) {
    console.error('Database error:', error);
    // Return mock data if database is not available
    if (error.code === 'P1001' || error.message.includes('connect') || error.message.includes('database')) {
      console.log('Database not available, returning mock events');
      res.json([
        {
          id: 1,
          title: "BUCCUSA Orientation",
          description: "Welcome event for new students",
          event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: "Main Campus",
          is_upcoming: true
        }
      ]);
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    if (!prisma) {
      console.log('Prisma not available, returning mock data');
      return res.json([
        {
          id: 1,
          title: "Welcome to BUCCUSA",
          content: "Welcome to the BUCCUSA Student Association website. We're excited to have you here!",
          published_at: new Date().toISOString(),
          published: true
        }
      ]);
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
    console.error('Database error:', error);
    // Return mock data if database is not available
    if (error.code === 'P1001' || error.message.includes('connect') || error.message.includes('database')) {
      console.log('Database not available, returning mock data');
      res.json([
        {
          id: 1,
          title: "Welcome to BUCCUSA",
          content: "Welcome to the BUCCUSA Student Association website. We're excited to have you here!",
          published_at: new Date().toISOString(),
          published: true
        }
      ]);
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM posts WHERE id = ? AND published = true', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/impact-stats', async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM impact_stats');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/testimonials', async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM testimonials');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM gallery ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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

    // Insert into database
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
      return res.status(500).json({ message: 'Database error', error: dbError.message });
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
    const db = await getDBConnection();
    const { organizationName, contactPerson, email, phone, partnershipType, message } = req.body;

    await db.execute(
      'INSERT INTO partnership_requests (organization_name, contact_person, email, phone, partnership_type, message) VALUES (?, ?, ?, ?, ?, ?)',
      [organizationName, contactPerson, email, phone, partnershipType, message]
    );

    // Send email notification
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

    if (transporter) {
      await transporter.sendMail(mailOptions);
    }

    res.json({ message: 'Partnership request submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Volunteer form
app.post('/api/volunteer', async (req, res) => {
  try {
    const db = await getDBConnection();
    const { name, email, phone, interests, experience } = req.body;

    await db.execute(
      'INSERT INTO volunteer_submissions (name, email, phone, interests, experience) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, interests, experience]
    );

    // Send email notification
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

    if (transporter) {
      await transporter.sendMail(mailOptions);
    }

    res.json({ message: 'Volunteer application submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin routes (protected)
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    // Get comprehensive stats
    const [stats] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM contact_messages WHERE is_read = false) as unread_messages,
        (SELECT COUNT(*) FROM contact_messages) as total_messages,
        (SELECT COUNT(*) FROM posts WHERE published = true) as published_posts,
        (SELECT COUNT(*) FROM posts) as total_posts,
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM programs WHERE is_active = 1) as active_programs,
        (SELECT COUNT(*) FROM programs) as total_programs,
        (SELECT COUNT(*) FROM testimonials) as total_testimonials,
        (SELECT COUNT(*) FROM impact_stats) as total_stats,
        (SELECT COUNT(*) FROM leaders WHERE is_active = 1) as active_leaders,
        (SELECT COUNT(*) FROM members WHERE is_active = 1) as active_members
    `);

    // Get recent contacts
    const [recentContacts] = await db.execute(
      'SELECT id, name, email, subject, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 5'
    );

    // Also get some sample data counts to verify
    const [sampleCounts] = await db.execute(`
      SELECT
        'programs' as table_name, COUNT(*) as count FROM programs
      UNION ALL
      SELECT 'events' as table_name, COUNT(*) as count FROM events
      UNION ALL
      SELECT 'testimonials' as table_name, COUNT(*) as count FROM testimonials
      UNION ALL
      SELECT 'posts' as table_name, COUNT(*) as count FROM posts
    `);

    console.log('Dashboard stats:', stats[0]);
    console.log('Sample counts:', sampleCounts);

    res.json({
      stats: stats[0],
      recentContacts,
      debug: sampleCounts
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// CRUD operations for admin
app.get('/api/admin/programs', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM programs ORDER BY id');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/programs', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { title, description, icon } = req.body;
    const [result] = await db.execute(
      'INSERT INTO programs (title, description, icon, is_active) VALUES (?, ?, ?, 1)',
      [title, description ?? null, icon ?? null]
    );
    res.json({ id: result.insertId, message: 'Program created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/programs/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { title, description, icon, is_active } = req.body;
    await db.execute(
      'UPDATE programs SET title = ?, description = ?, icon = ?, is_active = COALESCE(?, is_active) WHERE id = ?',
      [title, description ?? null, icon ?? null, is_active ?? null, req.params.id]
    );
    res.json({ message: 'Program updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/programs/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    await db.execute('DELETE FROM programs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for Leaders (Officials)
app.get('/api/admin/leaders', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM leaders ORDER BY order_position');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/leaders', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { name, title, bio, photo_url } = req.body;

    let result;
    try {
      // Get max order_position
      const [maxOrder] = await db.execute('SELECT COALESCE(MAX(order_position), 0) as max_order FROM leaders');
      const nextOrder = maxOrder[0].max_order + 1;

      [result] = await db.execute(
        'INSERT INTO leaders (name, title, bio, photo_url, order_position, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [name, title, bio ?? null, photo_url ?? null, nextOrder]
      );
    } catch (dbError) {
      console.error("Database insertion error:", dbError);
      return res.status(500).json({ message: 'Database insertion error', error: dbError.message });
    }
    res.json({ id: result.insertId, message: 'Official added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


app.put('/api/admin/leaders/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { name, title, bio, photo_url, order_position, is_active } = req.body;
    await db.execute(
      'UPDATE leaders SET name = ?, title = ?, bio = ?, photo_url = ?, order_position = COALESCE(?, order_position), is_active = COALESCE(?, is_active) WHERE id = ?',
      [name, title, bio ?? null, photo_url ?? null, order_position ?? null, is_active ?? null, req.params.id]
    );
    res.json({ message: 'Official updated successfully' });
  } catch (error) {
    console.error('Error updating official:', error);
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/leaders/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    await db.execute('DELETE FROM leaders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Official deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


// CRUD for Members
app.get('/api/admin/members', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM members ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/members', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { name, email, phone, position, department, photo_url, bio } = req.body;
    const [result] = await db.execute(
      'INSERT INTO members (name, email, phone, position, department, photo_url, bio) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone ?? null, position ?? null, department ?? null, photo_url ?? null, bio ?? null]
    );
    res.json({ id: result.insertId, message: 'Member added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/members/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { name, email, phone, position, department, photo_url, bio, is_active } = req.body;
    await db.execute(
      'UPDATE members SET name = ?, email = ?, phone = ?, position = ?, department = ?, photo_url = ?, bio = ?, is_active = ? WHERE id = ?',
      [name, email, phone ?? null, position ?? null, department ?? null, photo_url ?? null, bio ?? null, is_active ?? null, req.params.id]
    );
    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/members/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    await db.execute('DELETE FROM members WHERE id = ?', [req.params.id]);
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for Events
app.get('/api/admin/events', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM events ORDER BY event_date DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/events', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { title, description, event_date, location, image_url, is_upcoming } = req.body;
    const [result] = await db.execute(
      'INSERT INTO events (title, description, event_date, location, image_url, is_upcoming) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description ?? null, event_date, location ?? null, image_url ?? null, is_upcoming]
    );
    res.json({ id: result.insertId, message: 'Event created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/events/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { title, description, event_date, location, image_url, is_upcoming } = req.body;
    await db.execute(
      'UPDATE events SET title = ?, description = ?, event_date = ?, location = ?, image_url = ?, is_upcoming = ? WHERE id = ?',
      [title, description ?? null, event_date, location ?? null, image_url ?? null, is_upcoming, req.params.id]
    );
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/events/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    await db.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Contact Messages Management
app.get('/api/admin/messages', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/messages/:id/reply', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { reply_text } = req.body;
    const messageId = req.params.id;

    if (!reply_text) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    // Get message details
    const [messages] = await db.execute('SELECT * FROM contact_messages WHERE id = ?', [messageId]);
    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = messages[0];

    // Mark message as read
    await db.execute('UPDATE contact_messages SET is_read = true WHERE id = ?', [messageId]);

    // Send email reply only if transporter is configured
    if (transporter) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: message.email,
          subject: `Re: ${message.subject}`,
          html: `
            <h3>Thank you for your message</h3>
            <p>Dear ${message.name},</p>
            <p>${reply_text}</p>
            <p>Best regards,<br>BUCCUSA Team</p>
          `
        };
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        return res.json({ message: 'Reply saved but email sending failed' });
      }
    }

    res.json({ message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/admin/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    await db.execute('UPDATE contact_messages SET is_read = true WHERE id = ?', [req.params.id]);
    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/messages/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    await db.execute('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for Posts (Announcements)
app.get('/api/admin/posts', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/posts', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { title, content, excerpt, image_url, published } = req.body;
    const published_at = published ? new Date() : null;
    const [result] = await db.execute(
      'INSERT INTO posts (title, content, excerpt, image_url, published, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [title, content ?? null, excerpt ?? null, image_url ?? null, published, published_at]
    );
    res.json({ id: result.insertId, message: 'Post created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/posts/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { title, content, excerpt, image_url, published } = req.body;
    const published_at = published ? new Date() : null;
    await db.execute(
      'UPDATE posts SET title = ?, content = ?, excerpt = ?, image_url = ?, published = ?, published_at = ? WHERE id = ?',
      [title, content ?? null, excerpt ?? null, image_url ?? null, published, published_at, req.params.id]
    );
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/posts/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    await db.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for Testimonials
app.get('/api/admin/testimonials', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM testimonials ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/testimonials', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { name, role, content, image } = req.body;
    const [result] = await db.execute(
      'INSERT INTO testimonials (name, role, content, image) VALUES (?, ?, ?, ?)',
      [name, role, content, image || null]
    );
    res.json({ id: result.insertId, message: 'Testimonial created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { name, role, content, image } = req.body;
    await db.execute(
      'UPDATE testimonials SET name = ?, role = ?, content = ?, image = ? WHERE id = ?',
      [name, role, content, image || null, req.params.id]
    );
    res.json({ message: 'Testimonial updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    await db.execute('DELETE FROM testimonials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for Impact Stats
app.get('/api/admin/impact-stats', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const [rows] = await db.execute('SELECT * FROM impact_stats ORDER BY id');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/impact-stats', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { number, label, icon } = req.body;
    const [result] = await db.execute(
      'INSERT INTO impact_stats (number, label, icon) VALUES (?, ?, ?)',
      [number, label, icon || 'users']
    );
    res.json({ id: result.insertId, message: 'Stat created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/impact-stats/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    const { number, label, icon } = req.body;
    await db.execute(
      'UPDATE impact_stats SET number = ?, label = ?, icon = ? WHERE id = ?',
      [number, label, icon || 'users', req.params.id]
    );
    res.json({ message: 'Stat updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/impact-stats/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDBConnection();
    await db.execute('DELETE FROM impact_stats WHERE id = ?', [req.params.id]);
    res.json({ message: 'Stat deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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