import { DocAssistConfig } from '../config';
import { chat } from '../llm';

export interface Task {
  title: string;
  description: string;
  wordCount: string;
}

export interface AssessmentBrief {
  moduleName: string;
  assignmentTitle: string;
  tasks: Task[];
  learningOutcomes: string[];
  markingCriteria: string;
  submissionFormat: string;
  deadline: string;
}

export async function parseAssessment(content: string, config: DocAssistConfig): Promise<AssessmentBrief> {
  const prompt = `You are an expert academic parser. Extract the following structured information from the provided assessment brief document. If a detail is missing, provide "N/A".
Return ONLY valid JSON matching this exact structure:
{
  "moduleName": "string",
  "assignmentTitle": "string",
  "tasks": [{"title": "string", "description": "string", "wordCount": "string"}],
  "learningOutcomes": ["string"],
  "markingCriteria": "string",
  "submissionFormat": "string",
  "deadline": "string"
}

Document Content:
---
${content.slice(0, 50000)} // truncate to prevent context limits
---`;

  const response = await chat([
    { role: 'system', content: 'You are a parsing engine. Return only JSON.' },
    { role: 'user', content: prompt }
  ], config);

  let jsonStr = response.content.trim();
  // Strip markdown blocks if present
  if (jsonStr.startsWith('\`\`\`')) {
    const lines = jsonStr.split('\
');
    lines.shift();
    if (lines[lines.length - 1].startsWith('\`\`\`')) lines.pop();
    jsonStr = lines.join('\
');
  }

  try {
    const obj = JSON.parse(jsonStr);
    return obj as AssessmentBrief;
  } catch (err: any) {
    throw new Error(`Failed to parse LLM structured output. Extracted string: ${jsonStr}`);
  }
}
