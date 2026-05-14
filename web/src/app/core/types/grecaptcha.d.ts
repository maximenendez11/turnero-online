export {};

declare global {
  interface Window {
    grecaptcha?: {
      ready: (fn: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}
