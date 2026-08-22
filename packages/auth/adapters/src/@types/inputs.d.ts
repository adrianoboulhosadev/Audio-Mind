export interface RegisterUserInput {
  email: string
  password: string
  name?: string | null
}

export interface LoginUserInput {
  email: string
  password: string
}

/** The userId does NOT come in the body: it is resolved from the JWT at the HTTP
 * boundary and passed separately (anti-IDOR). */
export interface ChangePasswordInput {
  oldPassword: string
  newPassword: string
}

/** Display-only field; omit the key to leave it unchanged. */
export interface UpdateProfileInput {
  name?: string | null
}
