# Typeform Clone

A working clone of Typeform: build a form by dragging questions around, publish it to
a shareable link, and read the responses back as per question statistics.

## Live demo

| | |
|---|---|
| **App** | https://type-form-lakshay.vercel.app |
| API | https://typeform-production-bd2b.up.railway.app |
| API docs | https://typeform-production-bd2b.up.railway.app/docs |

The dashboard opens on three seeded forms, two of them already holding responses, so
the builder, the respondent flow and the results view all have something to show
straight away. Filling in a form needs no account.

## What it does

### Form builder

- Eight question types: short text, long text, multiple choice, dropdown, yes/no,
  rating, email and number
- Drag and drop reordering, plus duplicate and delete
- Per question settings: title, description, required, placeholder, character and
  value limits, rating scale and icon, multi select, randomised options
- Optional welcome screen and a customisable ending screen
- Paste a list of titles to import several questions at once
- Custom theme colours, applied to the builder canvas, the preview and the live form
- Full screen preview with a desktop and mobile toggle, and a restart control

### Publishing and sharing

- Publish a form to a public link that needs no account to open
- The link slug is editable, so a form can have a readable URL
- Editing a live form surfaces a "Publish edits" button that pushes the changes
- Unpublishing takes the link offline and keeps the responses already collected

### Respondent flow

- One question per screen, the way Typeform does it
- Validation as you go, matching the rules the server enforces
- Choice questions advance on their own a second after being answered
- Progress bar driven by how much has actually been answered
- Keyboard navigation with Enter and the arrow keys

### Results

- Per question summary statistics: choice distributions, rating averages, response
  counts and completion rate
- A response table with one row per submission, and a drawer for reading one in full
- CSV export of every response

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Motion, dnd-kit |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | SQLite, migrated with Alembic |
| Tests | pytest with FastAPI's TestClient, 40 tests |
| Hosting | Frontend on Vercel, backend on Railway with a volume for the database |
