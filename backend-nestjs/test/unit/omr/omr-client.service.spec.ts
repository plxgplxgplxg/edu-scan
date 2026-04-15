import { BadGatewayException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OmrClientService } from '../../../src/modules/omr/services/omr-client.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OmrClientService', () => {
  let service: OmrClientService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'OMR_SERVICE_URL') {
          return 'http://localhost:8000';
        }

        return undefined;
      }),
    } as unknown as ConfigService;

    service = new OmrClientService(configService);
    mockedAxios.post.mockReset();
  });

  it('returns OMR payload when service responds with valid shape', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        studentCode: '20224871',
        needsReview: false,
        answers: [
          {
            questionNumber: 1,
            detectedAnswer: 'A',
            needsReview: false,
          },
        ],
      },
    });

    await expect(
      service.processImage({
        imageUrl: 'https://example.com/sheet.png',
        questionCount: 1,
      }),
    ).resolves.toEqual({
      studentCode: '20224871',
      needsReview: false,
      answers: [
        {
          questionNumber: 1,
          detectedAnswer: 'A',
          needsReview: false,
        },
      ],
    });
  });

  it('raises unprocessable entity when payload shape is invalid', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        studentCode: '20224871',
      },
    });

    await expect(
      service.processImage({
        imageUrl: 'https://example.com/sheet.png',
        questionCount: 1,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('maps upstream error to bad gateway exception', async () => {
    mockedAxios.post.mockRejectedValue({
      message: 'connect ECONNREFUSED',
      response: {
        data: {
          message: 'OMR upstream failed',
        },
      },
    });

    await expect(
      service.processImage({
        imageUrl: 'https://example.com/sheet.png',
        questionCount: 1,
      }),
    ).rejects.toEqual(new BadGatewayException('OMR upstream failed'));
  });
});
