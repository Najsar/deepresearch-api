import FirecrawlApp, { SearchResponse } from '@mendable/firecrawl-js';
import { generateObject, LanguageModelV1 } from 'ai';
import { compact } from 'lodash';
import { z } from 'zod';
import { trimPrompt } from './parser/providers';
import { systemPrompt } from './prompt';
import { OpenAIProvider, createOpenAI } from '@ai-sdk/openai';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ResearchProgressGateway } from '../websocket/research-progress.gateway';

type ResearchResult = {
  learnings: string[];
  visitedUrls: string[];
};

// increase this if you have higher API rate limits
const ConcurrencyLimit = 2;

export interface IDeepResearchWorker {
  generateQuestions(query: string, numQuestions: number): Promise<string[]>;
  conductResearch(query: string, questionsWithAnswers: string, depth: number, breadth: number): Promise<string>;
  deepResearch(params: {
    query: string;
    breadth: number;
    depth: number;
    learnings?: string[];
    visitedUrls?: string[];
  }): Promise<ResearchResult>;
  writeFinalReport(params: {
    prompt: string;
    learnings: string[];
    visitedUrls: string[];
  }): Promise<string>;
}

@Injectable()
export class DeepResearchWorker implements IDeepResearchWorker {
  private readonly openai: OpenAIProvider;
  private readonly firecrawl: FirecrawlApp;
  o3MiniModel: LanguageModelV1;

  constructor(
    private readonly progressGateway: ResearchProgressGateway
  ) {
    // Check if we have API keys
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY');
    }
    if (!process.env.FIRECRAWL_API_KEY) {
      throw new Error('Missing FIRECRAWL_API_KEY');
    }

