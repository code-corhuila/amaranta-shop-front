import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section>
      <h2>404 · No encontramos esta página</h2>
      <Link to="/">Volver al inicio</Link>
    </section>
  );
}
