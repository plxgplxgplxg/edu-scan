import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/auth/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/auth/roles.guard";
import { Roles } from "../../../common/decorators/auth/roles.decorator";
import { Role } from "@prisma/client";
import { UsersService } from "../services/users.service";
import { CurrentUser } from "../../../common/decorators/auth/current-user.decorator";
import { UpdateUserDto } from "../dto/update-user.dto";
import { CreateUserDto } from "../dto/create-user.dto";

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