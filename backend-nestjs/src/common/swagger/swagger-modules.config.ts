import { Type } from '@nestjs/common';
import { AssignmentsModule } from '../../modules/assignments/assignments.module';
import { AuthModule } from '../../modules/auth/auth.module';
import { ClassesModule } from '../../modules/classes/classes.module';
import { ExamsModule } from '../../modules/exams/exams.module';
import { OmrModule } from '../../modules/omr/omr.module';
import { ReportsModule } from '../../modules/reports/reports.module';
import { SubmissionsModule } from '../../modules/submissions/submissions.module';
import { UsersModule } from '../../modules/users/users.module';
import { StatisticsModule } from '../../modules/statistics/statistics.module';
import {
  SWAGGER_MODULES_METADATA,
  type SwaggerModuleKey,
  type SwaggerModuleMetadata,
} from './swagger.metadata';

export interface SwaggerModuleConfig extends SwaggerModuleMetadata {
  moduleClass: Type<unknown>;
}

export const SWAGGER_MODULES_CONFIG: Record<
  SwaggerModuleKey,
  SwaggerModuleConfig
> = {
  auth: {
    ...SWAGGER_MODULES_METADATA.auth,
    moduleClass: AuthModule,
  },
  users: {
    ...SWAGGER_MODULES_METADATA.users,
    moduleClass: UsersModule,
  },
  classes: {
    ...SWAGGER_MODULES_METADATA.classes,
    moduleClass: ClassesModule,
  },
  exams: {
    ...SWAGGER_MODULES_METADATA.exams,
    moduleClass: ExamsModule,
  },
  submissions: {
    ...SWAGGER_MODULES_METADATA.submissions,
    moduleClass: SubmissionsModule,
  },
  assignments: {
    ...SWAGGER_MODULES_METADATA.assignments,
    moduleClass: AssignmentsModule,
  },
  omr: {
    ...SWAGGER_MODULES_METADATA.omr,
    moduleClass: OmrModule,
  },
  reports: {
    ...SWAGGER_MODULES_METADATA.reports,
    moduleClass: ReportsModule,
  },
  statistics: {
    ...SWAGGER_MODULES_METADATA.statistics,
    moduleClass: StatisticsModule,
  },
};

export const SWAGGER_MODULES_CONFIG_LIST = Object.values(
  SWAGGER_MODULES_CONFIG,
);
