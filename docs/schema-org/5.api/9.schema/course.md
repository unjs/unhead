---
title: Course Schema
description: Use defineCourse() to add Course structured data. Enable rich results for educational courses with provider, description, and course details.
---

## Schema.org Course

- **Type**: `defineCourse(input?: Course)`{lang="ts"}

  Describes a Course.

## Useful Links

- [Schema.org Course](https://schema.org/Course)
- [Course Schema Markup - Google Search Central](https://developers.google.com/search/docs/advanced/structured-data/course)

::alert{type="warning"}
🔨 Documentation in progress
::

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

::alert{type="warning"}
🔨 Schema in development
::

## Related Schemas

- [Organization](/docs/schema-org/api/schema/organization) - Course provider
- [Person](/docs/schema-org/api/schema/person) - Instructor
- [Event](/docs/schema-org/api/schema/event) - Course sessions
