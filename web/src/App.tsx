import { useState, useRef } from 'react';
import { NoteInput } from '@/components/note-input';
import { ResultCards } from '@/components/result-cards';
import { PipelineProgressBar } from '@/components/pipeline-progress';
import { processRequestStream } from '@/lib/api';
import type { StreamResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { RotateCcw, X } from 'lucide-react';
import type { PipelineProgress, PipelineResult } from '@repo/shared';

type AppState =
  | { phase: 'idle' }
  | { phase: 'loading'; progress: PipelineProgress; note: string }
  | { phase: 'success'; result: PipelineResult }
  | { phase: 'error'; message: string; lastNote: string };

const EXAMPLE_NOTES = [
  {
    key: 'investment',
    text: 'Sarah Mitchell called — looking for a 3BR investment property in Austin under $450K, wants to close within 60 days.',
  },
  {
    key: 'waterfront',
    text: 'James Park emailed asking about waterfront condos in Miami, budget around $800K, first-time buyer, needs mortgage pre-approval help.',
  },
  {
    key: 'followup',
    text: 'Follow up with the Rodriguez family re: their offer on the Maple St property. They want to schedule an inspection by Friday.',
  },
] as const;

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'idle' });
  const streamRef = useRef<StreamResult | null>(null);

  const handleSubmit = async (note: string) => {
    setState({ phase: 'loading', progress: { steps: [], result: null, error: null }, note });

    const stream = processRequestStream(note, (progress) => {
      setState((prev) => (prev.phase === 'loading' ? { phase: 'loading', progress, note } : prev));
    });
    streamRef.current = stream;

    try {
      const result = await stream.result;
      streamRef.current = null;
      setState({ phase: 'success', result });
    } catch (err) {
      streamRef.current = null;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
        lastNote: note,
      });
    }
  };

  const handleCancel = () => {
    streamRef.current?.abort();
    streamRef.current = null;
    setState({ phase: 'idle' });
  };

  const handleRetry = () => {
    if (state.phase === 'error' && state.lastNote) {
      handleSubmit(state.lastNote);
    }
  };

  const handleDismiss = () => {
    setState({ phase: 'idle' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">🏠 Advisor Request Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Voice or text → Multi-agent workflow → Structured output
        </p>
      </div>

      {/* Input */}
      <NoteInput
        onSubmit={handleSubmit}
        isLoading={state.phase === 'loading'}
        onCancel={handleCancel}
      />

      {/* Empty State — example notes */}
      {state.phase === 'idle' && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Try one of these examples:</p>
          <div className="flex flex-col gap-2">
            {EXAMPLE_NOTES.map((example) => (
              <button
                key={example.key}
                onClick={() => handleSubmit(example.text)}
                className="text-left text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border/50 hover:border-border px-3 py-2 transition-colors"
              >
                {example.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Progress */}
      {state.phase === 'loading' && (
        <div
          className="mt-4 animate-fade-in-up opacity-0"
          style={{ animationFillMode: 'forwards' }}
        >
          <PipelineProgressBar steps={state.progress.steps} />
        </div>
      )}

      {/* Error */}
      {state.phase === 'error' && (
        <div className="mt-6 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="flex-1">{state.message}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-destructive hover:text-destructive h-auto p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {state.phase === 'success' && <ResultCards result={state.result} />}
    </div>
  );
}
