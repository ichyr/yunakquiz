# quiz-review Specification

## Purpose

The Review is the point of the product: after Finish the scout sees the Score and, for every Question, their chosen Option, the Correct Option and the Explanation. Answers are checked in the browser (ADR 0001) by logic in `packages/core` (ADR 0002).

## Requirements

### Requirement: Review replaces the Quiz screen

Finishing an Attempt SHALL replace the Quiz screen with the Review at the same address; the Review has no address of its own. A Review MUST NOT be built while any Question is unanswered.

#### Scenario: Finish

- **WHEN** the scout presses Finish on `/quizzes/ivan-bohun`
- **THEN** the Review is shown, the address is still `/quizzes/ivan-bohun`, and the page scrolls to the top

#### Scenario: Review before every answer

- **WHEN** a Review is requested for an Attempt with an unanswered Question
- **THEN** it is refused with an error

### Requirement: Score

The Review SHALL show the Score as the number of Questions answered correctly out of the total, e.g. `7 / 10`, with no pass or fail. A perfect Score SHALL be congratulated; any other Score SHALL invite the scout to read the Explanations and try again.

#### Scenario: Three of five correct

- **WHEN** the scout answered 3 of 5 Questions correctly
- **THEN** the Review shows `3 / 5` and invites another Attempt

#### Scenario: Perfect Score

- **WHEN** every answer was correct
- **THEN** the Review shows `5 / 5` and says all answers are correct

### Requirement: Every Question explained

For every Question, in the order shown during the Attempt, the Review SHALL show the prompt, all Options in the Attempt's order, whether the answer was correct, the scout's chosen Option, the Correct Option highlighted, and the Explanation.

#### Scenario: Wrong answer

- **WHEN** the scout chose a wrong Option for a Question
- **THEN** that Question is marked incorrect, the chosen Option is marked as "your answer", the Correct Option is highlighted, and the Explanation is shown

#### Scenario: Right answer

- **WHEN** the scout chose the Correct Option
- **THEN** that Question is marked correct and the Option is marked both as "your answer" and as the Correct Option

### Requirement: Try again

The Review SHALL offer "Try again", which starts a fresh Attempt with a new shuffle and no answers, and scrolls to the top. Attempts are unlimited.

#### Scenario: Retake

- **WHEN** the scout presses Try again
- **THEN** a new Attempt starts with Questions and Options in a new order and nothing answered
