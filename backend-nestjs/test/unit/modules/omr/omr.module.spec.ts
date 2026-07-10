import { OMR_QUEUE_NAME } from '../../../../src/modules/omr/queue/omr-queue.constants';
import { OmrModule } from '../../../../src/modules/omr/omr.module';

describe('OmrModule queue configuration', () => {
  it('uses long idle waits and bounded job retention for the OMR-only queue', () => {
    const metadata = Reflect.getMetadata('imports', OmrModule) as Array<{
      providers?: Array<{
        useFactory?: (dependencyHolder: {
          getDependencyRef: () => object;
        }) => unknown;
      }>;
    }>;
    const queueModule = metadata.find((item) => item.providers);
    const queueOptions = queueModule?.providers?.[1]?.useFactory?.({
      getDependencyRef: () => ({}),
    }) as {
      name: string;
      settings: Record<string, number>;
      defaultJobOptions: Record<string, boolean>;
    };

    expect(queueOptions).toMatchObject({
      name: OMR_QUEUE_NAME,
      settings: {
        drainDelay: 60,
        guardInterval: 60_000,
        stalledInterval: 15 * 60_000,
        lockDuration: 5 * 60_000,
        lockRenewTime: 60_000,
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
  });
});
