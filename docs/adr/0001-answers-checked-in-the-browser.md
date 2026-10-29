# Answers are checked in the browser

The API returns full Quizzes, including Correct Options and Explanations. The browser shuffles, scores and builds the Review. This is deliberate, not a security hole: Yunakquiz is for learning, not formal assessment. A scout who peeks at the answers only cheats themselves, and checking on the server would add a round trip and server-side Attempt state for no learning benefit. Revisit this if Quizzes ever count toward ranks, badges or other formal outcomes.
