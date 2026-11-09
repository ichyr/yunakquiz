# quiz-search Specification

## Purpose

Finding Quizzes by words in their title or description, across every Quiz Language, with a shareable address for each search. Matching uses Postgres trigrams rather than full-text search, because Postgres has no Ukrainian dictionary (ADR 0003).

## Requirements

### Requirement: Search on submit

Submitting the search box (Enter or the button) on Home or Search SHALL open the Search screen at `/search?q=<query>`. Search SHALL NOT run while typing.

#### Scenario: Search from Home

- **WHEN** the scout types "Богун" on Home and presses Enter
- **THEN** the address becomes `/search?q=Богун` and the matching Quizzes are listed

#### Scenario: Typing does not search

- **WHEN** the scout types in the search box without submitting
- **THEN** no search request is sent and the address does not change

### Requirement: Shareable search address

The Search screen SHALL read its query from the address, prefill the search box with it and show its results, so a copied link reproduces the search. Back and Forward SHALL refill the box with that address's query.

#### Scenario: Opening a shared link

- **WHEN** the scout opens `/search?q=knots` directly
- **THEN** the box contains "knots" and the matching Quizzes are listed

### Requirement: Partial, case-insensitive matching

A Quiz SHALL match when its title or description contains the query, ignoring case. `%` and `_` in the query SHALL match only themselves.

#### Scenario: Part of the title, different case

- **WHEN** the query is "БОГ"
- **THEN** "Іван Богун" matches

#### Scenario: Wildcard characters are literal

- **WHEN** the query is `_` and no title or description contains an underscore
- **THEN** there are no results

### Requirement: All Quiz Languages

Search SHALL cover every Quiz whatever its Quiz Language and whatever the Interface Language.

#### Scenario: English Quiz from Ukrainian interface

- **WHEN** the Interface Language is Ukrainian and the query is "bowline"
- **THEN** the English Quiz whose description mentions bowline matches

### Requirement: Blank and empty searches

A blank query SHALL NOT be sent to the API; the Search screen SHALL ask the scout to type something. A search with no matches SHALL say nothing was found.

#### Scenario: Blank query

- **WHEN** the scout opens `/search?q=` or submits only spaces
- **THEN** the screen asks for a title or description and sends no request

#### Scenario: No matches

- **WHEN** no Quiz matches the query
- **THEN** the screen says nothing was found
