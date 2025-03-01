import { Injectable } from '@nestjs/common';
import { generateObject } from 'ai';
import { z } from 'zod';
import { systemPrompt } from './tools/prompt';
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { DeepResearchWorker } from './tools/deep-research';
import {
  PrepareResearchInput,
  StartResearchInput,
} from './deep-research.model';

@Injectable()
export class DeepResearchService {
  private readonly openai: OpenAIProvider;

  constructor(private readonly worker: DeepResearchWorker) {
    this.openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async startResearch(input: StartResearchInput) {
    console.log('🚀 Starting research with parameters:', {
      query: input.query,
      depth: input.depth,
      breadth: input.breadth,
      questionsLength: input.questionsWithAnswers?.length || 0
    });

    try {
      const initialQuery = input.query;
      const questions = input.questionsWithAnswers;

      const combinedQuery = `
        Initial Query: ${initialQuery}
        Follow-up Questions and Answers:
        ${questions}
      `;

      console.log('📝 Combined query:', combinedQuery);

      console.log('🔍 Starting deepResearch...');
      const { learnings, visitedUrls } = await this.worker.deepResearch({
        query: combinedQuery,
        breadth: input.breadth,
        depth: input.depth,
      });

      console.log('✅ deepResearch completed:', {
        learningsCount: learnings.length,
        visitedUrlsCount: visitedUrls.length
      });

      console.log('📊 Generating final report...');
      const report = await this.worker.writeFinalReport({
        prompt: combinedQuery,
        learnings,
        visitedUrls,
      });

      console.log('🎉 Report generated, length:', report.length);
      return report;
    } catch (error) {
      console.error('❌ Error in startResearch:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async prepareQuestions(fields: PrepareResearchInput): Promise<string[]> {
    console.log('📋 Generating questions for:', fields.query);
    try {
      const questions = await this.worker.generateQuestions(fields.query, fields.numQuestions);
      console.log('✅ Generated questions:', questions);
      return questions;
    } catch (error) {
      console.error('❌ Error in prepareQuestions:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
