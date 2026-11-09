# interface-language Specification

## Purpose

The app's own labels and messages come in Ukrainian and English, chosen by the scout and independent of the Quiz Language. Quiz content is never translated by the app.

## Requirements

### Requirement: Ukrainian by default

The app SHALL open in Ukrainian whatever the browser's language, unless the scout has picked an Interface Language on this device before.

#### Scenario: First visit with an English browser

- **WHEN** a scout whose browser prefers English opens the app for the first time
- **THEN** the interface is in Ukrainian

### Requirement: Choosing the Interface Language

A switcher in the header SHALL offer Ukrainian and English and show which is active. Choosing one SHALL switch every label at once, set the document language, and be remembered on that device.

#### Scenario: Switch to English and come back

- **WHEN** the scout picks English and later reopens the app on the same device
- **THEN** the interface is in English

### Requirement: Every interface string is translated

Every label and message SHALL come from the Interface Language translations, with both languages defining the same keys. Ukrainian copy SHALL use the Ukrainian terms in the glossary.

#### Scenario: Score label in Ukrainian

- **WHEN** the Interface Language is Ukrainian and the Review is shown
- **THEN** the Review is titled «Розбір» and the Score is labelled «Правильних відповідей»

### Requirement: Independent of Quiz Language

Changing the Interface Language SHALL NOT change or translate Quiz content, and Quizzes in every Quiz Language SHALL stay available.

#### Scenario: English interface, Ukrainian Quiz

- **WHEN** the Interface Language is English and the scout opens "Іван Богун"
- **THEN** the Questions are in Ukrainian and the labels in English
