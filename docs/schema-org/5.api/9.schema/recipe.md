---
title: "Recipe Schema Markup: JSON-LD Example and API"
description: Add recipe schema markup with defineRecipe(). See Recipe JSON-LD with ingredients and steps, plus the name and image that Google requires.
navigation:
  title: Recipe
---

[Recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe) describes the ingredients, steps, and cooking times of a recipe. Google can show eligible recipes as rich results.

## JSON-LD Example

Unhead renders this JSON-LD for the [minimal example](#minimal). It converts each instruction to a `HowToStep` and moves the image to its own `ImageObject` node.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": "https://example.com/blog/my-article#recipe",
      "@type": "Recipe",
      "name": "Peanut Butter Cookies",
      "image": {
        "@id": "https://example.com/#/schema/image/1"
      },
      "recipeIngredient": [
        "Peanut Butter",
        "Cookie Dough"
      ],
      "recipeInstructions": [
        {
          "@type": "HowToStep",
          "text": "Bake at 200*C for 40 minutes, or until golden-brown, stirring periodically throughout"
        },
        {
          "@type": "HowToStep",
          "text": "Eat them up"
        }
      ]
    },
    {
      "@id": "https://example.com/#/schema/image/1",
      "@type": "ImageObject",
      "contentUrl": "https://example.com/photos/1x1/photo.jpg",
      "inLanguage": "en-AU",
      "url": "https://example.com/photos/1x1/photo.jpg"
    }
  ]
}
```

## Schema.org Recipe

- **Type**: `defineRecipe<T extends Record<string, any>>(input?: Recipe & T)`{lang="ts"}

  Describes a Recipe, which contains a series of instructions, ingredients, and optional fields.

## Useful Links

- [Schema.org Recipe](https://schema.org/Recipe)
- [Recipe Structured Data](https://developers.google.com/search/docs/appearance/structured-data/recipe)

## Google and Unhead requirements

Google requires `name` and `image` for a Recipe rich result. Unhead can inherit those fields from page metadata. Google recommends `recipeIngredient` and `recipeInstructions`, so the input type leaves both optional. Unhead performs no runtime eligibility validation.

- **name** `string`

  A string describing the recipe.

  Route metadata on the `title` key can provide this value; see [Defaults](#defaults).

- **image** `NodeRelations<string | ImageObject>`

  An image representing the completed recipe, referenced by ID.

  Route metadata on the `image` key can provide a single image URL; see [Defaults](#defaults).

- **recipeIngredient** `string[]`

  Recommended. An array of strings representing each ingredient and quantity, for example `"3 apples"`.

- **recipeInstructions** `NodeRelations<HowToSection | HowToStep | string>`

  Recommended. Instructions for how to prepare the recipe, optionally grouped into sections.

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

- `aggregateRating`, `author`, `recipeInstructions`, and `video` resolve as typed nested nodes

- `datePublished` accepts Date objects

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
  image?: NodeRelations<ImageObject | string>
  /**
   * An array of strings representing each ingredient and quantity (e.g., "3 apples").
   */
  recipeIngredient?: string[]
  /**
   * Instructions as a HowToStep, HowToSection, string, or an array of those values.
   */
  recipeInstructions?: NodeRelations<HowToSection | HowToStep | string>
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
  recipeYield?: Arrayable<number | string>
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
  author?: NodeRelation<Identity>
  /**
   * The date when the recipe was added, in ISO 8601 format.
   */
  datePublished?: ResolvableDate
  /**
   * The average rating of the recipe.
   */
  aggregateRating?: NodeRelation<AggregateRating>
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
