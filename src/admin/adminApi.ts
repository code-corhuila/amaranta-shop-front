import { apiClient as shellClient } from '../core/http/exposed';
import type { ApiClient } from '../core/http/apiClient';

export interface PageMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

/** A page of anything the services list: `{data, meta}`. */
export interface Page<T> {
  readonly data: readonly T[];
  readonly meta: PageMeta;
}

/** What the administration sees of an account. Never the password: the service does not send it. */
export interface UserRow {
  readonly userId: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly role: string;
  /** ISO-8601, in UTC: when the account was registered. */
  readonly createdAt: string;
}

/** Every registered account, newest first. Only the administrator gets it: the service answers 403 to anyone else. */
export async function listUsers(page: number, limit: number, signal?: AbortSignal, client: ApiClient = shellClient): Promise<Page<UserRow>> {
  const response = await client.get<Page<UserRow>>(`/api/v1/admin/users?page=${page}&limit=${limit}`, signal ? { signal } : {});
  return response.data;
}

/** How many there are of something that is listed in pages, asking for a single row. `null` when it cannot be known now. */
export async function countOf(path: string, signal?: AbortSignal, client: ApiClient = shellClient): Promise<number | null> {
  try {
    const response = await client.get<Page<unknown>>(`${path}${path.includes('?') ? '&' : '?'}page=1&limit=1`, signal ? { signal } : {});
    return response.data.meta.total;
  } catch {
    return null;
  }
}
