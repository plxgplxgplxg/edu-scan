import { Queue } from 'bull';
import { OmrQueueJobData } from '../../../../../src/modules/omr/queue/omr-queue.types';
import { OmrQueueService } from '../../../../../src/modules/omr/services/omr-queue.service';
import { OMR_JOB_PROCESS_FILE } from '../../../../../src/modules/omr/queue/omr-queue.constants';

describe('OmrQueueService', () => {
  const addMock = jest.fn();
  const queue = {
    add: addMock,
  } as unknown as Queue;

  let service: OmrQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OmrQueueService(queue);
    addMock.mockResolvedValue(undefined);
  });

  it('enqueues one job per file with retry/backoff settings', async () => {
    const files = [buildFile('sheet-1.png'), buildFile('sheet-2.png')];

    await service.enqueueBatch({
      batchId: 'batch-1',
      examId: 'exam-1',
      files,
      templateName: 'tnteam_60q_4col_ad',
    });

    expect(addMock).toHaveBeenCalledTimes(2);
    const firstCall = addMock.mock.calls[0] as [
      string,
      OmrQueueJobData,
      {
        attempts: number;
        backoff: {
          type: string;
          delay: number;
        };
      },
    ];

    expect(firstCall[0]).toBe(OMR_JOB_PROCESS_FILE);
    expect(firstCall[1].batchId).toBe('batch-1');
    expect(firstCall[1].examId).toBe('exam-1');
    expect(firstCall[1].file.originalname).toBe('sheet-1.png');
    expect(firstCall[1].file.bufferBase64).toBe(
      Buffer.from('sheet-1.png').toString('base64'),
    );
    expect(firstCall[2]).toMatchObject({
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  });
});

function buildFile(originalname: string): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname,
    encoding: '7bit',
    mimetype: 'image/png',
    size: 10,
    buffer: Buffer.from(originalname),
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
  };
}
