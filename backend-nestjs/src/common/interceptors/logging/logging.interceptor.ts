import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const now = Date.now();

    this.logger.log(
      `--> ${method} ${url}` +
        (body && Object.keys(body).length ? ` body=${JSON.stringify(body)}` : '') +
        (query && Object.keys(query).length ? ` query=${JSON.stringify(query)}` : '') +
        (params && Object.keys(params).length ? ` params=${JSON.stringify(params)}` : ''),
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          this.logger.log(
            `<-- ${method} ${url} ${response.statusCode} ${Date.now() - now}ms`,
          );
        },
        error: (error) => {
          this.logger.error(
            `<-- ${method} ${url} ${error.status ?? 500} ${Date.now() - now}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}