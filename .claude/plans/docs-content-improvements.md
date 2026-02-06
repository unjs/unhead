# Documentation Content Improvements Plan

## DONE

## Goal
Comprehensive content improvements for all docs beyond just frontmatter - better structure, more examples, Quick Answers, and improved readability.

---

## Checklist Per Page

For each doc page, check and fix:

- [ ] **Quick Answer** - Add if missing, ensure it's actionable (1-2 sentences max)
- [ ] **Heading structure** - H2 for main sections, H3 for subsections, use question format for SEO
- [ ] **Code examples** - Ensure they're copy-pasteable, have proper syntax highlighting, show real use cases
- [ ] **Links** - Add relevant "See Also" or "Next Steps" sections linking to related docs
- [ ] **Content gaps** - Fill in missing explanations, add common gotchas/pitfalls
- [ ] **Readability** - Short paragraphs, bullet points for lists, remove fluff

---

## Section 1: Head API Composables (Priority: High) ✅ DONE

Files:
- `docs/head/7.api/composables/0.use-head.md`
- `docs/head/7.api/composables/1.use-head-safe.md`
- `docs/head/7.api/composables/3.use-seo-meta.md`
- `docs/head/7.api/composables/4.use-script.md`
- `docs/head/7.api/composables/6.use-server-head.md`

Improvements completed:
- [x] Add "Common Patterns" section with real-world examples (already had good examples)
- [x] Add "TypeScript" section showing type imports and usage (use-head, use-script)
- [x] Add "Gotchas" or "Common Mistakes" section (use-head, use-seo-meta, use-script)
- [x] Ensure all parameters are documented with examples (already good)
- [x] Add comparison between composables (when to use which) (use-head)

---

## Section 2: Head Core Concepts (Priority: High) ✅ DONE

Files:
- `docs/head/1.guides/1.core-concepts/1.titles.md`
- `docs/head/1.guides/1.core-concepts/2.positions.md`
- `docs/head/1.guides/1.core-concepts/3.class-attr.md`
- `docs/head/1.guides/1.core-concepts/4.inner-content.md`
- `docs/head/1.guides/1.core-concepts/6.handling-duplicates.md`
- `docs/head/1.guides/1.core-concepts/8.dom-event-handling.md`
- `docs/head/1.guides/1.core-concepts/9.loading-scripts.md`

All already had:
- [x] Quick Answer sections
- [x] Practical examples with "When would I use this?" patterns
- [x] Framework-agnostic code examples (with @unhead/dynamic-import)
- [x] Key Takeaways and See Also sections

---

## Section 3: Schema.org Guides (Priority: High) ✅ DONE

Files:
- `docs/schema-org/2.guides/0.get-started/0.overview.md`
- `docs/schema-org/2.guides/1.core-concepts/2.nodes.md`
- `docs/schema-org/2.guides/1.core-concepts/2.deduping-nodes.md`
- `docs/schema-org/2.guides/1.core-concepts/3.params.md`

Improvements completed:
- [x] Added "How Do Nodes Relate to Each Other?" section with diagram
- [x] Enhanced "Testing Your Schema" section with validation links
- [x] Added table showing Rich Result types for each schema
- [x] All already had Quick Answer sections

---

## Section 4: Schema.org Recipes (Priority: Medium) ✅ DONE

Files:
- `docs/schema-org/2.guides/4.recipes/blog.md`
- `docs/schema-org/2.guides/4.recipes/faq.md`
- `docs/schema-org/2.guides/4.recipes/e-commerce.md` (already comprehensive)

Improvements completed:
- [x] Added "Expected JSON-LD Output" sections to blog.md and faq.md
- [x] Added "Common Issues" troubleshooting sections
- [x] All already had links to Google's docs
- [x] e-commerce.md was already comprehensive with best practices

---

## Section 5: Schema.org API Schemas (Priority: Medium) ✅ REVIEWED

Files: `docs/schema-org/5.api/9.schema/*.md` (34 files)

Already well-structured with:
- [x] Required Properties sections
- [x] Examples (Minimal and Complete)
- [x] Related Schemas sections
- [x] Links to schema.org official docs
- [x] TypeScript type definitions

---

## Section 6: Framework Installation Guides (Priority: Medium) ✅ REVIEWED

Files: All framework installation guides

Already comprehensive with:
- [x] Clear SSR setup documentation
- [x] Step-by-step instructions with code examples
- [x] Default tags explanation
- [x] Auto-import setup
- [x] Next Steps with links to composables

---

## Section 7-10: Lower Priority Sections

Reviewed and found to be in good shape. Framework reactivity, migration guides, plugins, and advanced guides all have:
- Clear documentation
- Code examples
- Related links

---

## Summary

**Completed improvements in this session:**

1. **use-head.md**: Added TypeScript section, Common Mistakes, Choosing the Right Composable table
2. **use-seo-meta.md**: Added Common Mistakes section with OG tags, image dimensions, duplication
3. **use-script.md**: Added TypeScript generics example, Common Mistakes section
4. **overview.md (Schema.org)**: Added node relationship diagram, enhanced Testing Your Schema section, Rich Results table
5. **blog.md**: Added Expected JSON-LD Output, Common Issues section
6. **faq.md**: Added Expected JSON-LD Output, Common Issues section

**Overall assessment:** Docs were already in good shape. Focused improvements on high-traffic API composable pages with practical gotchas and TypeScript guidance.

---

## Execution Order

1. **Session 1**: Head API Composables (Section 1) - highest traffic pages
2. **Session 2**: Head Core Concepts (Section 2)
3. **Session 3**: Schema.org Guides + Recipes (Sections 3-4)
4. **Session 4**: Schema.org API Schemas (Section 5) - bulk update
5. **Session 5**: Framework guides (Sections 6-7)
6. **Session 6**: Migration, Plugins, Advanced (Sections 8-10)

---

## Notes

- Keep changes focused and incremental
- Test code examples actually work
- Maintain consistent voice/tone across docs
- Don't over-engineer - simple and clear beats comprehensive
