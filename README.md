# Typeform Clone

A functional clone of Typeform: a drag-and-drop form builder, publishable shareable
links, the signature one-question-at-a-time respondent experience, and a results
view with per-question summary statistics.

## Live demo

| | |
|---|---|
| **App** | https://type-form-lakshay.vercel.app |
| API | https://typeform-production-bd2b.up.railway.app |
| API docs | https://typeform-production-bd2b.up.railway.app/docs |

The app opens on the dashboard with three seeded forms, one of which already has
responses — so the builder, the respondent flow and the results view all have data to
show without setting anything up. Filling in a form needs no account.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Motion, dnd-kit |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | SQLite, migrated with Alembic |
| Tests | pytest + FastAPI `TestClient` |
| Hosting | Frontend on Vercel, backend on Railway (native Python + volume) |

## Repository layout

```
backend/
  app/
    core/          # configuration and database engine/session setup
    models/        # SQLAlchemy ORM models (the schema)
    schemas/       # Pydantic request/response models (the API contract)
    services/      # business logic: forms, questions, validation, stats, CSV
    api/
      deps.py      # shared dependencies: db session, current creator, form ownership
      routes/      # thin HTTP handlers, grouped by resource
    main.py        # app assembly: CORS, router mounting
    seed.py        # demo data
  alembic/         # migrations
  tests/
frontend/
  app/
    globals.css    # every design token (colours, radii, sidebar width)
    layout.tsx     # font + toast provider
    page.tsx       # creator dashboard
    forms/[formId]/          # builder route
    forms/[formId]/results/  # results route
    f/[slug]/                # public respondent flow (no auth)
  components/
    ui/            # Button, Dropdown, Modal, Toast, Icons — no UI library
    dashboard/     # TopBar, NavTabs, Sidebar, FormRow, FormCard, States
    builder/       # 3-pane builder: PagesPanel, Canvas, SettingsPanel, picker, preview
    respondent/    # FormRunner + screens + chrome for the public fill experience
    form/          # AnswerField + ChoiceOption — shared by builder and respondent flow
  hooks/           # useForms (dashboard), useBuilder (autosave + optimistic ops)
  lib/             # api client, types, questionTypes registry, formatters
```

The layering is deliberate: **routes** resolve and authorise, **services** hold the
logic, **models** own persistence. That is what lets `seed.py` create its demo
responses by calling the same `submit_response` service the public API calls,
rather than reimplementing inserts — so seeding exercises real validation.

## Getting started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate        # Windows; use .venv/bin/activate elsewhere
pip install -r requirements-dev.txt

