# Product Plan

## Product

**ShuttleMotion** is a browser-based badminton teaching aid for coaches. It helps students understand court position and movement, with 2D and 3D views for the same court and lesson content.

## Users

- **Primary:** badminton coach who selects and explains a lesson.
- **Learner:** student who watches, explores, and practices the movement.

The first version is for one coach's lessons. Multi-coach accounts and public lesson publishing are outside the initial scope.

## Product principles

1. Coaching guidance must be reviewable by a badminton coach.
2. Court dimensions and markings must come from one documented source of truth shared by the 2D and 3D views.
3. A 3D view should clarify court position, direction, timing, and body orientation.
4. Lessons should be structured as content so new lessons do not require rebuilding the whole viewer.
5. The first experience should work in a browser without requiring students to install an app.

## Foundation scope

The repository foundation is complete when:

- Product scope and architecture decisions are recorded here and in `ARCHITECTURE.md`.
- Frontend and backend have clearly owned directories and responsibilities.
- The runtime is Node.js 22+ with plain HTML, CSS, and JavaScript; the court viewer uses the pinned `three` package. Database and hosting choices wait until lesson and deployment needs are defined.
- The first lesson has enough coach-reviewed source material to describe its steps and expected movement.

## First usable slice

The court reference data prerequisite is implemented in `reference/badminton/`: JSON geometry, generated SVG, version-pinned English rules, source metadata, and Node.js unit tests. The responsive 2D/3D court viewer is the first learner-facing feature. The shuttle vector sandbox (typed shuttle and player placement with physics candidate paths, see `FEATURE_SHUTTLE_SANDBOX_PLAN.md`) is implemented, with a separate shot lab page at `/shot` that simulates a hit from a coach-entered speed and racket-face angle, with two player figures, a hitter and a receiver. Each has a profile (sex, height, mass, jump fitness or a measured jump), and the page shows whether that player can reach the shuttle. A doubles training page at `/training` (see `FEATURE_DOUBLES_TRAINING_PLAN.md`) loads eight lessons through the backend lesson API. They are drafts derived from cited BWF pages, pending coach review, so the coach-reviewed lesson below is still open. A run-test mode animates an incoming shuttle from B, A's jump and hit from where A stands, and suggests a better stand spot when A cannot reach. The training page animates players moving linearly between step positions with step, pause and slow playback. Still open: a coach-reviewed lesson, coaching cues and common errors, and stroke or footwork poses during lessons.

- One competition-standard court viewer with a 2D/3D switch and singles/doubles boundary emphasis, as scoped in `FEATURE_COMPETITION_COURT_PLAN.md`.
- One coach-reviewed movement lesson.
- A 3D player or movement representation with a visible path on court.
- Basic lesson playback controls such as step, pause, and slow playback.
- At least one useful camera view beyond the initial view.
- Short coaching cues and a depiction of a common error, if the coach supplies validated examples.
- Lesson content loaded through the backend API.

## Not in the first slice

- Student accounts, saved personal progress, payments, social features, or leaderboards.
- A lesson authoring CMS.
- Multiple backend services.
- Automated pose recognition or AI assessment of a student's technique.
- A full badminton course library.
- Tournament-venue certification such as ceiling, lighting, or run-off clearance validation.

These can be reconsidered after the first slice is used in a real lesson.

## Decisions to make before implementation

- Student age and skill level for the first lesson.
- The first movement or stroke to teach.
- Whether the main use is a phone courtside, a tablet, or a computer/projector in class.
- Which coach-reviewed videos, diagrams, or 3D references are available.
- Whether lessons need to be editable by the coach in the first release.