    this.openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY,
    });

    this.o3MiniModel = this.openai('o3-mini', {
      reasoningEffort: 'medium',
      structuredOutputs: true,
    });
  }

  private emitProgress(message: string, data?: any) {
    this.progressGateway.emitProgress({
      type: 'info',
      message,
      data
    });
  }

  private emitError(message: string, error?: any) {
    this.progressGateway.emitProgress({
      type: 'error',
      message,
      data: error
    });
  }

  private emitSuccess(message: string, data?: any) {
    this.progressGateway.emitProgress({
      type: 'success',
      message,
      data
    });
  }

  private async detectLanguage(text: string): Promise<string> {
    const res = await generateObject({
      model: this.o3MiniModel,
      system: "You are a language detection expert. Return only the ISO 639-1 language code.",
      prompt: `Detect the language of the following text and return its ISO 639-1 code (e.g. 'en' for English, 'pl' for Polish, etc.). Only return the code, nothing else: ${text}`,
      schema: z.object({
        languageCode: z.string().describe('ISO 639-1 language code')
      })
    });

    return res.object.languageCode;
  }

  async generateQuestions(query: string, numQuestions: number): Promise<string[]> {
    const language = await this.detectLanguage(query);
    
    const res = await generateObject({
      model: this.o3MiniModel,
      system: systemPrompt(),
      prompt: `Given the following query from the user, generate EXACTLY ${numQuestions} follow up questions in the same language as the query (${language}). The questions must be unique, specific, and directly related to the main query. Each question should explore a different aspect of the topic: <query>${query}</query>`,
      schema: z.object({
        questions: z.array(z.string())
      }),
    });

    const questions = res.object.questions.slice(0, numQuestions);
    if (questions.length < numQuestions) {
      throw new Error(`Not enough questions generated. Expected ${numQuestions} but got ${questions.length}`);
    }

    return questions.slice(0, numQuestions);
  }

  async conductResearch(query: string, questionsWithAnswers: string, depth: number, breadth: number): Promise<string> {
    this.emitProgress('Starting comprehensive research...', { query, depth, breadth });

    const { learnings, visitedUrls } = await this.deepResearch({
      query: `
        Initial Query: ${query}
        Follow-up Questions and Answers:
        ${questionsWithAnswers}
      `,
      depth,
      breadth
    });

    this.emitProgress('Generating final report...', { 
      learningsCount: learnings.length, 
      sourcesCount: visitedUrls.length 
    });

    const report = await this.writeFinalReport({
      prompt: query,
      learnings,
      visitedUrls
    });

    this.emitSuccess('Research completed successfully!');
    return report;
  }

  async generateSerpQueries({
    query,
    numQueries = 3,
    learnings,
  }: {
    query: string;
    numQueries?: number;
    learnings?: string[];
  }) {
    console.log('🔍 Generating SERP queries:', {
      query,
      numQueries,
      hasLearnings: !!learnings,
      learningsCount: learnings?.length
    });

    try {
      const language = await this.detectLanguage(query);
      console.log('🌍 Detected language:', language);
      
      const res = await generateObject({
        model: this.o3MiniModel,
        system: systemPrompt(),
        prompt: `Given the following prompt from the user, generate a list of SERP queries in the same language as the query (${language}) to research the topic. Return a maximum of ${numQueries} queries, but feel free to return less if the original prompt is clear. Make sure each query is unique and not similar to each other: <prompt>${query}</prompt>\n\n${
          learnings
            ? `Here are some learnings from previous research, use them to generate more specific queries: ${learnings.join(
                '\n',
              )}`
            : ''
        }`,
        schema: z
          .object({
            queries: z
              .array(
                z.object({
                  query: z.string().describe('The SERP query'),
                  researchGoal: z
                    .string()
                    .describe(
                      'First talk about the goal of the research that this query is meant to accomplish, then go deeper into how to advance the research once the results are found, mention additional research directions. Be as specific as possible, especially for additional research directions.',
                    ),
                }),
              )
              .describe(`List of SERP queries, max of ${numQueries}`),
          }),
      });

      const queries = res.object.queries.slice(0, numQueries);
      console.log('✅ Generated queries:', queries);
      return queries;
    } catch (error) {
      console.error('❌ Error in generateSerpQueries:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async processSerpResult({
    query,
    result,
    numLearnings = 3,
    numFollowUpQuestions = 3,
  }: {
    query: string;
    result: SearchResponse;
    numLearnings?: number;
    numFollowUpQuestions?: number;
  }) {
    const language = await this.detectLanguage(query);
    
    const contents = compact(result.data.map((item) => item.markdown)).map(
      (content) => trimPrompt(content, 25_000),
    );

    const res = await generateObject({
      model: this.o3MiniModel,
      abortSignal: AbortSignal.timeout(60_000),
      system: systemPrompt(),
      prompt: `Given the following contents from a SERP search for the query <query>${query}</query>, generate a list of learnings in the same language as the query (${language}) from the contents. Return a maximum of ${numLearnings} learnings, but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. The learnings should be concise and to the point, as detailed and information dense as possible. Make sure to include any entities like people, places, companies, products, things, etc in the learnings, as well as any exact metrics, numbers, or dates. The learnings will be used to research the topic further.\n\n<contents>${contents
        .map((content) => `<content>\n${content}\n</content>`)
        .join('\n')}</contents>`,
      schema: z.object({
        learnings: z
          .array(z.string())
          .describe(`List of learnings, max of ${numLearnings}`),
        followUpQuestions: z
          .array(z.string())
          .describe(
            `List of follow-up questions to research the topic further, max of ${numFollowUpQuestions}`,
          ),
      }),
    });

    return res.object;
  }

  async writeFinalReport({
    prompt,
    learnings,
    visitedUrls,
  }: {
    prompt: string;
    learnings: string[];
    visitedUrls: string[];
  }) {
    this.emitProgress('Starting final report generation...', {
      learningsCount: learnings.length,
      urlsCount: visitedUrls.length
    });

    const language = await this.detectLanguage(prompt);
    this.emitProgress('Detected report language', { language });
    
    const learningsString = trimPrompt(
      learnings
        .map((learning) => `<learning>\n${learning}\n</learning>`)
        .join('\n'),
      150_000,
    );

    this.emitProgress('Generating report content...', {
      promptLength: prompt.length,
      learningsLength: learningsString.length
    });

    const res = await generateObject({
      model: this.o3MiniModel,
      system: systemPrompt(),
      prompt: `Given the following prompt from the user, write a final report in the same language as the query (${language}) on the topic using the learnings from research. Make it as detailed as possible, aim for 3 or more pages, include ALL the learnings from research:\n\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from previous research:\n\n<learnings>\n${learningsString}\n</learnings>`,
      schema: z.object({
        reportMarkdown: z
          .string()
          .describe('Final report on the topic in Markdown'),
      }),
    });

    this.emitProgress('Adding sources section...', {
      reportLength: res.object.reportMarkdown.length,
      sourcesCount: visitedUrls.length
    });

    // Append the visited URLs section to the report with localized title
    const sourcesTitle = await this.getLocalizedSourcesTitle(language);
    const urlsSection = `\n\n${sourcesTitle}\n\n${visitedUrls.map((url) => `- ${url}`).join('\n')}`;
    
    const finalReport = res.object.reportMarkdown + urlsSection;
    
    this.emitSuccess('Final report has been generated', {
      finalLength: finalReport.length,
      sectionsCount: finalReport.split('#').length - 1,
      sourcesCount: visitedUrls.length
    });

    return finalReport;
  }

  private async getLocalizedSourcesTitle(language: string): Promise<string> {
    const res = await generateObject({
      model: this.o3MiniModel,
      system: "You are a translator. Return only the translated word, nothing else.",
      prompt: `Translate the word "Sources" into the language with ISO code: ${language}. Return only the translated word with markdown h2 formatting (##), nothing else.`,
      schema: z.object({
        translation: z.string().describe('Translated word with markdown h2 formatting')
      })
    });

    return res.object.translation;
  }

  async deepResearch({
    query,
    breadth,
    depth,
    learnings = [],
    visitedUrls = [],
  }: {
    query: string;
    breadth: number;
    depth: number;
    learnings?: string[];
    visitedUrls?: string[];
  }): Promise<ResearchResult> {
    console.log('🚀 Starting deepResearch:', {
      depth,
      breadth,
      learningsCount: learnings.length,
      visitedUrlsCount: visitedUrls.length
    });

    if (depth <= 0) {
      console.log('🎯 Maximum depth reached');
      this.emitSuccess(`Maximum depth reached`);
      return {
        learnings,
        visitedUrls
      };
    }

    try {
      this.emitProgress(`Starting research at depth ${depth}...`, {
        query,
        currentLearnings: learnings.length
      });

      console.log('🔍 Generating SERP queries...');
      const serpQueries = await this.generateSerpQueries({
        query,
        learnings,
        numQueries: Math.min(breadth, 3), // Limiting the number of parallel queries
      });

      this.emitProgress(`Generated SERP queries`, {
        count: serpQueries.length,
        queries: serpQueries.map(q => ({
          query: q.query,
          goal: q.researchGoal.split('.')[0] || q.researchGoal
        }))
      });

      const results = await Promise.all(
        serpQueries.map(async (serpQuery) => {
          try {
            this.emitProgress(`Processing query`, {
              query: serpQuery.query
            });
            
            const result = await this.firecrawl.search(serpQuery.query, {
              timeout: 15000,
              limit: 3, // Reducing results limit
              scrapeOptions: { formats: ['markdown'] },
            });

            const newUrls = compact(result.data.map((item) => item.url));
            const newLearnings = await this.processSerpResult({
              query: serpQuery.query,
              result,
              numLearnings: 3,
              numFollowUpQuestions: Math.ceil(breadth / 2),
            });

            return {
              learnings: newLearnings.learnings,
              visitedUrls: newUrls,
            };
          } catch (error) {
            console.error('❌ Error processing query:', {
              query: serpQuery.query,
              error: error.message
            });
            
            if (error.response?.status === 402 || error.response?.status === 429) {
              throw error;
            }
            
            return {
              learnings: [],
              visitedUrls: [],
            };
          }
        })
      );

      const newLearnings = [...new Set([...learnings, ...results.flatMap(r => r.learnings || [])])];
      const newUrls = [...new Set([...visitedUrls, ...results.flatMap(r => r.visitedUrls || [])])];

      if (depth > 1) {
        const nextDepthResult = await this.deepResearch({
          query,
          breadth: Math.max(2, Math.ceil(breadth / 2)),
          depth: depth - 1,
          learnings: newLearnings,
          visitedUrls: newUrls,
        });

        return {
          learnings: [...new Set([...newLearnings, ...nextDepthResult.learnings])],
          visitedUrls: [...new Set([...newUrls, ...nextDepthResult.visitedUrls])],
        };
      }

      return {
        learnings: newLearnings,
        visitedUrls: newUrls,
      };
    } catch (error) {
      console.error('❌ Error in deepResearch:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      if (error instanceof HttpException) {
        throw error;
      }
      
      this.emitError('Error in research process', {
        error: error.message,
        stack: error.stack
      });
      
      throw new HttpException(
        'An error occurred while conducting research', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
