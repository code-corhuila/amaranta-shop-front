import { Link, useSearchParams } from 'react-router-dom';
import type { ApiClient } from '../core/http/apiClient';
import { roleLabel } from '../core/auth/roles';
import { listUsers } from './adminApi';
import { useLoad } from './useLoad';

const PAGE_SIZE = 20;

/** The page the address asks for; anything that is not a whole number from 1 up is the first page. */
function parsePage(raw: string | null): number {
  return raw !== null && /^[1-9]\d*$/.test(raw) ? Number(raw) : 1;
}

/** "14 oct 2026", in the time of the shop. */
function registeredOn(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }).format(new Date(iso));
}

/**
 * Who has registered, newest first: name, email, phone, role and the day they did. For the administrator only (the route is behind
 * RequireRole and the service answers 403 to anyone else). The password never reaches the browser.
 */
export function UsersPage({ client }: { client?: ApiClient }) {
  const [params, setParams] = useSearchParams();
  const page = parsePage(params.get('page'));
  const { state, retry } = useLoad((signal) => listUsers(page, PAGE_SIZE, signal, client), `users:${page}`);

  return (
    <section>
      <p>
        <Link to="/admin">← Administración</Link>
      </p>
      <h2>Usuarios registrados</h2>
      <p className="field-hint">Todas las cuentas, de la más reciente a la más antigua.</p>

      {state.status === 'loading' && <p role="status">Cargando los usuarios…</p>}
      {state.status === 'error' && (
        <div role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      {state.status === 'success' && state.data.data.length === 0 && <p>Todavía no se ha registrado nadie.</p>}

      {state.status === 'success' && state.data.data.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <caption>{`${state.data.meta.total} ${state.data.meta.total === 1 ? 'usuario' : 'usuarios'} en total`}</caption>
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Teléfono</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Se registró</th>
                </tr>
              </thead>
              <tbody>
                {state.data.data.map((user) => (
                  <tr key={user.userId}>
                    <th scope="row">{user.fullName}</th>
                    <td>{user.email}</td>
                    <td>{user.phone ?? '—'}</td>
                    <td>
                      <span className={user.role === 'ADMIN' ? 'chip chip-stock' : 'chip chip-category'}>{roleLabel(user.role)}</span>
                    </td>
                    <td>{registeredOn(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.data.meta.totalPages > 1 && (
            <nav aria-label="Paginación" className="pager">
              <button type="button" disabled={page <= 1} onClick={() => setParams(page - 1 > 1 ? { page: String(page - 1) } : {})}>
                Anterior
              </button>
              <p>{`Página ${state.data.meta.page} de ${state.data.meta.totalPages}`}</p>
              <button type="button" disabled={page >= state.data.meta.totalPages} onClick={() => setParams({ page: String(page + 1) })}>
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
