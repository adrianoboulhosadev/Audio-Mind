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

/**
 * What an ADMINISTRATOR changes about somebody else's account. Both fields are
 * optional so one screen can flip either without touching the other; the target
 * user is in the path, and who is doing it comes from the JWT — never from here.
 */
export interface SetUserAccessInput {
  role?: string
  active?: boolean
}
