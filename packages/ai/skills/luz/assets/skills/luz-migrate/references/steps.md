# The five steps

The same procedure as the page "Migrate a project to LUZ" of the docs (https://luzds.com/docs/get-started/migrate/), in the order the skill follows it.

## Step 1: tokens with the current brand

Make a theme from `themes/_template.css` with the values the project uses today (the `luz-theme` skill does it). Map the project's variables or loose colours to the tokens of LUZ and give the person the table to check. Nothing changes on screen; the old CSS and LUZ now share a vocabulary.

## Step 2: the old CSS in a layer before LUZ

Put the old stylesheet in a layer that comes before `luz`, so LUZ wins where both style an element:

```css
/* site.css, linked before the LUZ stylesheets */
@layer legacy, luz;
@import url("legacy.css") layer(legacy);
```

- An `!important` in an earlier layer still beats LUZ: list them and let the person decide which go now.
- CSS with no layer (a `style` attribute, the CSS of a plugin) beats every layer. The screenshots show it.
- `@import` is for the migration only: it adds a request.

## Step 3: the first region

Load `luz.conditional.css` instead of `luz.css`, pick a small page with no JavaScript, and put `data-luz` on the element that holds it. Inside, HTML with no class comes out styled by LUZ. Do this one by hand with the person: what is learnt goes into the next pages.

## Step 4: page by page

Order: the simple pages first, the pages that share a template together. Migrate the shared parts (header, footer, menu) once, after the simple pages and before the complex ones, so there are not two headers for months. For each page, the same loop:

1. Put the page in the region, remove the classes of the old framework, leave the HTML semantic, and add a LUZ class only where HTML is not enough.
2. Run `npx @luz-ds/check` and the accessibility check the plan named. Show what changed and what is left.
3. The person reads the diff and the screenshots and runs the smoke tests.
4. One commit per page, which the person makes.

## Step 5: remove the old CSS

When no page uses it: remove the legacy layer, load `luz.css` instead of `luz.conditional.css`, drop `data-luz`. Search for the classes and scripts that are left and report them. The person deletes the old framework. Never earlier, and never without their OK for this step.

## Where the bugs come from

- **The old framework's JavaScript.** A modal of the old framework is a `dialog` in LUZ, but the code that opened or validated it is still there.
- **Forms.** Migrate one form first, from the field to the submit.
- **Shared parts.** Once, as step 4 says.
- **JavaScript that looks for old classes.** Search for a class before it goes: a `querySelector` that stops finding its button gives no error.
