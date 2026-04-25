<script setup lang="ts">
import type { RuleSeverity, ValidationRuleId } from 'unhead/validate'
import type { LintFileResult, LintMessage, LintResponse } from '~/composables/state'
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

const result = ref<LintResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const lastMode = ref<'audit' | 'migrate' | null>(null)

async function run(mode: 'audit' | 'migrate') {
  loading.value = true
  error.value = null
  lastMode.value = mode
  try {
    result.value = await callRpc<LintResponse>('unhead:run-lint', { mode })
  }
  catch (err: any) {
    error.value = err?.message || String(err)
  }
  finally {
    loading.value = false
  }
}

function severityColor(s: 'error' | 'warn'): 'error' | 'warning' {
  return s === 'error' ? 'error' : 'warning'
}

function openFile(file: LintFileResult, message?: LintMessage) {
  const loc = message?.line != null
    ? `${file.filePath}:${message.line}${message.column != null ? `:${message.column}` : ''}`
    : file.filePath
  fetch(`/__open-in-editor?file=${encodeURIComponent(loc)}`).catch((err) => {
    console.warn('[unhead devtools] open-in-editor failed:', err)
  })
}
</script>

<template>
  <div class="p-6 space-y-4">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-highlighted">
          Source-level audit
        </h2>
        <p class="text-sm text-muted">
          Runs <code class="font-mono">@unhead/eslint-plugin</code>'s recommended ruleset across the project. Apply the migration ruleset to also rewrite tag literals into <code class="font-mono">defineX</code> helpers.
        </p>
      </div>
      <div class="flex gap-2 shrink-0">
        <UButton
          icon="i-carbon-search"
          variant="solid"
          color="primary"
          :loading="loading && lastMode === 'audit'"
          :disabled="loading"
          @click="run('audit')"
        >
          Run audit
        </UButton>
        <UButton
          icon="i-carbon-magic-wand"
          variant="outline"
          color="warning"
          :loading="loading && lastMode === 'migrate'"
          :disabled="loading"
          @click="run('migrate')"
        >
          Apply migrate
        </UButton>
      </div>
    </div>

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
          {{ result.errorCount }} error{{ result.errorCount === 1 ? '' : 's' }}
        </UBadge>
        <UBadge color="warning" variant="subtle">
          {{ result.warningCount }} warning{{ result.warningCount === 1 ? '' : 's' }}
        </UBadge>
        <UBadge v-if="result.mode === 'migrate'" color="success" variant="subtle">
          {{ result.filesFixed }} file{{ result.filesFixed === 1 ? '' : 's' }} fixed
        </UBadge>
        <UBadge v-else-if="result.fixableErrorCount + result.fixableWarningCount > 0" color="info" variant="subtle">
          {{ result.fixableErrorCount + result.fixableWarningCount }} fixable
        </UBadge>
        <UBadge color="neutral" variant="subtle" class="font-mono">
          {{ result.durationMs }}ms
        </UBadge>
      </div>

      <div v-if="result.files.length === 0" class="text-sm text-muted py-8 text-center">
        No issues found.
      </div>

      <div v-else class="space-y-3">
        <div v-for="file in result.files" :key="file.filePath" class="border border-default rounded-md overflow-hidden">
          <div class="flex items-center justify-between bg-elevated px-3 py-2 border-b border-default">
            <button class="font-mono text-xs hover:underline cursor-pointer text-left truncate" @click="openFile(file)">
              {{ file.relativePath }}
            </button>
            <div class="flex gap-1 shrink-0 ml-2">
              <UBadge v-if="file.fixed" color="success" variant="subtle" size="xs">
                fixed
              </UBadge>
              <UBadge v-if="file.errorCount" color="error" variant="subtle" size="xs">
                {{ file.errorCount }} error
              </UBadge>
              <UBadge v-if="file.warningCount" color="warning" variant="subtle" size="xs">
                {{ file.warningCount }} warn
              </UBadge>
            </div>
          </div>
          <ul class="divide-y divide-default">
            <li
              v-for="(m, i) in file.messages"
              :key="i"
              class="px-3 py-2 flex items-start gap-2 text-xs hover:bg-elevated/40 cursor-pointer"
              @click="openFile(file, m)"
            >
              <UIcon
                :name="m.severity === 'error' ? 'i-carbon-error-filled' : 'i-carbon-warning-filled'"
                class="text-sm mt-0.5 shrink-0"
                :class="m.severity === 'error' ? 'text-red-500' : 'text-amber-500'"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span v-if="m.ruleId" class="font-mono text-muted">{{ m.ruleId }}</span>
                  <UBadge v-if="m.fixable" :color="severityColor(m.severity)" variant="subtle" size="xs">
                    fixable
                  </UBadge>
                  <span class="font-mono text-muted text-[10px]">{{ m.line ?? '?' }}:{{ m.column ?? '?' }}</span>
                </div>
                <p class="text-default mt-0.5">
                  {{ m.message }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else class="text-sm text-muted py-12 text-center">
      Click <span class="font-medium">Run audit</span> to lint your source files for unhead misuse.
    </div>

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
