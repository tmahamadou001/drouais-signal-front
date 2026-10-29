<script setup lang="ts">
/**
 * Créer une collectivité.
 *
 * En modale, comme les autres : le formulaire s'ouvrait en accordéon au-dessus
 * du tableau et repoussait vers le bas la liste dans laquelle on vérifie que la
 * commune n'existe pas déjà.
 *
 * Le slug est la seule valeur qu'on ne peut plus reprendre : il devient le
 * sous-domaine, il est écrit dans les liens envoyés par e-mail, et il sert de
 * clé à la résolution de commune. L'écran le dit au lieu de le laisser
 * découvrir.
 */
import { ref, computed, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { PLAN_LABELS } from '@/lib/tenantStatus'

export interface NewTenant {
  slug: string
  name: string
  cityName: string
  contactEmail: string
  plan: string
  primaryColor: string
}

const props = defineProps<{
  open: boolean
  creating: boolean
  /** Les slugs déjà pris — pour le dire avant l'envoi. */
  takenSlugs: string[]
}>()

const emit = defineEmits<{ close: []; submit: [tenant: NewTenant] }>()

const slug = ref('')
const name = ref('')
const cityName = ref('')
const contactEmail = ref('')
const plan = ref('starter')
const primaryColor = ref('#1A56A0')

watch(() => props.open, (open) => {
  if (!open) return
  slug.value = ''
  name.value = ''
  cityName.value = ''
  contactEmail.value = ''
  plan.value = 'starter'
  primaryColor.value = '#1A56A0'
})

/** Minuscules, chiffres et tirets : c'est un sous-domaine, pas un titre. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const cleanSlug = computed(() => slug.value.trim().toLowerCase())
const taken = computed(() => props.takenSlugs.includes(cleanSlug.value))
const slugValid = computed(() => SLUG.test(cleanSlug.value) && !taken.value)

const valid = computed(() =>
  slugValid.value && Boolean(name.value.trim()) && Boolean(cityName.value.trim())
)

function submit() {
  if (!valid.value || props.creating) return
  emit('submit', {
    slug: cleanSlug.value,
    name: name.value.trim(),
    cityName: cityName.value.trim(),
    contactEmail: contactEmail.value.trim(),
    plan: plan.value,
    primaryColor: primaryColor.value,
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="font-ui fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-brand-900/40" @click="emit('close')" />

        <div class="relative flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-ds-lg">
          <header class="flex flex-none items-start gap-3 border-b border-line px-5 py-4">
            <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-50">
              <AppIcon name="Building2" :size="18" :stroke-width="1.75" class="text-brand-700" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-[15px] font-bold leading-[1.3] text-brand-900">Nouvelle collectivité</h2>
              <p class="mt-0.5 text-xs leading-[1.4] text-muted">
                Elle démarre en essai, sans aucun signalement.
              </p>
            </div>
            <button class="flex-none p-1 text-faint hover:text-ink" aria-label="Fermer" @click="emit('close')">
              <AppIcon name="X" :size="18" />
            </button>
          </header>

          <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            <div class="flex flex-col gap-2">
              <label for="tenant-slug" class="text-xs font-semibold leading-none text-muted">
                IDENTIFIANT
              </label>
              <input
                id="tenant-slug"
                v-model="slug"
                placeholder="la-loupe"
                class="h-10 rounded-[10px] border bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
                :class="cleanSlug && !slugValid ? 'border-status-danger' : 'border-line'"
              />
              <p
                class="text-xs leading-[1.45]"
                :class="cleanSlug && !slugValid ? 'text-status-danger' : 'text-muted'"
              >
                <template v-if="taken">Cet identifiant est déjà pris.</template>
                <template v-else-if="cleanSlug && !slugValid">
                  Minuscules, chiffres et tirets uniquement.
                </template>
                <template v-else>
                  Devient <strong>{{ cleanSlug || 'la-loupe' }}.onsignale.fr</strong> — définitif,
                  il est écrit dans les liens envoyés par e-mail.
                </template>
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label for="tenant-name" class="text-xs font-semibold leading-none text-muted">
                  NOM DE LA COLLECTIVITÉ
                </label>
                <input
                  id="tenant-name"
                  v-model="name"
                  placeholder="Ville de La Loupe"
                  class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label for="tenant-city" class="text-xs font-semibold leading-none text-muted">
                  NOM DE LA COMMUNE
                </label>
                <input
                  id="tenant-city"
                  v-model="cityName"
                  placeholder="La Loupe"
                  class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
                />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label for="tenant-email" class="text-xs font-semibold leading-none text-muted">
                E-MAIL DE CONTACT (facultatif)
              </label>
              <input
                id="tenant-email"
                v-model="contactEmail"
                type="email"
                placeholder="contact@mairie.fr"
                class="h-10 rounded-[10px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand-700"
              />
            </div>

            <div class="flex flex-col gap-2">
              <span class="text-xs font-semibold leading-none text-muted">PLAN</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="(label, key) in PLAN_LABELS"
                  :key="key"
                  type="button"
                  class="rounded-lg border px-3 py-1.5 text-xs font-semibold leading-none transition-colors"
                  :class="plan === key
                    ? 'border-brand-700 bg-brand-50 text-brand-700'
                    : 'border-line bg-white text-muted hover:bg-canvas'"
                  @click="plan = key"
                >
                  {{ label }}
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label for="tenant-color" class="text-xs font-semibold leading-none text-muted">
                COULEUR DE LA COMMUNE
              </label>
              <div class="flex items-center gap-2.5">
                <input
                  id="tenant-color"
                  v-model="primaryColor"
                  type="color"
                  class="h-10 w-16 cursor-pointer rounded-[10px] border border-line"
                />
                <span class="text-sm tabular-nums text-ink">{{ primaryColor }}</span>
              </div>
            </div>
          </div>

          <footer class="flex flex-none items-center gap-2.5 border-t border-line bg-canvas px-5 py-4">
            <button
              class="h-10 flex-none rounded-[10px] px-3.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
              @click="emit('close')"
            >
              Annuler
            </button>
            <button
              class="ml-auto flex h-10 flex-none items-center gap-2 rounded-[10px] bg-brand-700 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
              :disabled="!valid || creating"
              @click="submit"
            >
              <AppIcon name="Plus" :size="15" :stroke-width="2" />
              {{ creating ? 'Création…' : 'Créer' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active { transition: opacity 0.2s ease; }
.dialog-enter-from,
.dialog-leave-to { opacity: 0; }
</style>
