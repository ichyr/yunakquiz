# quiz-api Specification

## Purpose

The REST + JSON API under `/api` that the web app reads. It is read-only. It returns whole Quizzes, Correct Options and Explanations included, because answers are checked in the browser (ADR 0001). Response shapes are the zod schemas in `packages/core`, shared with the web app (ADR 0004).

## Requirements

### Requirement: List Categories

`GET /api/categories` SHALL return the Categories that contain at least one Quiz, each with slug and name, ordered by name.

#### Scenario: Empty Category is left out

- **WHEN** a Category exists with no Quizzes
- **THEN** it is not in the response

### Requirement: Get a Category

`GET /api/categories/:slug` SHALL return the Category and summaries of its Quizzes ordered by title. A summary has slug, title, description and Quiz Language, and no Questions.

#### Scenario: Known Category

- **WHEN** the slug names an existing Category
- **THEN** the response is 200 with the Category and its Quiz summaries, without Questions

#### Scenario: Unknown Category

- **WHEN** no Category has the slug
- **THEN** the response is 404

### Requirement: Search Quizzes

`GET /api/quizzes?q=` SHALL return summaries of the Quizzes whose title or description contains `q`, ignoring case, ordered by title. The query MUST be non-blank after trimming.

#### Scenario: Blank or missing query

- **WHEN** `q` is missing or only whitespace
- **THEN** the response is 400

### Requirement: Get a Quiz

`GET /api/quizzes/:slug` SHALL return the whole Quiz: metadata, Categories (ordered by name), and every Question with its Options, Correct Option and Explanation.

#### Scenario: Known Quiz

- **WHEN** the slug names an existing Quiz
- **THEN** the response is 200 and parses with the Quiz schema, Correct Options and Explanations included

#### Scenario: Unknown Quiz

- **WHEN** no Quiz has the slug
- **THEN** the response is 404

### Requirement: Health check

`GET /api/health` SHALL report whether the database answers.

#### Scenario: Database reachable

- **WHEN** the database answers a trivial query
- **THEN** the response is 200 with `{ "status": "ok" }`

#### Scenario: Database unreachable

- **WHEN** the database cannot be reached
- **THEN** the response is 503 with `{ "status": "unavailable" }`

### Requirement: Server errors hide details

On a server error the API SHALL log the full error and respond with only `{ "error": "Internal Server Error" }`, never SQL or stack details.

#### Scenario: Query fails

- **WHEN** a request fails because the database is unreachable
- **THEN** the response is 500 with `{ "error": "Internal Server Error" }`

### Requirement: Container-friendly configuration

The API SHALL take its database connection from `DATABASE_URL` and listen on `HOST` (default `0.0.0.0`) and `PORT` (default `3000`), and fail at start-up when `DATABASE_URL` is missing.

#### Scenario: Missing database URL

- **WHEN** the API or seed starts without `DATABASE_URL`
- **THEN** it exits with an error naming the missing variable
