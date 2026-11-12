import { Link } from 'react-router-dom';
import type { RemoteDefinition } from '../remotes/types';

/** The way in: a short welcome and one clear action, which is to see the catalog. */
export function Home({ remotes }: { remotes: readonly RemoteDefinition[] }) {
  const catalog = remotes.find((remote) => remote.id === 'catalog');
  return (
    <section className="home-hero">
      <p className="home-kicker">Tu tienda de mascotas</p>
      <h2>Todo para tu mejor amigo</h2>
      <p className="home-lead">Alimento, juguetes e higiene para tu perro o tu gato. Eliges, agregas al carrito y listo.</p>
      {catalog && (
        <Link to={catalog.path} className="btn btn-primary home-cta">
          Ver el catálogo
        </Link>
      )}
    </section>
  );
}

export function NotFound() {
  return (
    <section>
      <h2>404 · No encontramos esta página</h2>
      <Link to="/">Volver al inicio</Link>
    </section>
  );
}
