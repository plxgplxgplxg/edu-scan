import {
  BadGatewayException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { OmrClientService } from '../../../src/modules/omr/services/omr-client.service';
import { OmrMarkStatus } from '../../../src/modules/omr/interfaces/omr-transport.interface';

describe('OmrClientService', () => {
  let service: OmrClientService;
  let grpcClient: ClientGrpc;
  const omrGrpcService = {
    detect: jest.fn(),
    gradeOverlay: jest.fn(),
  };

  beforeEach(() => {
    grpcClient = {
      getService: jest.fn().mockReturnValue(omrGrpcService),
    } as unknown as ClientGrpc;

    service = new OmrClientService(grpcClient);
    service.onModuleInit();
    omrGrpcService.detect.mockReset();
    omrGrpcService.gradeOverlay.mockReset();
  });

  it('returns OMR payload when service responds with valid shape', async () => {
    omrGrpcService.detect.mockReturnValue(
      of({
        studentCode: '20224871',
        testId: '001',
        needsReview: false,
        artifacts: {
          processedImagePath: '/tmp/processed.png',
        },
        answers: [
          {
            questionNumber: 1,
            detectedAnswer: 'A',
            correctAnswer: 'A',
            isCorrect: true,
            needsReview: false,
            reviewReason: null,
          },
        ],
      }),
    );

    await expect(
      service.detectImage({
        imageUrl: 'https://example.com/sheet.png',
        templateName: 'tnteam_60q_4col_ad',
      }),
    ).resolves.toEqual({
      studentCode: '20224871',
      testId: '001',
      needsReview: false,
      artifacts: {
        processedImagePath: '/tmp/processed.png',
        annotatedImagePath: null,
        warpOverlayPath: null,
        answerScoresPath: null,
        resultJsonPath: null,
      },
      answers: [
        {
          questionNumber: 1,
          detectedAnswer: 'A',
          needsReview: false,
          reviewReason: null,
        },
      ],
    });
  });

  it('raises unprocessable entity when payload shape is invalid', async () => {
    omrGrpcService.detect.mockReturnValue(
      of({
        studentCode: '20224871',
      }),
    );

    await expect(
      service.detectImage({
        imageUrl: 'https://example.com/sheet.png',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('maps upstream error to bad gateway exception', async () => {
    omrGrpcService.detect.mockReturnValue(
      throwError(() => ({
        code: 14,
        details: 'OMR upstream failed',
      })),
    );

    await expect(
      service.detectImage({
        imageUrl: 'https://example.com/sheet.png',
      }),
    ).rejects.toEqual(new BadGatewayException('OMR upstream failed'));
  });

  it('maps gRPC validation errors to unprocessable entity', async () => {
    omrGrpcService.gradeOverlay.mockReturnValue(
      throwError(() => ({
        code: 3,
        details: 'Invalid overlay payload',
      })),
    );

    await expect(
      service.renderGradeOverlay({
        resultJsonPath: '/tmp/result.json',
        marks: [{ questionNumber: 1, status: OmrMarkStatus.CORRECT }],
      }),
    ).rejects.toEqual(
      new UnprocessableEntityException('Invalid overlay payload'),
    );
  });
});
