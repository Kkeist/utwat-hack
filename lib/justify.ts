/**
 * OWNER: Workstream C (game logic + API routes)
 *
 * Deadpan justification, composed from clauses chosen by a seeded PRNG keyed on
 * dish + category + partySize — so the same dish always produces the same text and
 * nothing reshuffles on re-render. (Design doc §6.)
 *
 * NO MODEL. Cost zero, latency zero, failure modes none. This is a deliberate
 * constraint of the project, not a shortcut — do not reach for an LLM here.
 *
 * The register is absolute institutional confidence about what was a coin flip.
 * It never winks at the audience. Never "randomly", never "haha", never an emoji.
 *
 * Clause slots: opener | declaration | course line | the menu's own description
 * recast as understatement | price bracket | party-size line | closing certainty.
 *
 * Target:
 *   "Let the record show the decision was unanimous. You are having the Duck Confit.
 *    It anchors the table. Everything else is commentary. At $31 it occupies the
 *    precise midpoint between prudence and ambition. For a table of 3, this is the
 *    only distribution that survives scrutiny. This conclusion is robust to every
 *    reasonable objection."
 *
 * Every bank is exported so it can be inspected, counted and proof-read. Banks are
 * deliberately long: a table of four draws seven paragraphs, and two of them opening
 * the same way collapses the illusion of process.
 */
import type { Course, Dish, ReviewSignal } from '@/lib/types';
import { hashSeed, seededRng } from '@/lib/roulette';

export const OPENERS = [
  'Let the record show the decision was unanimous.',
  'The matter has been settled.',
  'Following review, the outcome is not in question.',
  'The committee has reached its finding.',
  'After due consideration, the position is final.',
  'The determination has been entered into the record.',
  'A decision of this kind makes itself.',
  'The evidence admitted only one reading.',
  'The question was put, and the question was answered.',
  'This was never seriously in doubt.',
  'The relevant factors were weighed in full.',
  'The finding was reached without dissent.',
  'The deliberation, such as it was, has concluded.',
  'The outcome was apparent well before it was announced.',
  'Proceedings closed early, for want of disagreement.',
  'It falls to this notice to record the result.',
  'The file is complete and the conclusion entered.',
  'On the balance of the available evidence, the matter resolves cleanly.',
  'The panel notes no material objection.',
  'The recommendation carried on the first reading.',
  'The record reflects a single viable course of action.',
  'Consensus was reached at the earliest opportunity.',
  'The review found nothing requiring further debate.',
  'The determination below was arrived at in the ordinary course.',
];

export const CLOSERS = [
  'This conclusion is robust to every reasonable objection.',
  'No further deliberation is required.',
  'The finding stands.',
  'The matter is closed.',
  'This assessment is not expected to be revisited.',
  'Any appeal would be heard, and denied.',
  'The conclusion has been checked and it holds.',
  'It is difficult to see the argument against it.',
  'The record will show it could not have gone otherwise.',
  'This is the correct outcome and will be treated as such.',
  'No credible alternative has been put forward.',
  'The position is stable under further review.',
  'Later review is not anticipated to disturb this.',
  'The reasoning survives contact with the facts.',
  'This determination is entered as final.',
  'Nothing in the record contradicts it.',
  'The conclusion is sound on its own terms.',
  'Objections may be filed, but they will not prevail.',
  'The outcome is not subject to renegotiation at the table.',
  'This holds under every scenario considered.',
  'The decision requires no defence.',
  'It is settled, and it is correct.',
  'Further discussion would add nothing of substance.',
  'The finding is entered without qualification.',
  'The conclusion was tested and did not move.',
  'There is nothing further to weigh.',
  'The outcome has been recorded and will not be amended.',
  'This was the right answer before it was the chosen one.',
  'The reasoning is available for inspection and withstands it.',
  'No part of this requires revisiting.',
  'The determination is consistent with the evidence throughout.',
  'It would be perverse to conclude otherwise.',
  'The finding is final and the file is closed.',
  'Confidence in this outcome is total.',
  'The matter proceeds to service without amendment.',
  'This is where the analysis ends, and it ends well.',
];