cp .env.example .env                 # optional — defaults work for local dev
alembic upgrade head                 # create the schema
python -m app.seed                   # load demo forms and responses
uvicorn app.main:app --reload        # http://localhost:8000
```

Interactive API docs: **http://localhost:8000/docs**

> **Note on `--reload`:** uvicorn's file watcher proved unreliable inside a
> OneDrive-synced folder — it logs "Reloading…" and sometimes never completes,
> leaving the old code serving. If a new endpoint 404s or 405s, or a changed
> default doesn't take effect, restart the server rather than debugging the code.

Run the tests:

```bash
pytest -q                            # 20 tests covering all three flows
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local           # points at http://localhost:8000
npm run dev                          # http://localhost:3000
```

Run the checks:

```bash
npx tsc --noEmit                     # types
npx eslint .                         # lint (next lint was removed in Next 16)
```

## Architecture overview

Three distinct surfaces share one database:

1. **Creator API** — `/api/forms/...`, `/api/me`. Every query filters on
   `owner_id`. Authentication is simplified per the assignment: `get_current_creator`
   in `app/api/deps.py` resolves a single configured creator, creating the row on
   first use. Swapping that one dependency for session or token auth is the only
   change real authentication requires.
2. **Public API** — `/api/public/forms/{slug}`. Unauthenticated, and scoped to
   *published* forms only. It serves a deliberately narrower `PublicForm`
   projection: no owner, no numeric id, no counts, no timestamps.
3. **Results API** — `/api/forms/{id}/summary`, `/responses`, `/responses/export`.
   Creator-only, reading the same answer rows the public API wrote.

A few decisions worth calling out:

- **Validation lives in one place.** `services/answer_validation.py` is the
  authority on whether a submission is acceptable, and it owns the
  respondent-facing error copy ("Hmm... that email doesn't look right"). The
  submit endpoint's Pydantic schema deliberately types the incoming answer value
  as `Any` — if Pydantic coerced it first, respondents would see Pydantic's error
  text instead. The frontend mirrors the same rules for instant feedback, but the
  server never trusts it.
- **Validation iterates over the form's questions, not the payload.** That is what
  makes a *missing* required answer detectable, and it means unknown or duplicated
  question ids in a crafted request cannot influence what gets stored.
- **Submissions are all-or-nothing.** A rejected submission writes nothing, so no
  partial rows appear in the creator's results.
- **Choice options are rows, not a JSON array.** Answers reference them by foreign
  key, which makes per-option counts a `GROUP BY` instead of a scan over free text.
- **Editing an option updates it in place.** Options are matched by id on update.
  Delete-and-recreate would cascade away the `answer_options` rows of every
  response already collected — losing results data on a typo fix.
- **Aggregation is pushed into SQL.** The summary endpoint costs a fixed handful
  of grouped queries regardless of how many questions or responses a form has.
- **Question positions are always dense.** Any structural change renumbers to
  `0..n-1`, so the frontend can treat `position` as an array index.
- **Slugs are stable and unguessable.** A random suffix is always appended, and a
  rename or unpublish/republish never changes the slug — a shared link keeps working.

### Frontend architecture

- **All visual tokens live in `app/globals.css`.** Colours, radii and the sidebar
  width are Tailwind v4 `@theme` entries, so a shade can be corrected in one place
  instead of being hunted through components.
- **No UI or icon library.** `components/ui/` holds the primitives (Button,
  Dropdown, Modal, Toast) and the icon set is hand-drawn inline SVG on a 24px grid.
  That keeps every glyph at Typeform's stroke weight rather than inheriting another
  library's house style, and avoids fighting a component library's defaults.
- **One column template, two consumers.** `COLUMN_TEMPLATE` in `FormRow.tsx` is the
  CSS grid used by the header row, every data row, *and* the loading skeleton.
  Defining those separately is exactly how headings drift out of line with values.
- **Optimistic mutations.** Rename and publish apply locally first, then reconcile
  with the server's response, and roll back to the previous value if the request
  fails. The list never waits on a round trip to feel responsive.
- **Loading state is derived, not assigned.** `useForms` compares a request key
  against the key of the last settled result. Setting `loading` at the top of the
  effect would trigger a second render pass before paint — which React's
  `set-state-in-effect` lint rule flags — and can fall out of step with the request
  it describes.
- **The list survives a search.** A search request in flight keeps the previous
  rows and headings on screen; only the very first load shows a skeleton. That
  distinction is what `loading` versus `initialLoading` exists for.
- **Route params are awaited.** Next 16 removed synchronous `params` access, so the
  builder and results pages `await props.params` and use the generated
  `PageProps<'/forms/[formId]'>` helper.
- **`suppressHydrationWarning` is on `<html>` and `<body>`, and nowhere else.**
  Browser extensions stamp attributes onto those two elements between the HTML
  arriving and React hydrating (ColorZilla's `cz-shortcut-listen`, password
  managers, Grammarly), producing mismatch warnings for markup the app never
  rendered. The flag is one level deep — it covers each element's own attributes
  and direct text and does *not* silence descendants, so real hydration bugs inside
  the app are still reported. Verified by planting a `Math.random()` mismatch one
  level inside `<body>` and confirming React still flagged it.

### The builder

Three panes: the question list, the editing canvas, and the settings panel.

- **`lib/questionTypes.ts` is the single source of truth for a type's identity** —
  its label, icon and accent colour. The pages panel, element picker, type
  dropdown, canvas and preview all read from it, so a type cannot appear under two
  different names or icons depending on where you look.
- **`AnswerField` is shared, not duplicated.** The canvas renders it disabled, the
  preview renders it live, and the public respondent flow will render it too. It
  knows nothing about navigation or transitions, which is what makes that reuse
  possible — eight question types implemented once rather than three times.
- **Content edits autosave on a 600ms debounce; structural changes send
  immediately.** Typing a title should never wait on the network, but adding,
  deleting, reordering or retyping a question can *fail* in ways the creator has to
  see at once — a type locked by existing answers, a rejected reorder.
- **Pending saves are flushed on unmount**, so navigating away right after typing
  does not silently drop the last edit.
- **Reordering is optimistic and rolls back.** The new order paints immediately;
  if the API rejects it, the previous order is restored and a toast explains why.
- **Options added in the canvas carry a negative placeholder id**, which is
  stripped before sending so the server treats them as inserts. Existing options
  keep their real ids so they are updated in place, never recreated.
- **Mobile preview narrows the canvas rather than scaling it**, so text wraps the
  way it actually would on a phone instead of being shrunk.
- **Creating a form opens the element picker.** The dashboard creates an empty form
  and navigates to `/forms/{id}?new=1`; the builder reads that flag and opens the
  picker, so the creator's first choice becomes question 1. The flag is read
  server-side and used as the picker's *initial* state rather than opened from an
  effect, which would flash an empty builder for a frame first. Keying off the flag
  rather than "this form has no questions" means reopening an existing empty form
  does not pop the picker unasked.
- **The element picker holds only the eight documented types.** Every entry adds a
  real question, so nothing in it can be clicked to reach a dead end. Its three
  columns are filled sequentially against a target height rather than with CSS
  `columns`, which rebalances on every keystroke as the search filters items.

### Screens are elements, not defaults

A new form has **no welcome screen**. It is added from the element picker's
"Recommended" section, appears in the Pages panel once added, and can be removed
again from that row's menu. `forms.show_welcome_screen` therefore defaults to
`False` — a Python-side default, so existing rows keep whatever they were saved
with and no migration was needed.

The thank-you screen is the opposite: always present, with no remove action, because
every submission needs somewhere to land.

### Adding questions

Three routes in, all landing on the same place:

- **Add form elements** — one question of a chosen type, appended.
- **Import questions** — paste one question per line; blank lines are ignored. Every
  line becomes a Short Text question. Guessing the type from the wording would be
  wrong often enough to be worse than a predictable default: a mis-typed question is
  easy to miss and, once answered, its type locks with a `409`.
- `POST /forms/{id}/questions/bulk` backs the import in **one transaction**, so
  twenty pasted titles either all land or none do, and it is one round trip rather
  than twenty.

The Pages panel scrolls the newly selected question into view. Questions append to
the end, so on a form that already fills the panel the new one would otherwise sit
below the fold — the canvas would change while the panel looked untouched, which
reads as "it didn't work".

### Form sections are routes, not tab state

`Content`, `Share` and `Results` are separate URLs under `/forms/{id}`, sharing one
`FormTopBar`. Real navigation rather than in-page state, because "send me the
results link" is a thing people do and the back button should work.

`Workflow` and `Connect` are the two tabs with nothing behind them.

Moving between sections plays an expanding-circle reveal. It runs on **arrival**
rather than departure: a leaving animation would have to hold the navigation open
while it played, delaying the new page. It unmounts from motion's
`onAnimationComplete` — a callback rather than an effect body — so there's no timer
to clean up.

Publishing lives on the Share tab rather than in its own dialog, because "is it
live?" and "what's the link?" are the same question from the creator's side.

**The top-bar button follows the form's state.** An unpublished form shows *Share*;
once it's live there is nothing left to share, so the useful action is grabbing the
link — the button becomes a copy control that flips to a tick when clicked and
reverts after 1.8s. The tick is the confirmation rather than a toast, because the
button is what was clicked; `aria-live` carries the same result to a screen reader,
which can't see the glyph change. The pending revert is cleared on unmount so no
state is set against a component that has gone.

**Pressing Share publishes a ready draft.** The top bar's Share button links to
`?publish=1`; the Share *tab* omits the flag. So the deliberate "share it" action
publishes, while moving between tabs never mutates the form — the same
explicit-intent pattern as `?new=1` on the builder. A ref guards against a second
attempt on remount: publishing twice is harmless, but the animation firing twice
would not look it.

Going live plays a two-beat confirmation — a tick, then an arrow sweeping right.
Each beat advances from motion's `onAnimationComplete` rather than chained timers,
so the sequence can't drift from the animation it describes and there is nothing to
clear on unmount.

If the form isn't publishable, the `problems` checklist renders inline instead — on
the page rather than in a toast, since this is the case that otherwise reads as
"Share is broken".

Only conditions that make a form genuinely *unanswerable* block publishing: no
questions at all, or a choice question with no options. A missing question title is
incomplete rather than broken, so it publishes and renders as a `…` placeholder — the
way Typeform does it. Blocking there would stop a creator sharing a draft they are
still wording.

`questionLabel()` in `lib/format.ts` is the single source of that placeholder, used
by the pages panel, respondent flow, summary, responses table and response drawer, so
an untitled question looks the same everywhere it appears.

**The link is editable** (`PATCH /forms/{id}` with `slug`). Not a brief requirement,
added because it's visible in the UI being matched. Three things it has to get right:

- **Uniqueness** — the slug is `UNIQUE` in the schema, so the service checks for a
  clash and returns `409` rather than letting the insert blow up.
- **Nothing half-applies** — the slug is validated *before* any field is written, so
  a rejected link doesn't silently save the rest of the payload.
- **The old link dies immediately**, which the UI warns about before you save.
  Responses are unaffected: they reference the form's id, not its slug.

Input is normalised on every keystroke (lowercase, single hyphens, no symbols) so
the field can only hold something the API accepts; edge hyphens are trimmed on save.

The link preview card is built from the form's own title, description and theme, so
it reflects what a chat app would actually unfurl. QR codes and the two embed options
are placeholders.

### Request bodies reject unknown fields

Every request schema extends `RequestModel`, which sets `extra="forbid"`.

Pydantic's default is to silently drop unknown keys — so a misspelled field, or one
the deployed backend doesn't have yet, returns `200` with nothing changed and looks
like a successful write. That cost real debugging time during this build: the
frontend sent `slug` to a backend that predated it and the UI cheerfully reported
"saved". A `422` puts the mismatch where it happens.

### The respondent flow

`/f/[slug]` — one question per screen, no authentication.

- **Server-rendered.** This is the page a respondent reaches cold from a pasted
  link, so the first question paints immediately instead of after a client fetch.
  A 404 from the API renders the not-found screen, and because the API answers
  unknown slugs and unpublished drafts identically, that screen's copy never
  implies the form exists.
- **One submission at the end, not per question.** The API writes a response
  atomically, so an abandoned form leaves nothing behind and there is no partial
  state to reconcile. (`responses.is_complete` and `started_at` exist so partial
  tracking could be added without a schema change.)
- **Progress tracks answers, not position.** Someone who skipped optional questions
  really has got less far than someone who answered them.
- **Going back never validates.** A respondent must always be able to return to a
  question they left incomplete.
- **Server rejections map back to questions.** A 422 carries per-question issues, so
  the flow jumps to the *first* offending question and shows its message rather
  than surfacing one opaque failure.
- **Arrow keys navigate from a single-line input** — where up/down have nothing else
  to do — but not from a textarea or a native select, where the field owns them.
  Enter inside a field is left to the field so Shift+Enter stays a newline in long
  text.
- **Everything is rechecked before submit.** A respondent can reach the last
  question, go back, clear a required answer and come forward again; per-question
  validation alone would miss that.
- **Selection-only questions advance themselves.** Picking an answer on a yes/no,
  rating, dropdown or single-select choice question moves on after 700ms — there is
  nothing to type and nothing to confirm. Excluded: **multi-select**, because
  somebody choosing "Web app" may be about to choose "Mobile app" too; and the
  **last question**, because advancing there would submit the form without the
  respondent ever pressing Submit. Any manual navigation cancels a pending advance,
  as does unmounting.
- **Dropdowns are a themed listbox, not a native `<select>`.** A native select
  renders its options through the operating system, so the form's theme can't reach
  them — a dark form gets a light OS menu — and the A/B/C keys can't be shown at all.
  It reuses the same `ChoiceOption` card as the other choice types, so a dropdown and
  a multiple choice look like the same form.
- **Welcome and ending screens are centred; question screens are left-aligned**,
  matching the builder canvas and the live preview.

### Results

Two sub-tabs under `/forms/{id}/results`, covering the brief's four points:

- **Summary** — per-question stats. Choice and dropdown questions get the
  Choices / Responses / Percentages table the brief names; yes/no and rating get the
  same shape; number questions get average, lowest and highest; free-text questions
  list their latest answers with a pointer to the Responses tab for the rest.
- **Responses** — one row per submission, one column per question, scrolling
  sideways for wide forms. Columns come from the form definition rather than from
  the answers present, so a skipped question shows `–` instead of shifting the grid.
  The timestamp column is sticky, so a row stays identifiable once the question
  columns have scrolled past.
- **An individual response in full** — clicking a row opens a drawer. It iterates the
  *form's questions*, not the answers returned, because a skipped optional question
  writes no answer row: iterating answers alone would silently omit it, and
  "they didn't answer this" is information the creator wants. Long text is shown
  complete here, since the table truncates.
- **CSV export** — a plain link, so the browser handles the download and honours the
  `Content-Disposition` filename the API sends.

Both datasets load once on mount rather than per sub-tab, so switching is instant
and the response count in the tab label is right before that tab is opened.

Deliberately **not** built, because they aren't in the brief and would need data the
app doesn't record: Typeform's *Insights / Big picture* panel (views, starts,
drop-off — no page-view tracking exists, so those numbers would be invented) and
*Smart Insights*. The form-level figures shown are only the three that are real:
submissions, completion rate and average time to complete.

### Answer validation, on both sides

`backend/app/services/answer_validation.py` is the authority — it re-checks every
answer and a crafted request cannot get past it. `frontend/lib/answerValidation.ts`
is a deliberate mirror of it, so a respondent isn't made to wait for a round trip
to learn that an email is malformed.

The two share their **exact message strings**, so the same mistake never produces
two different wordings depending on which layer caught it. A backend test
(`test_required_message_depends_on_how_the_answer_is_given`) pins the copy so the
layers can't silently drift.

One rule worth naming: required-but-empty produces *"Please fill this in"* for typed
types and *"Please make a selection"* for clicked ones (choice, dropdown, yes/no,
rating). Telling someone to "fill in" a row of stars is the wrong instruction.

The client validation is shared by the builder's live preview and — from the next
phase — the public respondent flow, the same way `AnswerField` is.

### Where validation happens, and why it moved

The builder cannot let you type a question title without first creating an empty
question, so the API accepts incomplete work: blank titles, blank option labels.
That would have made a broken form publishable, so completeness is enforced at the
point where it matters — `POST /forms/{id}/publish` returns `422` with a
`problems` list, and the share dialog renders it as a checklist. Fixing four
things in one pass beats four round trips.

Relatedly, `question.type` is **not** fully immutable as first designed. It can be
changed freely until the question has an answer, then locks with a `409`. That
keeps the data-integrity guarantee (answers live in columns specific to the old
type) while letting a creator fix a type they picked wrongly.

## Database schema

```
users
  id, email (unique), name, created_at, updated_at
    │
    │ 1─N
    ▼
