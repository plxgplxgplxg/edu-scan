import { PartialType } from '@nestjs/swagger';
import { SubmitAssignmentDto } from './submit-assignment.dto';

export class UpdateSubmitDto extends PartialType(SubmitAssignmentDto) {}
