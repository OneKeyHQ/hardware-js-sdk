export const logger = {
  info: (...args: any[]) => {
    console.log('Mock Info:', ...args);
  },
  debug: (...args: any[]) => {
    console.log('Mock Debug:', ...args);
  },
  error: (...args: any[]) => {
    console.log('Mock Error:', ...args);
  },
};
