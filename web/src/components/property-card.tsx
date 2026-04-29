import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PropertySearch } from '@repo/shared';

interface PropertyCardProps {
  search: PropertySearch;
}

function formatBudget(value: number | null): { display: string; hasValue: boolean } {
  if (value === null) return { display: 'Not specified', hasValue: false };
  return { display: `$${value.toLocaleString('en-US')}`, hasValue: true };
}

export function PropertyCard({ search }: PropertyCardProps) {
  const budgetMax = formatBudget(search.budgetMax);
  const budgetMin = formatBudget(search.budgetMin);

  const rows = [
    { label: 'Type', display: search.type, hasValue: search.type !== null },
    { label: 'Budget Max', display: budgetMax.display, hasValue: budgetMax.hasValue },
    { label: 'Budget Min', display: budgetMin.display, hasValue: budgetMin.hasValue },
    { label: 'Timeline', display: search.timeline, hasValue: search.timeline !== null },
    { label: 'Location', display: search.location, hasValue: search.location !== null },
  ];

  const hasAnyValue = rows.some((r) => r.hasValue);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search />
          Property Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAnyValue ? (
          <p className="text-sm italic text-muted-foreground">No property criteria extracted</p>
        ) : (
          <dl className="space-y-2.5">
            {rows.map(
              ({ label, display, hasValue }) =>
                hasValue && (
                  <div key={label} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{display}</dd>
                  </div>
                ),
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