forms
  id, owner_id → users.id, title, slug (unique), status (draft|published),
  published_at, show_welcome_screen, welcome_heading, welcome_description,
  welcome_button_label, thank_you_heading, thank_you_description,
  created_at, updated_at
    │                    │                       │
    │ 1─1                │ 1─N                   │ 1─N
    ▼                    ▼                       ▼
form_themes          questions               responses
  id                   id                      id
  form_id (unique)     form_id → forms.id      form_id → forms.id
  background_color     type                    token (unique)
  question_color       title, description      is_complete
  answer_color         position                started_at, submitted_at
  button_color         is_required             duration_seconds
  button_text_color    placeholder             user_agent
  font_family          max_length                  │
                       min_value, max_value        │ 1─N
                       allow_decimal               ▼
                       rating_max, rating_icon  answers
                       allow_multiple             id
                       randomize_options          response_id → responses.id
                         │                        question_id → questions.id
                         │ 1─N                    value_text
                         ▼                        value_number
                     question_options             value_bool
                       id                         value_rating
                       question_id                unique(response_id, question_id)
                       label                          │
                       position ◄──────────────┐      │
                                               │      │
                                        answer_options (N─N join)
                                          answer_id  → answers.id
                                          option_id  → question_options.id
                                          primary key (answer_id, option_id)
