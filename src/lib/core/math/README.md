# Math pack (exact decimals, number helpers, calculator)

No dependencies. JavaScript floats give `0.1 + 0.2 = 0.30000000000000004`, so wallet and fee maths goes through `Decimal` (BigInt underneath).

```ts
import { Decimal, dec, Num, evaluate } from '../lib/core/math/index.js';

dec('0.1').add('0.2').toString();                       // '0.3'
dec(1500).percent(7.5).toString();                      // '112.5'   (7.5% of 1500)
dec(100).div(3, 2).toString();                          // '33.33'   (you choose the decimal places)
dec('1234567.5').format(2, '₦');                        // '₦1,234,567.50'
dec(100).allocate([1, 1, 1]).map(String);               // ['33.34', '33.33', '33.33'] (nothing lost)
dec('2.5').round(0, 'half-even').toString();            // '2'

Num.round(1.005, 2);                                    // 1.01
Num.percentage(30, 120);                                // 25
Num.percentChange(80, 100);                             // 25
Num.avg([1, 2, 4]); Num.median([...]); Num.stdDev([...]);
Num.clamp(15, 0, 10); Num.range(0, 1, 0.25); Num.gcd(12, 18); Num.isPrime(97); Num.factorial(25);

evaluate('(amount * vat) / 100 + fee', { vars: { amount: 5000, vat: 7.5, fee: 50 } }).toString();  // '425'
```

Store money as `DECIMAL(14, 2)` and read it with `dec(row.balance)`, not `Number(...)`. Use `.toFixed(2)` when writing it back.

`Decimal` methods: `add sub mul div(scale) mod pow sqrt abs neg percent allocate`, rounding `round floor ceil rescale normalize`, comparing `cmp eq gt gte lt lte isZero isNegative isPositive`, output `toString toFixed toNumber format`. Rounding modes: `half-up` (default), `half-even`, `down`, `up`, `floor`, `ceil`.

`evaluate()` has no `eval`. Operators `+ - * / % ^` and parentheses; functions `abs round floor ceil min max sum avg sqrt pow`.

## Commands
```bash
npm run artisan -- math:calc "(1200 * 1.075) / 3" [--scale=20] [--round=2]
npm run artisan -- math:calc -- "-5 + 3"                # put -- before an expression that starts with "-"
npm run artisan -- math:split 1000 50,30,20 [--scale=2]
npm run artisan -- math:stats 4,8,15,16,23,42 [--sample]
```
