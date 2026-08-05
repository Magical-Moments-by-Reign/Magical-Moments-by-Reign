# Home Journey — area tile images

These images back the area tiles on the Home Journey world
(`/dashboard/journeys/home`). Each tile darkens the image with a gradient and
lays its title on top, so the visual works best when the important part of the
picture sits in the upper-left.

Drop the four files here with these EXACT names (case-sensitive):

| File                | Home Journey tile     |
| ------------------- | --------------------- |
| `renovation.jpg`    | Renovation            |
| `apartment.jpg`     | Apartment Rental      |
| `investment.jpg`    | Investment Property   |
| `vacation.jpg`      | Vacation Homes        |

Notes
- `.jpg` is expected. If you upload `.png` instead, tell me and I'll switch the
  paths in `src/lib/journeys/worlds.ts` to match.
- Wide (16:9) banner graphics will crop to the tile shape and the tile title
  overlays on top — same treatment as the existing "Buy a Home" tile.
- Until these files exist the tiles simply show the dark gradient (today's look);
  nothing breaks.
