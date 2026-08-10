# Magical Discovery — Sports

Discover → Follow → Predict → Play → React → Return. Lives inside `/dashboard/discovery/sports`.

## Provider

`API_SPORTS_KEY` — one key, direct api-sports.io access (not the RapidAPI variant), covers every sport host below. Get a key at [api-sports.io](https://api-sports.io).

| Sport | Host | Default league ID |
|---|---|---|
| NFL | `v1.american-football.api-sports.io` | 1 |
| College Football | `v1.american-football.api-sports.io` | 2 |
| NBA | `v1.basketball.api-sports.io` | 12 |
| MLB | `v1.baseball.api-sports.io` | 1 |
| Soccer | `v3.football.api-sports.io` | 39 (Premier League) |
| NHL | `v1.hockey.api-sports.io` | 57 |
| Rugby | `v1.rugby.api-sports.io` | 1 |
| Volleyball | `v1.volleyball.api-sports.io` | 1 |

**League ID caveat:** NFL (1) and the major soccer league IDs are well-documented and stable. The others above are best-known defaults from API-Sports' public docs — this environment has no live key to verify them against, so **confirm each league ID against API-Sports' own docs once a key is active**, and adjust `SPORT_CONFIG` in `src/lib/discovery/providers/sports.ts` if any differ.

**MMA and F1** aren't mapped by `ApiSportsProvider` — both hosts return a fundamentally different shape (fights, not two-team games; multi-entrant races, not a home/away matchup), so `isConfigured()` reports `false` for them even with a key set. They're excluded from `MATCHUP_SPORTS` and never appear in the Pick/vote UI.

**High School sports** has no provider connected — `HighSchoolPendingProvider` is a permanent, honest placeholder (same shape as the old `SportsPendingProvider`) until a licensed data partnership is in place. The Sports page shows a "High School" filter chip that always reads as pending; nothing is scraped or invented.

## Data model

- `SportsFollow` — a member's explicit follow of a sport, league, or team.
- `SportsGame` — our stable local copy of a game/matchup (provider-synced or Owner-entered); picks reference this row, not the provider directly, so a matchup keeps working through a provider refetch or outage.
- `SportsPick` — one member's pick per matchup; doubles as the community vote tally (aggregated by `teamPick`) and their personal prediction (graded after the game goes final).
- `SportsBadgeEarned` — persisted record of an earned Magical Picks badge (catalog itself is a static list in `src/lib/discovery/sports/badges.ts`).

Live provider results are cached in the existing `DiscoveryCache` table (`category: "sports"`) — no separate cache table.

## Grading

Automatic: whenever a live sync reports a game `final`, `gradeGame()` runs immediately (see `syncGamesToLocal` in `service.ts`), grading every open pick and re-evaluating badges. `gradeGameAction`/`enterFinalScoreAction` (Owner only, in the Discovery Content Center) cover an Owner-entered exhibition matchup or a provider outage.

## Notifications

Reuses the existing shared `Notification`/`NotificationPreference` system (`src/lib/notifications.ts`, `src/lib/notify.ts`) — five new `NotificationType` entries (`sports_team_playing_soon`, `sports_game_final`, `sports_prediction_result`, `sports_new_matchup`, `sports_streak_achievement`), no new table. `sports_prediction_result` and `sports_streak_achievement` fire for real today (from grading and badge-earning). `sports_team_playing_soon`, `sports_game_final`, and `sports_new_matchup` are registered and ready, but firing them requires a scheduled job querying upcoming games against follows — this codebase has no cron/scheduler yet, so those three are architecture only until one exists.
