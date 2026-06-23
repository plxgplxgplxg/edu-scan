import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class SseRegistryService<TEvent = unknown> {
  private readonly channels = new Map<string, Subject<TEvent>>();

  stream(channelId: string): Observable<TEvent> {
    return this.getOrCreate(channelId).asObservable();
  }

  emit(channelId: string, event: TEvent): void {
    this.getOrCreate(channelId).next(event);
  }

  complete(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }

    channel.complete();
    this.channels.delete(channelId);
  }

  private getOrCreate(channelId: string) {
    const existing = this.channels.get(channelId);
    if (existing) {
      return existing;
    }

    const channel = new Subject<TEvent>();
    this.channels.set(channelId, channel);
    return channel;
  }
}
