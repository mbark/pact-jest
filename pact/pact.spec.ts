// this is not technically needed as 'jsdom' is the default, but I added it to
// make it more clear.
/**
 * @jest-environment jsdom
 */

import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/mergeMap';

import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpClientModule,
  HTTP_INTERCEPTORS,
  HttpClient
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Pact } from '@pact-foundation/pact';
import { HTTPMethod } from '@pact-foundation/pact/common/request';
import { Observable } from 'rxjs/Observable';
import { TestBed, async } from '@angular/core/testing';

const port = 1234;

describe('Pact', () => {
  let http: HttpClient;

  const provider = new Pact({
    port,
    consumer: 'consumer',
    provider: 'provider',
    logLevel: 'debug',
    spec: 2,
    cors: true
  });

  beforeAll(async () => await provider.setup());
  afterAll(async () => await provider.finalize());

  async function addInteraction(): Promise<string> {
    const method: HTTPMethod = 'GET';
    const interaction = {
      state: 'i have something',
      uponReceiving: 'a request',
      withRequest: {
        method: method,
        path: '/path'
      },
      willRespondWith: {
        status: 200
      }
    };

    return provider.addInteraction(interaction);
  }

  beforeAll(done => addInteraction().then(() => done(), () => done()));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: PactInterceptor, multi: true }
      ]
    });

    http = TestBed.get(HttpClient) as HttpClient;
  });

  it(
    'returns the correct response',
    async(() => {
      http
        .get<any>('/path')
        .catch((err, _) => {
          return Observable.of({});
        })
        .mergeMap(() => provider.verify())
        .mergeMap(() => provider.finalize())
        .subscribe(() => {});
    })
  );
});

@Injectable()
export class PactInterceptor implements HttpInterceptor {
  constructor() {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(
      req.clone({
        url: `http://127.0.0.1:${port}${req.url}`
      })
    );
  }
}
