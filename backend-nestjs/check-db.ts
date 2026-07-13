import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const exams = await prisma.exam.findMany();
  console.log('Total exams:', exams.length);
  console.log(exams.map(e => ({ id: e.id, teacherId: e.teacherId, title: e.title })));
  
  const users = await prisma.user.findMany({ where: { role: 'TEACHER' }});
  console.log('Teachers:', users.map(u => ({ id: u.id, email: u.email })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
