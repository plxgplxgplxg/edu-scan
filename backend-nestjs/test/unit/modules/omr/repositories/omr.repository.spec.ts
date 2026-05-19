import { OmrBatchStatus } from '@prisma/client';
import { resolveFinalBatchStatus } from '../../../../../src/modules/omr/repositories/omr.repository';

describe('OmrRepository final status resolver', () => {
  it('returns COMPLETED when all files succeed', () => {
    const status = resolveFinalBatchStatus(5, 0);
    expect(status).toBe(OmrBatchStatus.COMPLETED);
  });

  it('returns FAILED when all files fail', () => {
    const status = resolveFinalBatchStatus(0, 4);
    expect(status).toBe(OmrBatchStatus.FAILED);
  });

  it('returns PARTIAL_FAILED when both success and fail exist', () => {
    const status = resolveFinalBatchStatus(3, 2);
    expect(status).toBe(OmrBatchStatus.PARTIAL_FAILED);
  });
});
