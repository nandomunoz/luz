# What it costs, and when not to

A migration has three costs, and one case where it does not pay.

- **Two visual languages for a while.** The tokens step softens it: the old CSS and LUZ share a vocabulary.
- **The weight of both stylesheets** while the migration lasts.
- **The JavaScript of the old framework,** which the person must rewrite.

When not to: in a single-page app built on a component library for React or Vue, a migration changes the look but not the components. It is more honest to rewrite screen by screen with LUZ.

Who does what: the AI makes the inventory, maps variables to tokens, lists the `!important` rules, writes the smoke tests, removes classes, runs the checks and searches for what is left. The person corrects the inventory, chooses the order, does the first region, reviews every diff, replaces the JavaScript that holds business logic and deletes the old framework.
