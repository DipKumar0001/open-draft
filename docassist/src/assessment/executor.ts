import { DocAssistConfig } from '../config';
import { chat } from '../llm';
import { AssessmentBrief } from './parser';
import { logger } from '../utils/logger';

export interface ExecutionResult {
  brief: AssessmentBrief;
  completions: { title: string; content: string }[];
  provider: string;
  model: string;
}

export async function executeAssessment(brief: AssessmentBrief, config: DocAssistConfig): Promise<ExecutionResult> {
  const completions = [];
  let currentProvider = '';
  let currentModel = '';

  for (let i = 0; i < brief.tasks.length; i++) {
    const task = brief.tasks[i];
    logger.info(`Executing Task ${i + 1}/${brief.tasks.length}: ${task.title}`);

    const systemPrompt = `You are a highly capable university student completing an assignment.
Module: ${brief.moduleName}
Assignment: ${brief.assignmentTitle}
Learning Outcomes to address: ${brief.learningOutcomes.join(', ')}
Marking Criteria: ${brief.markingCriteria}
Format Required: ${brief.submissionFormat}

Instructions:
1. Complete the main task to the best of your ability.
2. Ensure you strictly follow the requested word count: ${task.wordCount}.
3. Maintain a formal academic register.
4. If references are required by standard academic conventions, invent plausible references or format placeholders properly.
5. Do not include boilerplate prefaces or trailing apologies. Output only the assignment content.`;

    const userPrompt = `Please write the content for this task:
Title: ${task.title}
Description: ${task.description}`;

    const response = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], config);

    completions.push({
      title: task.title,
      content: response.content
    });
    
    currentProvider = response.provider;
    currentModel = response.model;
  }

  return {
    brief,
    completions,
    provider: currentProvider || config.provider,
    model: currentModel
  };
}
