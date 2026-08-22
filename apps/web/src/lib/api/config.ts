import axios from 'axios'

/**
 * The single axios instance. `withCredentials` is what carries the httpOnly
 * refresh cookie on /auth/refresh — without it the silent refresh on boot can
 * never work, and the session dies every time the tab reloads.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000',
  withCredentials: true,
})
