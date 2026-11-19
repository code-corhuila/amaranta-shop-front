import { Link } from 'react-router-dom';
import type { RemoteDefinition } from '../remotes/types';

/**
 * The photographs behind the welcome, in the order they are shown. They are free-to-use pictures of pets from Unsplash,
 * asked at the size a screen needs. They are only decoration: if one does not load, the blue behind it is what the person sees.
 */
export const WELCOME_PHOTOS: readonly string[] = [
  '1548199973-03cce0bbc87b', // two dogs running at sunset
  '1537151625747-768eb6cf92b2', // a dog and a cat, side by side
  '1587300003388-59208cc962cb', // a dog by the sea
  '1543466835-00a7907e9de1', // a beagle, smiling
  '1573865526739-10659fec78a5', // a cat looking up
  '1596854407944-bf87f6fdd49e', // a ginger cat, in the sun
];

/** How long each photograph stays, in seconds. The same number is in welcome.css (--slide), which animates them. */
export const SLIDE_SECONDS = 6;

export const photoUrl = (id: string, width = 1600): string => `https://images.unsplash.com/photo-${id}?w=${width}&q=70&auto=format&fit=crop`;

/** A paw print, drawn once and used as decoration: it floats behind the words and says nothing to a screen reader. */
function Paw({ className }: { className: string }) {
  return (
    <svg className={`welcome-paw ${className}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <ellipse cx="32" cy="42" rx="14" ry="12" />
      <ellipse cx="14" cy="26" rx="6" ry="8" transform="rotate(-20 14 26)" />
      <ellipse cx="25" cy="14" rx="6" ry="8.5" transform="rotate(-6 25 14)" />
      <ellipse cx="39" cy="14" rx="6" ry="8.5" transform="rotate(6 39 14)" />
      <ellipse cx="50" cy="26" rx="6" ry="8" transform="rotate(20 50 26)" />
    </svg>
  );
}

/** The arrow of the button: it slides when the pointer is over it. Decoration; the button says what it does in words. */
function Arrow() {
  return (
    <svg className="welcome-arrow" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/**
 * The way in: a whole screen with the name of the shop, one line about it and one button. Behind it, photographs of dogs and
 * cats that fade into each other (pure CSS, so there is nothing to start, stop or load apart). The button goes to the catalog.
 */
export function Welcome({ remotes }: { remotes: readonly RemoteDefinition[] }) {
  const catalog = remotes.find((remote) => remote.id === 'catalog');
  return (
    <section
      className="welcome"
      aria-labelledby="welcome-title"
      style={{ ['--slides' as string]: WELCOME_PHOTOS.length, ['--slide' as string]: `${SLIDE_SECONDS}s` }}
    >
      <div className="welcome-slides" aria-hidden="true">
        {WELCOME_PHOTOS.map((id, index) => (
          <div key={id} className="welcome-slide" style={{ backgroundImage: `url(${photoUrl(id)})`, ['--i' as string]: index }} />
        ))}
      </div>
      <div className="welcome-veil" aria-hidden="true" />
      <Paw className="welcome-paw-1" />
      <Paw className="welcome-paw-2" />
      <Paw className="welcome-paw-3" />
      <Paw className="welcome-paw-4" />

      <div className="welcome-content">
        <h2 id="welcome-title" className="welcome-title">
          Amaranta Shop
        </h2>
        <p className="welcome-lead">Todo para tu mejor amigo: alimento, juguetes e higiene para tu perro o tu gato.</p>
        {catalog && (
          <Link to={catalog.path} className="welcome-cta">
            <span>Bienvenido</span>
            <span className="sr-only">, entrar al catálogo</span>
            <Arrow />
          </Link>
        )}
      </div>

      <p className="welcome-credit">Fotos: Unsplash</p>
    </section>
  );
}
