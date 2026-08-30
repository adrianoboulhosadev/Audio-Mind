// The rich entity travels as a VALUE: the apps' Prisma repositories
// reconstitute it (`new Task({...})`) without importing @task/core. `toTaskFilter`
// comes along because the backend reads the filter off a query string and the
// fail-closed default is domain, not HTTP.
export { Task, TaskText, toTaskFilter } from '@task/core'
export type { TaskFilter } from '@task/core'
