---
title: Course Schema
description: Use defineCourse() to add Course structured data with a provider, description, and course details.
---

## Schema.org Course

- **Type**: `defineCourse<T extends Record<string, any>>(input?: Course & T)`{lang="ts"}

  Describes a Course.

## Useful Links

- [Schema.org Course](https://schema.org/Course)
- [Course List Markup - Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/course)

Google no longer shows the Course info rich result. [Google removed its documentation in September 2025](https://developers.google.com/search/updates#simplification). Course list is the only Google feature that uses Course markup.

The fields below cover Google's Course list feature and the fields used by Unhead's resolver. They do not cover every property on `schema.org/Course`. Other valid properties, such as `coursePrerequisites`, pass through to the generated JSON-LD. Use a [custom node](/docs/schema-org/guides/recipes/custom-nodes) with [`schema-dts`](https://github.com/google/schema-dts) when you need full Schema.org typing.

## Examples

```ts
defineCourse({
  name: 'Introduction to Computer Science and Programming',
  description: 'Introductory CS course laying out the basics.',
  provider: {
    name: 'University of Technology - Eureka',
    sameAs: 'http://www.ut-eureka.edu',
  },
})
```

For [Google's course list feature](https://developers.google.com/search/docs/appearance/structured-data/course), mark up at least three courses and add the required ItemList carousel properties. Each Course requires `name` and `description`. Google's property table lists `provider` as recommended, but its content guidelines say each course must have a valid `name` and `provider`. Set `provider` on every course.

## Defaults and resolves

- `@type` defaults to `Course`.
- A root Course receives an ID such as `${canonicalUrl}#/schema/course/{n}`.
- `provider` is resolved as a root Organization. Unhead does not fill it in, so set it on every course.

## Types

```ts
/**
 * A course or class offered by an educational institution.
 */
export interface CourseSimple extends Thing {
  /**
   * The title of the course.
   */
  name: string
  /**
   * A description of the course. Display limit of 60 characters.
   */
  description: string
  /**
   * The course code or identifier.
   */
  courseCode?: string
  /**
   * The educational level of the course.
   */
  educationalLevel?: string
  /**
   * The duration of the course.
   */
  timeRequired?: string
  /**
   * A reference to an Organization piece, representing the organization offering the course.
   */
  provider?: NodeRelation<Organization>
}
```

## Related Schemas

- [Organization](/docs/schema-org/api/schema/organization): Course provider
- [ItemList](/docs/schema-org/api/schema/item-list): Course list carousel
