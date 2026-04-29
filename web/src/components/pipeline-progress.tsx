import { Loader2, Check, X, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STEP_DESCRIPTIONS } from '@repo/shared';
import type { PipelineStep, StepStatus } from '@repo/shared';

interface PipelineProgressProps {
  steps: PipelineStep[];
}

const statusConfig: Record<StepStatus, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: 'text-muted-foreground/40', label: 'Pending' },
  running: { icon: Loader2, color: 'text-blue-400', label: 'Running' },
  success: { icon: Check, color: 'text-emerald-400', label: 'Done' },
  failed: { icon: X, color: 'text-destructive', label: 'Failed' },
};

export function PipelineProgressBar({ steps }: PipelineProgressProps) {
  const runningSteps = steps.filter((s) => s.status === 'running');
  const failedStep = steps.find((s) => s.status === 'failed');
  const allDone = steps.every((s) => s.status === 'success');

  const subtitle: string = (() => {
    if (failedStep) return `Failed at ${failedStep.label}`;
    if (allDone) return 'Done — switching to results…';
    if (runningSteps.length === 0) return 'Starting pipeline…';
    if (runningSteps.length === 1) {
      return STEP_DESCRIPTIONS[runningSteps[0].id] ?? 'Processing…';
    }
    return `Running ${runningSteps.length} steps in parallel…`;
  })();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Pipeline Progress</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Step 1: Classify */}
          <StepBadge step={steps[0]} />

          <Arrow />

          {/* Steps 2-4: Parallel (CRM, Email, Task) */}
          <ParallelGroup>
            <StepBadge step={steps[1]} />
            <StepBadge step={steps[2]} />
            <StepBadge step={steps[3]} />
          </ParallelGroup>

          <Arrow />

          {/* Step 5: Assemble */}
          <StepBadge step={steps[4]} />
        </div>
      </CardContent>
    </Card>
  );
}

function StepBadge({ step }: { step: PipelineStep }) {
  const config = statusConfig[step.status];
  const Icon = config.icon;
  const isRunning = step.status === 'running';

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
        step.status === 'pending'
          ? 'border-border/50 text-muted-foreground/60 bg-transparent'
          : step.status === 'running'
            ? 'border-blue-400/30 bg-blue-400/10 text-blue-400'
            : step.status === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
      }`}
    >
      <Icon className={`h-3 w-3 ${isRunning ? 'animate-spin' : ''}`} />
      {step.label}
    </div>
  );
}

function ParallelGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col gap-1 px-3 py-2">
      <span className="absolute -top-2 left-2 text-[10px] font-medium text-muted-foreground/60 bg-card px-1">
        parallel
      </span>
      <div className="flex items-center gap-1.5 border border-dashed border-muted-foreground/25 rounded-md px-2 py-1.5">
        {children}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground/30 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
