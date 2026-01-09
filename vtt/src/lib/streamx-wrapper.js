// ESM wrapper for streamx CommonJS module
// This ensures Vite can properly bundle the Duplex class

// Use createRequire to load the CommonJS module directly
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load streamx from node_modules bypassing the alias
const streamxModule = require('streamx');

// Re-export named exports
export const {
  pipeline,
  pipelinePromise,
  isStream,
  isStreamx,
  isEnded,
  isFinished,
  isDisturbed,
  getStreamError,
  Stream,
  Writable,
  Readable,
  Duplex,
  Transform,
  PassThrough
} = streamxModule;

// Also export as default for compatibility
export default streamxModule;
