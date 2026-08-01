// Axios wrapper to fix module.exports.default for rollup compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios');

// Create a proper wrapper that satisfies rollup's _interopDefaultLegacy expectations
// The compiled code uses: axios__default["default"].interceptors.request.use()
// So we need to ensure that when webpack resolves this, it has the right structure

// Ensure axios has a .default property pointing to itself
if (!axios.default) {
  axios.default = axios;
}

// Also ensure interceptors exist
if (!axios.interceptors) {
  // This shouldn't happen, but just in case, create a mock
  axios.interceptors = {
    request: {
      use: fn => {
        console.warn('axios.interceptors.request.use mock called');
        return 0;
      },
    },
    response: {
      use: fn => {
        console.warn('axios.interceptors.response.use mock called');
        return 0;
      },
    },
  };
}

module.exports = axios;
