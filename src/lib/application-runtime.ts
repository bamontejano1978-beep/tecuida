import {
  type ApplicationEntryRef,
  getApplicationEntryPath,
} from '@/lib/application-links'

export const APPLICATION_PROVIDERS = ['tecuida', 'firebase', 'external'] as const
export type ApplicationProvider = (typeof APPLICATION_PROVIDERS)[number]

export const APPLICATION_LAUNCH_MODES = ['native', 'landing', 'redirect', 'embed'] as const
export type ApplicationLaunchMode = (typeof APPLICATION_LAUNCH_MODES)[number]

export interface ApplicationRuntimeRef extends ApplicationEntryRef {
  app_provider?: ApplicationProvider | string | null
  launch_mode?: ApplicationLaunchMode | string | null
  url_acceso?: string | null
}

const PROVIDER_LABELS: Record<ApplicationProvider, string> = {
  tecuida: 'TE CUIDA',
  firebase: 'Firebase',
  external: 'Externo',
}

const LAUNCH_MODE_LABELS: Record<ApplicationLaunchMode, string> = {
  native: 'Nativa',
  landing: 'Landing',
  redirect: 'Redireccion',
  embed: 'Embebida',
}

export function getApplicationProvider(app: ApplicationRuntimeRef): ApplicationProvider {
  return APPLICATION_PROVIDERS.includes(app.app_provider as ApplicationProvider)
    ? (app.app_provider as ApplicationProvider)
    : 'tecuida'
}

export function getApplicationLaunchMode(app: ApplicationRuntimeRef): ApplicationLaunchMode {
  return APPLICATION_LAUNCH_MODES.includes(app.launch_mode as ApplicationLaunchMode)
    ? (app.launch_mode as ApplicationLaunchMode)
    : 'landing'
}

export function getApplicationLaunchPath(app: ApplicationRuntimeRef): string {
  return `${getApplicationEntryPath(app)}/launch`
}

export function shouldEmbedApplication(app: ApplicationRuntimeRef): boolean {
  return getApplicationLaunchMode(app) === 'embed' && !!app.url_acceso
}

export function getApplicationProviderLabel(app: ApplicationRuntimeRef): string {
  return PROVIDER_LABELS[getApplicationProvider(app)]
}

export function getApplicationLaunchModeLabel(app: ApplicationRuntimeRef): string {
  return LAUNCH_MODE_LABELS[getApplicationLaunchMode(app)]
}
