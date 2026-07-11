import type { DemoAccount } from '../types/domain';

export const demoAccounts: DemoAccount[] = [
  {
    email: 'teacher@edu.vn',
    password: '123456',
    role: 'TEACHER',
    profileName: 'Nguyễn Văn A',
  },
  {
    email: 'student@edu.vn',
    password: '123456',
    role: 'STUDENT',
    profileName: 'Trần Thị B',
  },
  {
    email: 'admin@edu.vn',
    password: '123456',
    role: 'ADMIN',
    profileName: 'Admin EduScan',
  },
];
