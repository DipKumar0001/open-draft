import { ExecutionResult } from '../assessment/executor';

export function formatMarkdown(result: ExecutionResult): string {
  const { brief, completions } = result;
  
  let md = `# ${brief.assignmentTitle}\
`;
  md += `**Module:** ${brief.moduleName}\
\
`;
  md += `---\
\
`;

  for (const comp of completions) {
    md += `## ${comp.title}\
\
`;
    md += `${comp.content}\
\
`;
    md += `---\
\
`;
  }

  return md;
}

export function formatPlainText(result: ExecutionResult): string {
  const { brief, completions } = result;
  
  let txt = `${brief.assignmentTitle.toUpperCase()}\
`;
  txt += `Module: ${brief.moduleName}\
\
`;
  txt += `=========================================\
\
`;

  for (const comp of completions) {
    txt += `[ ${comp.title.toUpperCase()} ]\
\
`;
    txt += `${comp.content}\
\
`;
    txt += `-----------------------------------------\
\
`;
  }

  return txt;
}
