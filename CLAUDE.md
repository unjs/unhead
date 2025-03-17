# Unhead Development Guide

## Build Commands
- `pnpm build` - Build all packages
- `pnpm stub` - Create package stubs
- `pnpm test` - Run all tests
- `pnpm test <pattern>` - Run tests matching pattern
- `pnpm vitest -t "test name"` - Run a specific test
- `pnpm lint` - Lint and fix code
- `pnpm benchmark` - Run benchmarks
- `pnpm lint:docs` - Lint documentation

## Code Style
- **Imports**: Use named imports/exports, keep sorted
- **Types**: Strict TypeScript, explicit return types
- **Naming**:
  - camelCase for variables/functions
  - PascalCase for classes/interfaces
  - use- prefix for composables
- **Styling**: Using @antfu/eslint-config rules
- **Structure**: Maintain small files with focused responsibilities
- **Error Handling**: Use typed errors, handle edge cases
- **Testing**: Write unit tests for all exports
- **Documentation**: Document public API with JSDoc

Unhead is a framework-agnostic head management library for managing HTML head tags.
