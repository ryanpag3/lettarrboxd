// Increase the max listeners limit for EventEmitter to avoid warnings during tests
// This is needed because we create multiple mock servers that attach listeners to the process
process.setMaxListeners(20);