'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * Every dish on the menu, browsable and searchable. Clicking one asks /api/dish
 * for its facts (cache-first server-side, so a prefetched dish returns instantly).
 *
 * TODO(D): the search box, grouping by category, and keyboard navigation.
 */
import type { Dish, DishFacts } from '@/lib/types';

export function MenuList({
  dishes,
  facts,
  onSelect,
}: {
  dishes: Dish[];
  facts: Record<string, DishFacts>;
  onSelect: (dish: Dish) => void;
}) {
  return (
    <ul className="divide-border divide-y border-[3px] border-ink bg-surface px-5">
      {dishes.map((dish) => (
        <li key={`${dish.category}-${dish.name}`}>
          <button
            onClick={() => onSelect(dish)}
            className="flex w-full items-baseline justify-between gap-4 py-3 text-left hover:text-accent"
          >
            <span className="font-serif text-lg">
              {dish.name}
              {facts[dish.name] && <span className="ml-2 text-xs text-muted">·</span>}
            </span>
            <span className="font-bold text-muted">{dish.price}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
