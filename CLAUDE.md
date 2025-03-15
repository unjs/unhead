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

## Documentation Standards

### Platform
- **Nuxt Content v3**: Documentation is built with Nuxt Content v3
- **MDC Format**: Content is authored in MDC (Markdown Components) format
- **Nuxt Components**: Leverage built-in and custom components. Use `::caution`, `::tip`, `::warning` and `::note` where appropriate

### MDC Syntax Guidelines
- **Component Usage**: Use `::component{}` syntax for components
- **Nested Components**: Structure complex components with proper nesting
- **Props**: Pass props to components using curly braces `{prop: value}`
- **Slots**: Use the slot syntax for component content
- **Code Blocks**: Use language-specific code blocks with syntax highlighting
- **Component Libraries**: Leverage built-in UI components from Nuxt Content

### Code blocks
- **Language Tags**: All used hooks `useHead`, `useSeoMeta` should be imported from `@unhead/dynamic-import`

### Structure
- **Consistent Hierarchy**: Organize with clear numbered sections (0.introduction.md, 1.guides/...)
- **Progressive Disclosure**: Basic concepts first, advanced topics later
- **Separation of Concerns**: Keep guides, API references, and examples distinct

### Content Guidelines
- **Conversational Tone**: Write in clear, friendly language without being verbose
- **Practical Examples**: Every feature should have real-world code examples
- **Complete API References**: Document all parameters, return values, and types
- **Starter Recipes**: Provide copy-paste solutions for common use cases
- **Troubleshooting**: Include common issues and their solutions
- **Framework Specifics**: Unless explicitly stated, examples should be framework-agnostic and code examples should import Unhead composables from `@unhead/dynamic-import`
- **Common Use Cases**: Include a "Common Use Cases" section where applicable to demonstrate practical applications
- **Best Practices**: Add guidance on recommended approaches and patterns
- **API Caveats**: Clearly document any limitations, edge cases, or unexpected behaviors

### Page Structure
- **Front Matter**: Include YAML front matter with title, description and navigation.title. These should be optimized for SEO without keyword stuffing, reference specific frameworks if applicable
- **Title**: Not needed, this is generated from the front matter
- **Introduction**: Brief overview of the concept/component with high-level navigation to major sections
- **Core Concepts**: Breakdown of main functionality with clear section headings
- **Usage Examples**: Code examples with explanations
- **Advanced Usage**: More complex scenarios and advanced features when applicable
- **API Reference**: When applicable, with props/events/slots
- **Related Resources**: Links to relevant documentation to create a connected knowledge base

### Formatting
- **Alert Components**: Use specific alert components based on context:
  - `::tip` - For best practices and recommendations
  - `::note` - For additional information or context
  - `::warning` or `::caution` - For potential issues or gotchas
  - `::alert{type="info"}` - For general important notes
- **Tabs**: Use tab components for multi-framework examples
- **Code Groups**: Use code groups for related code examples
- **Diagrams**: Use visual aids for complex concepts
- **Consistency**: Maintain consistent terminology throughout
- **Inline Code**: When rendering inline `code` tags, always postfix with the lang:
  - HTML tags: `<head>`{lang="html"}
  - CSS/properties: `color`{lang="css"}
  - JS/TS variables and code: `tagPriority`{lang="bash"} or `function`{lang="ts"}
- **Section Links**: Use anchor links to create navigation between sections of the document

### Maintenance
- **Version Specificity**: Indicate which version features were introduced
- **Regular Reviews**: Schedule periodic reviews to ensure accuracy
- **Deprecation Notices**: Clearly mark deprecated features
- **Change Log**: Maintain detailed documentation changes

Unhead is a framework-agnostic head management library for managing HTML head tags.
