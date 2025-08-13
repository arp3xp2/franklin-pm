# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Franklin PM" - an MVP learning app for aspiring Product Managers. The app generates AI-powered multiple-choice questions from user-provided PM learning materials (text or uploaded files) and provides immediate quiz functionality with feedback.

**Current Version**: v0.2.1 "Gemini Scholar" - File upload support for quiz generation
**Evolution**: From CLI-based to full web application with Gemini file upload integration

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

### Current Web Architecture
- **Frontend**: Next.js with React (pages/index.js)
- **Backend API**: `/api/generate-quiz` and `/api/gemini-upload`
- **AI Integration**: Google Gemini 1.5-flash via SDK (text) and REST API (files)
- **File Support**: Resumable uploads to Gemini with drag & drop UI
- **Input methods**: Text input OR file uploads (PDF, images, docs)
- **Output**: JSON-formatted quiz questions with validation

### Quiz Generation Pipeline
1. **Input Processing**: Accepts PM text or uploaded files via web interface
2. **File Handling**: Resumable upload to Gemini API with status tracking
3. **AI Prompting**: Structured prompts for text-only or file-based generation
4. **Response Validation**: JSON schema validation with automatic repair attempts
5. **Error Handling**: Retry buttons and graceful failure messaging

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

**Current Implementation**: Full web application with file upload support
**Recent Features**: 
- Gemini file upload API with resumable uploads
- Drag & drop file interface with status chips
- Quiz generation from attached files (PDF, images, docs)
- Retry buttons for better error UX
- Dynamic question count based on content length
- Randomized answer positions

**Architecture Complete**:
- Text-based quiz generation via Gemini SDK
- File-based quiz generation via Gemini REST API  
- Real-time quiz UI with immediate feedback
- Score summaries and navigation
- Tailwind CSS styling

## AI Integration Notes

- Uses Google Gemini 1.5 Flash model for cost efficiency
- Prompt engineering focuses on PM-specific question generation
- Built-in JSON repair mechanism for AI response reliability
- Validates exactly 3 questions with 5 options each