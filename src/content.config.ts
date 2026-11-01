import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Trip reports, builds and skill logs: one Markdown file each in src/content/entries/.
const entries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/entries' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kind: z.enum(['trip', 'build', 'skill']),
    hobbies: z.array(z.string()).default([]),
    /** Optional trip id from src/data/trips.js, linked from the entry. */
    trip: z.string().optional(),
    summary: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { entries };
