# Yunakquiz

A platform where scouts (from any scouting organisation) take quizzes and learn from every answer through explanations of why the correct answer is correct.

## Language

**Quiz**:
A fixed set of Questions on a subject, written in one Quiz Language, taken as one unit.
_Avoid_: Test, exam, проба

**Category**:
A named group of Quizzes on a common theme. A Quiz may belong to many Categories; Categories don't nest.
_Avoid_: Folder, section, topic

**Quiz Language**:
The language a Quiz's content is written in. Independent of the Interface Language.
_Avoid_: Locale

**Interface Language**:
The language of the application's own labels and messages, chosen by the scout.
_Avoid_: UI locale, app language

**Question**:
A single prompt within a Quiz that the scout answers by choosing exactly one Option.
_Avoid_: Item, task

**Option**:
One of the possible answers offered for a Question.
_Avoid_: Choice, answer, variant

**Correct Option**:
The Option that is the right answer to a Question.
_Avoid_: Right answer, key

**Explanation**:
The text attached to a Question that explains why the Correct Option is correct. It is the core of the learning experience.
_Avoid_: Hint, comment, rationale

**Attempt**:
One run by a scout through all Questions of a Quiz, with Questions and Options in a freshly shuffled order. A scout may make unlimited Attempts.
_Avoid_: Try, session, run

**Score**:
The number of Questions answered correctly in an Attempt out of the total, e.g. 7 / 10. There is no pass or fail.
_Avoid_: Grade, mark, result

**Review**:
What a scout sees after finishing an Attempt: the Score, and for every Question their chosen Option, the Correct Option and the Explanation.
_Avoid_: Summary, report, feedback
