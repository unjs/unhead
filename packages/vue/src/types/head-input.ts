import type { defineLink } from 'unhead'
import type { GenericLink, KnownLinkRel, SchemaAugmentations, Stringable } from 'unhead/types'
import type { Ref } from 'vue'
import type { MaybeFalsy, ResolvableProperties, ResolvableValue } from './util'

export type TitleTag = ResolvableProperties<{ textContent: Stringable } & SchemaAugmentations['title']>

export type HeadInput<Schema, WithRefGetters extends boolean = false> = WithRefGetters extends true
  ? MaybeFalsy<Schema> | Ref<MaybeFalsy<Schema> | (() => MaybeFalsy<Schema>)> | (() => MaybeFalsy<Schema> | Ref<MaybeFalsy<Schema>>)
  : ResolvableValue<Schema>

type UnwrapHeadRef<Value> = Value extends Ref<infer Head> ? Head : Value
type ResolveHeadValue<Value> = UnwrapHeadRef<Value extends () => infer Result ? Result : Value>
type ResolveHeadEntry<Value> = ResolveHeadValue<UnwrapHeadRef<Value>>
type UnwrapTagArray<Value> = Value extends readonly (infer Tag)[] ? ResolveHeadValue<Tag> : Value
type TagValue<Value> = UnwrapTagArray<ResolveHeadValue<Value>>
type ObjectKeys<Value> = Value extends object ? keyof Value : never
type KnownObjectKeys<Value> = 0 extends (1 & Value) ? never : ObjectKeys<Value>

// Heterogeneous arrays can infer optional undefined keys for absent attributes.
type SuppliedTagKeys<Tag> = { [Key in keyof Tag]-?: Tag[Key] extends undefined ? never : Key }[keyof Tag]

// An exact match in any compatible variant takes precedence over extra keys in other variants.
type TagVariantResult<Tag, Variant> = Variant extends object
  ? Tag extends Variant
    ? Exclude<SuppliedTagKeys<Tag>, keyof Variant> extends infer ExtraKeys
      ? [ExtraKeys] extends [never] ? true : ExtraKeys
      : never
    : never
  : never
type UnknownVariantKeys<Tag, Variants, NoMatch = never> = [KnownObjectKeys<Tag>] extends [never]
  ? never
  : Tag extends object
    ? TagVariantResult<Tag, Variants> extends infer Match
      ? true extends Match ? never : [Match] extends [never] ? NoMatch : Exclude<Match, true>
      : never
    : never
type UnknownTagAttributes<Tag, Variants>
  = Exclude<KnownObjectKeys<Tag>, ObjectKeys<Variants>> | UnknownVariantKeys<Tag, Variants>

type TagKey<Schema> = Exclude<keyof Schema, 'templateParams'>
type DefinedLinkRelationKey = Exclude<keyof ReturnType<typeof defineLink<{ rel: string }>>['rel'], keyof string>
type DeclaredLink<Rel> = ResolveHeadValue<Rel> extends Record<DefinedLinkRelationKey, infer Input> ? Input : never
type LinkWithRelation<Input, Rel> = Rel extends KnownLinkRel ? Omit<Input, 'rel'> & { rel: Rel } : never
type ResolvableCustomLink = ResolvableProperties<GenericLink & SchemaAugmentations['link']>
type UnknownSharedLinkAttributes<Tag, Variants>
  = UnknownVariantKeys<Tag, Pick<ResolvableCustomLink, keyof ResolvableCustomLink & keyof Extract<Variants, object>>, 'rel'>
type UnknownKnownLinkAttributes<Tag, Rel, Variants> = string extends Rel
  ? UnknownSharedLinkAttributes<Tag, Variants>
  : Exclude<Rel, MaybeFalsy<KnownLinkRel>> extends never
    ? UnknownVariantKeys<LinkWithRelation<Tag, Rel>, Variants, 'rel'>
    : 'rel'

type LinkVariantKeys<Rel, Variants> = Variants extends { rel: infer VariantRel }
  ? ResolveHeadValue<Rel> extends ResolveHeadValue<VariantRel> ? keyof Variants : never
  : never

// Read current values for supplied fields while ignoring the widened schema's implied fields.
type DefinedLinkFields<Tag, Input, Rel, Variants, Fields extends keyof Tag = (Exclude<SuppliedTagKeys<Tag>, LinkVariantKeys<Rel, Variants>> | Exclude<keyof Input, 'rel'>) & keyof Tag>
  = Omit<Input, Fields> & Pick<Tag, Fields>

type UnknownDefinedLinkAttributes<Input, Variants> = Input extends { rel: infer Rel extends string }
  ? string extends Rel
    ? UnknownSharedLinkAttributes<Input, Variants>
    : UnknownVariantKeys<LinkWithRelation<Input, Extract<KnownLinkRel, Rel>>, Variants, 'rel'>
      | (Exclude<Rel, KnownLinkRel> extends never ? never : UnknownVariantKeys<Input, ResolvableCustomLink, 'rel'>)
  : never

type UnknownLinkAttributes<Tag, Variants> = Tag extends { rel: infer Rel }
  ? [DeclaredLink<Rel>] extends [never]
      ? UnknownKnownLinkAttributes<Tag, ResolveHeadValue<Rel>, Variants>
      : Exclude<KnownObjectKeys<Tag>, ObjectKeys<Variants> | keyof GenericLink>
        | UnknownDefinedLinkAttributes<DefinedLinkFields<Tag, DeclaredLink<Rel>, Rel, Variants>, Variants>
  : UnknownTagAttributes<Tag, Variants>
type TagVariants<Schema, Key extends keyof Schema, Link> = Exclude<TagValue<Key extends 'link' ? Link : Schema[Key]>, Ref>

// Check tag attributes without descending into attribute values such as JSON or class maps.
type UnknownTagKeys<Head, Schema, Link> = Head extends object
  ? {
      [Key in keyof Head & TagKey<Schema>]-?: Key extends 'link'
        ? UnknownLinkAttributes<TagValue<Head[Key]>, TagVariants<Schema, Key, Link>>
        : UnknownTagAttributes<TagValue<Head[Key]>, TagVariants<Schema, Key, Link>>
    }[keyof Head & TagKey<Schema>]
  : never
type UnknownHeadInputKeys<Input, Schema, Link>
  = | Exclude<KnownObjectKeys<ResolveHeadEntry<Input>>, keyof Schema>
    | UnknownTagKeys<ResolveHeadEntry<Input>, Schema, Link>
export type CheckedHeadInput<Input, Schema, Link> = Input & (
  [UnknownHeadInputKeys<NoInfer<Input>, Schema, Link>] extends [never]
    ? unknown
    : Record<UnknownHeadInputKeys<NoInfer<Input>, Schema, Link>, never>
)
