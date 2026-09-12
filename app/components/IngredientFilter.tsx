'use client';
/**
 * OWNER: Workstream D (UI)
 *
 * Collapsed by default: one row showing the title and how many ingredients
 * are chosen. Open, it offers Include / Exclude, a box that holds the chosen
 * ingredients as chips and a text field that narrows the list beneath, and
 * that list itself — every known ingredient, click to pick. Two ways to
 * choose, one place to remove.
 */
import { useId, useState } from 'react';
import { copy } from '../copy';
import { ToggleGroup } from './controls';

export type IngredientMode = 'include' | 'exclude';

function plain(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function IngredientFilter({
  options,
  selected,
  mode,
  onSelectedChange,
  onModeChange,
}: {
  options: string[];
  selected: string[];
  mode: IngredientMode;
  onSelectedChange: (next: string[]) => void;
  onModeChange: (next: IngredientMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const panelId = useId();

  const q = plain(text.trim());
  // Matches that start a word come first: "gar" offers Garlic before Caster Sugar.
  const startsWord = (o: string) => plain(o).split(' ').some((w) => w.startsWith(q));
  const shown = options
    .filter((o) => !selected.includes(o) && (!q || plain(o).includes(q)))
    .sort((a, b) => (q ? Number(startsWord(b)) - Number(startsWord(a)) : 0));

  function add(name: string) {
    onSelectedChange([...selected, name]);
    setText('');
  }
  function remove(name: string) {
    onSelectedChange(selected.filter((s) => s !== name));
  }

  return (
    <div className="border-t border-gold-soft pt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-lg font-semibold"
      >
        <span>
          {copy.ingredients}
          {selected.length > 0 && (
            <span className="ml-2 font-normal text-ink-soft">
              {mode === 'include' ? copy.include : copy.exclude} {selected.length}
            </span>
          )}
        </span>
        <span aria-hidden className="text-ink-soft">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div id={panelId} className="mt-2 grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              label={copy.ingredients}
              value={mode}
              onChange={onModeChange}
              options={[
                { value: 'include', label: copy.include },
                { value: 'exclude', label: copy.exclude },
              ]}
            />
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectedChange([])}
                className="min-h-11 px-2 text-base text-ink-soft underline decoration-gold-soft underline-offset-4 hover:text-ink"
              >
                {copy.clear}
              </button>
            )}
          </div>

          {/* The box: chips first, then the text field, all inside one border. */}
          <div className="field flex flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-room">
            {selected.map((name) => (
              <span key={name} className="tag flex items-center gap-1 bg-cream-deep">
                {name}
                <button
                  type="button"
                  aria-label={copy.remove(name)}
                  onClick={() => remove(name)}
                  className="-mr-1 px-1 text-ink-soft hover:text-tomato"
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && shown.length) {
                  e.preventDefault();
                  add(shown[0]);
                }
                if (e.key === 'Backspace' && !text && selected.length) remove(selected[selected.length - 1]);
              }}
              placeholder={copy.ingredientPlaceholder}
              aria-label={copy.ingredientPlaceholder}
              className="bare min-h-9 min-w-[10rem] flex-1 bg-transparent text-lg placeholder:text-ink-soft"
            />
          </div>

          {options.length === 0 ? (
            <p className="text-base italic text-ink-soft">{copy.noIngredientsYet}</p>
          ) : (
            <ul className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto overscroll-contain pr-1">
              {shown.map((name) => (
                <li key={name}>
                  <button type="button" onClick={() => add(name)} className="tag hover:border-room hover:text-room">
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
