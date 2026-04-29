import { CheckCircle, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@repo/shared';

interface TaskCardProps {
  task: Task;
}

const priorityVariant: Record<Task['priority'], 'destructive' | 'secondary' | 'outline'> = {
  urgent: 'destructive',
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
};

export function TaskCard({ task }: TaskCardProps) {
  const parsed = new Date(task.dueDate);
  const isValidDate = !isNaN(parsed.getTime());
  const formattedDate = isValidDate
    ? parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle />
          Task
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="text-base font-medium">{task.description}</div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar />
          Due: {formattedDate ?? 'Date unavailable'}
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Priority</div>
          <Badge variant={priorityVariant[task.priority] ?? 'secondary'}>{task.priority}</Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{task.category}</span>
          <span className="flex items-center gap-1">
            <User />
            {task.assignee}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
