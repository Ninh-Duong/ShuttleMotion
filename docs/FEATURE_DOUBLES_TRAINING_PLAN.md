# Feature: Doubles Training Page

## Goal

Give the coach a page of doubles lessons. Each lesson is an animated 2 vs 2 rally that shows how both pairs move and where the shuttle goes. Lessons are grouped by theme:

- serve and receive;
- attack and smash;
- defence and counter-attack;
- rotation and mixed doubles.

## Status

All lessons are **drafts derived from cited BWF pages**. Each one has `status: "draft-source-derived"`, and the page shows a badge saying it is awaiting coach review. No lesson is coach-reviewed yet, so PLAN.md's "one coach-reviewed movement lesson" remains open.

## Sources

These were read in full:

- **BWF Coach Education, Coaches' Manual Level 1, 2nd edition (2017), Module 8.**
  - Ch.08 Doubles Tactics (pp.148–169) covers formations, the channel attack, rotation, serve and receive, defence, counter-attack, lift directions and drill templates.
  - Ch.09 Mixed Doubles Tactics (pp.170–180) covers roles, serve positions and defence.
- **BWF Shuttle Time, Schools Badminton Lesson Plans (2017), Lessons 21–22 (pp.95–102).** These include the "low serve → lift → server takes net, partner smashes → block defence → net player lifts → formations change" exercise.

Recorded but not used:

- **Downey J. *Winning Badminton Doubles* (1984).** The PDF could not be read and no licence statement was found.
- **Grice *Steps to Success* and Brahms *Badminton Handbook*.** No open preview was available.
- **Doubles tracking data (Ding et al. drone dataset).** It has no licence, so movement is not taken from it.

Peer-reviewed match analyses (for example Le Mansec et al. 2023) describe rally length and shot frequency, not positions, and are not used for lesson content.

## Lesson data (`backend/lessons/doubles.json`)

- **`sources`**: the cited documents. A source marked `notUsedYet` cannot be referenced.
- **`speeds`**: launch speed for each shot type, either with a `sourceId` or marked `status: "illustrative"`.
  - The smash uses trained players' 45.3 m/s (Zhang 2016).
  - Elite drop speeds (22–29 m/s) do not give a falling drop from these contact points in the point-mass model, so the drop is illustrative.
  - Illustrative speeds were chosen so each shot has a typical-looking arc:

| Shot | Speed (m/s) | Resulting arc |
|---|---|---|
| Low serve | 9 | apex about 1.7 m |
| Flick serve | 22 | — |
| Lift | 22 | apex about 5–6 m |
| Block | 9 | — |
| Net shot | 3 | apex just over the tape |
| Drop | 18 | — |

- **`lessons[]`**. Each lesson has:
  - `id`, `category`, `status`;
  - `title` and `objective` in `{en, vi}`;
  - `sources` with pages;
  - four `players` (`A1`, `A2`, `B1`, `B2`), each with a team and an optional role label;
  - `steps[]`.
- **Each step** has:
  - `positions` for every player in player-view coordinates (`left`, `fromNet`; side A is z > 0, side B z < 0);
  - a `shot` `{by, type, to, arc, contactHeight?, speed?}`, or, on the last step only, an optional `receivedBy`;
  - a `caption` in `{en, vi}`;
  - a verbatim English `quote` `{text, pages, sourceId?}`.
- **Language.** English captions paraphrase the cited page. Vietnamese captions are project translations.
- **Positions and sequences.** These are a project interpretation, because the sources describe positions in words only ("close to the T", "centrally in the midcourt") and give no metres. Each rally sequence is chosen to illustrate the cited roles.

## Chained physics (`frontend/lesson-timeline.mjs`)

`buildTimeline` reuses `frontend/shuttle-physics.mjs`.

- **First contact.** It is 0.4 m in front of the first hitter at `contactHeight`. This is an illustration, not a technique.
- **Each shot.** It is aimed with `aimAt`. The shot must clear the sagging net between the posts; `arc` chooses the flattest or the highest solution.
- **Interception.** The flight ends where the next hitter, or `receivedBy`, meets it from their next-step position:
  - Smashes, clears and drops are taken at the highest point the player can reach with a jump, with the arm at least `player.json` `overhead.minArmElevationDeg` above horizontal (`highestContact`).
  - Other shots are taken without a jump when possible (`interceptPose` with no jump), and with a jump only when needed.
- **Default player.** The `player.json` `defaultProfile` sets the height and the estimated jump.
- **Errors.** If a shot cannot clear the net or cannot be reached, `buildTimeline` throws, naming the lesson and step. The tests run every lesson through it.

## Validation (`backend/lessons.mjs`)

`validateLessons` runs at server start; invalid data stops the server, so it is never served. It checks:

- unique ids, known categories and statuses;
- `en` and `vi` text, and a verbatim quote with pages;
- usable source ids, and quote sources that are among the lesson's own sources;
- two players per side, all positions present, within the doubles width and at most 0.8 m behind the back boundary (a project limit, not a BWF run-off rule);
- shot targets inside the doubles court, with limits read from `court.json`;
- known shot types with a speed, and an `arc` of `flat` or `high`;
- that the next hitter is on the other side.

**Serve legality**, for a first step of type `lowServe` or `flickServe`:

- The contact height is at most `rules.json` `service-action.limits.maxShuttleHeightAtContactM`, which is 1.15 m (Law 9.1.6).
- The server stands in a doubles service court.
- The serve lands in the diagonally opposite court's landing area (`court.json` `serviceAreas`).
- The receiver stands in that court.

## API

- `GET /api/lessons` returns `{categories, notes, lessons: [{id, category, title, status}]}`.
- `GET /api/lessons/:id` returns `{lesson, speeds, sources, notes}`, or 404.

## Page (`/training`)

- **Sidebar:**
  - the lesson library grouped by category;
  - a player legend with kit colours (A blue shades, B red shades) and roles;
  - notes, including the illustrative speeds;
  - the cited sources with pages.
- **Stage:** the 3D court.
  - All four players in the ready hold, moving linearly between step positions over each flight.
  - The shuttle with a fading trail.
  - A top-down view button.
- **Controls:** previous step, play all or pause, next step (plays one flight and stops), and speed 1× / 0.5× / 0.25×.
- **Step card:** "Step n/N" with the hitter and shot, the caption, and the quote with its source and pages.
- **Links:** navigation between `/`, `/shot` and `/training`.

## Non-goals

- Hitter arm or jump poses during lessons; players stay in the ready hold, and `/shot` covers reach and jumps.
- Lesson editing (no CMS), learner progress, quizzes.
- Movement taken from tracking data.

## Coach questions

- Review each draft lesson: positions, rally sequences, captions and the Vietnamese wording.
- Typical speeds for serves, lifts, blocks, net shots and drops for the target learners.
- Which further themes to add (for example drives, the third-shot patterns, mixed-doubles serve variations), and whether Downey or Grice should be licensed as sources.

## Verification

- `npm test` runs `tests/lessons.test.mjs`:
  - **Schema.** All lessons are valid. Broken fixtures are rejected for each rule: wrong side, unusable source, serve too high, serve into the wrong court, receiver outside the diagonal court, missing Vietnamese text, empty quote, quote from a foreign source, unsourced speed.
  - **Geometry.** Every lesson's chained flights can be played and reached.
  - **API.** Both endpoints work, an unknown id returns 404, and `/training` is served.
- Manual check:
  1. Run `npm run dev` and open `/training`.
  2. Select "Lift, smash, block". Step through all six steps, then play at 0.25× in the top-down view.
  3. Confirm the formations change, the trail fades, and each quote shows its own source and page.
