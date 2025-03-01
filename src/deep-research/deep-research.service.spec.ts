import { Test, TestingModule } from '@nestjs/testing';
import { DeepResearchService } from './deep-research.service';
import { DeepResearchWorker } from './tools/deep-research';
import { ConfigModule } from '@nestjs/config';

jest.setTimeout(30000); // Increasing global timeout to 30 seconds

jest.mock('./tools/deep-research', () => {
  return {
    DeepResearchWorker: jest.fn().mockImplementation(() => ({
      generateQuestions: jest.fn().mockResolvedValue([
        'Which sectors of the economy are most threatened by AI?',
        'How will the job market change in the next 5 years?',
        'What new professions may emerge due to AI development?'
      ]),
      conductResearch: jest.fn().mockResolvedValue(
        '# Impact of Artificial Intelligence on the Job Market\n\n## Key findings...'
      ),
      deepResearch: jest.fn().mockResolvedValue({
        learnings: [
          'AI could automate up to 30% of current jobs by 2030',
          'New AI-related jobs will require creative and social skills',
          'Service sector will be most resistant to automation'
        ],
        visitedUrls: ['https://example.com/ai-impact']
      }),
      writeFinalReport: jest.fn().mockResolvedValue(
        '# Impact of Artificial Intelligence on the Job Market\n\n## Key findings...'
      )
    }))
  };
});

describe('DeepResearchService', () => {
  let service: DeepResearchService;
  let worker: DeepResearchWorker;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [DeepResearchService, DeepResearchWorker],
    }).compile();

    service = module.get<DeepResearchService>(DeepResearchService);
    worker = module.get(DeepResearchWorker);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('prepareQuestions', () => {
    it('should return an array of questions', async () => {
      const input = {
        query: 'How does artificial intelligence affect the job market?',
        numQuestions: 3
      };

      const result = await service.prepareQuestions(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(worker.generateQuestions).toHaveBeenCalledWith(input.query, input.numQuestions);
    });
  });

  describe('startResearch', () => {
    it('should return a markdown formatted research report', async () => {
      const input = {
        query: 'How does artificial intelligence affect the job market?',
        depth: 3,
        breadth: 5,
        questionsWithAnswers: 'Q1: Which sectors are most at risk?\nA1: Mainly transportation and administration.'
      };

      const result = await service.startResearch(input);

      expect(typeof result).toBe('string');
      expect(result).toContain('# Impact of Artificial Intelligence on the Job Market');
      expect(worker.deepResearch).toHaveBeenCalledWith({
        query: expect.any(String),
        depth: input.depth,
        breadth: input.breadth
      });
      expect(worker.writeFinalReport).toHaveBeenCalled();
    });
  });
}); 