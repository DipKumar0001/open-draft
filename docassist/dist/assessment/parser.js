"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAssessment = parseAssessment;
const llm_1 = require("../llm");
async function parseAssessment(content, config) {
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
    const response = await (0, llm_1.chat)([
        { role: 'system', content: 'You are a parsing engine. Return only JSON.' },
        { role: 'user', content: prompt }
    ], config);
    let jsonStr = response.content.trim();
    // Strip markdown blocks if present
    if (jsonStr.startsWith('\`\`\`')) {
        const lines = jsonStr.split('\
');
        lines.shift();
        if (lines[lines.length - 1].startsWith('\`\`\`'))
            lines.pop();
        jsonStr = lines.join('\
');
    }
    try {
        const obj = JSON.parse(jsonStr);
        return obj;
    }
    catch (err) {
        throw new Error(`Failed to parse LLM structured output. Extracted string: ${jsonStr}`);
    }
}
