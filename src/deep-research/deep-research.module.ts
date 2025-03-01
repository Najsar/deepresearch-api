import { Module } from '@nestjs/common';
import { DeepResearchService } from './deep-research.service';
import { DeepResearchWorker } from './tools/deep-research';
import { DeepResearchController } from './deep-research.controller';
import { ResearchProgressGateway } from './websocket/research-progress.gateway';

@Module({
  imports: [],
  providers: [DeepResearchService, DeepResearchWorker, ResearchProgressGateway],
  controllers: [DeepResearchController],
  exports: [DeepResearchService],
})
export class DeepResearchModule {}
