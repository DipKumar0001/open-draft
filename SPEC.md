# Specification (SPEC.md)

## Objective
A full-stack web application (Next.js) that reads all types of documents (PDF, DOCX, HTML, Excel, code, etc.) and integrates with local Ollama models to act as a system-level agent.

## Technology Stack
- **Frontend**: Next.js (App Router), React, Vanilla CSS for premium aesthetics.
- **Backend API**: Node.js API Routes within Next.js.

## Document Processing
- Supports PDF extraction (`pdf-parse`).
- Supports DOCX extraction (`mammoth`).
- Supports Excel/XLSX extraction (`xlsx`).
- Supports generic text encoding for strings/code.

## Ollama Agent
- Utilizes an Ollama REST client (`http://localhost:11434`).
- Uses Tool Use / Function Calling technique to detect actions vs chat.
- Capable of `create_file`, `launch_app`, and `open_url` natively via Node.js system commands (`fs` and `child_process`).

## UI/UX
- Premium Web chat interface supporting dark mode and sleek animations.
- Clear file upload component to establish document context.
- Conversational main area for natural English communication and agentic commands.
- Fully accessible via CLI using `npm run dev`.
