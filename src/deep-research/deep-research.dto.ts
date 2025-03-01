import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min } from 'class-validator';

export class PrepareResearchDto {
  @ApiProperty({
    description: 'Initial research query',
    example: 'How does artificial intelligence affect the job market?',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Number of supplementary questions to generate',
    minimum: 1,
    maximum: 10,
    default: 3,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  numQuestions: number;
}

export class StartResearchDto {
  @ApiProperty({
    description: 'Research depth - number of recursive search levels',
    minimum: 1,
    maximum: 5,
    default: 3,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  depth: number;

  @ApiProperty({
    description: 'Research breadth - number of parallel research paths',
    minimum: 1,
    maximum: 10,
    default: 6,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  breadth: number;

  @ApiProperty({
    description: 'Initial research query',
    example: 'How does artificial intelligence affect the job market?',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Supplementary questions with answers in text format',
    example: 'Q1: Which sectors are most at risk?\nA1: Mainly transportation and administration...',
  })
  @IsString()
  questionsWithAnswers: string;
} 