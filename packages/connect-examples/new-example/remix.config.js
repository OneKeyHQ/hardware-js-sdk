/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "esm",

  // Configure client-side focused features
  future: {
    v2_dev: true,
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
    unstable_cssSideEffectImports: true,
    unstable_vanillaExtract: false,

    // Client-side features
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
    v3_singleFetch: true,
    v3_lazyRouteDiscovery: true,
  },

  // Minimal server config - mostly for development compatibility
  serverBuildPath: "build/index.js",
  publicPath: "/build/",
  assetsBuildDirectory: "public/build",
};
