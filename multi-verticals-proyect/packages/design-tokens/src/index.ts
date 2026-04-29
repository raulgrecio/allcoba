import tokens from './tokens.json' with { type: 'json' };

export type Tokens = typeof import('./tokens.json');

export const getTokens = (): Tokens => tokens;

export { generateCSS } from './css-gen.js';
export { generateDart } from './dart-gen.js';
