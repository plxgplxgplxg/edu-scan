import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));
  
  const exams = await prisma.exam.findMany();
  console.log('Exams:', exams.map(e => ({ id: e.id, teacherId: e.teacherId, title: e.title })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
