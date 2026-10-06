<script setup lang="ts">
import type { RuleSeverity, ValidationRuleId } from 'unhead/validate'
import type { LintFileResult, LintMessage, LintResponse, LintRunResult } from '~/composables/state'
import { openInEditor } from '~/composables/open-in-editor'
import { callRpc } from '~/composables/rpc'
import { useRuleOverrides } from '~/composables/rule-overrides'

const { overrides, knownRuleIds, set: setOverride, reset: resetOverrides } = useRuleOverrides()

const SEVERITY_OPTIONS: Array<{ label: string, value: RuleSeverity | 'default' }> = [
  { label: 'Default', value: 'default' },
  { label: 'Warn', value: 'warn' },
  { label: 'Info', value: 'info' },
  { label: 'Off', value: 'off' },
]

function severityValue(id: ValidationRuleId): RuleSeverity | 'default' {
  return overrides.value[id] ?? 'default'
}

function onSeverityChange(id: ValidationRuleId, value: RuleSeverity | 'default') {
  setOverride(id, value === 'default' ? null : value)
}

const overrideCount = computed(() => Object.keys(overrides.value).length)

type Action = 'audit' | 'preview' | 'migrate'

const result = ref<LintResponse | null>(null)
const running = ref<Action | null>(null)
const error = ref<string | null>(null)
// A dry run waiting for the user to confirm the rewrite.
const pendingMigration = ref<LintRunResult | null>(null)

async function run(action: Action, files?: string[]) {
  running.value = action
  error.value = null
  try {
    const response = await callRpc<LintResponse>('unhead:run-lint', {
      mode: action === 'audit' ? 'audit' : 'migrate',
      dryRun: action === 'preview',
      files,
    })
    if (action === 'preview' && response.available)
      pendingMigration.value = response
    else
      result.value = response
  }
  catch (err: any) {
    error.value = err?.message || String(err)
  }
  finally {
    running.value = null
  }
}

function confirmMigration() {
  // Write only the files the dialog listed, even if more became rewritable since the dry run.
  const files = pendingMigration.value?.files.filter(f => f.fixed).map(f => f.filePath) ?? []
  pendingMigration.value = null
  run('migrate', files)
}

