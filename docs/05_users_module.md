# Hướng dẫn: 1.4 UC002 - Users Module

> Nhiệm vụ: Bổ sung module quản lý người dùng cho Admin và chốt rõ phần backend còn thiếu sau khi đã có `schema`, `core infrastructure`, `auth`, `classes`.

---

## Kết luận nhanh

Sau khi đọc `docs/01`, `docs/02`, `docs/03`, `docs/04`, `docs/todo_modules.md` và mã hiện tại trong `backend-nestjs`, trạng thái backend đang là:

- Đã có nền tảng tốt: `Prisma schema`, `DatabaseModule`, `StorageModule`, `AuthModule`, `ClassesModule`
- Chưa có `UsersModule`, dù đây là module nền tảng cần hoàn tất trước khi mở rộng teacher/student flow
- Chưa có các module nghiệp vụ chính tiếp theo: `Exams`, `OMR`, `Submissions`, `Assignments`, `Remarks`, `Question Bank`, `Reports`, `Notifications`
- Chưa có test backend cho các module nghiệp vụ hiện tại

Nếu đi theo thứ tự đúng và giữ code `high cohesion`, `low coupling`, `SOLID`, thì phần backend còn lại nên làm theo thứ tự này:

1. `Users Module`
2. `Exams Module`
3. `OMR Module` + `Submissions Module`
4. `Assignments Module`
5. `Remarks Module`
6. `Question Bank`
7. `Reports`
8. `Notifications`
9. Bổ sung `unit test` và `e2e test`

---

## Những gì còn thiếu ở Backend

### Đã xong

- `01_database_schema`
- `02_core_infrastructure`
- `03_auth_module`
- `04_classes_module`

### Còn thiếu và nên làm tiếp

#### Giai đoạn nền tảng

- `Users Module`
  - CRUD user cho Admin
  - Hash password bằng `bcrypt`
  - Soft delete bằng `isActive = false` thay vì hard delete
  - Chặn trùng `email`, `studentCode`

#### Giai đoạn teacher core

- `Exams Module`
  - Tạo đề thi
  - Gán nhiều lớp qua `ExamClass`
  - Lưu `AnswerKey`
  - Map `ExamQuestion`

- `OMR Module`
  - Upload ảnh
  - Tạo `OmrBatch`
  - Push queue
  - Nhận kết quả từ OMR service
  - Chấm điểm

- `Submissions Module`
  - Lưu kết quả OMR
  - Xem chi tiết bài làm
  - Manual override
  - Ghép `studentId` thủ công khi thiếu

#### Giai đoạn student

- `Assignments Module`
- `Remarks Module`
- API học sinh xem điểm

#### Giai đoạn nâng cao

- `Question Bank`
- `Reports`
- `Notifications`
- Logging/test/monitoring

---

## Vì sao nên làm `Users Module` trước

Hiện tại hệ thống đã có đăng nhập và phân quyền, nhưng chưa có module chính thức để Admin quản trị vòng đời user. Nếu bỏ qua bước này thì các flow sau sẽ thiếu điểm vào chuẩn để:

- tạo giáo viên
- tạo học sinh
- gán `studentCode`
- khóa user
- chuẩn hóa dữ liệu đầu vào cho `Classes`, `OMR`, `Assignments`

Vì vậy `Users Module` là bước kế tiếp hợp lý nhất sau `Auth` và trước `Exams`.

---

## Phạm vi implement đề xuất

**File cần tạo trong codebase thật sau này:**

- `backend-nestjs/src/modules/users/dto/create-user.dto.ts`
- `backend-nestjs/src/modules/users/dto/update-user.dto.ts`
- `backend-nestjs/src/modules/users/services/users.service.ts`
- `backend-nestjs/src/modules/users/controllers/users.controller.ts`
- `backend-nestjs/src/modules/users/users.module.ts`

