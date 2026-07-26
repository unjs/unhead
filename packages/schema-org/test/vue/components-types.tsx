/** @jsxImportSource vue */
import { defineSchemaOrgComponent, SchemaOrgArticle } from '@unhead/schema-org/vue'
import 'vue/jsx'

const validArticle = <SchemaOrgArticle headline="Typed headline" customProperty={42} />
// @ts-expect-error known Schema.org component properties stay validated in TSX
const invalidArticle = <SchemaOrgArticle headline={42} />

const OptionalInput = defineSchemaOrgComponent('OptionalInput', (input?: { name: string }) => input)
const RequiredInput = defineSchemaOrgComponent('RequiredInput', (input: { name: string }) => input)

const validOptional = <OptionalInput name="Optional" customProperty />
const validRequired = <RequiredInput name="Required" customProperty />
// @ts-expect-error optional callback parameters still drive component props
const invalidOptional = <OptionalInput name={42} />
// @ts-expect-error required callback parameters also drive component props
const invalidRequired = <RequiredInput name={42} />

void validArticle
void invalidArticle
void validOptional
void validRequired
void invalidOptional
void invalidRequired
