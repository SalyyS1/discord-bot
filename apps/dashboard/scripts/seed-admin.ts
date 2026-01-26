import { prisma } from '@repo/database';

async function main() {
  // Delete existing admin user and account
  const existingUser = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (existingUser) {
    await prisma.account.deleteMany({ where: { userId: existingUser.id } });
    await prisma.session.deleteMany({ where: { userId: existingUser.id } });
    await prisma.user.delete({ where: { id: existingUser.id } });
    console.log('Deleted existing admin user');
  }

  // Create admin via Better Auth sign-up API
  const response = await fetch('http://localhost:3000/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000',
    },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin',
    }),
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Admin user created via Better Auth:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
  } else {
    console.error('❌ Failed to create admin:', result);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
