import { Link } from 'react-router-dom';

export function Home() {
  return (
    <section>
      <h2>Bienvenido</h2>
      <p>Elige un módulo en el menú para empezar.</p>
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
