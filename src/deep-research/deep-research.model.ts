export interface PrepareResearchInput {
  query: string;
  numQuestions: number;
}

export interface StartResearchInput {
  depth: number;
  breadth: number;
  query: string;
  questionsWithAnswers: string;
}
