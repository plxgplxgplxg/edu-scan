import { Type } from '@nestjs/common';
import { AssignmentsModule } from '../../modules/assignments/assignments.module';
import { AuthModule } from '../../modules/auth/auth.module';
import { ClassesModule } from '../../modules/classes/classes.module';
import { ExamsModule } from '../../modules/exams/exams.module';
import { OmrModule } from '../../modules/omr/omr.module';
import { QuestionsModule } from '../../modules/questions/questions.module';
import { RemarksModule } from '../../modules/remarks/remarks.module';
import { ReportsModule } from '../../modules/reports/reports.module';
import { SubmissionsModule } from '../../modules/submissions/submissions.module';
import { UsersModule } from '../../modules/users/users.module';
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
  questions: {
    ...SWAGGER_MODULES_METADATA.questions,
    moduleClass: QuestionsModule,
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
  remarks: {
    ...SWAGGER_MODULES_METADATA.remarks,
    moduleClass: RemarksModule,
  },
  reports: {
    ...SWAGGER_MODULES_METADATA.reports,
    moduleClass: ReportsModule,
  },
};

export const SWAGGER_MODULES_CONFIG_LIST = Object.values(
  SWAGGER_MODULES_CONFIG,
);
