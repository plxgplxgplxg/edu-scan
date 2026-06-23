import {
  Controller,
  MessageEvent,
  Param,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { map, Observable } from 'rxjs';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { OmrSwagger } from '../docs/omr.swagger';
import { buildOmrSseChannelId, OmrSseEvent } from '../sse/omr-sse-event';
import { BatchService } from '../services/batch.service';
import { SseRegistryService } from '../services/sse-registry.service';

@Controller('sse')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class OmrSseController {
  constructor(
    private readonly batchService: BatchService,
    private readonly sseRegistryService: SseRegistryService<OmrSseEvent>,
  ) {}

  @Sse('omr/:batchId')
  @OmrSwagger.TheoDoiTienDoBatchOmr()
  async streamOmrBatch(
    @Param('batchId') batchId: string,
    @CurrentUser('id') teacherId: string,
  ): Promise<Observable<MessageEvent>> {
    await this.batchService.assertTeacherBatchAccess(batchId, teacherId);

    return this.sseRegistryService
      .stream(buildOmrSseChannelId(batchId))
      .pipe(map((event) => ({ type: event.type, data: event })));
  }
}
