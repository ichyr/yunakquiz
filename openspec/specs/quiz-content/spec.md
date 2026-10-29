# quiz-content Specification

## Purpose

Defines what a valid Quiz is and how Quizzes get into the database. Quizzes are authored as files in the repository and loaded by a seed; there is no authoring in the app.

## Requirements

### Requirement: Quiz structure

A Quiz SHALL have a slug, a title, a description, one Quiz Language, at least one Category and at least one Question. Title, description and Quiz Language MUST be non-blank after trimming.

#### Scenario: Valid Quiz is accepted

- **WHEN** a Quiz has a slug, non-blank title and description, a Quiz Language, one Category and one valid Question
- **THEN** the Quiz schema accepts it

#### Scenario: Quiz without Questions is rejected

- **WHEN** a Quiz has an empty list of Questions
- **THEN** the Quiz schema rejects it

#### Scenario: Quiz without Categories is rejected

- **WHEN** a Quiz has an empty list of Categories
- **THEN** the Quiz schema rejects it

#### Scenario: Blank title is rejected

- **WHEN** a Quiz's title is only whitespace
- **THEN** the Quiz schema rejects it

### Requirement: Quiz Language is a language tag

A Quiz's Quiz Language SHALL be a BCP 47 language tag such as `uk`, `en` or `uk-UA`, so the app can name it in any Interface Language.

#### Scenario: Language tag is accepted

- **WHEN** a Quiz's Quiz Language is `uk`
- **THEN** the Quiz schema accepts it

#### Scenario: Language name or malformed tag is rejected

- **WHEN** a Quiz's Quiz Language is `ukrainian` or `uk UA`
- **THEN** the Quiz schema rejects it

### Requirement: Slugs

Quiz and Category slugs SHALL consist of lowercase letters and digits, joined by single hyphens.

#### Scenario: Slug with spaces is rejected

- **WHEN** a Quiz's slug is `ivan bohun`
- **THEN** the Quiz schema rejects it

#### Scenario: Uppercase Category slug is rejected

- **WHEN** a Category's slug is `Patrony`
- **THEN** the Quiz schema rejects it

### Requirement: Categories are flat

A Category SHALL have a slug and a non-blank name and no parent. A Quiz MAY belong to many Categories, and MUST list each Category only once.

#### Scenario: Quiz in two Categories

- **WHEN** a Quiz lists the Categories "Патрони куренів" and "Історія України"
- **THEN** the Quiz appears in both Categories

#### Scenario: Same Category listed twice

- **WHEN** a Quiz lists the same Category slug twice
- **THEN** the Quiz schema rejects it, before the seed writes anything

### Requirement: Question structure

A Question SHALL have a non-blank prompt, at least two Options with non-blank text, exactly one Correct Option and exactly one non-blank Explanation. There is no upper limit on Options.

#### Scenario: Question with no Correct Option is rejected

- **WHEN** no Option of a Question is marked correct
- **THEN** the Quiz schema rejects the Quiz

#### Scenario: Question with two Correct Options is rejected

- **WHEN** two Options of a Question are marked correct
- **THEN** the Quiz schema rejects the Quiz

#### Scenario: Question with one Option is rejected

- **WHEN** a Question has a single Option
- **THEN** the Quiz schema rejects the Quiz

#### Scenario: Blank prompt, Option or Explanation is rejected

- **WHEN** a Question's prompt, any Option's text or its Explanation is blank
- **THEN** the Quiz schema rejects the Quiz

### Requirement: Plain-text Explanations with paragraphs

Content SHALL be plain text. An Explanation MAY have several paragraphs separated by a blank line; the app SHALL show each paragraph separately and keep single line breaks inside a paragraph.

#### Scenario: Paragraphs split at blank lines

- **WHEN** an Explanation is `First\n\nSecond\r\n \r\nThird`
- **THEN** it is shown as three paragraphs: First, Second, Third

#### Scenario: Single line break stays inside a paragraph

- **WHEN** an Explanation is `One line\nand the next`
- **THEN** it is shown as one paragraph containing the line break

#### Scenario: Extra blank lines are ignored

- **WHEN** an Explanation starts, ends or is padded with repeated blank lines
- **THEN** no empty paragraphs are shown

### Requirement: Content is stored whole

A Quiz's Questions, Options and Explanations SHALL be stored together as one document on the Quiz, validated by the shared Quiz schema; Quiz metadata and Categories are stored as ordinary rows (ADR 0005). Questions and Options have no stored ids; they are identified by position (ADR 0006).

#### Scenario: Quiz read back unchanged

- **WHEN** a Quiz is seeded and then read through the API
- **THEN** its Questions, Options, Correct Options and Explanations equal the seeded content

### Requirement: Rerunnable seed

The seed SHALL load one file per Quiz from the repository, validate every Quiz before writing anything, and insert or update each Quiz and its Categories by slug in one transaction. Running it again SHALL be safe. The seed applies pending database migrations first.

#### Scenario: Rerun updates a Quiz and its Categories

- **WHEN** the seed runs again with a changed title and a different Category list for an existing slug
- **THEN** the Quiz has the new title and belongs only to the new Categories

#### Scenario: Invalid Quiz stops the whole seed

- **WHEN** one Quiz in a seed run breaks the content rules
- **THEN** the seed fails and no Quiz in that run is written or changed

### Requirement: First Quiz

The repository SHALL ship the Quiz "Іван Богун" with Quiz Language `uk`, in the Categories "Патрони куренів" and "Історія України".

#### Scenario: Fresh database after seeding

- **WHEN** the seed runs against an empty database
- **THEN** the Quiz "Іван Богун" is available in both Categories
