import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { intentClassifierAgent } from '../agents/intent-classifier.js';
import { crmWriterAgent } from '../agents/crm-writer.js';
import { emailDrafterAgent } from '../agents/email-drafter.js';
import { taskCreatorAgent } from '../agents/task-creator.js';
import {
  WorkflowInputSchema,
  ClassifiedNoteSchema,
  ContactRecordSchema,
  EmailDraftSchema,
  TaskSchema,
  PipelineResultSchema,
} from '../schemas.js';

// ─── Agent Steps ─────────────────────────────

const classifyStep = createStep(intentClassifierAgent, {
  structuredOutput: { schema: ClassifiedNoteSchema },
  retries: 2,
});

const crmStep = createStep(crmWriterAgent, {
  structuredOutput: { schema: ContactRecordSchema },
  retries: 2,
});

const emailStep = createStep(emailDrafterAgent, {
  structuredOutput: { schema: EmailDraftSchema },
  retries: 2,
});

const taskStep = createStep(taskCreatorAgent, {
  structuredOutput: { schema: TaskSchema },
  retries: 2,
});

// ─── Assemble Step ─────────────────────────────────────────────────

const AssembleInputSchema = z.object({
  'crm-writer': ContactRecordSchema,
  'email-drafter': EmailDraftSchema,
  'task-creator': TaskSchema,
  classified: ClassifiedNoteSchema,
});

const assembleStep = createStep({
  id: 'assemble',
  description: 'Merges parallel agent outputs into the final pipeline result.',
  inputSchema: AssembleInputSchema,
  outputSchema: PipelineResultSchema,
  retries: 0,
  execute: async ({ inputData }) => {
    const { classified } = inputData;

    return {
      contact: inputData['crm-writer'],
      email: inputData['email-drafter'],
      task: inputData['task-creator'],
      propertySearch: {
        type: classified.propertyType,
        budgetMax: classified.budgetMax,
        budgetMin: classified.budgetMin,
        timeline: classified.timeline,
        location: classified.location,
      },
    };
  },
});

// ─── Workflow ──────────────────────────────────────────────────────────

export const advisorRequestWorkflow = createWorkflow({
  id: 'advisor-request-pipeline',
  description:
    'Processes an advisor note through classification, parallel CRM/email/task generation, and final assembly.',
  inputSchema: WorkflowInputSchema,
  outputSchema: PipelineResultSchema,
})
  .map(async ({ inputData }) => ({
    prompt: `Extract structured information from this advisor note:\n\n${inputData.note}`,
  }))
  .then(classifyStep)
  .map(async ({ inputData }) => {
    const today = new Date().toISOString().split('T')[0];
    return {
      prompt: `Process this classified advisor note. Today's date is ${today}.\n\n${JSON.stringify(inputData, null, 2)}`,
    };
  })
  .parallel([crmStep, emailStep, taskStep])
  .map(async ({ inputData, getStepResult }) => ({
    ...inputData,
    classified: getStepResult('intent-classifier'),
  }))
  .then(assembleStep)
  .commit();
