# Proving benchmarks

Run `npm run benchmark` from the repository root with Node 24. No npm dependencies are required; `node benchmark/proving.mjs` works directly.

To compare with the revision before the November 25 modernisation:

```sh
npm run benchmark -- 306c00206ef1999626aa436da7e9ce7a699fd2ce
npm run benchmark
```

The optional Git ref loads the historical engine via `git show` without checking it out. Both versions execute in the same VM harness with minimal legacy DOM/jQuery stubs. Full-prove cases include parsing, truth, music, ATW and result formatting, but exclude browser rendering. Synthetic truth-only cases use distinct permutations, not ringing compositions. Each case validates its result, warms up ten times and measures 25 samples; median and nearest-rank p95 are reported in milliseconds, plus median throughput. Run on the same machine and Node version, ideally repeat in reverse order. These are informational benchmarks, not CI timing gates.
