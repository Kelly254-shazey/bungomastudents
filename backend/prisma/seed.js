const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Seed Admins
  console.log('📝 Seeding admins...');
  const admin = await prisma.admin.upsert({
    where: { username: 'buccusa' },
    update: {},
    create: {
      username: 'buccusa',
      password_hash: '$2b$10$3c0j5QJ6zFJq5bYH2X2p7uXbG1jzZy6wRr7b4rZcQk0nGJ7Z7dQ8a',
      email: 'admin@buccusa.org',
      created_at: new Date('2026-01-15T18:21:53.000Z'),
      updated_at: new Date('2026-01-15T21:43:53.000Z')
    }
  });
  const adminId = admin.id;

  // Seed Additional Admin (Kelly)
  const kellyPassword = await bcrypt.hash('kellyflo@341', 10);
  await prisma.admin.upsert({
    where: { email: 'kelly123simiyu@gmail.com' },
    update: {},
    create: {
      username: 'kelly123simiyu',
      password_hash: kellyPassword,
      email: 'kelly123simiyu@gmail.com',
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  // Seed Contact Messages
  console.log('💬 Seeding contact messages...');
  const contactMessagesData = [
    { name: '', email: '', subject: '', message: '', is_read: false, created_at: '2026-01-15T20:00:44.000Z' },
    { name: 'Kelvin Simiyu', email: 'kelly123simiyu@gmail.com', subject: 'mathematics', message: 'HELLO', is_read: true, created_at: '2026-01-16T10:20:59.000Z' },
    { name: 'Simiyu', email: 'kelly123simiyu@gmail.com', subject: 'me', message: 'hae\n', is_read: true, created_at: '2026-01-16T14:35:32.000Z' },
    { name: 'Simiyu', email: 'kelly123simiyu@gmail.com', subject: 'me', message: 'hae\n', is_read: false, created_at: '2026-01-16T14:40:11.000Z' },
    { name: 'Simiyu', email: 'kelly@gmail', subject: 'hae', message: 'yess', is_read: true, created_at: '2026-01-16T14:40:49.000Z' },
    { name: 'flo', email: 'flo@kelly', subject: 'we', message: 'what is this ', is_read: true, created_at: '2026-01-16T14:42:52.000Z' },
    { name: 'Simiyu', email: 'kelly123simiyu@gmail.com', subject: 'mathematics', message: '1+1', is_read: true, created_at: '2026-01-16T17:06:27.000Z' },
    { name: 'florence', email: 'kelly123simiyu@gmail.com', subject: 'hae', message: 'i love you', is_read: false, created_at: '2026-01-31T13:22:57.000Z' }
  ];

  const contactMessageIds = [];
  for (const msg of contactMessagesData) {
    const created = await prisma.contactMessage.create({
      data: {
        name: msg.name,
        email: msg.email,
        subject: msg.subject,
        message: msg.message,
        is_read: msg.is_read,
        created_at: new Date(msg.created_at)
      }
    });
    contactMessageIds.push(created.id);
  }

  // Seed Events
  console.log('📅 Seeding events...');
  const eventsData = [
    { title: 'Leadership Summit 2026', description: 'Annual gathering of student leaders to discuss challenges and solutions', event_date: '2026-02-15T09:00:00.000Z', location: 'Bungoma County Headquarters', image_url: '', is_upcoming: true, created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-15T20:06:43.000Z' },
    { title: 'Community Service Day', description: 'Give back to community through service projects and cleanup', event_date: '2026-02-28T08:00:00.000Z', location: 'Multiple Locations in Bungoma', image_url: '', is_upcoming: true, created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-15T20:06:43.000Z' },
    { title: 'Youth Entrepreneurship Workshop', description: 'Learn practical skills for starting your own business', event_date: '2026-03-10T10:00:00.000Z', location: 'Webuye Technical Training Institute', image_url: '', is_upcoming: true, created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-15T20:06:43.000Z' },
    { title: 'Sports and Recreation Festival', description: 'Celebrate unity through football, volleyball and athletics', event_date: '2026-01-16T21:18:00.000Z', location: 'Bungoma Sports Complex', image_url: '', is_upcoming: true, created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-16T18:18:18.000Z' }
  ];

  for (const event of eventsData) {
    await prisma.event.create({
      data: {
        title: event.title,
        description: event.description,
        event_date: new Date(event.event_date),
        location: event.location,
        image_url: event.image_url,
        is_upcoming: event.is_upcoming,
        created_at: new Date(event.created_at),
        updated_at: new Date(event.updated_at)
      }
    });
  }

  // Seed Impact Stats
  console.log('📊 Seeding impact stats...');
  const impactStatsData = [
    { label: 'Youth Members', icon: 'users', value: 350, suffix: '+', is_active: true, created_at: '2026-01-15T18:21:53.000Z', updated_at: '2026-01-16T18:54:50.000Z' },
    { label: 'Events Organized', icon: null, value: 100, suffix: '+', is_active: true, created_at: '2026-01-15T18:21:53.000Z', updated_at: '2026-01-15T18:21:53.000Z' },
    { label: 'Communities Reached', icon: null, value: 50, suffix: '+', is_active: true, created_at: '2026-01-15T18:21:53.000Z', updated_at: '2026-01-15T18:21:53.000Z' },
    { label: 'Years of Service', icon: null, value: 1, suffix: '+', is_active: true, created_at: '2026-01-15T18:21:53.000Z', updated_at: '2026-01-15T18:21:53.000Z' }
  ];

  for (const stat of impactStatsData) {
    await prisma.impactStat.create({
      data: {
        label: stat.label,
        icon: stat.icon,
        value: stat.value,
        suffix: stat.suffix,
        is_active: stat.is_active,
        created_at: new Date(stat.created_at),
        updated_at: new Date(stat.updated_at)
      }
    });
  }

  // Seed Leaders
  console.log('👥 Seeding leaders...');
  const leadersData = [
    { name: 'Mary Sambai', title: 'Academic and Sports', bio: 'Visionary leader with a passion for youth empowerment', photo_url: '/uploads/1768570979961.jpeg', order_position: 0, is_active: true, created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-16T13:43:01.000Z', role: null },
    { name: 'Daniel delvin', title: 'Vice President', bio: 'Dedicated advocate for educational excellence', photo_url: '/uploads/1768571017400.jpeg', order_position: 0, is_active: true, created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-16T13:43:39.000Z', role: null },
    { name: 'Daniel  Wanjala', title: 'Organizing Secretary', bio: 'Strategic thinker focused on organizational growth', photo_url: '/uploads/1768570840442.jpeg', order_position: 0, is_active: true, created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-16T13:41:14.000Z', role: null },
    { name: 'Brian Manyonge', title: 'Treasurer', bio: 'Financial expert committed to transparency', photo_url: '/uploads/1768571066032.jpeg', order_position: 0, is_active: true, created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-16T13:44:28.000Z', role: null },
    { name: 'Faith Wambwele', title: 'Deputy Secretary General', bio: 'Innovative program designer for community initiatives', photo_url: '/uploads/1768571158569.jpeg', order_position: 0, is_active: true, created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-16T13:46:00.000Z', role: null },
    { name: 'Annita Wasike', title: 'Gender and Welfare', bio: 'Passionate storyteller sharing BUCCUSA impact', photo_url: '/uploads/1768570928362.jpeg', order_position: 0, is_active: true, created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-16T13:42:11.000Z', role: null },
    { name: 'Marvis nekesa', title: 'president', bio: 'Visionary leader with a passion for youth empowerment', photo_url: '/uploads/1768569516307.jpeg', order_position: 1, is_active: true, created_at: '2026-01-16T12:49:05.000Z', updated_at: '2026-01-16T13:18:38.000Z', role: null },
    { name: 'Nixon Wekesa', title: 'Membership Secretary', bio: 'passionate about well being of people', photo_url: '/uploads/1768571863185.jpeg', order_position: 2, is_active: true, created_at: '2026-01-16T13:57:44.000Z', updated_at: '2026-01-16T13:57:44.000Z', role: null },
    { name: 'Job Chesoli', title: 'chief of staff', bio: 'future minded soul', photo_url: '/uploads/1768571966099.jpeg', order_position: 3, is_active: true, created_at: '2026-01-16T14:01:17.000Z', updated_at: '2026-01-31T13:26:51.000Z', role: null },
    { name: 'Onesmus Wekesa ', title: 'Publicity Lead', bio: 'we speak mind ', photo_url: '/uploads/1768572156958.jpeg', order_position: 4, is_active: true, created_at: '2026-01-16T14:02:38.000Z', updated_at: '2026-01-16T14:09:41.000Z', role: null },
    { name: 'Daniel Misiko', title: 'Spokesperson', bio: 'I speak mind of people.', photo_url: '/uploads/1769866207567.jpeg', order_position: 5, is_active: true, created_at: '2026-01-31T13:30:16.000Z', updated_at: '2026-01-31T13:30:16.000Z', role: null }
  ];

  for (const leader of leadersData) {
    await prisma.leader.create({
      data: {
        name: leader.name,
        title: leader.title,
        bio: leader.bio,
        photo_url: leader.photo_url,
        order_position: leader.order_position,
        is_active: leader.is_active,
        created_at: new Date(leader.created_at),
        updated_at: new Date(leader.updated_at),
        role: leader.role
      }
    });
  }

  // Seed Message Replies (using the mapped contact message IDs)
  console.log('💌 Seeding message replies...');
  const messageRepliesData = [
    { contact_message_index: 1, reply_text: 'HAE', replied_by: adminId, created_at: '2026-01-16T10:23:35.000Z' }, // Refers to contactMessagesData[1] (Kelvin Simiyu)
    { contact_message_index: 1, reply_text: 'how may i help you', replied_by: adminId, created_at: '2026-01-16T13:19:29.000Z' },
    { contact_message_index: 2, reply_text: 'yes\n', replied_by: adminId, created_at: '2026-01-16T14:36:01.000Z' } // Refers to contactMessagesData[2] (Simiyu)
  ];

  for (const reply of messageRepliesData) {
    await prisma.messageReply.create({
      data: {
        contact_message_id: contactMessageIds[reply.contact_message_index],
        reply_text: reply.reply_text,
        replied_by: reply.replied_by,
        created_at: new Date(reply.created_at)
      }
    });
  }

  // Seed Posts
  console.log('📰 Seeding posts...');
  const postsData = [
    { title: 'Successful Annual General Meeting', content: 'Our recent Annual General Meeting was a success with representatives from 15 institutions. Key discussions included education access and career development.', excerpt: 'Over 500 delegates attended our AGM discussing key issues', image_url: '', published: true, published_at: '2026-01-08T19:58:59.000Z', created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-15T20:06:43.000Z' },
    { title: 'BUCCUSA Wins Regional Excellence Award', content: 'We received the Regional Excellence Award for Community Impact 2025 in recognition of our hard work and commitment to positive change.', excerpt: 'Recognized for outstanding community impact and leadership', image_url: '', published: true, published_at: '2026-01-01T19:58:59.000Z', created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-15T20:06:43.000Z' },
    { title: 'Mentorship Program Results Announced', content: 'Our mentorship program delivered outstanding results this year with 92% of graduates securing internships or employment opportunities.', excerpt: '92% success rate with mentees securing jobs and internships', image_url: '', published: true, published_at: '2025-12-25T19:58:59.000Z', created_at: '2026-01-15T19:58:59.000Z', updated_at: '2026-01-15T20:06:43.000Z' }
  ];

  for (const post of postsData) {
    await prisma.post.create({
      data: {
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        image_url: post.image_url,
        published: post.published,
        published_at: post.published_at ? new Date(post.published_at) : null,
        created_at: new Date(post.created_at),
        updated_at: new Date(post.updated_at)
      }
    });
  }

  // Seed Programs
  console.log('🎯 Seeding programs...');
  const programsData = [
    { title: 'Leadership Development summit', description: 'Building the next generation of leaders through training and workshops.', icon: 'crown', is_active: false, created_at: '2026-01-15T18:21:53.000Z', updated_at: '2026-01-16T18:56:02.000Z' },
    { title: 'Mental Health Awareness', description: 'Promoting mental wellness and providing support services.', icon: 'heart', is_active: true, created_at: '2026-01-15T18:21:53.000Z', updated_at: '2026-01-15T18:21:53.000Z' },
    { title: 'Anti-Drug Campaigns', description: 'Educating youth about the dangers of drug abuse and promoting healthy lifestyles.', icon: 'shield', is_active: true, created_at: '2026-01-15T18:21:53.000Z', updated_at: '2026-01-15T18:21:53.000Z' },
    { title: 'Climate & Community Action', description: 'Environmental conservation and community development initiatives.', icon: 'leaf', is_active: true, created_at: '2026-01-15T18:21:53.000Z', updated_at: '2026-01-15T18:21:53.000Z' }
  ];

  for (const program of programsData) {
    await prisma.program.create({
      data: {
        title: program.title,
        description: program.description,
        icon: program.icon,
        is_active: program.is_active,
        created_at: new Date(program.created_at),
        updated_at: new Date(program.updated_at)
      }
    });
  }

  // Seed Testimonials
  console.log('💬 Seeding testimonials...');
  await prisma.testimonial.create({
    data: {
      name: 'Dandelvin',
      message: 'BUCCUSA has transformed my leadership skills and connected me with amazing opportunities.',
      position: 'Former Student Leader',
      photo_url: null,
      is_active: true,
      created_at: new Date('2026-01-15T18:21:53.000Z'),
      updated_at: new Date('2026-01-15T18:21:53.000Z')
    }
  });

  // Seed Members
  console.log('👥 Seeding members...');
  const membersData = [
    { name: 'Grace Mwakio', email: 'grace@buccusa.org', phone: '+254712345678', position: 'Member', department: 'Welfare', photo_url: null, bio: 'Committed to student welfare.', is_active: true, created_at: new Date('2026-01-15T18:21:53.000Z') },
    { name: 'Samuel Kamau', email: 'samuel@buccusa.org', phone: '+254723456789', position: 'Coordinator', department: 'Sports', photo_url: null, bio: 'Sports enthusiast and organizer.', is_active: true, created_at: new Date('2026-01-16T10:00:00.000Z') }
  ];

  for (const member of membersData) {
    if (prisma.member) {
      await prisma.member.upsert({
        where: { email: member.email },
        update: {},
        create: member
      });
    }
  }

  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });