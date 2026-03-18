import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor(private configService: ConfigService) {
    const connectionString = configService.get<string>('database.url');
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool as any);
    
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    this.logger.log('PrismaClient initialized');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('PrismaClient disconnected');
  }
}
