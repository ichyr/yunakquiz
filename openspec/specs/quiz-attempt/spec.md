# quiz-attempt Specification

## Purpose

Taking a Quiz. The Quiz screen at `/quizzes/:slug` shows every Question on one page, in a fresh shuffled order for each Attempt, with no feedback until Finish. Attempts are never stored (ADR 0006); the Attempt logic lives in `packages/core` (ADR 0002).

## Requirements

### Requirement: Fresh shuffle per Attempt

Starting an Attempt SHALL put the Questions, and the Options within each Question, in a new random order. Every Question and every Option SHALL appear exactly once.

#### Scenario: Everything offered once

- **WHEN** an Attempt starts on a Quiz with 5 Questions of 4 Options each
- **THEN** the Attempt offers all 5 Questions, each with all 4 of its Options, none repeated

#### Scenario: Order depends on the random source

- **WHEN** two Attempts start with the same random source
- **THEN** they have the same order, and a different random source gives a different order

### Requirement: Correct Options hidden during the Attempt

The Attempt SHALL NOT expose which Option is correct, and the screen SHALL give no feedback on answers until Finish.

#### Scenario: Attempt Options carry no correctness

- **WHEN** an Attempt starts
- **THEN** no Option in it has a correctness flag

### Requirement: Answer in any order, change freely

The scout SHALL be able to answer Questions in any order and replace an answer at any time. Each Question takes exactly one chosen Option. Choosing an Option that does not belong to the Question MUST be rejected.

#### Scenario: Changing an answer

- **WHEN** the scout picks one Option and then another on the same Question
- **THEN** the second Option is the recorded answer

#### Scenario: Foreign Option

- **WHEN** an answer names an Option or Question that is not part of the Attempt
- **THEN** it is rejected with an error

### Requirement: Progress and Finish

The screen SHALL show how many Questions are answered out of the total. "Finish" SHALL be enabled only once every Question has an answer; until then a hint explains why.

#### Scenario: One Question unanswered

- **WHEN** all but one Question have an answer
- **THEN** Finish is disabled and the hint is shown

#### Scenario: All answered

- **WHEN** every Question has an answer, in whatever order they were answered
- **THEN** Finish is enabled

### Requirement: Leaving discards the Attempt after confirmation

Once the scout has answered at least one Question and before Finish, navigating to another screen SHALL ask for confirmation, and closing or reloading the tab SHALL trigger the browser's own prompt. Confirming SHALL discard the Attempt. Before the first answer, and after Finish, leaving SHALL NOT ask.

#### Scenario: Leave mid-Attempt and stay

- **WHEN** the scout has answered a Question and clicks the app name in the header
- **THEN** a dialog asks whether to leave, and choosing "Stay" keeps the Attempt as it was

#### Scenario: Leave mid-Attempt and confirm

- **WHEN** the scout confirms leaving in that dialog
- **THEN** the other screen opens and the Attempt is gone

#### Scenario: Leave before answering

- **WHEN** the scout has not answered anything and navigates away
- **THEN** no confirmation is asked

### Requirement: An Attempt survives background refetches

Once the Quiz has loaded, a failed or changed background refetch of the Quiz SHALL NOT reset or replace the Attempt in progress.

#### Scenario: Refetch fails mid-Attempt

- **WHEN** the Quiz is refetched in the background and the request fails
- **THEN** the scout's Attempt and answers stay on screen

### Requirement: Content in its Quiz Language

Quiz titles, descriptions, prompts, Options and Explanations SHALL be shown exactly as authored and marked with their Quiz Language, so browser translation and screen readers treat them correctly. The app SHALL NOT translate Quiz content.

#### Scenario: Ukrainian Quiz, English interface

- **WHEN** the Interface Language is English and the Quiz Language is `uk`
- **THEN** prompts and Options are shown in Ukrainian, marked `lang="uk"`, while labels are in English
