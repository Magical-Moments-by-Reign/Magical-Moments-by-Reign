# Baby Journey — area tile images

These images back the area tiles on the Baby Journey world
(`/dashboard/journeys/baby`). Each tile darkens the image with a gradient and
lays its title on top.

Drop the files here with these EXACT names (case-sensitive):

| File                  | Baby Journey tile        |
| --------------------- | ------------------------ |
| `welcome-baby.jpg`    | Welcome Baby             |
| `birth-story.jpg`     | Birth Story              |
| `milestones.jpg`      | Baby Milestones          |
| `first-holidays.jpg`  | Baby's First Holidays    |
| `first-birthday.jpg`  | First Birthday           |

Notes
- `.jpg` is expected. If you upload `.png` instead, tell me and I'll switch the
  paths in `src/lib/journeys/worlds.ts` to match.
- Some of these are wide banners with baked-in text (Baby Milestones grid, First
  Birthday, First Holidays) — they'll crop to the tile and the tile title
  overlays on top. Say the word if you'd like any cropped to a cleaner frame.
- Gender Reveal, Baby Shower, Nursery, and Baby Memories still use existing
  photos or a gradient until you send art for them.
- Until these files exist the tiles show the dark gradient; nothing breaks.
