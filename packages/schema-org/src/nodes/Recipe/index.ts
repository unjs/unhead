import type {
  Arrayable,
  Identity,
  IdReference,
  NodeRelation,
  NodeRelations,
  ResolvableDate,
  Thing,
} from '../../types'
import type { AggregateRating } from '../AggregateRating'
import type { HowToSection, HowToStep } from '../HowTo'
import type { ImageObject } from '../Image'
import type { VideoObject } from '../Video'
import { defineSchemaOrgResolver, resolveIdentityRelation, resolveRelation } from '../../core'
import {
  asArray,
  idReference,
  resolvableDateToIso,
  setIfEmpty,
} from '../../utils'
import { aggregateRatingResolver } from '../AggregateRating'
import { PrimaryArticleId } from '../Article'
import { howToSectionResolver, howToStepResolver } from '../HowTo'
import { imageResolver } from '../Image'
import { organizationResolver } from '../Organization'
import { personResolver } from '../Person'
import { videoResolver } from '../Video'
import { PrimaryWebPageId } from '../WebPage'

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
   * An array of HowToStep objects.
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

export interface Recipe extends RecipeSimple {}

export interface NutritionInformation extends Thing {
  '@type': 'NutritionInformation'
  /**
   * A calorie count as a string (e.g., "270 calories").
   */
  'calories': string
}

export const RecipeId = '#recipe'

export const recipeResolver = defineSchemaOrgResolver<Recipe>({
  defaults: {
    '@type': 'Recipe',
  },
  inheritMeta: [
    { meta: 'title', key: 'name' },
    'description',
    'image',
    'datePublished',
  ],
  idPrefix: ['url', RecipeId],
  resolve(node, ctx) {
    node.aggregateRating = resolveRelation(node.aggregateRating, ctx, aggregateRatingResolver)
    node.author = resolveIdentityRelation(node.author, ctx, {
      organization: organizationResolver,
      person: personResolver,
    }, {
      root: true,
    }) as NodeRelation<Identity>
    node.datePublished = resolvableDateToIso(node.datePublished)
    node.image = resolveRelation(node.image, ctx, imageResolver, {
      root: true,
    })
    if (node.recipeInstructions) {
      const resolveInstruction = (instruction: NodeRelation<HowToSection | HowToStep | string>) => {
        const instructionTypes = typeof instruction === 'object' && instruction !== null
          ? asArray(instruction['@type'])
          : []
        const isExplicitStep = instructionTypes.includes('HowToStep')
        const isSection = !isExplicitStep
          && typeof instruction === 'object'
          && instruction !== null
          && (instructionTypes.includes('HowToSection') || ('itemListElement' in instruction && !('text' in instruction)))
        return isSection
          ? resolveRelation(instruction as HowToSection, ctx, howToSectionResolver)
          : resolveRelation(instruction as NodeRelation<HowToStep | string>, ctx, howToStepResolver)
      }
      node.recipeInstructions = Array.isArray(node.recipeInstructions)
        ? node.recipeInstructions.map(resolveInstruction)
        : resolveInstruction(node.recipeInstructions)
    }
    node.video = resolveRelation(node.video, ctx, videoResolver)
    return node
  },
  resolveRootNode(node, { find }) {
    const article = find(PrimaryArticleId)
    const webPage = find(PrimaryWebPageId)
    if (article)
      setIfEmpty(node, 'mainEntityOfPage', idReference(article))
    else if (webPage)
      setIfEmpty(node, 'mainEntityOfPage', idReference(webPage))
    if (article?.author)
      setIfEmpty(node, 'author', article.author)
    return node
  },
})
