import { prisma } from '@repo/database';

async function main() {
  const user = await prisma.user.findUnique({ 
    where: { email: 'admin@example.com' } 
  });
  console.log('User:', user);
  
  if (user) {
    const account = await prisma.account.findFirst({ 
      where: { userId: user.id } 
    });
    console.log('Account:', account);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