> Giai đoạn này **chưa cần** `users.repository.ts` vì CRUD còn đơn giản, đúng với quy ước của dự án: `controller -> service -> PrismaService`.

---

## 1. DTOs

### File: `backend-nestjs/src/modules/users/dto/create-user.dto.ts`

```typescript
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsEnum(Role)
  role!: Role;

  @ValidateIf((dto: CreateUserDto) => dto.role === Role.STUDENT)
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]{4,30}$/, {
    message: 'studentCode must contain 4-30 uppercase letters, numbers, "_" or "-"',
  })
  studentCode?: string;

  @ValidateIf((dto: CreateUserDto) => dto.role !== Role.STUDENT)
  @IsOptional()
  @IsString()
  studentCode?: string;
}
```

### File: `backend-nestjs/src/modules/users/dto/update-user.dto.ts`

```typescript
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ValidateIf((dto: UpdateUserDto) => dto.role === Role.STUDENT || dto.studentCode !== undefined)
  @IsString()
  @Matches(/^[A-Z0-9_-]{4,30}$/, {
    message: 'studentCode must contain 4-30 uppercase letters, numbers, "_" or "-"',
  })
  @IsOptional()
  studentCode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

---

## 2. Service

### File: `backend-nestjs/src/modules/users/services/users.service.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  studentCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(createUserDto: CreateUserDto) {
    await this.ensureEmailAvailable(createUserDto.email);

    const normalizedStudentCode = this.normalizeStudentCode(createUserDto.studentCode);

    if (createUserDto.role === Role.STUDENT && !normalizedStudentCode) {
      throw new BadRequestException('studentCode is required for student accounts');
    }

    if (normalizedStudentCode) {
      await this.ensureStudentCodeAvailable(normalizedStudentCode);
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    return this.prismaService.user.create({
      data: {
        email: createUserDto.email.trim().toLowerCase(),
        name: createUserDto.name.trim(),
        passwordHash,
        role: createUserDto.role,
        studentCode: createUserDto.role === Role.STUDENT ? normalizedStudentCode : null,
      },
      select: userSelect,
    });
  }

  async listUsers() {
    return this.prismaService.user.findMany({
      select: userSelect,
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getUserById(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const nextRole = updateUserDto.role ?? existingUser.role;
    const normalizedEmail = updateUserDto.email?.trim().toLowerCase();
    const normalizedStudentCode = this.normalizeStudentCode(updateUserDto.studentCode);

    if (normalizedEmail && normalizedEmail !== existingUser.email) {
      await this.ensureEmailAvailable(normalizedEmail, userId);
    }

    if (nextRole === Role.STUDENT) {
      const finalStudentCode = normalizedStudentCode ?? existingUser.studentCode;

      if (!finalStudentCode) {
        throw new BadRequestException('studentCode is required for student accounts');
      }

      await this.ensureStudentCodeAvailable(finalStudentCode, userId);
    }

    if (normalizedStudentCode && normalizedStudentCode !== existingUser.studentCode) {
      await this.ensureStudentCodeAvailable(normalizedStudentCode, userId);
    }

    const data: Prisma.UserUpdateInput = {
      email: normalizedEmail,
      name: updateUserDto.name?.trim(),
      role: nextRole,
      isActive: updateUserDto.isActive,
    };

    if (updateUserDto.password) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (nextRole === Role.STUDENT) {
      data.studentCode = normalizedStudentCode ?? existingUser.studentCode;
    }

    if (nextRole !== Role.STUDENT) {
      data.studentCode = null;
    }

    return this.prismaService.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });
  }

  async deleteUser(targetUserId: string, currentAdminId: string) {
    if (targetUserId === currentAdminId) {
      throw new BadRequestException('Admin cannot deactivate its own account');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('User is already inactive');
    }

    return this.prismaService.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
      select: userSelect,
    });
  }

  private normalizeStudentCode(studentCode?: string) {
    const normalized = studentCode?.trim().toUpperCase();
    return normalized || undefined;
  }

  private async ensureEmailAvailable(email: string, excludeUserId?: string) {
    const existingUser = await this.prismaService.user.findFirst({
      where: {
        email,
        ...(excludeUserId
          ? {
              NOT: {
                id: excludeUserId,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
  }

  private async ensureStudentCodeAvailable(studentCode: string, excludeUserId?: string) {
    const existingUser = await this.prismaService.user.findFirst({
      where: {
        studentCode,
        ...(excludeUserId
          ? {
              NOT: {
                id: excludeUserId,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Student code already exists');
    }
  }
}
```

### Giải thích thiết kế

- `UsersService` gọi trực tiếp `PrismaService` vì logic hiện tại chưa đủ phức tạp để tách repository
- Dùng `userSelect` để tránh lộ `passwordHash`
- `DELETE /users/:id` được implement thành `soft delete`, phù hợp schema hiện có và an toàn hơn với các quan hệ về sau
- Tách các hàm `ensureEmailAvailable`, `ensureStudentCodeAvailable`, `normalizeStudentCode` để tăng cohesion và giảm lặp

---

## 3. Controller

### File: `backend-nestjs/src/modules/users/controllers/users.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersService } from '../services/users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listUsers() {
    return this.usersService.listUsers();
  }

  @Get(':id')
  async getUserById(@Param('id') userId: string) {
    return this.usersService.getUserById(userId);
  }

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') userId: string,
    @CurrentUser('id') currentAdminId: string,
  ) {
    return this.usersService.deleteUser(userId, currentAdminId);
  }
}
```

---

## 4. Module

### File: `backend-nestjs/src/modules/users/users.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## 5. Cập nhật `app.module.ts`

Thêm `UsersModule` vào root module:

```typescript
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, cloudinaryConfig, redisConfig],
    }),
    DatabaseModule,
    StorageModule,
    AuthModule,
    UsersModule,
    ClassesModule,
  ],
})
export class AppModule {}
```

---

## 6. API cần có sau khi implement thật

### Admin only

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`

### Mẫu payload tạo user

```json
{
  "email": "student01@eduscan.vn",
  "name": "Nguyen Van A",
  "password": "123456",
  "role": "STUDENT",
  "studentCode": "HS0001"
}
```

### Mẫu payload update user

```json
{
  "name": "Nguyen Van A Updated",
  "isActive": true
}
```

---

## 7. Việc nên làm ngay sau `Users Module`

Sau khi hoàn tất module này trong code thật, backend nên đi tiếp như sau:

1. Tạo `Exams Module`
2. Tạo `Submissions Module`
3. Tạo `OMR Module`
4. Thêm manual override cho submission
5. Tạo `Assignments Module`
6. Tạo `Remarks Module`
7. Tạo `Question Bank`
8. Tạo `Reports`
9. Tạo `Notifications`

---

## 8. Gợi ý chuẩn code để giữ cohesion/coupling tốt

- `controller` chỉ nhận request/response và guard/decorator
- `service` giữ business rule
- Chỉ tách `repository` khi query bắt đầu phức tạp
- Không để `passwordHash` đi ra khỏi service
- Không hard delete `User` khi đã có quan hệ nghiệp vụ
- Dùng `DTO + ValidationPipe` để chặn dữ liệu xấu ngay ở biên
- Mọi module mới nên có `select/include` rõ ràng thay vì trả raw object dư thừa

---

## 9. Kết luận

Backend hiện tại chưa thiếu ở phần lõi nữa, nhưng vẫn thiếu toàn bộ các module nghiệp vụ chính ngoài `auth` và `classes`. Bước hợp lý nhất tiếp theo là hoàn tất `Users Module`, vì đây là mắt xích còn trống ở tầng foundation và là tiền đề cho toàn bộ luồng Admin, Teacher, Student về sau.
