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
 ✓ bench/ssr-harlanzw-com-e2e.bench.ts > ssr e2e bench 3067ms
     name           hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · e2e      2,134.55  0.4019  1.4006  0.4685  0.4831  0.7774  0.8233  0.9579  ±0.46%     5000
   · simple  38,325.44  0.0228  0.4301  0.0261  0.0249  0.0505  0.0560  0.1621  ±0.52%    19163   fastest
   
✓ bench/ssr-harlanzw-com-e2e.bench.ts > ssr e2e bench 3100ms
   name           hz     min     max    mean     p75     p99    p995    p999     rme  samples
 · e2e      2,105.37  0.3998  1.7183  0.4750  0.4886  0.9004  0.9598  1.1246  ±0.53%     5000
 · simple  37,885.63  0.0225  0.2561  0.0264  0.0259  0.0520  0.0555  0.1342  ±0.40%    18943   fastest
 
 ✓ bench/ssr-harlanzw-com-e2e.bench.ts > ssr e2e bench 3158ms
     name           hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · e2e      2,054.98  0.3990  1.1435  0.4866  0.5125  0.8812  0.9269  1.0605  ±0.53%     5000
   · simple  37,126.87  0.0228  0.9798  0.0269  0.0264  0.0496  0.0582  0.1486  ±0.57%    18564   fastest 
   
 ✓ bench/ssr-harlanzw-com-e2e.bench.ts > ssr e2e bench 3234ms
     name           hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · e2e      1,991.87  0.4003  1.4117  0.5020  0.5321  0.8760  0.9741  1.0921  ±0.57%     5000
   · simple  40,268.21  0.0226  0.2101  0.0248  0.0244  0.0408  0.0510  0.1299  ±0.37%    20135   fastest   

 ✓ bench/ssr-harlanzw-com-e2e.bench.ts > ssr e2e bench 3138ms
     name           hz     min     max    mean     p75     p99    p995    p999     rme  samples
   · e2e      2,070.56  0.3927  1.5478  0.4830  0.5251  0.8516  0.9581  0.9999  ±0.53%     5000
   · simple  37,455.01  0.0229  0.2217  0.0267  0.0255  0.0479  0.0528  0.1618  ±0.47%    18728   fastest   
```

## ssr-perf.bench.ts

-- after --

```
✓ bench/ssr-perf.bench.ts > ssr bench 8954ms
name         hz     min      max    mean     p75      p99     p995     p999     rme  samples
· x50 ssr  113.05  8.1113  15.1597  8.8454  8.9100  12.3025  13.8244  14.8498  ±0.46%     1000

✓ bench/ssr-perf.bench.ts > ssr bench 8944ms
name         hz     min      max    mean     p75      p99     p995     p999     rme  samples
· x50 ssr  113.20  7.9871  17.4970  8.8337  8.9022  12.5053  12.9496  17.3206  ±0.56%     1000

✓ bench/ssr-perf.bench.ts > ssr bench 8766ms
name         hz     min      max    mean     p75      p99     p995     p999     rme  samples
· x50 ssr  115.49  8.0093  15.2666  8.6591  8.6741  12.4337  12.8412  15.0107  ±0.53%     1000

✓ bench/ssr-perf.bench.ts > ssr bench 8877ms
name         hz     min      max    mean     p75      p99     p995     p999     rme  samples
· x50 ssr  114.07  8.1292  17.7684  8.7666  8.6782  13.8655  15.0269  16.9608  ±0.69%     1000

✓ bench/ssr-perf.bench.ts > ssr bench 8909ms
name         hz     min      max    mean     p75      p99     p995     p999     rme  samples
· x50 ssr  113.73  8.0236  16.8817  8.7926  8.7953  13.3301  15.0942  16.8089  ±0.62%     1000
```

--- before ---

```
✓ bench/ssr-perf.bench.ts > ssr bench 9815ms
name         hz     min      max    mean     p75      p99     p995     p999     rme  samples
· x50 ssr  103.09  8.9346  26.6410  9.7001  9.7547  13.2671  13.6113  14.7850  ±0.57%     1000

✓ bench/ssr-perf.bench.ts > ssr bench 9992ms
name         hz     min      max    mean      p75      p99     p995     p999     rme  samples
· x50 ssr  101.23  8.7280  17.8255  9.8786  10.0013  16.2151  16.9746  17.6946  ±0.72%     1000

✓ bench/ssr-perf.bench.ts > ssr bench 9487ms
name         hz     min      max    mean     p75      p99     p995     p999     rme  samples
· x50 ssr  106.64  8.5666  18.2041  9.3771  9.4008  12.7400  13.4962  17.1925  ±0.49%     1000

✓ bench/ssr-perf.bench.ts > ssr bench 9413ms
name         hz     min      max    mean     p75      p99     p995     p999     rme  samples
· x50 ssr  107.47  8.6505  18.9421  9.3051  9.3052  12.9069  14.0262  15.9473  ±0.50%     1000

✓ bench/ssr-perf.bench.ts > ssr bench 10102ms
name         hz     min      max    mean     p75      p99     p995     p999     rme  samples
· x50 ssr  100.22  9.0020  22.1970  9.9777  9.8022  18.8643  20.0461  21.6316  ±1.07%     1000
```
