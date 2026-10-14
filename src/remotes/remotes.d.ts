// The portals the shell loads at run time. Their types are declared here because their code is not in this repository.
declare module 'catalogPortal/App' {
  import type { ComponentType } from 'react';
  const App: ComponentType;
  export default App;
}

declare module 'salesPortal/App' {
  import type { ComponentType } from 'react';
  const App: ComponentType;
  export default App;
}