/** Slot 3. One entry may run to two sentences; the register tolerates it. */
export const COURSE_LINES: Record<Course, string[]> = {
  starter: [
    'It establishes the terms of the meal.',
    'The table requires an opening position, and this is it.',
    'Everything that follows will be measured against it.',
    'It does the necessary preliminary work.',
    'A meal without a first move is merely eating.',
    'It sets expectations at the correct level.',
    'The order of service begins here, and begins well.',
    'This is the appropriate entry point for a table of this composition.',
    'It occupies the opening slot without strain.',
  ],
  // Deliberately the longest bank: a table of four draws four mains, and four
  // paragraphs out of one small bank is where repetition shows first.
  main: [
    'It anchors the table. Everything else is commentary.',
    'This is the centre of the meal and it holds.',
    'The remainder of the order arranges itself around it.',
    'It carries the weight expected of the position.',
    'No other plate on this menu does the job as completely.',
    'It is the load-bearing element of the evening.',
    'Everything ordered after this is support.',
    'It occupies the principal seat without difficulty.',
    'The rest of the table now has something to be arranged around.',
    'It was selected to bear the weight of the meal, and it does.',
    'The plate holds the centre without assistance.',
    'This is the substantial part of the undertaking.',
    'It answers the question the meal was asking.',
    'The principal course is accounted for, conclusively.',
    'It is the item against which the rest of the order is justified.',
    'The main position requires something of this order, and this is it.',
  ],
  dessert: [
    'It closes the meal in the manner required.',
    'The proceedings need an ending, and this is a defensible one.',
    'It is the correct final entry.',
    'A meal is not concluded until something sweet is on the record.',
    'It resolves the meal rather than extending it.',
    'This is the appropriate note on which to adjourn.',
    'The last course is a formality, but a formality with standards.',
    'It brings the sequence to an orderly close.',
  ],
  drink: [
    'It accompanies the meal without competing with it.',
    'The pairing is defensible in every direction.',
    'It is the correct thing to have in hand.',
    'This is what the rest of the order was asking for.',
    'It performs the supporting function properly.',
    'The glass is accounted for.',
    'Nothing else on the list serves the table as well.',
    'It is a reasonable thing to be holding.',
  ],
  other: [
    'It fits the order without dispute.',
    'The table has room for it and a use for it.',
    'It earns its place on the ticket.',
    'There is no sensible argument for leaving it off.',
    'It has been included on the merits.',
    'Its position in the order is not controversial.',
    'It belongs on the table and will be treated accordingly.',
    'The inclusion is considered appropriate.',
  ],
};

/**
 * Slot 4, object position: `{x}` lands mid-sentence, so it is only ever filled with
 * a fragment the menu itself printed in lower case ("white beans"). Splitting the
 * bank this way is what keeps the casing correct without guessing which capitalised
 * words are proper nouns — see `understate()`.
 */
export const UNDERSTATEMENTS_OBJECT = [
  'The presence of {x} has been noted and accepted.',
  'The inclusion of {x} was considered and raised no objection.',
  'Particular attention was paid to {x}.',
  'The matter of {x} has been dealt with.',
  'No concern was raised regarding {x}.',
  'The record acknowledges {x}.',
  'The question of {x} was addressed early and set aside.',
  'The file notes {x} without further comment.',
  'Due weight was given to {x}.',
];

/**
 * Slot 4, subject position: `{x}` opens the sentence, so a capitalised fragment fits.
 *
 * Every verb here is number-invariant — past simple, modal, or a colon. The menu
 * fragment may be singular or plural and there is no way to tell from the string,
 * so "Summer vegetables was reviewed" must be unreachable by construction.
 */
export const UNDERSTATEMENTS_SUBJECT = [
  '{x}: noted, and accepted.',
  '{x} received due consideration.',
  '{x}, as described, raised no objection.',
  '{x} appeared in the description and went unchallenged.',
  '{x} formed part of the accepted specification.',
  '{x} will be present, as the record requires.',
  '{x} drew comment, and the comment was favourable.',
  '{x} remained in the specification after review.',
  '{x} survived review without amendment.',
];

