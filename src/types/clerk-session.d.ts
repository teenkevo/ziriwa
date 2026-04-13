/**
 * Optional JWT template (Session token) in Clerk:
 *   "app_role": "{{user.public_metadata.appRole}}"
 * @see https://clerk.com/docs/guides/sessions/jwt-templates
 */
export {}

declare global {
  interface CustomJwtSessionClaims {
    app_role?: string
  }
}
