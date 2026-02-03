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


// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
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

// Prisma Client initialization
const prisma = new PrismaClient();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
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

// Routes

// Admin authentication
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      console.log(`Login failed: Admin user '${username}' not found in Prisma DB`);
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
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public routes
app.get('/api/programs', async (req, res) => {
  try {
    const programs = await prisma.program.findMany({ orderBy: { id: 'asc' } });
    res.json(programs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/leaders', async (req, res) => {
  try {
    const leaders = await prisma.leader.findMany({ orderBy: { order_position: 'asc' } });
    res.json(leaders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({ orderBy: { event_date: 'desc' } });
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: Number(req.params.id) } });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({ where: { published: true }, orderBy: { published_at: 'desc' } });
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: Number(req.params.id), published: true } });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/impact-stats', async (req, res) => {
  try {
    const stats = await prisma.impact_stats.findMany();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/testimonials', async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany();
    res.json(testimonials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    const gallery = await prisma.gallery.findMany({ orderBy: { created_at: 'desc' } });
    res.json(gallery);
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
      await prisma.contact_messages.create({
        data: { name, email, subject, message }
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
    const { organizationName, contactPerson, email, phone, partnershipType, message } = req.body;

    await prisma.partnership_requests.create({
      data: {
        organization_name: organizationName,
        contact_person: contactPerson,
        email,
        phone,
        partnership_type: partnershipType,
        message
      }
    });

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
    const { name, email, phone, interests, experience } = req.body;

    await prisma.volunteer_submissions.create({
      data: { name, email, phone, interests, experience }
    });

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
    // Get comprehensive stats
    const stats = {
      unread_messages: await prisma.contact_messages.count({ where: { is_read: false } }),
      total_messages: await prisma.contact_messages.count(),
      published_posts: await prisma.post.count({ where: { published: true } }),
      total_posts: await prisma.post.count(),
      total_events: await prisma.event.count(),
      active_programs: await prisma.program.count({ where: { is_active: 1 } }),
      total_programs: await prisma.program.count(),
      total_testimonials: await prisma.testimonial.count(),
      total_stats: await prisma.impact_stats.count(),
      active_leaders: await prisma.leader.count({ where: { is_active: 1 } }),
      active_members: await prisma.member.count({ where: { is_active: 1 } })
    };
    const recentContacts = await prisma.contact_messages.findMany({
      select: { id: true, name: true, email: true, subject: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 5
    });
    const sampleCounts = [
      { table_name: 'programs', count: await prisma.program.count() },
      { table_name: 'events', count: await prisma.event.count() },
      { table_name: 'testimonials', count: await prisma.testimonial.count() },
      { table_name: 'posts', count: await prisma.post.count() }
    ];
    res.json({ stats, recentContacts, debug: sampleCounts });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// CRUD operations for admin
app.get('/api/admin/programs', authenticateToken, async (req, res) => {
  try {
    const programs = await prisma.program.findMany({ orderBy: { id: 'asc' } });
    res.json(programs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/programs', authenticateToken, async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    const program = await prisma.program.create({
      data: { title, description: description ?? null, icon: icon ?? null, is_active: 1 }
    });
    res.json({ id: program.id, message: 'Program created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/programs/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, icon, is_active } = req.body;
    await prisma.program.update({
      where: { id: Number(req.params.id) },
      data: { title, description: description ?? null, icon: icon ?? null, is_active: is_active ?? undefined }
    });
    res.json({ message: 'Program updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/programs/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.program.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for Leaders (Officials)
app.get('/api/admin/leaders', authenticateToken, async (req, res) => {
  try {
    const leaders = await prisma.leader.findMany({ orderBy: { order_position: 'asc' } });
    res.json(leaders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/leaders', authenticateToken, async (req, res) => {
  try {
    const { name, title, bio, photo_url } = req.body;
    
    try {
      const maxOrder = await prisma.leader.aggregate({ _max: { order_position: true } });
      const nextOrder = (maxOrder._max.order_position || 0) + 1;
      const leader = await prisma.leader.create({
        data: { name, title, bio: bio ?? null, photo_url: photo_url ?? null, order_position: nextOrder, is_active: 1 }
      });
      res.json({ id: leader.id, message: 'Official added successfully' });
    } catch (dbError) {
      console.error("Database insertion error:", dbError);
      return res.status(500).json({ message: 'Database insertion error', error: dbError.message });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


app.put('/api/admin/leaders/:id', authenticateToken, async (req, res) => {
  try {
    const { name, title, bio, photo_url, order_position, is_active } = req.body;
    await prisma.leader.update({
      where: { id: Number(req.params.id) },
      data: {
        name,
        title,
        bio: bio ?? null,
        photo_url: photo_url ?? null,
        order_position: order_position ?? undefined,
        is_active: is_active ?? undefined
      }
    });
    res.json({ message: 'Official updated successfully' });
  } catch (error) {
    console.error('Error updating official:', error);
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/leaders/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.leader.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Official deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


// CRUD for Members
app.get('/api/admin/members', authenticateToken, async (req, res) => {
  try {
    const members = await prisma.member.findMany({ orderBy: { created_at: 'desc' } });
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/members', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, position, department, photo_url, bio } = req.body;
    const member = await prisma.member.create({
      data: { name, email, phone: phone ?? null, position: position ?? null, department: department ?? null, photo_url: photo_url ?? null, bio: bio ?? null }
    });
    res.json({ id: member.id, message: 'Member added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/members/:id', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, position, department, photo_url, bio, is_active } = req.body;
    await prisma.member.update({
      where: { id: Number(req.params.id) },
      data: { name, email, phone: phone ?? null, position: position ?? null, department: department ?? null, photo_url: photo_url ?? null, bio: bio ?? null, is_active: is_active ?? undefined }
    });
    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/members/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.member.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for Events
app.get('/api/admin/events', authenticateToken, async (req, res) => {
  try {
    const events = await prisma.event.findMany({ orderBy: { event_date: 'desc' } });
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/events', authenticateToken, async (req, res) => {
  try {
    const { title, description, event_date, location, image_url, is_upcoming } = req.body;
    const event = await prisma.event.create({
      data: { title, description: description ?? null, event_date, location: location ?? null, image_url: image_url ?? null, is_upcoming }
    });
    res.json({ id: event.id, message: 'Event created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/events/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, event_date, location, image_url, is_upcoming } = req.body;
    await prisma.event.update({
      where: { id: Number(req.params.id) },
      data: { title, description: description ?? null, event_date, location: location ?? null, image_url: image_url ?? null, is_upcoming }
    });
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/events/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Contact Messages Management
app.get('/api/admin/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await prisma.contact_messages.findMany({ orderBy: { created_at: 'desc' } });
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/messages/:id/reply', authenticateToken, async (req, res) => {
  try {
    const { reply_text } = req.body;
    const messageId = req.params.id;

    if (!reply_text) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    // Get message details from Prisma
    const message = await prisma.contact_messages.findUnique({ where: { id: Number(messageId) } });
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Mark message as read
    await prisma.contact_messages.update({ where: { id: Number(messageId) }, data: { is_read: true } });

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
        res.json({ message: 'Reply sent successfully and delivered to user email.' });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        res.json({ message: 'Reply saved but email sending failed', error: emailError.message });
      }
    } else {
      res.json({ message: 'Reply saved, but email service is not configured.' });
    }
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/admin/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    await prisma.contact_messages.update({ where: { id: Number(req.params.id) }, data: { is_read: true } });
    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/messages/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.contact_messages.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for Posts (Announcements)
app.get('/api/admin/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await prisma.post.findMany({ orderBy: { created_at: 'desc' } });
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/posts', authenticateToken, async (req, res) => {
  try {
    const { title, content, excerpt, image_url, published } = req.body;
    const published_at = published ? new Date() : null;
    const post = await prisma.post.create({
      data: { title, content: content ?? null, excerpt: excerpt ?? null, image_url: image_url ?? null, published, published_at }
    });
    res.json({ id: post.id, message: 'Post created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { title, content, excerpt, image_url, published } = req.body;
    const published_at = published ? new Date() : null;
    await prisma.post.update({
      where: { id: Number(req.params.id) },
      data: { title, content: content ?? null, excerpt: excerpt ?? null, image_url: image_url ?? null, published, published_at }
    });
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/posts/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.post.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for Testimonials
app.get('/api/admin/testimonials', authenticateToken, async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({ orderBy: { created_at: 'desc' } });
    res.json(testimonials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/testimonials', authenticateToken, async (req, res) => {
  try {
    const { name, role, content, image } = req.body;
    const testimonial = await prisma.testimonial.create({
      data: { name, role, content, image: image || null }
    });
    res.json({ id: testimonial.id, message: 'Testimonial created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    const { name, role, content, image } = req.body;
    await prisma.testimonial.update({
      where: { id: Number(req.params.id) },
      data: { name, role, content, image: image || null }
    });
    res.json({ message: 'Testimonial updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.testimonial.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CRUD for Impact Stats
app.get('/api/admin/impact-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await prisma.impact_stats.findMany({ orderBy: { id: 'asc' } });
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/impact-stats', authenticateToken, async (req, res) => {
  try {
    const { number, label, icon } = req.body;
    const stat = await prisma.impact_stats.create({
      data: { number, label, icon: icon || 'users' }
    });
    res.json({ id: stat.id, message: 'Stat created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/impact-stats/:id', authenticateToken, async (req, res) => {
  try {
    const { number, label, icon } = req.body;
    await prisma.impact_stats.update({
      where: { id: Number(req.params.id) },
      data: { number, label, icon: icon || 'users' }
    });
    res.json({ message: 'Stat updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/impact-stats/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.impact_stats.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Stat deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Using Prisma backend`);
});
