const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL
    }
  }
});

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query test passed:', result);
    
    // Test model access
    const adminCount = await prisma.admin.count();
    console.log('✅ Admin count:', adminCount);
    
    const programCount = await prisma.program.count();
    console.log('✅ Program count:', programCount);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.code === 'P6002') {
      console.error('   This is a Prisma Accelerate API key error');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();