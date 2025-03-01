import { Module } from '@nestjs/common';
import { DeepResearchModule } from './deep-research/deep-research.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DeepResearchModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
