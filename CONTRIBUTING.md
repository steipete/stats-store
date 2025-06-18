# Contributing to stats.store

Thanks for your interest in contributing! 🎉

## How Can I Help?

### 🐛 Found a Bug?

1. Check if it's already reported in [Issues](https://github.com/steipete/stats-store/issues)
2. If not, [create a new issue](https://github.com/steipete/stats-store/issues/new) with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if relevant

### 💡 Have an Idea?

1. Check [existing issues](https://github.com/steipete/stats-store/issues) for similar ideas
2. Open a new issue to discuss before coding
3. We'll figure out the best approach together!

### 🔧 Want to Fix Something?

Awesome! Here's how:

1. **Fork & Clone**
   \`\`\`bash

   # Fork on GitHub first, then:

   git clone https://github.com/YOUR_USERNAME/stats-store.git
   cd stats-store
   pnpm install
   \`\`\`

2. **Create a Branch**
   \`\`\`bash
   git checkout -b fix/awesome-bug-fix

   # or

   git checkout -b feature/cool-new-thing
   \`\`\`

3. **Make Your Changes**

   - Write clean, readable code
   - Follow the existing style (Prettier will help!)
   - Add tests if needed

4. **Test Everything**
   \`\`\`bash
   pnpm test # Run tests
   pnpm lint # Check linting
   pnpm typecheck # TypeScript checks
   pnpm build # Make sure it builds
   \`\`\`

5. **Commit Your Changes**
   \`\`\`bash
   git add .
   git commit -m "fix: solve the awesome bug"

   # or

   git commit -m "feat: add cool new thing"
   \`\`\`

   We use [conventional commits](https://www.conventionalcommits.org/):

   - `fix:` for bug fixes
   - `feat:` for new features
   - `docs:` for documentation
   - `test:` for test additions
   - `refactor:` for code refactoring

6. **Push and Create PR**
   \`\`\`bash
   git push origin your-branch-name
   \`\`\`
   Then open a Pull Request on GitHub!

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Supabase account (for database)

### Environment Setup

1. Copy `.env.example` to `.env.local`
2. Add your Supabase credentials
3. Run migrations in Supabase SQL editor

### Useful Commands

\`\`\`bash
pnpm dev # Start dev server
pnpm test # Run tests
pnpm test:watch # Run tests in watch mode
pnpm lint # Run linter
pnpm format # Format code
pnpm build # Build for production
\`\`\`

## Code Style

- We use Prettier for formatting (it runs automatically!)
- TypeScript for type safety
- Functional components with hooks
- Clear variable names > clever code

## Testing

- Write tests for new features
- Update tests when changing behavior
- Run `pnpm test` before submitting PR
- Tests live next to the code they test

## Questions?

- Open an issue for discussion
- Tweet [@steipete](https://twitter.com/steipete)
- Email [peter@steipete.me](mailto:peter@steipete.me)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thanks for helping make stats.store better! 🚀
