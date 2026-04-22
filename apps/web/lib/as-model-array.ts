/** API may return `{ error }` instead of an array — never assume JSON is `Model[]`. */
export function asModelArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : []
}
