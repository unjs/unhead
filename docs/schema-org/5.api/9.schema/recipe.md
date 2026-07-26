---
title: Recipe Schema
description: Use defineRecipe() to add Recipe structured data with cooking time, ingredients, nutrition, and step-by-step instructions.
---

## Schema.org Recipe

- **Type**: `defineRecipe<T extends Record<string, any>>(input?: Recipe & T)`{lang="ts"}

  Describes a Recipe, which contains a series of instructions, ingredients, and optional fields.

## Useful Links

- [Schema.org Recipe](https://schema.org/Recipe)
- [Recipe Structured Data](https://developers.google.com/search/docs/appearance/structured-data/recipe)

## Google and Unhead requirements

Google requires `name` and `image` for a Recipe rich result. Unhead can inherit those fields from page metadata. Separately, the `Recipe` TypeScript input requires `recipeIngredient` and `recipeInstructions`; Google recommends those two properties but does not require them for basic eligibility. Unhead performs no runtime validation of either set of rules.

- **name** `string`

  A string describing the recipe.

  Route metadata on the `title` key can provide this value; see [Defaults](#defaults).

- **image** `string|ImageObject`

  An image representing the completed recipe, referenced by ID.

  Route metadata on the `image` key can provide a single image URL; see [Defaults](#defaults).

- **recipeIngredient** `string[]`

  An array of strings representing each ingredient and quantity (e.g., "3 apples").

- **recipeInstructions** `NodeRelations<HowToStep | string>`

  An array of instructions for how to prepare the recipe.

## Defaults

- **@type**: `Recipe`
- **@id**: `${canonicalUrl}#recipe`
- **name**: page title from resolved metadata
- **image**: resolved page image
- **description**: resolved page description
- **datePublished**: resolved page publication date
- **author**: (conditional) set to the current page article's author if one exists
- **mainEntityOfPage**: Article reference when an Article exists; otherwise, WebPage reference

## Resolves

See [Global Resolves](/docs/schema-org/guides/get-started/overview#how-does-schemaorg-get-page-data) for full context.

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
   * The total time required to prepare and cook the recipe in ISO 8601 format.
   */
  totalTime?: string
  /**
   * The cooking method used to prepare the recipe.
   */
  cookingMethod?: string
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
  recipeCategory?: 'Appetizer' | 'Breakfast' | 'Brunch' | 'Dessert' | 'Dinner' | 'Drink' | 'Lunch' | 'Main course' | 'Sauce' | 'Side dish' | 'Snack' | 'Starter' | (string & Record<never, never>)
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
  'calories': string
}
```

## Related Schemas

- [HowTo](/docs/schema-org/api/schema/how-to): Step-by-step instructions
- [Person](/docs/schema-org/api/schema/person): Recipe author
- [Organization](/docs/schema-org/api/schema/organization): Recipe publisher
