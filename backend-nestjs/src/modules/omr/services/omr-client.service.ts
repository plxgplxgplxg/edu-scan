import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { lastValueFrom, Observable, timeout } from 'rxjs';
import type { ClientGrpc } from '@nestjs/microservices';
import {
  OmrGradeOverlayResponse,
  OmrServiceResponse,
} from '../interfaces/omr-response.interface';
import {
  OmrDetectRequest,
  OmrGradeOverlayRequest,
  OmrTransportClient,
} from '../interfaces/omr-transport.interface';
import {
  OMR_GRPC_CLIENT_TOKEN,
  OMR_GRPC_SERVICE_NAME,
} from '../omr-grpc.constants';

type OmrGrpcAnswerResponse = {
  questionNumber: number;
  detectedAnswer?: string | null;
  correctAnswer?: string | null;
  isCorrect?: boolean | null;
  needsReview?: boolean;
  reviewReason?: string | null;
};

type OmrGrpcArtifactsResponse = {
  processedImagePath?: string | null;
  annotatedImagePath?: string | null;
  warpOverlayPath?: string | null;
  answerScoresPath?: string | null;
  resultJsonPath?: string | null;
};

type OmrGrpcProcessResponse = {
  studentCode?: string | null;
  testId?: string | null;
  needsReview?: boolean;
  answers?: OmrGrpcAnswerResponse[];
  artifacts?: OmrGrpcArtifactsResponse | null;
};

type OmrGrpcGradeOverlayResponse = {
  artifacts?: OmrGrpcArtifactsResponse | null;
};

type OmrGrpcService = {
  detect(payload: OmrDetectRequest): Observable<OmrGrpcProcessResponse>;
  gradeOverlay(
    payload: OmrGradeOverlayRequest,
  ): Observable<OmrGrpcGradeOverlayResponse>;
};

@Injectable()
export class OmrClientService implements OmrTransportClient, OnModuleInit {
  private readonly logger = new Logger(OmrClientService.name);
  private omrGrpcService!: OmrGrpcService;

  constructor(
    @Inject(OMR_GRPC_CLIENT_TOKEN)
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.omrGrpcService = this.grpcClient.getService<OmrGrpcService>(
      OMR_GRPC_SERVICE_NAME,
    );
  }

  async detectImage(payload: OmrDetectRequest): Promise<OmrServiceResponse> {
    this.logger.log(
      `detectImage: imageUrl=${payload.imageUrl} templateName=${payload.templateName ?? 'auto'}`,
    );
    const response = await this.invokeGrpc(() =>
      this.omrGrpcService.detect(payload),
    );
    this.validateDetectResponse(response);
    const mapped = this.mapProcessResponse(response);
    this.logger.log(
      `detectImage done: studentCode=${mapped.studentCode ?? 'null'} testId=${mapped.testId ?? 'null'} answers=${mapped.answers.length} needsReview=${mapped.needsReview}`,
    );
    return mapped;
  }

  async renderGradeOverlay(
    payload: OmrGradeOverlayRequest,
  ): Promise<OmrGradeOverlayResponse> {
    this.logger.log(
      `renderGradeOverlay: resultJsonPath=${payload.resultJsonPath} marksCount=${payload.marks.length}`,
    );
    const response = await this.invokeGrpc(() =>
      this.omrGrpcService.gradeOverlay(payload),
    );

    return {
      artifacts: this.mapArtifacts(response.artifacts),
    };
  }

  private async invokeGrpc<ResponsePayload>(
    execute: () => Observable<ResponsePayload>,
  ): Promise<ResponsePayload> {
    try {
      return await lastValueFrom(execute().pipe(timeout(15000)));
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }
      this.handleGrpcError(error);
    }
  }

  private validateDetectResponse(payload: OmrGrpcProcessResponse) {
    if (!payload || !Array.isArray(payload.answers)) {
      throw new UnprocessableEntityException(
        'OMR service returned invalid detect payload',
      );
    }
  }

  private mapProcessResponse(
    payload: OmrGrpcProcessResponse,
  ): OmrServiceResponse {
    return {
      studentCode: this.normalizeNullableString(payload.studentCode),
      testId: this.normalizeNullableString(payload.testId),
      needsReview: Boolean(payload.needsReview),
      answers: (payload.answers ?? []).map((answer) => ({
        questionNumber: answer.questionNumber,
        detectedAnswer: this.normalizeNullableString(answer.detectedAnswer),
        needsReview: Boolean(answer.needsReview),
        reviewReason: this.normalizeNullableString(answer.reviewReason),
      })),
      artifacts: this.mapArtifacts(payload.artifacts),
    };
  }

  private mapArtifacts(
    artifacts?: OmrGrpcArtifactsResponse | null,
  ): OmrServiceResponse['artifacts'] {
    if (!artifacts) {
      return undefined;
    }

    return {
      processedImagePath: this.normalizeNullableString(
        artifacts.processedImagePath,
      ),
      annotatedImagePath: this.normalizeNullableString(
        artifacts.annotatedImagePath,
      ),
      warpOverlayPath: this.normalizeNullableString(artifacts.warpOverlayPath),
      answerScoresPath: this.normalizeNullableString(
        artifacts.answerScoresPath,
      ),
      resultJsonPath: this.normalizeNullableString(artifacts.resultJsonPath),
    };
  }

  private normalizeNullableString(value?: string | null) {
    return value == null || value === '' ? null : value;
  }

  private handleGrpcError(error: unknown): never {
    const grpcError = error as {
      code?: number;
      details?: string;
      message?: string;
      stack?: string;
    };
    const message =
      grpcError.details || grpcError.message || 'OMR service request failed';
    this.logger.error(
      `OMR gRPC error: code=${grpcError.code ?? 'unknown'} message=${message}${grpcError.stack ? ' stack=' + grpcError.stack : ''}`,
    );

    if (grpcError.code === 3 || grpcError.code === 9 || grpcError.code === 11) {
      throw new UnprocessableEntityException(message);
    }

    throw new BadGatewayException(message);
  }
}
