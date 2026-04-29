import { z } from 'zod';

// ─── Intent Classifier Output ─────────────────────────────────

export const ClassifiedNoteSchema = z.object({
  contactName: z.string().describe('Full name of the person mentioned'),
  contactEmail: z.string().nullable().describe('Email if mentioned'),
  contactPhone: z.string().nullable().describe('Phone if mentioned'),
  propertyType: z.string().nullable().describe('Property type: 2BR, condo, studio, etc.'),
  budgetMax: z.coerce.number().nullable().describe('Maximum budget in USD'),
  budgetMin: z.coerce.number().nullable().describe('Minimum budget in USD'),
  timeline: z.string().nullable().describe('Move timeline'),
  location: z.string().nullable().describe('Area or neighborhood of interest'),
  sentiment: z.enum(['hot', 'warm', 'cold']).describe('Lead temperature'),
  source: z.string().describe('Where the interaction happened'),
  followUpNeeded: z.boolean().describe('Whether follow-up is needed'),
  followUpTimeframe: z.string().nullable().describe('When to follow up'),
  rawContext: z.string().describe('Full original context for downstream agents'),
});

export type ClassifiedNote = z.infer<typeof ClassifiedNoteSchema>;

// ─── CRM Writer Output ───────────────────────────────────────

export const ContactRecordSchema = z.object({
  name: z.string().describe('Contact full name'),
  email: z.string().nullable().describe('Email or null'),
  phone: z.string().nullable().describe('Phone or null'),
  tags: z.array(z.string()).describe('Auto-generated tags'),
  leadScore: z.number().min(1).max(10).describe('Lead score 1-10'),
  source: z.string().describe('Lead source'),
  notes: z.string().describe('Summary notes'),
  status: z.enum(['new', 'contacted', 'active', 'closed']).describe('Contact status'),
});

export type ContactRecord = z.infer<typeof ContactRecordSchema>;

// ─── Email Drafter Output ────────────────────────────────────

export const EmailDraftSchema = z.object({
  to: z.string().describe('Recipient email'),
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Full email body with greeting and sign-off'),
  tone: z.string().describe('Email tone'),
  cta: z.string().describe('Call-to-action in the email'),
});

export type EmailDraft = z.infer<typeof EmailDraftSchema>;

// ─── Task Creator Output ─────────────────────────────────────

export const TaskSchema = z.object({
  description: z.string().describe('Task description'),
  dueDate: z.string().describe('ISO date string calculated from followUpTimeframe'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Task priority'),
  category: z
    .enum(['lead-follow-up', 'showing', 'closing', 'administrative', 'other'])
    .describe('Task category'),
  assignee: z.string().describe('Assigned to'),
});

export type Task = z.infer<typeof TaskSchema>;

// ─── Final Assembled Output ───────────────────────────────────

export const PropertySearchSchema = z.object({
  type: z.string().nullable(),
  budgetMax: z.number().nullable(),
  budgetMin: z.number().nullable(),
  timeline: z.string().nullable(),
  location: z.string().nullable(),
});

export type PropertySearch = z.infer<typeof PropertySearchSchema>;

export const PipelineResultSchema = z.object({
  contact: ContactRecordSchema,
  email: EmailDraftSchema,
  task: TaskSchema,
  propertySearch: PropertySearchSchema,
});

export type PipelineResult = z.infer<typeof PipelineResultSchema>;

// ─── Workflow Input ───────────────────────────────────────────────────

export const WorkflowInputSchema = z.object({
  note: z.string().describe('The raw advisor note text'),
});
