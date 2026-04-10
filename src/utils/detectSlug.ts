export const detectSlug = (): string => {
  
  const hostname = window.location.hostname
  const parts = hostname.split('.')

  if (
    parts.length >= 3 &&
    parts[0] !== 'www' &&
    parts[0] !== 'api'
  ) {
    return parts[0]
  }

  return import.meta.env.VITE_DEV_TENANT ?? 'dreux'
}