```

**Relationships.** `users 1─N forms`, `forms 1─N questions`, `forms 1─1 form_themes`,
`forms 1─N responses`, `questions 1─N question_options`, `responses 1─N answers`,
`answers N─N question_options` (via `answer_options`).

**Notes on the design.**

- Every foreign key is `ON DELETE CASCADE`, and SQLite's `PRAGMA foreign_keys=ON`
  is set per connection in `core/database.py` — without it SQLite silently ignores
  cascades. Deleting a form removes its questions, options, responses and answers.
- `answers` uses **typed value columns** rather than one stringified column, so
  numbers and ratings stay comparable and aggregatable in SQL. `value_rating` is
  separate from `value_number` so a rating distribution can be aggregated without
  mixing in free-form numeric answers.
- **A skipped optional question writes no answer row at all.** That keeps
  "skipped" and "answered with an empty string" distinguishable in the stats.
- `unique(response_id, question_id)` on `answers` makes a duplicate answer for one
  question impossible at the database level.
- Question type settings (`max_length`, `min_value`, `rating_max`, …) are explicit
  columns rather than a JSON blob, because every one of them participates in
  server-side validation and is worth keeping typed and queryable.
- `question.type` **locks once the question has an answer**. It can be changed
  freely on a draft; afterwards the change is refused with a `409`, because the
  stored values sit in columns the new type would not read.

## API overview

All routes are prefixed `/api`. Full interactive reference at `/docs`.

### Creator — forms

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/me` | The acting creator |
| `GET` | `/forms` | List forms with question + response counts. Filters: `?status=`, `?search=` |
| `POST` | `/forms` | Create a form (optionally with starter questions) |
| `GET` | `/forms/{id}` | Full form definition for the builder |
| `PATCH` | `/forms/{id}` | Update title, welcome/thank-you screens, theme (all partial) |
| `POST` | `/forms/{id}/duplicate` | Deep-copy the definition, excluding responses |
| `POST` | `/forms/{id}/publish` | Publish and return `public_url`; `422` + `problems[]` if incomplete |
| `POST` | `/forms/{id}/unpublish` | Take the public link offline |
| `DELETE` | `/forms/{id}` | Delete the form and all its responses |

