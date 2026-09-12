'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * The whole menu as a printed card: one course per section, each dish a
 * name, a dotted leader and a price. Tapping a dish opens it in place — the
 * photo and the looked-up sentence appear under the row — and asks /api/dish
 * for its facts if they are not in hand yet. Only that row re-renders.
 */
import { useState } from 'react';
import type { Dish, DishFacts } from '@/lib/types';
import { copy } from '../copy';
import { SectionTitle } from './Card';
import { Skeleton } from './Skeleton';

function groupByCategory(dishes: Dish[]): Array<{ category: string; dishes: Dish[] }> {
  const groups: Array<{ category: string; dishes: Dish[] }> = [];
  for (const dish of dishes) {
    const category = dish.category ?? '';
    const last = groups[groups.length - 1];
    if (last && last.category === category) last.dishes.push(dish);
    else groups.push({ category, dishes: [dish] });
  }
  return groups;
}

export function MenuList({
  dishes,
  facts,
  onSelect,
}: {
  dishes: Dish[];
  facts: Record<string, DishFacts>;
  onSelect: (dish: Dish) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  function toggle(dish: Dish) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(dish.name)) next.delete(dish.name);
      else next.add(dish.name);
      return next;
    });
    if (!facts[dish.name]) onSelect(dish);
  }

  return (
    <div className="grid gap-9">
      {groupByCategory(dishes).map((group, gi) => (
        <section key={`${group.category}-${gi}`}>
          {group.category && (
            <div className="mb-4">
              <SectionTitle as="h3">{group.category}</SectionTitle>
            </div>
          )}
          <ul className="grid gap-1">
            {group.dishes.map((dish) => {
              const isOpen = open.has(dish.name);
              const dishFacts = facts[dish.name];
              return (
                <li key={dish.name}>
                  <button
                    type="button"
                    data-dish-row
                    aria-expanded={isOpen}
                    onClick={() => toggle(dish)}
                    className="block w-full py-2 text-left hover:text-tomato"
                  >
                    <span className="flex items-baseline">
                      <span className="text-xl font-medium leading-snug">{dish.name}</span>
                      <span aria-hidden className="leader mx-2" />
                      {dish.price && (
                        <span className="shrink-0 text-xl font-semibold tabular-nums">{dish.price}</span>
                      )}
                    </span>
                    {dish.description && (
                      <span className="block max-w-[52ch] text-base italic leading-snug text-ink-soft">
                        {dish.description}
                      </span>
                    )}
                  </button>

                  {isOpen && (
                    <div className="mb-3 border-l-2 border-gold-soft pl-4">
                      {dishFacts ? (
                        <div className="grid gap-3 sm:grid-cols-[10rem_1fr] sm:items-start">
                          {dishFacts.photoUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={dishFacts.photoUrl}
                              alt=""
                              className="aspect-[4/3] w-full border border-gold-soft object-cover"
                            />
                          )}
                          <div className={dishFacts.photoUrl ? '' : 'sm:col-span-2'}>
                            {dishFacts.description && (
                              <p className="leading-relaxed">{dishFacts.description}</p>
                            )}
                            <a
                              href={dishFacts.searchUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-base text-tomato underline decoration-tomato/40 underline-offset-4 hover:decoration-tomato"
                            >
                              {copy.lookItUp}
                            </a>
                          </div>
                        </div>
                      ) : (
                        <Skeleton className="h-16 w-full" />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
