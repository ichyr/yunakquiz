# Yunakquiz

A platform where scouts (from any scouting organisation) take quizzes and learn from every answer through explanations of why the correct answer is correct.

## Language

Each term lists the word to use in Ukrainian copy too.

**Quiz**:
A fixed set of Questions on a subject, written in one Quiz Language, taken as one unit.
_Ukrainian_: вікторина
_Avoid_: Test, exam, проба, тест

**Category**:
A named group of Quizzes on a common theme. A Quiz may belong to many Categories; Categories don't nest.
_Ukrainian_: категорія
_Avoid_: Folder, section, topic

**Quiz Language**:
The language a Quiz's content is written in. Independent of the Interface Language.
_Ukrainian_: мова вікторини
_Avoid_: Locale

**Interface Language**:
The language of the application's own labels and messages, chosen by the scout.
_Ukrainian_: мова інтерфейсу
_Avoid_: UI locale, app language

**Question**:
A single prompt within a Quiz that the scout answers by choosing exactly one Option.
_Ukrainian_: питання
_Avoid_: Item, task, завдання

**Option**:
One of the possible answers offered for a Question.
_Ukrainian_: варіант відповіді
_Avoid_: Choice, answer, variant

**Correct Option**:
The Option that is the right answer to a Question.
_Ukrainian_: правильна відповідь
_Avoid_: Right answer, key, ключ

**Explanation**:
The text attached to a Question that explains why the Correct Option is correct. It is the core of the learning experience.
_Ukrainian_: пояснення
_Avoid_: Hint, comment, rationale, підказка, коментар

**Attempt**:
One run by a scout through all Questions of a Quiz, with Questions and Options in a freshly shuffled order. A scout may make unlimited Attempts.
_Ukrainian_: спроба
_Avoid_: Try, session, run, сесія

**Score**:
The number of Questions answered correctly in an Attempt out of the total, e.g. 7 / 10. There is no pass or fail.
_Ukrainian_: кількість правильних відповідей, e.g. «Правильних відповідей: 7 / 10»
_Avoid_: Grade, mark, result, оцінка, бал

**Review**:
What a scout sees after finishing an Attempt: the Score, and for every Question their chosen Option, the Correct Option and the Explanation.
_Ukrainian_: розбір
_Avoid_: Summary, report, feedback, підсумок, звіт

**Account**:
A registered identity with an email, a unique display name and a password. Needed to author Quizzes; taking Quizzes needs none. Has a role, `user` or `admin`.
_Ukrainian_: обліковий запис
_Avoid_: User, profile, login, користувач, профіль

**Guest**:
A person without an Account, or not logged in. Can browse, search and take Quizzes, and sees only published ones.
_Ukrainian_: гість
_Avoid_: Anonymous, visitor, User

**Author**:
The holder of a verified Account who wrote a Quiz. Their display name is shown on the Quiz. A Quiz loses its Author when the Account is deleted.
_Ukrainian_: автор
_Avoid_: Creator, owner, editor, User

**Admin**:
An Account with the `admin` role. Manages Accounts and Categories, and can edit or delete any Quiz.
_Ukrainian_: адміністратор
_Avoid_: Superuser, moderator, root
