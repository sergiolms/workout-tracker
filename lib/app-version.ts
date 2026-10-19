// Embedded in the served bundle, so cached installations show their own release.
// Firebase account data never determines which application version is displayed.
declare const __APP_RELEASE__: {
  version: string;
  build: string;
  builtAt: string;
  date: string;
};

export const appRelease = __APP_RELEASE__;
