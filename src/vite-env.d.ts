/// <reference types="vite/client" />

// Permite importar .h como texto bruto via Vite
declare module '*.h?raw' {
  const content: string;
  export default content;
}