### Creator — questions

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/forms/{id}/questions` | Questions in display order |
| `POST` | `/forms/{id}/questions` | Add a question; `position` inserts, omitting it appends |
| `POST` | `/forms/{id}/questions/bulk` | Append up to 100 questions in one transaction (Import questions) |
| `PUT` | `/forms/{id}/questions/reorder` | Apply a new order (drag and drop) |
| `PUT` | `/forms/{id}/questions/{qid}` | Update a question and reconcile its options; `409` if changing a type that already has answers |
| `DELETE` | `/forms/{id}/questions/{qid}` | Delete a question |

`reorder` requires the complete list of the form's question ids. A partial list is
rejected with `400` rather than guessed at, since the remaining positions would be
ambiguous and silently ignoring unknown ids would hide a stale-client bug.

### Public — respondent flow (no auth)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/public/forms/{slug}` | Fetch a published form |
| `POST` | `/public/forms/{slug}/responses` | Submit a response |

Unpublished and non-existent slugs both return `404` with the same message, so a
draft's link cannot be used to probe for its existence.

Failed validation returns `422` with a per-question issue list the UI can use to
jump back to the offending question:

```json
{
  "detail": "Some answers need attention",
  "issues": [
    { "question_id": 3, "message": "Hmm... that email doesn't look right" },
    { "question_id": 5, "message": "Please enter a whole number" }
  ]
}
```

