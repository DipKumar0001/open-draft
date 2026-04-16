# DocAssist

AI-powered document scanner and assessment tool, featuring an advanced Node.js engine and Python fallback layer.

## Installation

```bash
npm install -g docassist
# or locally link
npm link
```

## Quick Start Examples

```bash
# Start Claude Code-style interactive REPL (defaults to Ollama)
open-draft

# Scan a specific file and log output
docassist scan ./my-document.pdf

# Detect and execute an assessment brief automatically using Ollama
docassist assess ./homework.docx

# Provide an API key and Use Anthropic
docassist assess ./homework.docx --provider anthropic --api-key sk-ant-xxxx...

# View existing config
docassist config

# Test providers
docassist providers
```

## Python Fallback Setup

In case Node.js cannot natively parse your files computationally, DocAssist relies on powerful Python primitives. Simply run:
```bash
pip install PyMuPDF python-docx openpyxl pytesseract Pillow
```

## Config
Provide a `.docassistrc` JSON file anywhere in your workspace.
```json
{
  "provider": "ollama",
  "ollamaModel": "llama3.2",
  "ollamaBaseUrl": "http://localhost:11434",
  "outputDir": "./docassist-output",
  "pythonFallback": true,
  "verbose": false,
  "assessmentMode": "auto"
}
```

## Troubleshooting
**"Ollama not running"** --> Execute `ollama serve`
**"API key required"** --> Ensure `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set in your bashrc or append `--api-key` to your run.
