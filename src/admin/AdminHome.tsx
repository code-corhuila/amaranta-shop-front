import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApiClient } from '../core/http/apiClient';
import { countOf } from './adminApi';

interface Card {
  readonly to: string;
  readonly title: string;
  readonly text: string;
  /** Where to ask how many there are, and the words for one and for many. */
  readonly count: { readonly path: string; readonly one: string; readonly many: string };
}

/** What the administrator runs, and where. The catalog and the orders live in their own portals; the accounts live here. */
const CARDS: readonly Card[] = [
  {
    to: '/catalog/admin',
    title: 'Catálogo',
    text: 'Crea productos, cambia precios y existencias, activa o desactiva lo que se vende.',
    count: { path: '/api/v1/admin/products', one: 'producto', many: 'productos' },
  },
  {
    to: '/sales/admin/orders',
    title: 'Pedidos',
    text: 'Mira todos los pedidos de la tienda y quién los hizo: clientes con cuenta, invitados y ventas en mostrador.',
    count: { path: '/api/v1/admin/orders', one: 'pedido', many: 'pedidos' },
  },
  {
    to: '/admin/users',
    title: 'Usuarios',
    text: 'Mira quién se ha registrado, con qué correo y cuándo.',
    count: { path: '/api/v1/admin/users', one: 'usuario', many: 'usuarios' },
  },
];

function Total({ card, client }: { card: Card; client: ApiClient | undefined }) {
  const [total, setTotal] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    const controller = new AbortController();
    void countOf(card.count.path, controller.signal, client).then((n) => {
      if (!controller.signal.aborted) setTotal(n);
    });
    return () => controller.abort();
  }, [card.count.path, client]);

  if (total === undefined) return <span className="admin-card-count" aria-hidden="true">…</span>;
  if (total === null) return <span className="admin-card-count">No se pudo contar</span>;
  return <span className="admin-card-count">{`${total} ${total === 1 ? card.count.one : card.count.many}`}</span>;
}

/** The front door of the administration: three cards, each one with how many there are. */
export function AdminHome({ client }: { client?: ApiClient }) {
  return (
    <section>
      <h2>Administración</h2>
      <p className="field-hint">Lo que necesitas para llevar la tienda.</p>
      <ul className="admin-cards">
        {CARDS.map((card) => (
          <li key={card.to}>
            <Link to={card.to} className="admin-card">
              <h3>{card.title}</h3>
              <p>{card.text}</p>
              <Total card={card} client={client} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