Accepted `value` shapes per question type:

| Type | Value |
|---|---|
| `short_text`, `long_text`, `email` | string |
| `number` | number, or a numeric string |
| `yes_no` | boolean |
| `rating` | integer, `1..rating_max` |
| `multiple_choice`, `dropdown` | an option id, or a list of option ids |
| skipped (optional question) | `null`, `""` or `[]` |

### Creator — results

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/forms/{id}/responses` | Paginated submissions (`?limit=`, `?offset=`) |
| `GET` | `/forms/{id}/responses/{rid}` | One response in full |
| `GET` | `/forms/{id}/summary` | Per-question summary statistics |
| `GET` | `/forms/{id}/responses/export` | CSV export |

`/summary` returns only the fields relevant to each question type: option counts
and percentages for choice questions, yes/no counts, a rating distribution plus
average, min/max/average for numbers, and recent answers for text. Every question
also reports `answered_count` and `skipped_count`. Choice percentages are of
respondents who *answered* that question, so a mostly-skipped optional question
still reads sensibly — which means multi-select percentages can sum above 100%.

## Seed data

`python -m app.seed` loads:

- **Customer Satisfaction Survey** — published, 7 questions covering short text,
  email, rating, multi-select, dropdown, yes/no and long text; 12 responses with
  some questions genuinely skipped.
- **Product Feedback 2026** — published, 5 questions including a number question
  and a 10-point rating; 6 responses; a custom dark theme.
- **Job Application — Frontend Engineer** — a draft, so the dashboard shows both
  statuses.

Submissions are spread over recent days so the results view isn't a single
timestamp, and the random generator is seeded so re-running produces identical data.
Rows are cleared first in foreign-key order rather than by dropping tables, so the
Alembic migration history is never bypassed.

Two entry points:

| Command | Behaviour |
|---|---|
| `python -m app.seed` | **Destructive.** Wipes and reseeds. For local resets. |
| `python -m app.seed --if-empty` | Seeds only an empty database; leaves a populated one alone. |

The container runs `--if-empty` on start. Running the destructive version on every
deploy would delete the responses collected from the live link — the exact data the
brief requires to persist.

## Deployment

Frontend on **Vercel**, backend on **Railway**.

### Why Railway for the backend

SQLite is a file, so the API needs a filesystem that survives restarts. As of 2026
that rules out the obvious free options:

| Host | Persistent disk |
|---|---|
| Render | Paid instances only — a free instance's filesystem is wiped on redeploy and after it idles out |
| Fly.io | Volumes are cheap ($0.15/GB/month) but there is no free tier |
| **Railway** | Volumes on every tier — 0.5 GB on Trial, 5 GB on Hobby |

The database is ~130 KB, so the smallest volume is ample. `render.yaml` is kept as a
documented alternative, pinned to `plan: starter` because a `free` plan with a disk
is rejected.

**No Docker.** Both hosts install straight from `requirements.txt` using their native
Python runtime, which is one less moving part than maintaining an image for a plain
ASGI app. `backend/.python-version` pins 3.12 so the deployed interpreter matches the
one the tests run on — Railpack otherwise defaults to 3.13.

### This is a monorepo, so tell the host where the app is

Both platforms look at the **repository root** by default. This repo has `backend/`
and `frontend/` there and no app at the top level, so auto-detection finds nothing
and the build fails before it starts. Each service needs its root directory set:

| Service | Root directory | Where |
|---|---|---|
| Backend | `backend` | Railway: service → **Settings** → *Root Directory* |
| Frontend | `frontend` | Vercel: project → **Settings → General** → *Root Directory* |

One catch worth knowing: **`railway.json` does not follow the root directory.**
Railway reads it from the repo root regardless, which is exactly where it lives here —
so the start command and health check apply without any extra configuration.

### Order matters

`NEXT_PUBLIC_API_URL` is **inlined into the client bundle at build time**, so it has
to be correct *before* the frontend builds — not after. Get it wrong and the site
loads normally while every request goes to the visitor's own `localhost:8000`.

That failure is silent, so the backend URL is committed in `frontend/.env.production`
rather than left to a dashboard field someone can forget. `NEXT_PUBLIC_*` values are
inlined into client JavaScript by definition, so this is a hostname, not a secret.
Next.js resolves `process.env` before any `.env` file, so a Vercel dashboard variable
still overrides it if the backend moves.

Note the load order the other way too: `.env.local` outranks `.env.production`, so a
`npm run build` **on your own machine** still points at localhost. That is intended —
`.env.local` is gitignored and never exists on Vercel.

**1. Backend → Railway.** New project from this repo, set *Root Directory* to
`backend`, attach a volume, then set:

| Variable | Value |
|---|---|
| volume mount path | `/data` |
| `DATABASE_URL` | `sqlite:////data/typeform.db` — four slashes means an absolute path |
| `CORS_ORIGINS` | your Vercel origin, e.g. `https://your-app.vercel.app` |
| `PUBLIC_FORM_BASE_URL` | that origin plus `/f` |

