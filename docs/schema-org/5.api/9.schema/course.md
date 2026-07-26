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

For [Google's course list feature](https://developers.google.com/search/docs/appearance/structured-data/course), mark up at least three courses and add the required ItemList carousel properties. Each Course needs `name` and `description`, together with valid provider information.

## Defaults and resolves

- `@type` defaults to `Course`.
- A root Course receives an ID such as `${canonicalUrl}#/schema/course/{n}`.
- `provider` is resolved as a root Organization. When it is omitted, Unhead references the primary identity if one exists.

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
  description?: string
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
- [Person](/docs/schema-org/api/schema/person): Instructor
- [Event](/docs/schema-org/api/schema/event): Course sessions
