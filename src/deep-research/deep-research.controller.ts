import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DeepResearchService } from './deep-research.service';
import { PrepareResearchDto, StartResearchDto } from './deep-research.dto';

@ApiTags('Deep Research')
@Controller('deep-research')
export class DeepResearchController {
  constructor(private readonly deepResearchService: DeepResearchService) {}

  @Post('prepare')
  @ApiOperation({
    summary: 'Prepare research questions',
    description: 'Generates a list of supplementary questions to refine the research direction based on the initial query.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of generated supplementary questions',
    type: [String],
  })
  async prepareQuestions(@Body() input: PrepareResearchDto): Promise<string[]> {
    return this.deepResearchService.prepareQuestions(input);
  }

  @Post('start')
  @ApiOperation({
    summary: 'Start research',
    description: 'Conducts in-depth research based on the query and answers to supplementary questions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed research report in Markdown format',
    type: String,
  })
  async startResearch(@Body() input: StartResearchDto): Promise<string> {
    return this.deepResearchService.startResearch(input);
  }
} 