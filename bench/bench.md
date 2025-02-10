# https://github.com/unjs/unhead/pull/480

(With hookable)

- Client: 13.2kB - gzipped 5 kB
- Server: 10.1kB - gzipped 4 kB

(Without hookable)

- Client: 9.5kB - gzipped 4.3 kB
- Server: 6.97kB - gzipped 3.2 kB

# main

- CLIENT Size: 13 kB (gzipped: 5.1 kB)
- SERVER Size: 10.2 kB (gzipped: 4.1 kB)

```
✓ bench/ssr-harlanzw-com-e2e.bench.ts > ssr e2e bench 3000ms
name           hz     min     max    mean     p75     p99    p995    p999     rme  samples
· e2e      2,195.76  0.3875  1.5184  0.4554  0.4558  0.9170  0.9514  1.1057  ±0.62%     5000
· simple  41,271.13  0.0223  0.2731  0.0242  0.0236  0.0448  0.0511  0.1337  ±0.39%    20636   fastest

✓ bench/ssr-harlanzw-com-e2e.bench.ts > ssr e2e bench 2909ms
name           hz     min     max    mean     p75     p99    p995    p999     rme  samples
· e2e      2,287.15  0.3852  1.4304  0.4372  0.4338  0.8237  0.8742  1.0820  ±0.47%     5000
· simple  41,559.27  0.0222  0.2242  0.0241  0.0237  0.0333  0.0439  0.1288  ±0.36%    20780   fastest

✓ bench/ssr-harlanzw-com-e2e.bench.ts > ssr e2e bench 2947ms
name           hz     min     max    mean     p75     p99    p995    p999     rme  samples
· e2e      2,250.82  0.3912  1.4397  0.4443  0.4544  0.6659  0.7022  0.7710  ±0.36%     5000
· simple  42,235.54  0.0217  0.2175  0.0237  0.0234  0.0323  0.0384  0.1221  ±0.34%    21119   fastest

✓ bench/ssr-harlanzw-com-e2e.bench.ts > ssr e2e bench 2915ms
name           hz     min     max    mean     p75     p99    p995    p999     rme  samples
· e2e      2,282.19  0.3843  1.4047  0.4382  0.4483  0.6476  0.6873  0.7934  ±0.37%     5000
· simple  40,613.21  0.0228  0.3312  0.0246  0.0244  0.0304  0.0325  0.1370  ±0.37%    20307   fastest

✓ bench/ssr-harlanzw-com-e2e.bench.ts > ssr e2e bench 2914ms
name           hz     min     max    mean     p75     p99    p995    p999     rme  samples
· e2e      2,282.16  0.3854  1.3827  0.4382  0.4456  0.6461  0.7164  0.8077  ±0.38%     5000
· simple  41,367.21  0.0223 0.2369  0.0242  0.0236  0.0423  0.0480  0.1356  ±0.39%    20684   fastest
```
