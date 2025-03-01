import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/deep-research/prepare (POST)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/deep-research/prepare',
      payload: {
        query: 'How does artificial intelligence affect the job market?',
        numQuestions: 3
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toBeInstanceOf(Array);
  });

  it('/deep-research/start (POST)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/deep-research/start',
      payload: {
        query: 'How does artificial intelligence affect the job market?',
        depth: 3,
        breadth: 5,
        questionsWithAnswers: 'Q1: Which sectors are most at risk?\nA1: Mainly transportation and administration.'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(typeof JSON.parse(response.payload)).toBe('string');
  });
}); 