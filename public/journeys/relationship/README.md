# Relationship Journey — area tile images

These images back the area tiles on the Relationship Journey world
(`/dashboard/journeys/relationship`). Each tile darkens the image with a
gradient and lays its title on top.

Drop the files here with these EXACT names (case-sensitive):

| File             | Relationship tile  |
| ---------------- | ------------------ |
| `dating.jpg`     | Dating             |
| `date-night.jpg` | Date Night Ideas   |
| `engagement.jpg` | Engagement         |
| `elopement.jpg`  | Elopement          |
| `bachelor-bachelorette.jpg` | Bachelor or Bachelorette |
| `love-letters.jpg` | Love Letters       |
| `rehearsal-dinner.jpg` | Rehearsal Dinner |
| `our-story.jpg`  | Our Story          |
| `relationship-milestones.jpg` | Relationship Milestones |

Notes
- `.jpg` is expected. If you upload `.png` instead, tell me and I'll switch the
  paths in `src/lib/journeys/worlds.ts` to match.
- These are clean photos (no baked-in text), so they crop and overlay well.
- Until these files exist the tiles show the dark gradient (today's look);
  nothing breaks.
