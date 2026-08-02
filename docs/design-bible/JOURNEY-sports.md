# Master Design Bible — The Sports Journey (Ultimate Athlete Platform)

**Status:** Founder Approved — **documented, phased build.** Not a photo gallery:
one **living Sports Journey** per athlete that grows every season, from first
practice through college, the pros, coaching, and beyond. Subordinate to the
[Constitution](./CONSTITUTION.md), Book I, and the [Life Journey Standard](./STANDARD-life-journey.md).

**Built today:** the athlete-focused **Preview Mode** page at `/journeys/sports`
(Magical AI Sports Guide welcome, what's-included, timeline, FAQ, marketplace,
unlock panel). **Needs (foundations):** accounts/auth with **athlete · parent ·
coach** roles + parent-controlled permissions, secure media Storage (game film),
a large data model (profile, games, stats, colleges, scholarships), the reminder
scheduler, PDF export, and AI for highlight assembly. Graceful seams — nothing
faked (no fabricated stats, offers, or guarantees).

---

## Principles & guardrails
- **Nothing is ever deleted.** Every game, award, photo, statistic, and milestone
  becomes part of the athlete's permanent **Magical Moments Library.**
- **Educational only:** the Recruitment and **NIL** centers educate in plain
  language — **never legal, tax, or financial advice**, and we **never guarantee
  recruitment or scholarships.** Readiness dashboards show recommended next steps
  only.
- **Real photos:** sports invitations use the athlete's **original**
  photographs — never recreate or distort the athlete unless requested (per the
  [Invitations standard](./STANDARD-invitations.md)).
- **Permissions:** parents control coach access; contributors (parents, athlete,
  family, invited coaches) add to the Journey within granted permissions.

## The platform (sections)
- **Athlete Profile & Dashboard** — name, DOB, grad year, school, grade, jersey,
  primary/secondary sports, height/weight, dominant hand/foot, GPA, intended
  major, parent/coach info, emergency contacts.
- **Sports supported** — Football, Basketball, Baseball, Softball, Soccer,
  Volleyball, Track & Field, Cross Country, Swimming, Golf, Tennis, Cheer, Dance,
  Gymnastics, Wrestling, Lacrosse, Hockey, Martial Arts, Bowling, Fishing,
  Esports — plus custom sports.
- **Game Center** — a page per game (opponent, location, date, score, W/L,
  photos/videos/highlights, personal stats, coach notes, family memories, player
  reflections, awards, media coverage); auto-organized by season.
- **Highlight Reel Builder** — upload full games, plays, photos, drone footage,
  interviews; Magical AI assists with organizing and assembling shareable reels
  by season/skill/year — **original uploads remain untouched.**
- **Athletic Resume** — auto-built professional resume (personal info, sports,
  measurables, position, GPA, honors, leadership, service, awards, records,
  recommendations, stats, highlight links) → **export to PDF.**
- **Recruitment Center** — plain-language education on DI/DII/DIII, NAIA, NJCAA,
  scholarships, walk-ons, recruiting calendar, official/unofficial visits,
  contact rules, eligibility, signing periods, transfer portal — with checklists.
- **College Visit Planner** — save favorites, schedule visits, record coach
  meetings, travel plans, notes, ratings, photos, offers; side-by-side compare.
- **Scholarship Hub** — tracker (applied / in progress / awarded / declined),
  deadlines, essay status, recommendation letters, checklist, deadline reminders.
- **NIL Education Center** — what NIL is, personal brand, social best practices,
  media kits, photography, logos, partnerships, financial literacy, taxes,
  budgeting, contract basics, questions to ask pros — **educational disclaimer.**
- **Recruitment Readiness** — a personalized dashboard (highlight video,
  academic profile, recommendations, showcases, NCAA eligibility, visits,
  deadlines, ACT/SAT) with recommended next steps — **no guarantees.**
- **Coach Portal** — invited coaches verify stats, write recommendations, upload
  film, confirm awards, share notes, endorse leadership, leave messages —
  **parent-controlled permissions.**
- **Parent Dashboard** — practice/game/tournament schedules, travel, hotels,
  expenses, equipment, uniforms, medical forms, physical expirations, insurance,
  coach meetings, team communications.
- **Teammate Connections** — encouraging messages, shared memories, photos,
  celebrations, digital guestbook.
- **Sports Invitations** — Signing Day, banquets, Senior Night, championships,
  commitment ceremony, Hall of Fame, camps, fundraisers, showcases, visits.
- **College Transition & beyond** — move-in day, dorm life, first college game,
  college stats/awards, NIL milestones, graduation, pro opportunities, coaching.
  **The Journey never ends.**
- **Magical AI Sports Guide** — recruiting & planning companion ("You have a
  showcase in two weeks — let's review your checklist"; "Three scholarship
  applications close this month"; "Congratulations on All-State — added to your
  resume").

## Recommended build phasing
- **Phase A (done):** athlete-focused Preview Mode content on `/journeys/sports`.
- **Phase B — foundations:** accounts/auth (athlete/parent/coach + parent-
  controlled permissions), secure Storage, and the athlete profile + Game Center
  + Magical Moments Library data model.
- **Phase C — tools:** Highlight Reel Builder, Athletic Resume (PDF),
  Scholarship Hub + reminders, College Visit Planner, Parent Dashboard,
  Teammate Connections, Coach Portal.
- **Phase D — guidance & AI:** Recruitment/NIL education centers, Readiness
  dashboard, AI Sports Guide, Sports Invitations, College Transition.

**Guardrail:** educational only (never legal/tax/financial advice); never
guarantee recruitment or scholarships; never fabricate stats/offers; real
athlete photos preserved; parents control coach access; nothing deleted.
