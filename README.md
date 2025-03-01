# Deep Research API

Advanced API for conducting in-depth research using artificial intelligence. The system automatically analyzes the given question, generates supplementary questions, and conducts multi-level research, gathering information from various sources.

## Features

- 🔍 Automatic generation of supplementary questions
- 🌐 Multi-level search of internet sources
- 🤖 AI-powered information analysis and synthesis
- 📊 Detailed report generation in Markdown format
- 🌍 Multi-language support (automatic detection)
- 📡 Real-time communication via WebSocket
- 📝 Detailed research progress logging

## Requirements

- Node.js >= 18
- npm >= 9
- OpenAI API Key
- Firecrawl API Key

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd deep-research-api
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env` file:
```env
OPENAI_API_KEY=your-openai-key
FIRECRAWL_API_KEY=your-firecrawl-key
```

4. Run the application:
```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

## API Usage

### Preparing Supplementary Questions

```http
POST /deep-research/prepare
Content-Type: application/json

{
  "query": "How does artificial intelligence affect the job market?",
  "numQuestions": 3
}
```

### Starting Research

```http
POST /deep-research/start
Content-Type: application/json

{
  "query": "How does artificial intelligence affect the job market?",
  "depth": 3,
  "breadth": 5,
  "questionsWithAnswers": "Q1: Which sectors are most at risk?\nA1: Mainly transportation and administration..."
}
```

### WebSocket - Progress Monitoring

Connect to the WebSocket endpoint:
```javascript
const socket = io('http://localhost:3000/research-progress');

socket.on('progress', (event) => {
  console.log(`[${event.type}] ${event.message}`);
  if (event.data) {
    console.log('Data:', event.data);
  }
});
```

## Research Parameters

- `depth` (1-5): Determines the depth of recursive research
- `breadth` (1-10): Determines the number of parallel research paths
- `numQuestions` (1-10): Number of supplementary questions generated

## Project Structure

```
src/
├── deep-research/
│   ├── tools/
│   │   ├── deep-research.ts    # Main research logic
│   │   ├── parser/            # Parsers and helper tools
│   │   └── prompt.ts          # AI prompt templates
│   ├── websocket/
│   │   └── research-progress.gateway.ts  # WebSocket handling
│   ├── deep-research.controller.ts  # API Controller
│   ├── deep-research.service.ts     # Business Service
│   ├── deep-research.module.ts      # NestJS Module
│   └── deep-research.dto.ts         # Data type definitions
└── main.ts                          # Application entry point
```

## API Documentation

Swagger documentation is available at:
```
http://localhost:3000/docs
```

## Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## License

MIT License

Copyright (c) 2025 Patryk Najsar Najsarek

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
