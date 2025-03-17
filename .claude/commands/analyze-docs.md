# Documentation Analysis and Improvement

This prompt helps analyze and improve Unhead documentation to create clean, approachable, and comprehensive documentation similar to anthropic.com, Vue.js, and Laravel.

## Documentation Analysis

When analyzing existing Unhead documentation, evaluate and provide recommendations for:

1. **Structure clarity**: Assess logical flow and hierarchy of information
2. **Completeness**: Identify missing concepts, edge cases, or examples
3. **Code examples**: Evaluate quality, relevance, and clarity
4. **Framework-specific guidance**: Check appropriate distinction between core and framework-specific features

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

### Code Blocks
- **Language Tags**: All used hooks `useHead`, `useSeoMeta` should be imported from `@unhead/dynamic-import`
- **Import statements**: Include complete import statements
- **Framework-agnostic**: Unless explicitly in framework-specific section
- **Progressive complexity**: Simple examples first, then complex ones
- **Complete and minimal**: Include all necessary code, but no more
- **TypeScript**: Prefer TypeScript in examples when appropriate

### Structure
- **Consistent Hierarchy**: Organize with clear numbered sections (0.introduction.md, 1.guides/...)
- **Progressive Disclosure**: Basic concepts first, advanced topics later
- **Separation of Concerns**: Keep guides, API references, and examples distinct

### Content Guidelines
- **Clear and concise**: Use direct, simple language with minimal jargon
- **Conversational but professional**: Write as if explaining to a colleague
- **Active voice**: Prefer "Configure the plugin by..." over "The plugin can be configured by..."
- **Practical Examples**: Every feature should have real-world code examples
- **Complete API References**: Document all parameters, return values, and types
- **Starter Recipes**: Provide copy-paste solutions for common use cases
- **Troubleshooting**: Include common issues and their solutions
- **Framework Specifics**: Unless explicitly stated, examples should be framework-agnostic and code examples should import Unhead composables from `@unhead/dynamic-import`
- **Common Use Cases**: Include a "Common Use Cases" section where applicable to demonstrate practical applications
- **Best Practices**: Add guidance on recommended approaches and patterns
- **API Caveats**: Clearly document any limitations, edge cases, or unexpected behaviors
- **Internal Linking**: Add links to related sections within the documentation for easy navigation. We can find all links in the `src/content/docs/` folder as paths will map to the URL structure (without number prefixes)
- **Deprecation Functions**: Any of the `useServer*` composables are deprecated, we should recommend using `useHead` instead with `import.meta.server` instead and link to docs/1.guides/7.client-only-tags.md

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

## Section Templates

### Marketing Section

Some sections are more marketing-oriented, such as the introduction and overview. These should be written in a more engaging and less technical tone.
They should use specific components to enhance the user experience.

```md
::UPageCard{title="Tailwind CSS" description="Nuxt UI v3 integrates with latest Tailwind CSS v4, bringing significant improvements." icon="i-simple-icons-tailwindcss" orientation="horizontal" spotlight spotlight-color="primary"}
  :img{src="/tailwindcss-v4.svg" alt="Tailwind CSS" class="w-full"}
::
```

### API Reference Section

```md
## API Reference

### Parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `param1` | `string` | `'default'` | Description of parameter |

### Returns

Description of return value and type

### Examples

```ts
// Simple example
```

### Component Section

```md
## ComponentName

Description of the component and when to use it.

### Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `prop1` | `string` | `'default'` | Description of prop |

### Example

```vue
<template>
  <ComponentName prop1="value" />
</template>
```

## Improvement Checklist

- [ ] Ensure all headings and page titles are clear and descriptive
- [ ] Confirm all code examples are complete and working
- [ ] Check that all parameters and options are documented
- [ ] Verify internal links are working correctly
- [ ] Review for consistent terminology
- [ ] Add practical examples for common use cases
- [ ] Include troubleshooting sections for common issues
- [ ] Provide migration paths from previous versions or other libraries

Unhead is a framework-agnostic head management library for managing HTML head tags in both client and server environments.
