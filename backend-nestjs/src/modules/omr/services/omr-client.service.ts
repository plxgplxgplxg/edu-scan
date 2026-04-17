import {
  BadGatewayException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  OmrGradeOverlayResponse,
  OmrServiceResponse,
} from '../interfaces/omr-response.interface';

type OmrDetectRequest = {
  imageUrl: string;
  templateName?: string;
};

type OmrGradeOverlayRequest = {
  resultJsonPath: string;
  answerKey: Array<{
    questionNumber: number;
    correctAnswer: string;
  }>;
};

@Injectable()
export class OmrClientService {
  private readonly logger = new Logger(OmrClientService.name);

  constructor(private readonly configService: ConfigService) {}

  async detectImage(payload: OmrDetectRequest): Promise<OmrServiceResponse> {
    const response = await this.post<OmrServiceResponse>('/detect', payload);
    this.validateDetectResponse(response);
    return response;
  }

  async renderGradeOverlay(
    payload: OmrGradeOverlayRequest,
  ): Promise<OmrGradeOverlayResponse> {
    return this.post<OmrGradeOverlayResponse>('/grade-overlay', payload);
  }

  private async post<ResponsePayload>(
    path: string,
    payload: unknown,
  ): Promise<ResponsePayload> {
    const baseUrl =
      this.configService.get<string>('OMR_SERVICE_URL') ||
      this.configService.get<string>('omrService.url') ||
      'http://localhost:8000';

    try {
      const response = await axios.post<ResponsePayload>(
        `${baseUrl.replace(/\/$/, '')}${path}`,
        payload,
        {
          timeout: 15000,
        },
      );

      return response.data;
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }

      const axiosError = error as AxiosError<{ message?: string }>;
      this.logger.error('OMR service request failed', axiosError.message);

      throw new BadGatewayException(
        axiosError.response?.data?.message || 'OMR service request failed',
      );
    }
  }

  private validateDetectResponse(payload: OmrServiceResponse) {
    if (!payload || !Array.isArray(payload.answers)) {
      throw new UnprocessableEntityException(
        'OMR service returned invalid detect payload',
      );
    }
  }
}
