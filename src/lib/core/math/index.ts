// math/index.ts
// Single import point: import { Decimal, Num, uuid, evaluate } from '../lib/core/math/index.js';
export { Decimal, dec, type DecimalInput, type RoundingMode } from './Decimal.js';
export { Num, uuid } from './Num.js';
export { evaluate, ExpressionError, type EvaluateOptions } from './Expression.js';
