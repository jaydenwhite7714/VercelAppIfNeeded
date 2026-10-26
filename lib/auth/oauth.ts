export const OAUTH_PROVIDERS = ['google', 'azure', 'apple'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function parseOAuthProvider(value: string | null): OAuthProvider | null {
  return value === 'google' || value === 'azure' || value === 'apple' ? value : null;
}

export function oauthProviderLabel(provider: OAuthProvider): string {
  return provider === 'azure' ? 'Microsoft' : provider === 'apple' ? 'Apple' : 'Google';
}