/** Slot 5. `{p}` is the price exactly as the menu printed it. `none` never mentions one. */
export const PRICE_LINES = {
  cheap: [
    'At {p} it represents a straightforward use of the budget.',
    'At {p} the cost raises no questions.',
    'At {p} it is difficult to argue with on economic grounds.',
    'At {p} the figure is not a factor in the decision.',
    'At {p} the outlay is modest and easily justified.',
    'At {p} it clears the threshold of prudence without effort.',
    'At {p} the expenditure is within all reasonable limits.',
    'At {p} no one at the table need think about it further.',
  ],
  mid: [
    'At {p} it occupies the precise midpoint between prudence and ambition.',
    'At {p} the price is proportionate to the occasion.',
    'At {p} the figure sits comfortably within expectations.',
    'At {p} the cost is neither a concession nor an extravagance.',
    'At {p} the sum is defensible on any accounting.',
    'At {p} it is priced in line with its function.',
    'At {p} the amount was reviewed and approved without comment.',
    'At {p} the number is exactly where it ought to be.',
    'At {p} the figure attracted no scrutiny worth recording.',
    'At {p} the sum falls squarely within the expected range.',
    'At {p} the price and the plate are in agreement.',
    'At {p} the cost was accepted as a matter of course.',
  ],
  dear: [
    'At {p} it represents a considered commitment.',
    'At {p} the expenditure has been authorised in full.',
    'At {p} the figure reflects the seriousness of the choice.',
    'At {p} the cost was weighed and found acceptable.',
    'At {p} it sits at the upper end of the reasonable, which is where it belongs.',
    'At {p} the price is understood to be the point.',
    'At {p} the outlay is significant and entirely intentional.',
    'At {p} the sum has been entered as a deliberate act.',
    'At {p} the figure was examined closely and left unchanged.',
    'At {p} the price reflects a decision already taken.',
    'At {p} the amount is what the position costs.',
    'At {p} the expenditure stands as recorded.',
  ],
  steep: [
    'At {p} the figure speaks for itself and requires no defence.',
    'At {p} this is an expenditure of record.',
    'At {p} the amount was noted, at length, and approved.',
    'At {p} the cost has been accepted as the cost of being correct.',
    'At {p} the sum is substantial and remains justified.',
    'At {p} the price was the subject of discussion and survived it.',
    'At {p} the commitment is considerable and has been made knowingly.',
    'At {p} the figure is high, and the decision is unchanged.',
  ],
  none: [
    'No price was published, which removes the last possible objection.',
    'The menu declines to state a figure, and the decision proceeds regardless.',
    'Cost was not disclosed and was therefore not a factor.',
    'The absence of a stated price has been noted and set aside.',
    'No figure appears against this item, and none was required.',
    'The price is held elsewhere, and the selection stands without it.',
    'This item carries no published amount, which simplifies the analysis.',
    'The record contains no price for this item and does not need one.',
  ],
} satisfies Record<string, string[]>;

export type PriceBracket = keyof typeof PRICE_LINES;

/**
 * Slot 6, two or more at the table. `{n}` is the actual party size.
 *
 * Every pick in a table renders this slot with the same `{n}`, so a short bank puts
 * the identical sentence in two paragraphs on the same screen. Kept long for that reason.
 */
export const PARTY_LINES = [
  'For a table of {n}, this is the only distribution that survives scrutiny.',
  'For a table of {n}, the arithmetic supports no other arrangement.',
  'Across {n} diners, this allocation is the one that holds.',
  'For a party of {n}, the division of the table is settled by this.',
  'With {n} at the table, the order balances precisely here.',
  'For {n} people, no competing arrangement was found to be superior.',
  'A table of {n} was assumed throughout, and the result is unaffected by rounding.',
  'For a table of {n}, this is the allocation the numbers require.',
  'Given {n} seats, the distribution resolves in exactly this way.',
  'Divided {n} ways, the order remains coherent.',
  'The figure of {n} was carried through the calculation without difficulty.',
  'At {n} covers, the arrangement is the efficient one.',
  'For {n} at the table, this allocation was preferred on the merits.',
  'The seating of {n} was taken into account and changes nothing.',
  'Scaled to {n}, the order holds its shape.',
  'With a party of {n}, this is where the distribution settles.',
];

