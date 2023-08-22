## Schema.org Course

- **Type**: `defineCourse(input?: Course)`{lang="ts"}

  Describes a Course.

- **Component**: `SchemaOrgCourse` _(see [how components work](/guide/guides/components))_

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
 * Any offered product or service.
 * For example: a pair of shoes; a concert ticket; the rental of a car;
 * a haircut; or an episode of a TV show streamed online.
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
   *  A reference to an Organization piece, representing brand associated with the Product.
   */
  provider?: NodeRelation<Organization>
}
```

::alert{type="warning"}
🔨 Schema in development
::
