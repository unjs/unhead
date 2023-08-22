## Schema.org Recipe

- **Type**: `defineRecipe(input?: Recipe)`{lang="ts"}

  Describes a Recipe, which contains a series of instructions, ingredients, and optional fields.

- **Component**: `SchemaOrgRecipe` _(see [how components work](/guide/guides/components))_

## Useful Links

- [Schema.org Recipe](https://schema.org/Recipe)
- [Recipe Structed Data](https://developers.google.com/search/docs/advanced/structured-data/recipe)


## Required properties

- **name** `string`

  A string describing the recipe.

  A name can be provided using route meta on the `title` key, see [defaults](#defaults).


- **image** `string|ImageObject`

  An image representing the completed recipe, referenced by ID.

  A single image URL can be provided using route meta on the `image` key, see [defaults](#defaults).

- **recipeIngredient** `string[]`

  An array of strings representing each ingredient and quantity (e.g., "3 apples").

- **recipeInstructions** `Arrayable<HowToStepInput>`

  An array of instructions for how to prepare the recipe.

## Defaults

- **@type**: `Recipe`
- **@id**: `${canonicalUrl}#recipe`
- **name**: `currentRouteMeta.title` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **image**: `currentRouteMeta.image` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **description**: `currentRouteMeta.description` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **inLanguage**: `options.defaultLanguage` _(see: [user Config](/guide/guides/user-config))_
- **datePublished**: `currentRouteMeta.datePublished` _(see: [route meta resolving](/guide/getting-started/how-it-works#route-meta-resolving))_
- **author**: (conditional) set to the current page article's author if one exists
- **mainEntityOfPage**: WebPage Reference


## Resolves

See [Global Resolves](/guide/getting-started/how-it-works#global-resolves) for full context.

- `datePublished` can be resolved from Date objects


### Minimal

```ts
defineRecipe({
  name: 'Peanut Butter Cookies',
  image: 'https://example.com/photos/1x1/photo.jpg',
  recipeInstructions: [
    {
      text: 'Bake at 200*C for 40 minutes, or until golden-brown, stirring periodically throughout',
    },
    {
      text: 'Eat them up',
    },
  ],
  recipeIngredient: ['Peanut Butter', 'Cookie Dough'],
})
```

## Types

```ts
export interface RecipeSimple extends Thing {
  /**
   * A string describing the recipe.
   */
  name?: string
  /**
   * An image representing the completed recipe, referenced by ID.
   */
  image?: NodeRelation<ImageObject | string>
  /**
   * An array of strings representing each ingredient and quantity (e.g., "3 apples").
   */
  recipeIngredient: string[]
  /**
   * An array of HowToStep objects.
   */
  recipeInstructions: NodeRelations<HowToStep | string>
  /**
   * A string describing the recipe.
   */
  description?: string
  /**
   * The cooking time in ISO 8601 format.
   */
  cookTime?: string
  /**
   * The time required to prepare the recipe.
   */
  prepTime?: string
  /**
   * A NutritionInformation node, with a calories property which defines a calorie count as a string (e.g., "270 calories").
   */
  nutrition?: NutritionInformation
  /**
   * The number of servings the recipe creates (not the number of individual items, if these are different), as a string
   * (e.g., "6", rather than 6).
   */
  recipeYield?: string
  /**
   * An array of strings representing the tools required in the recipe.
   */
  tools?: string[]
  /**
   * An array of keywords describing the recipe.
   */
  keywords?: string[]
  /**
   * A string describing the cuisine type (e.g., "American" or "Spanish").
   */
  recipeCuisine?: string
  /**
   * The category of the recipe.
   */
  recipeCategory?: 'Appetizer' | 'Breakfast' | 'Brunch' | 'Dessert' | 'Dinner' | 'Drink' | 'Lunch' | 'Main course' | 'Sauce' | 'Side dish' | 'Snack' | 'Starter'
  /**
   * A RestrictedDiet node, with a value (or array of values
   */
  suitableForDiet?: Partial<'DiabeticDiet' | 'GlutenFreeDiet' | 'HalalDiet' | 'HinduDiet' | 'KosherDiet' | 'LowCalorieDiet' | 'LowFatDiet' | 'LowLactoseDiet' | 'LowSaltDiet' | 'VeganDiet' | 'VegetarianDiet'>[]
  /**
   *  A reference to a video representing the recipe instructions, by ID.
   */
  video?: NodeRelations<VideoObject | IdReference>
  /**
   * The language code for the guide; e.g., en-GB.
   */
  inLanguage?: string
  /**
   * A reference-by-ID to the author of the article.
   */
  author?: NodeRelation<Person>
  /**
   * The date when the recipe was added, in ISO 8601 format.
   */
  datePublished?: ResolvableDate
}

export interface NutritionInformation extends Thing {
  '@type': 'NutritionInformation'
  /**
   * A calorie count as a string (e.g., "270 calories").
   */
  calories: string
}
```
