const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  // Example: Fetch first 5 programs
  const programs = await prisma.program.findMany({ take: 5 });
  console.log('Sample programs:', programs);

  // Example: Fetch first 5 members
  const members = await prisma.member.findMany({ take: 5 });
  console.log('Sample members:', members);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
