import { Test, TestingModule } from '@nestjs/testing';
import { DeepResearchController } from './deep-research.controller';
import { DeepResearchService } from './deep-research.service';

describe('DeepResearchController', () => {
  let controller: DeepResearchController;
  let service: DeepResearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeepResearchController],
      providers: [
        {
          provide: DeepResearchService,
          useValue: {
            prepareQuestions: jest.fn().mockResolvedValue([
              'Which sectors of the economy are most threatened by AI?',
              'How will the job market change in the next 5 years?',
              'What new professions may emerge due to AI development?'
            ]),
            startResearch: jest.fn().mockResolvedValue(
              '# Impact of Artificial Intelligence on the Job Market\n\n## Key findings...'
            )
          }
        }
      ],
    }).compile();

    controller = module.get<DeepResearchController>(DeepResearchController);
    service = module.get<DeepResearchService>(DeepResearchService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('prepareQuestions', () => {
    it('should return an array of questions', async () => {
      const input = {
        query: 'How does artificial intelligence affect the job market?',
        numQuestions: 3
      };

      const result = await controller.prepareQuestions(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(service.prepareQuestions).toHaveBeenCalledWith(input);
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

      const result = await controller.startResearch(input);

      expect(typeof result).toBe('string');
      expect(result).toContain('# Impact of Artificial Intelligence on the Job Market');
      expect(service.startResearch).toHaveBeenCalledWith(input);
    });
  });
}); 