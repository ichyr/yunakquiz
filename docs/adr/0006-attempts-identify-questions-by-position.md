# Attempts identify Questions and Options by position

During an Attempt, a Question is identified by its position in the Quiz and an Option by its position in its Question; seed files have no authored ids, and content issues refer to Questions by number ("Question 9"). This is safe only because Attempts are never stored: an Attempt holds its own copy of the Quiz, so reseeding mid-Attempt changes nothing for the scout. Stable Question ids arrive together with the move to Question rows in ADR 0005, since the same features (a Question Bank, per-Question statistics) need both.
