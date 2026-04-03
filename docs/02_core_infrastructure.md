# Hướng dẫn: 1.2 Core Infrastructure

## Tổng quan

Trong phần này, đã tạo tự động nền móng (Core Infrastructure) cho Backend NestJS. Các file này sẽ được sử dụng chung bởi toàn bộ hệ thống.
Tất cả các file đã được chia theo thư mục rõ ràng theo đúng Domain (VD: auth, response, exception...).

Cấu trúc hiện tại:
```
src/
├── config/
│   ├── database.config.ts
│   ├── jwt.config.ts
│   ├── cloudinary.config.ts
│   └── redis.config.ts
├── database/
│   ├── database.module.ts
│   └── prisma.service.ts
├── storage/
│   ├── storage.module.ts
│   ├── storage.interface.ts
│   └── cloudinary.service.ts
└── common/
    ├── decorators/
    │   └── auth/
    │       ├── roles.decorator.ts
    │       └── current-user.decorator.ts
    ├── filters/
    │   └── exception/
    │       └── http-exception.filter.ts
    ├── guards/
    │   └── auth/
    │       ├── jwt-auth.guard.ts
    │       └── roles.guard.ts
    └── interceptors/
        └── response/
            └── transform.interceptor.ts
```

---

## 5. Cập nhật `app.module.ts` và `main.ts`

**Tất cả các file trên đã được tự động generate và tự động gán vào module gốc!**

Bạn chỉ việc chạy lệnh khởi động server để test thử:

```bash
cd backend-nestjs
npm run start:dev
```

Nếu Console log hiện:
```
[NestApplication] Nest application successfully started
[PrismaService] PrismaClient initialized
```
Thì có nghĩa là hệ thống lõi đã chạy thành công 100%! Báo tôi để đi đến nghiệp vụ kế tiếp: **1.3 Auth Module**.
