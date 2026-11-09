# Add the MVP: browse, search, take a Quiz, see the Review

Written after the code on branch `feat/app-scaffold`, to record what it does. Its requirements were merged straight into `openspec/specs/` as the baseline, so this change has no spec deltas.

## Why

Scouts learn facts about their scouting heritage (patrons of their units, Ukrainian history, scout skills) mostly from leaders and printed material. Nothing lets a scout check themselves and, crucially, find out _why_ an answer is right, then try again until it sticks. Existing quiz tools grade and move on; they treat Explanations as an afterthought, assume accounts, or are tied to one organisation.

## What Changes

A web app, an API and a shared core package that together let any scout, with no account:

- find a Quiz by browsing Categories or searching title and description, across every Quiz Language;
- take an Attempt with all Questions on one page, freshly shuffled, answering in any order with no feedback until Finish;
- see a Review with the Score and, for every Question, their chosen Option, the Correct Option and the Explanation;
- retake the Quiz as often as they like;
- use the interface in Ukrainian (default) or English, independent of the Quiz Language.

Quizzes are authored as files in the repository and loaded by a rerunnable seed. The first Quiz is "Іван Богун".

Capabilities introduced: `quiz-content`, `quiz-api`, `catalog-browsing`, `quiz-search`, `quiz-attempt`, `quiz-review`, `interface-language`.

## User Stories

### Finding a Quiz

1. As a scout, I want to see a list of Categories on the Home screen, so that I can browse Quizzes by theme.
2. As a scout, I want only Categories that contain Quizzes to be listed, so that I never open an empty Category from Home.
3. As a scout, I want to open a Category and see its Quizzes, so that I can choose one on that theme.
4. As a scout, I want each listed Quiz to show its title, description and Quiz Language, so that I know what it covers and whether I can read it.
5. As a scout, I want the Quiz Language badge to name the language in my Interface Language, so that I understand it without knowing language codes.
6. As a scout, I want a search box on Home, so that I can find a Quiz without browsing.
7. As a scout, I want the search to match part of a title or description, so that I find "Іван Богун" by typing "Богун".
8. As a scout, I want the search to ignore case, so that I don't have to match capitalisation.
9. As a scout, I want the search to cover Quizzes in every Quiz Language, so that I can find English Quizzes while using the Ukrainian interface.
10. As a scout, I want the search to run when I submit, not while I type, so that results don't jump around.
11. As a scout, I want the Search screen to keep my query in the box, so that I can refine it.
12. As a patrol leader, I want each search to have its own address, so that I can send my patrol a link to the results.
13. As a scout, I want Back and Forward to show the right query in the box, so that browser history behaves as I expect.
14. As a scout, I want to be told when nothing matches, so that I know to try other words.
15. As a scout, I want to be asked to type something when I submit an empty search, so that I'm not shown a confusing empty page.
16. As a scout, I want `%` and `_` in my query to match literally, so that the search does what I typed.

### Taking a Quiz

17. As a patrol leader, I want each Quiz to have its own address, so that I can share a link to it.
18. As a scout, I want all Questions on one page, so that I can see how long the Quiz is and move around freely.
19. As a scout, I want the Questions and Options in a new order on every Attempt, so that I learn the content rather than the positions.
20. As a scout, I want to answer in any order, so that I can do the easy Questions first.
21. As a scout, I want to change an answer at any time before Finish, so that I can fix a mistake.
22. As a scout, I want no feedback until I finish, so that I commit to my own answers first.
23. As a scout, I want to see how many Questions I have answered out of the total, so that I know what's left.
24. As a scout, I want Finish to be available only once every Question has an answer, so that I don't finish by accident with gaps.
25. As a scout, I want a hint explaining why Finish is disabled, so that I'm not confused.
26. As a scout, I want to be asked before leaving a Quiz I've started, so that I don't lose my answers by accident.
27. As a scout, I want to leave freely when I haven't answered anything, so that I'm not nagged for nothing.
28. As a scout, I want the browser to warn me when I close or reload the tab mid-Attempt, so that I don't lose my answers that way either.
29. As a scout, I want my Attempt to survive a flaky connection once the Quiz has loaded, so that a failed refresh doesn't wipe my answers.
30. As a scout on a phone, I want the Quiz to be comfortable on a small screen, with Finish always reachable, so that I can take it anywhere.
31. As a scout using a screen reader, I want each Question to be a labelled group of radio buttons and content marked with its language, so that it is read correctly.

