/**
 * OWNER: Workstream C (game logic + API routes)
 *
 * POST /api/justify  { picks, partySize }  ->  { justifications: Record<name, string> }
 *
 * Called by the client AFTER a spin has rendered, never before. The spin already
 * shows a complete justification from lib/justify; this only replaces it with a
 * better-written one when Claude is reachable.
 *
 * An empty map is a success, not a failure — it means "keep the template". This
 * route never returns an error status for a model problem, because a model
 * problem is not a user-visible problem.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DishSchema, type Pick } from '@/lib/types';
import { upgradeJustifications } from '@/lib/justify-llm';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BodySchema = z.object({
  picks: z
    .array(
      z.object({
        dish: DishSchema,
        course: z.enum(['starter', 'main', 'dessert', 'drink', 'other']),
        seat: z.number().int().optional(),
        shared: z.boolean(),
        justification: z.string(),
      }),
    )
    .min(1)
    .max(20),
  partySize: z.number().int().min(1).max(12),
  signals: z.record(z.string(), z.object({ mentions: z.number(), score: z.number() })).optional(),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ justifications: {} });

  const justifications = await upgradeJustifications(
    body.data.picks as Pick[],
    body.data.partySize,
    body.data.signals ?? {},
  );
  return NextResponse.json({ justifications });
}