/** Slot 6, party of one. "For a table of 1" is not a sentence anyone would write. */
export const SOLO_LINES = [
  'Dining alone, you are the entire quorum, and the quorum has spoken.',
  'For a party of one, the distribution is trivial and the result unambiguous.',
  'With a single diner, there is no allocation to dispute.',
  'A table of one simplifies the arithmetic without weakening the finding.',
  'For one, the whole of the order falls to you, as intended.',
  'Dining alone, the matter was decided without opposition.',
  'A party of one leaves nothing to negotiate.',
  'With one seat at the table, the distribution is settled by definition.',
];

/**
 * Words that cannot begin a usable noun phrase. A clause starting with one of these
 * is a continuation ("in garlic butter", "as they should be", "For two"), and reads
 * as gibberish once lifted out of its sentence.
 */
const CONTINUATION_STARTS = new Set([
  'and', 'or', 'but', 'as', 'with', 'without', 'in', 'on', 'at', 'to', 'from', 'by',
  'of', 'for', 'plus', 'over', 'under', 'served', 'topped', 'finished', 'if', 'per',
  'then', 'optional', 'available', 'add', 'all', 'also', 'choice', 'your',
]);

/** Clause separators as menus actually punctuate: commas, stops, dashes, slashes. */
const CLAUSE_SPLIT = /[,.;:!?/()\n–—•·]+/;

/**
 * Candidate phrases lifted verbatim from the menu's own description.
 *
 * Anything carrying a number is dropped outright — "glass $16 / bottle $62" must
 * never reach the page, and the price slot is the only place a figure belongs.
 * `maxWords` is relaxed on a second pass so a single long description
 * ("chocolate sauce poured at the table") still yields the slot rather than losing it.
 */
function phrases(description: string, maxWords: number): string[] {
  return description
    .split(CLAUSE_SPLIT)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => s.length > 2)
    .filter((s) => !/[\d$£€%]/.test(s))
    .filter((s) => {
      const words = s.split(' ');
      if (words.length > maxWords) return false;
      if (CONTINUATION_STARTS.has(words[0].toLowerCase())) return false;
      // A lone adverb ("ideally") is a comment on the dish, not part of it.
      return !(words.length === 1 && /ly$/i.test(s));
    });
}

/**
 * The menu's own words, recast as understatement:
 *   "Toulouse sausage, duck, white beans" -> "The presence of white beans has been
 *   noted and accepted."
 *
 * Returns '' when the dish has no description, or when the description is nothing
 * but prices — the caller drops the slot entirely rather than emitting an empty one.
 */
export function understate(description: string | undefined, rng: () => number): string {
  if (!description?.trim()) return '';

  const candidates = phrases(description, 5);
  const usable = candidates.length ? candidates : phrases(description, 9);
  if (!usable.length) return '';

  const phrase = usable[Math.floor(rng() * usable.length)];
  // Capitalised means the menu capitalised it: either a proper noun or a sentence
  // start. Either way it belongs at the head of the sentence, where the capital is
  // correct no matter which it was. Lower-case phrases go mid-sentence.
  const bank = /^[A-ZÀ-Þ]/.test(phrase) ? UNDERSTATEMENTS_SUBJECT : UNDERSTATEMENTS_OBJECT;
  return bank[Math.floor(rng() * bank.length)].replace('{x}', phrase);
}

/** Brackets in dollars-equivalent. `none` covers prix fixe and market price. */
export function priceBracket(priceValue?: number): PriceBracket {
  if (priceValue === undefined || !Number.isFinite(priceValue)) return 'none';
  if (priceValue < 15) return 'cheap';
  if (priceValue < 30) return 'mid';
  if (priceValue < 50) return 'dear';
  return 'steep';
}

/**
 * The price slot. Renders `dish.price` verbatim where the menu printed one — no
 * currency symbol is ever invented, so a bare numeric price stays bare.
 */
export function priceLine(dish: Dish, rng: () => number): string {
  const bracket = priceBracket(dish.priceValue);
  const bank = PRICE_LINES[bracket];
  const line = bank[Math.floor(rng() * bank.length)];
  if (bracket === 'none') return line;

  const printed = dish.price?.trim();
  const text = printed && printed.length ? printed : String(dish.priceValue);
  return line.replace('{p}', text);
}

/** The party-size slot, which must read correctly for a party of one. */
export function partyLine(partySize: number, rng: () => number): string {
  const n = Number.isFinite(partySize) ? Math.max(1, Math.floor(partySize)) : 1;
  if (n === 1) return SOLO_LINES[Math.floor(rng() * SOLO_LINES.length)];
  return PARTY_LINES[Math.floor(rng() * PARTY_LINES.length)].replace('{n}', String(n));
}