### The Review

32. As a scout, I want to see my Score as correct answers out of the total, so that I know how I did.
33. As a scout, I want no pass or fail, so that the Quiz feels like learning, not an exam.
34. As a scout, I want to be congratulated on a perfect Score, so that I know I've mastered the Quiz.
35. As a scout, I want to be encouraged to read the Explanations and try again when I'm not perfect, so that I keep learning.
36. As a scout, I want to see, for every Question, the Option I chose and the Correct Option, so that I see exactly where I went wrong.
37. As a scout, I want each Question marked correct or incorrect, so that I can scan the Review quickly.
38. As a scout, I want every Explanation shown, including for Questions I got right, so that I learn why, not just what.
39. As a scout, I want Explanations split into readable paragraphs, so that long Explanations are easy to read.
40. As a scout, I want the Review in the same order I saw the Questions, so that it matches my memory of the Attempt.
41. As a scout, I want a Try again button at the top and bottom of the Review, so that I can retake without scrolling.
42. As a scout, I want Try again to give me a fresh shuffle, so that the retake is a real test.
43. As a scout, I want to retake a Quiz as many times as I like, so that I can keep going until I get it all right.

### Interface Language

44. As a Ukrainian scout, I want the app to open in Ukrainian, so that I can use it straight away.
45. As a scout who reads English better, I want to switch the interface to English, so that I understand the labels.
46. As a scout, I want my Interface Language remembered on my device, so that I don't pick it every visit.
47. As a scout, I want Quiz content to stay in its own language whatever the Interface Language, so that I read it as the author wrote it, and can use browser translation if I need to.
48. As a Ukrainian scout, I want Ukrainian labels to use consistent, natural terms (вікторина, питання, розбір, …), so that the app reads well.

### Errors

49. As a scout following an old link, I want a clear "not found" message with a link home, so that I can carry on.
50. As a scout on a bad connection, I want an error message with a retry button, so that I can try again without reloading.
51. As a scout, I want a loading indicator while data loads, so that I know the app is working.

### Content and operations

52. As a Quiz author, I want to write a Quiz as a file in the repository, checked against the content rules, so that mistakes are caught before they reach scouts.
53. As a Quiz author, I want a Quiz to be rejected if a Question has no Correct Option, two Correct Options, fewer than two Options, or any blank text, so that scouts never see a broken Question.
54. As a Quiz author, I want to put a Quiz in several Categories, so that it can be found under each theme.
55. As a maintainer, I want the seed to be safe to rerun and to update existing Quizzes by slug, so that publishing a content fix is one command.
56. As a maintainer, I want a seed run with one invalid Quiz to change nothing, so that the database is never left half-updated.
57. As a maintainer, I want a health endpoint that checks the database, so that a container orchestrator can tell whether the API is ready.
58. As a maintainer, I want server errors logged in full but hidden from clients, so that we can debug without leaking SQL.
59. As a maintainer, I want the API configured by environment variables, so that it runs the same locally, in CI and in a container.
60. As a developer, I want one command to start Postgres locally, and a separate test database, so that API tests never touch my dev data.
61. As a developer, I want CI to lint, format-check, typecheck, check stories, build, run unit and API tests, and run the main-path browser test, so that a broken main branch is unlikely.
62. As a developer, I want every web component to have a Storybook story, enforced in CI, so that the design system stays visible.
63. As a developer, I want commit messages checked against Conventional Commits, so that history stays readable.

## Impact

- New workspaces: `apps/web`, `apps/api`, `packages/core`.
- New infrastructure: Postgres 18 via Docker Compose, with the `pg_trgm` extension; GitHub Actions workflow.
- Docs: ADRs 0004–0006, Ukrainian glossary terms, Search screen added to the MVP spec.