`PORT` is supplied by Railway and read by the start command in `railway.json`, which
migrates, seeds if empty, then serves. Railpack's default FastAPI command is
`uvicorn main:app` — wrong for this layout and it skips migrations — which is why the
start command is specified explicitly.

Verify with `/health` and `/docs` before moving on.

Railway does not expose a service publicly until you ask it to: *Settings* →
**Networking → Public Networking → Generate Domain**. A green deploy only means the
container passed its health check internally.

**2. Frontend → Vercel.** Import the repo and set *Root Directory* to `frontend`.
No environment variables needed — `.env.production` already carries the backend URL.

**3. Close the loop.** Vercel assigns the real domain on that first deploy, so go back
and set `CORS_ORIGINS` and `PUBLIC_FORM_BASE_URL` to it. `PUBLIC_FORM_BASE_URL` is
what builds every `public_url`, so a stale value means the Share tab hands out links
pointing at localhost.

Then fill in a form end-to-end on the deployed URL — that exercises CORS, the volume
and the shareable link in one pass.

## Assumptions

- **Authentication is out of scope.** There is exactly one creator, resolved from
  configuration. The `users` table and `owner_id` filtering exist so that adding
  real auth is additive rather than a refactor.
- **A form's slug is permanent** once created. Renaming a form does not change its
  public link.
- **Responses are immutable** once submitted; there is no edit-a-response flow.
- **Partial responses are not yet written.** `responses.is_complete` and
  `started_at` exist so partial tracking can be added by writing rows as the
  respondent advances, with no schema change.
- **`randomize_options` is stored but applied client-side**, since option order is
  a presentation concern and the API should stay deterministic.
- **Client-reported `duration_seconds`** is taken at face value; it is display-only.
- **SQLite requires a persistent filesystem.** The backend runs on Railway with a
  volume mounted at `/data` (`render.yaml` is kept as a documented alternative).
  `DATABASE_URL` is configurable so it can move to Postgres if the host has no
  durable disk.

## Placeholders

Present in the UI as "Coming soon", per the assignment's "Mocked / Placeholder
Sections": logic jumps and branching, integrations and webhooks, team collaboration
and sharing, plus the builder chrome that sits outside the brief (Universal mode,
Workflow, Connect, video questions, "Other"/"None" options, contact mapping,
comments).

AI form generation is **not implemented at all**. It appears nowhere in the brief's
core features, bonus list, or placeholder list, so the create-form flow goes
straight to the builder rather than through Typeform's AI prompt screen. For the
same reason the element picker contains only the eight specified question types
rather than Typeform's full set.