const SEVERITY_ICON: Record<LintMessage['severity'], { icon: string, class: string, label: string }> = {
  error: { icon: 'i-carbon-error-filled', class: 'text-red-500', label: 'Error' },
  warn: { icon: 'i-carbon-warning-filled', class: 'text-amber-500', label: 'Warning' },
  info: { icon: 'i-carbon-information-filled', class: 'text-sky-500', label: 'Info' },
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function openFile(file: LintFileResult, message?: LintMessage) {
  openInEditor(message?.line != null
    ? `${file.filePath}:${message.line}${message.column != null ? `:${message.column}` : ''}`
    : file.filePath)
}
</script>

<template>
  <div class="p-6 space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 max-w-2xl">
        <h2 class="text-base font-semibold text-highlighted">
          Source audit
        </h2>
        <p class="text-sm text-muted">
          Checks your source files for Unhead misuse with <code class="font-mono">@unhead/cli</code>. Migrate also rewrites tag literals into <code class="font-mono">defineX</code> helpers.
        </p>
      </div>
      <div class="flex gap-2 shrink-0">
        <UButton
          icon="i-carbon-search"
          variant="solid"
          color="primary"
          :loading="running === 'audit'"
          :disabled="!!running"
          @click="run('audit')"
        >
          Run audit
        </UButton>
        <UButton
          icon="i-carbon-magic-wand"
          variant="outline"
          color="neutral"
          :loading="running === 'preview' || running === 'migrate'"
          :disabled="!!running"
          @click="run('preview')"
        >
          Migrate…
        </UButton>
      </div>
    </div>

    <UModal
      :open="!!pendingMigration"
      :title="pendingMigration?.filesFixed ? `Rewrite ${plural(pendingMigration.filesFixed, 'file')}?` : 'Nothing to migrate'"
      @update:open="(open: boolean) => { if (!open) pendingMigration = null }"
    >
      <template #body>
        <p v-if="pendingMigration?.filesFixed" class="text-sm">
          Migrate writes these changes to disk. Commit or stash your work first so you can review the diff.
        </p>
        <p v-else class="text-sm">
          No file has tag literals that Migrate can rewrite.
        </p>
        <ul v-if="pendingMigration?.filesFixed" class="mt-3 space-y-1 text-xs font-mono text-muted">
          <li v-for="file in pendingMigration.files.filter(f => f.fixed)" :key="file.filePath" class="truncate">
            {{ file.relativePath }}
          </li>
        </ul>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="pendingMigration = null">
            {{ pendingMigration?.filesFixed ? 'Cancel' : 'Close' }}
          </UButton>
          <UButton v-if="pendingMigration?.filesFixed" color="warning" icon="i-carbon-magic-wand" @click="confirmMigration">
            Rewrite files
          </UButton>
        </div>
      </template>
    </UModal>

    <UAlert v-if="error" color="error" :title="error" />

    <UAlert
      v-else-if="result && !result.available"
      color="warning"
      icon="i-carbon-warning"
      :title="result.message"
    />

    <div v-else-if="result && result.available" class="space-y-3">
      <div class="flex flex-wrap gap-2 text-xs">
        <UBadge color="error" variant="subtle">
          {{ plural(result.errorCount, 'error') }}
        </UBadge>
        <UBadge color="warning" variant="subtle">
          {{ plural(result.warningCount, 'warning') }}
        </UBadge>
        <UBadge v-if="result.mode === 'migrate'" color="success" variant="subtle">
          {{ plural(result.filesFixed, 'file') }} rewritten
        </UBadge>
        <UBadge color="neutral" variant="subtle" class="font-mono">
          {{ result.durationMs }}ms
        </UBadge>
      </div>

      <DevtoolsEmptyState v-if="result.files.length === 0" icon="i-carbon-checkmark-outline" title="No issues found" />

      <div v-else class="space-y-3">
        <div v-for="file in result.files" :key="file.filePath" class="border border-default rounded-md overflow-hidden">
          <div class="flex items-center justify-between bg-elevated px-3 py-2 border-b border-default">
            <button type="button" class="font-mono text-xs hover:underline cursor-pointer text-left truncate" :title="`Open ${file.relativePath} in your editor`" @click="openFile(file)">
              {{ file.relativePath }}
            </button>
            <div class="flex gap-1 shrink-0 ml-2">
              <UBadge v-if="file.fixed" color="success" variant="subtle" size="xs">
                rewritten
              </UBadge>
              <UBadge v-if="file.errorCount" color="error" variant="subtle" size="xs">
                {{ plural(file.errorCount, 'error') }}
              </UBadge>
              <UBadge v-if="file.warningCount" color="warning" variant="subtle" size="xs">
                {{ plural(file.warningCount, 'warning') }}
              </UBadge>
            </div>
          </div>
          <ul class="divide-y divide-default">
            <li v-for="(m, i) in file.messages" :key="i">
              <button
                type="button"
                class="w-full px-3 py-2 flex items-start gap-2 text-xs text-left hover:bg-elevated/40 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ui-primary)]"
                @click="openFile(file, m)"
              >
                <UIcon
                  :name="SEVERITY_ICON[m.severity].icon"
                  class="text-sm mt-0.5 shrink-0"
                  :class="SEVERITY_ICON[m.severity].class"
                  aria-hidden="true"
                />
                <span class="sr-only">{{ SEVERITY_ICON[m.severity].label }}:</span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-2 flex-wrap">
                    <span v-if="m.ruleId" class="font-mono text-muted">{{ m.ruleId }}</span>
                    <span class="font-mono text-muted text-[10px]">{{ m.line ?? '?' }}:{{ m.column ?? '?' }}</span>
                  </span>
                  <span class="block text-default mt-0.5">
                    {{ m.message }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <DevtoolsEmptyState v-else icon="i-carbon-rule-test" title="Audit your source files">
      <template #description>
        Run the audit to find Unhead misuse before it reaches production.
      </template>
    </DevtoolsEmptyState>

    <div class="border-t border-default pt-6 mt-6 space-y-3">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-base font-semibold text-highlighted">
            Rule overrides
          </h2>
          <p class="text-sm text-muted">
            Filter or remap severities for the runtime <code class="font-mono">ValidatePlugin</code>'s rules in the devtools view. Stored in this browser only; the runtime config in your app is unchanged.
          </p>
        </div>
        <UButton
          v-if="overrideCount > 0"
          icon="i-carbon-reset"
          variant="ghost"
          size="xs"
          @click="resetOverrides()"
        >
          Reset {{ overrideCount }}
        </UButton>
      </div>

      <div class="border border-default rounded-md divide-y divide-default">
        <div
          v-for="id in knownRuleIds"
          :key="id"
          class="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-elevated/40"
        >
          <span class="font-mono text-xs">{{ id }}</span>
          <USelect
            :model-value="severityValue(id)"
            :items="SEVERITY_OPTIONS"
            value-key="value"
            label-key="label"
            size="xs"
            class="w-28 shrink-0"
            @update:model-value="(v: any) => onSeverityChange(id, v)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