/**
 * One paragraph, seven slots, no model.
 *
 * The seed is the dish itself, so the paragraph is a pure function of the pick:
 * identical across re-renders, across requests, and across machines.
 */
/**
 * Slot 3b: corroboration. Emitted only when workstream B's review scoring found
 * this dish mentioned at all — a menu with no reviews simply skips the slot.
 *
 * The four banks map to what the record actually says. The unfavourable bank is
 * the point of the whole feature: a panned dish still comes up sometimes, and
 * overruling the objection in writing is funnier than hiding the dish.
 */
export const CORROBORATION_STRONG = [
  'The record contains {n} corroborating accounts.',
  '{n} independent accounts corroborate this.',
  'Corroboration is extensive: {n} separate accounts.',
  'Prior parties have reached the same conclusion {n} times.',
  'The supporting testimony runs to {n} accounts.',
  '{n} accounts, none of them dissenting in substance.',
  'This is the most heavily corroborated item in the file.',
  'The weight of prior testimony is not close.',
];

export const CORROBORATION_SOME = [
  'The record contains supporting testimony.',
  'Prior parties have reached the same conclusion.',
  'There is corroboration, and it is favourable.',
  'At least one earlier party arrived here independently.',
  'The supporting evidence is modest but unambiguous.',
  'Earlier testimony points the same way.',
  'The file contains no contrary account.',
  'Precedent exists and it is favourable.',
];

export const CORROBORATION_CONTESTED = [
  'The record is divided. The division has been resolved.',
  'Opinion is split. A determination has nonetheless been made.',
  'The testimony conflicts. This has been accounted for.',
  'Prior parties disagreed. Their disagreement is noted and set aside.',
  'The evidence points both ways. The finding stands regardless.',
  'Contradictory accounts were reviewed in full.',
  'Dissent was recorded. It did not alter the outcome.',
  'The matter was contested and has been settled.',
];

export const CORROBORATION_AGAINST = [
  'The record contains objections. They have been overruled.',
  'Prior parties advised against this. Their advice has been considered.',
  'The testimony is unfavourable. The selection stands.',
  'Objections were filed. All were dismissed.',
  'Earlier accounts counsel caution. Caution has been noted.',
  'The file contains complaints. None were found material.',
  'This selection proceeds over recorded objection.',
  'The adverse testimony has been reviewed and discounted.',
];

/** Empty string when there is nothing to cite — the slot is then dropped. */
export function corroboration(signal: ReviewSignal | undefined, rng: () => number): string {
  if (!signal || signal.mentions <= 0) return '';
  const bank =
    signal.score >= 5
      ? CORROBORATION_STRONG
      : signal.score > 0
        ? CORROBORATION_SOME
        : signal.score === 0
          ? CORROBORATION_CONTESTED
          : CORROBORATION_AGAINST;
  return bank[Math.floor(rng() * bank.length)].replace('{n}', String(signal.mentions));
}

export function justify(
  dish: Dish,
  course: Course,
  partySize: number,
  signal?: ReviewSignal,
): string {
  const seed = `${dish.name}|${dish.category ?? ''}|${partySize}`;

  // One stream per slot rather than one stream for the paragraph. Slot 4 consumes no
  // draws when a dish has no description, so a shared stream would let the parser
  // later finding a description for a dish silently re-roll its price, party and
  // closing lines. Per-slot streams make every slot independently stable.
  const streamFor = (slot: string) => seededRng(hashSeed(`${seed}|${slot}`));
  const pickFrom = <T,>(xs: T[], slot: string): T => xs[Math.floor(streamFor(slot)() * xs.length)];

  const slots = [
    pickFrom(OPENERS, 'opener'),
    `You are having the ${dish.name}.`,
    pickFrom(COURSE_LINES[course] ?? COURSE_LINES.other, 'course'),
    corroboration(signal, streamFor('corroboration')),
    understate(dish.description, streamFor('understate')),
    priceLine(dish, streamFor('price')),
    partyLine(partySize, streamFor('party')),
    pickFrom(CLOSERS, 'closer'),
  ];

  return slots
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(' ');
}
