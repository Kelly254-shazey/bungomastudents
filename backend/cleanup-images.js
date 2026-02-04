const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL
    }
  }
});

async function cleanupInvalidImages() {
  console.log('🧹 Cleaning up invalid image URLs...');
  
  try {
    // Find gallery items with local /uploads/ paths
    const invalidImages = await prisma.gallery.findMany({
      where: {
        image_url: {
          startsWith: '/uploads/'
        }
      }
    });
    
    console.log(`Found ${invalidImages.length} invalid image URLs`);
    
    if (invalidImages.length > 0) {
      // Delete invalid entries since they won't work on Vercel
      const deleteResult = await prisma.gallery.deleteMany({
        where: {
          image_url: {
            startsWith: '/uploads/'
          }
        }
      });
      
      console.log(`✅ Deleted ${deleteResult.count} invalid gallery entries`);
    }
    
    // Show remaining valid images
    const validImages = await prisma.gallery.findMany({
      where: {
        image_url: {
          startsWith: 'http'
        }
      }
    });
    
    console.log(`✅ ${validImages.length} valid images remaining`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupInvalidImages();