const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImages() {
  try {
    const gallery = await prisma.gallery.findMany();
    const posts = await prisma.post.findMany();
    const events = await prisma.event.findMany();
    const leaders = await prisma.leader.findMany();

    console.log('Gallery images:');
    gallery.forEach(g => console.log(g.image_url));

    console.log('\nPost images:');
    posts.forEach(p => console.log(p.image_url));

    console.log('\nEvent images:');
    events.forEach(e => console.log(e.image_url));

    console.log('\nLeader images:');
    leaders.forEach(l => console.log(l.photo_url));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImages();
