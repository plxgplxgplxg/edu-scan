import 'dotenv/config'
import bcrypt from 'bcrypt'
import { PrismaClient, Role } from '@prisma/client';
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

async function seedUser(email: string, name: string, role: typeof Role[keyof typeof Role], password: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Đã tồn tại [${role}]: ${email}`)
    return
  }
  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.create({ data: { email, name, role, passwordHash } })
  console.log(`Tạo thành công [${role}]: ${email}`)
}

async function main() {
  await seedUser('admin@eduscan.vn', 'Quản trị viên', Role.ADMIN, 'Admin@1234')
  await seedUser('teacher@eduscan.vn', 'Giáo viên Mẫu', Role.TEACHER, 'Teacher@1234')
  await seedUser('student@eduscan.vn', 'Học sinh Mẫu', Role.STUDENT, 'Student@1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
