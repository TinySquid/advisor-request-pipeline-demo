import { ContactCard } from './contact-card';
import { EmailCard } from './email-card';
import { TaskCard } from './task-card';
import { PropertyCard } from './property-card';
import type { PipelineResult } from '@repo/shared';

interface ResultCardsProps {
  result: PipelineResult;
}

export function ResultCards({ result }: ResultCardsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        className="animate-fade-in-up opacity-0"
        style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
      >
        <ContactCard contact={result.contact} />
      </div>
      <div
        className="animate-fade-in-up opacity-0"
        style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
      >
        <EmailCard email={result.email} />
      </div>
      <div
        className="animate-fade-in-up opacity-0"
        style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
      >
        <TaskCard task={result.task} />
      </div>
      <div
        className="animate-fade-in-up opacity-0"
        style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
      >
        <PropertyCard search={result.propertySearch} />
      </div>
    </div>
  );
}
