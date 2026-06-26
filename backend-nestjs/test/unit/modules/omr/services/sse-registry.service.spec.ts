import { firstValueFrom, take } from 'rxjs';
import { SseRegistryService } from '../../../../../src/modules/omr/services/sse-registry.service';

describe('SseRegistryService', () => {
  it('streams emitted events to subscribers', async () => {
    const service = new SseRegistryService<{ type: string }>();
    const received = firstValueFrom(
      service.stream('omr:batch-1').pipe(take(1)),
    );

    service.emit('omr:batch-1', { type: 'batch:file:queued' });

    await expect(received).resolves.toEqual({ type: 'batch:file:queued' });
  });

  it('creates a fresh stream after channel completion', async () => {
    const service = new SseRegistryService<{ type: string }>();
    service.complete('omr:batch-1');

    const received = firstValueFrom(
      service.stream('omr:batch-1').pipe(take(1)),
    );
    service.emit('omr:batch-1', { type: 'batch:completed' });

    await expect(received).resolves.toEqual({ type: 'batch:completed' });
  });
});
