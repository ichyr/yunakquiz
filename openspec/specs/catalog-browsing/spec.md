# catalog-browsing Specification

## Purpose

How a scout finds a Quiz without searching: the Home screen lists Categories, a Category screen lists its Quizzes. Web addresses mirror the planned native app's routes so a shared link opens the same screen (ADR 0004).

## Requirements

### Requirement: Home screen

The Home screen at `/` SHALL show a search box and the Categories that contain at least one Quiz, each linking to its Category screen.

#### Scenario: Categories listed

- **WHEN** the scout opens `/`
- **THEN** they see the search box and every Category with at least one Quiz

#### Scenario: No Quizzes yet

- **WHEN** no Category contains a Quiz
- **THEN** the Home screen says there are no Quizzes yet

### Requirement: Category screen

The Category screen at `/categories/:slug` SHALL show the Category's name and its Quizzes.

#### Scenario: Category with Quizzes

- **WHEN** the scout opens a Category
- **THEN** they see its name and the list of its Quizzes

#### Scenario: Category with no Quizzes

- **WHEN** the Category exists but has no Quizzes
- **THEN** the screen says the Category has no Quizzes yet

### Requirement: Quiz list entries

Every Quiz list (Category screen and search results) SHALL show each Quiz's title, description and a Quiz Language badge, and link to `/quizzes/:slug`. The badge SHALL name the Quiz Language in the Interface Language.

#### Scenario: Ukrainian Quiz with English Interface Language

- **WHEN** the Interface Language is English and a listed Quiz has Quiz Language `uk`
- **THEN** its badge reads "Ukrainian"

### Requirement: Loading, not found and errors

While a screen's data loads it SHALL show a loading state. An unknown Category, Quiz or address SHALL show a "not found" message with a link home. Any other failure SHALL show an error message with a retry button. A 404 is not retried automatically; other failures are retried up to three times first.

#### Scenario: Unknown Category

- **WHEN** the scout opens `/categories/nope`
- **THEN** they see "Category not found" and a link to Home

#### Scenario: Unknown address

- **WHEN** the scout opens an address that matches no screen
- **THEN** they see "Page not found" and a link to Home

#### Scenario: API unavailable

- **WHEN** the API keeps failing with a server error
- **THEN** the screen shows an error message and a retry button that reloads the data

### Requirement: Mobile-first layout

Every screen SHALL be usable on a phone-sized viewport, with a header holding the app name (linking Home) and the Interface Language switcher.

#### Scenario: Main path on a phone

- **WHEN** the main path is run on a Pixel 7 viewport
- **THEN** every step is reachable and usable
