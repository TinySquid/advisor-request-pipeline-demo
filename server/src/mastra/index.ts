import { Mastra } from '@mastra/core';
import { intentClassifierAgent } from './agents/intent-classifier.js';
import { crmWriterAgent } from './agents/crm-writer.js';
import { emailDrafterAgent } from './agents/email-drafter.js';
import { taskCreatorAgent } from './agents/task-creator.js';
import { advisorRequestWorkflow } from './workflows/advisor-request.js';

export const mastra = new Mastra({
  agents: {
    intentClassifierAgent,
    crmWriterAgent,
    emailDrafterAgent,
    taskCreatorAgent,
  },
  workflows: {
    advisorRequestWorkflow,
  },
});
