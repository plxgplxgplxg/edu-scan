import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import * as bcrypt from 'bcrypt';


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