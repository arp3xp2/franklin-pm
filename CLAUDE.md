# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Franklin Demo" - an MVP learning app for aspiring Product Managers. The app generates AI-powered multiple-choice questions from user-provided PM learning materials and provides immediate quiz functionality with feedback.

**Current State**: CLI-based quiz generator using Google's Gemini AI
**Planned Evolution**: Web application with React frontend (per PRD.md)

## Development Commands

```bash
# Generate quiz from PM learning text (CLI version)
npm run quiz -- "Your PM learning text here"

# Next.js development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Install dependencies
npm install

# Note: No test command configured yet (returns error)
npm test
```

## Environment Setup

The application requires a Gemini API key for AI question generation:

1. Create `.env.local` (preferred) or `.env` file
2. Add your Gemini API key: `GEMINI_API_KEY=your_key_here`
3. The app will automatically prefer `.env.local` over `.env` if both exist

## Architecture & Key Patterns

### Current CLI Architecture
- **Entry point**: `scripts/generate-quiz.mjs` 
- **AI Integration**: Google Generative AI (`gemini-1.5-flash` model)
- **Input method**: Command line arguments
- **Output**: JSON-formatted quiz questions with validation

### Quiz Generation Pipeline
1. **Input Processing**: Accepts PM learning text via CLI arguments
2. **AI Prompting**: Structured prompt engineering for PM-specific questions
3. **Response Validation**: Strict JSON schema validation with automatic repair
4. **Error Handling**: Graceful failures with specific error codes

### Data Structure
Questions follow this schema:
```javascript
{
  "frage": "Question text",
  "optionen": ["option1", "option2", "option3", "option4", "option5"], // Exactly 5 options
  "richtige_index": 0, // Index of correct answer (0-4)
  "erklaerung": "Explanation text"
}
```

### Error Handling Strategy
- **Exit Code 1**: Missing API key
- **Exit Code 2**: Invalid quiz data structure
- **Exit Code 3**: AI generation errors
- **Auto-repair**: Single attempt to fix malformed JSON responses

## Product Manager Context

This tool is designed specifically for PM learning scenarios:
- **Target Users**: PM career changers, interview prep, certification study
- **Question Style**: Practice-oriented, contextual PM scenarios
- **UI Direction**: Dashboard aesthetic (Jira/Trello-inspired) when web version is built
- **Scope**: Focused on quick text-to-quiz workflow without accounts or persistence

## Development Status

**Current Implementation**: CLI-based quiz generator
**Next Phase**: Next.js web application (dependencies already added)

The roadmap includes completing the React/Next.js web application with:
- Paste-based text input interface
- Real-time quiz UI with immediate feedback
- Score summaries with PM-specific improvement hints
- Tailwind CSS styling in PM tool aesthetic

## AI Integration Notes

- Uses Google Gemini 1.5 Flash model for cost efficiency
- Prompt engineering focuses on PM-specific question generation
- Built-in JSON repair mechanism for AI response reliability
- Validates exactly 3 questions with 5 options each