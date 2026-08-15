# Contributing to Open Writer

Thank you for your interest in contributing to Open Writer. This guide covers everything you need to get started.

---

## Development Setup

### Prerequisites

- **Node.js** 18 or later
- **Bun** runtime ([install guide](https://bun.sh/))
- **Git** for version control

### Getting Started

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/open-writer.git
   cd open-writer
   ```

3. **Install dependencies**:
   ```bash
   bun install
   ```

4. **Set up the database**:
   ```bash
   bun run db:push
   ```

5. **Start the development server**:
   ```bash
   bun run dev
   ```

6. **Create a branch** for your work:
   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## Code Style

### TypeScript

- All code must be written in TypeScript with strict type checking
- Avoid `any` types -- use proper type definitions or generics
- Use ES6+ import/export syntax throughout
- Prefer `interface` for object shapes, `type` for unions and utility types

### Component Guidelines

- Use **shadcn/ui** components from `src/components/ui/` as building blocks
- Do not rebuild components that already exist in the UI library
- Follow the `'use client'` / `'use server'` directive convention
- Keep components focused and composable -- one responsibility per component

### Styling

- Use **Tailwind CSS 4** utility classes for all styling
- Follow the project's responsive design conventions (mobile-first)
- Use CSS variables for theming (`bg-primary`, `text-primary-foreground`, etc.)
- Do not use indigo or blue as primary colors

### Linting

Run the linter before submitting your work:

```bash
bun run lint
```

Fix all lint errors and warnings before opening a pull request.

---

## Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Each commit message should use this format:

```
type(scope): description
```

### Types

| Type       | Description                                      |
| ---------- | ------------------------------------------------ |
| `feat`     | A new feature                                    |
| `fix`      | A bug fix                                        |
| `docs`     | Documentation changes only                       |
| `style`    | Code style changes (formatting, semicolons, etc.) |
| `refactor` | Code refactoring without behavior changes        |
| `perf`     | Performance improvements                         |
| `test`     | Adding or updating tests                         |
| `chore`    | Build process, tooling, or dependency changes    |

### Examples

```
feat(editor): add typewriter scrolling mode
fix(chapters): resolve chapter reordering drag issue
docs(readme): update installation instructions
chore(deps): upgrade TipTap to latest version
```

### Scope

Use a scope that describes the area of the codebase affected. Common scopes:

- `editor` -- Rich text editor and toolbar
- `chapters` -- Chapter tree and navigation
- `characters` -- Character panel and management
- `locations` -- Location panel and management
- `objects` -- Object panel and management
- `timeline` -- Timeline feature
- `relationships` -- Relationship mapping
- `ai` -- AI assistant integration
- `export` -- Export functionality
- `import` -- Import functionality
- `ui` -- General UI components
- `store` -- Zustand stores
- `api` -- API routes
- `db` -- Database schema and migrations

---

## Pull Request Process

### Before Opening a PR

1. **Update your branch** with the latest from `main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run the linter** and fix all issues:
   ```bash
   bun run lint
   ```

3. **Test your changes** thoroughly in the development environment

4. **Write clear commit messages** following the commit convention

### Opening a PR

1. Push your branch to your fork
2. Open a pull request against the `main` branch of the upstream repository
3. Fill out the PR template completely
4. Link any related issues (e.g., "Closes #123")

### PR Review

- All PRs require at least one review before merging
- Address all review feedback before requesting re-review
- Keep PRs focused -- one feature or fix per PR
- If a PR grows too large, consider splitting it into smaller PRs

### After Merge

- Your branch will be squashed and merged into `main`
- Delete your feature branch after merge

---

## Testing Expectations

### Current Approach

Open Writer is in early development. The current testing expectations are:

- **Manual testing** -- Thoroughly test your changes in the browser before submitting
- **Lint passing** -- All code must pass `bun run lint` without errors
- **Type safety** -- No TypeScript compilation errors
- **No regressions** -- Existing features must continue to work as expected

### Future Plans

As the project matures, we will introduce:

- Unit tests for utility functions and stores
- Integration tests for API routes
- Component tests for UI components
- End-to-end tests for critical user flows

---

## Reporting Issues

- **Bug reports** -- Use the bug report issue template
- **Feature requests** -- Use the feature request issue template
- **Questions** -- Open a discussion on GitHub Discussions

When reporting bugs, please include:

1. Steps to reproduce the issue
2. Expected behavior
3. Actual behavior
4. Your browser and operating system
5. Any relevant console errors or screenshots

---

## Code of Conduct

Be respectful and constructive in all interactions. We are all working toward the same goal: making Open Writer the best writing studio it can be.

---

Thank you for contributing to Open Writer. Your work helps writers everywhere.
