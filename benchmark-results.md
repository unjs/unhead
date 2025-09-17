# transformHtmlTemplate Benchmark Results

## First Run (Branch: benchmark-transformHtmlTemplate)

Benchmark run on: 2025-09-18

### Results

| Test Case | Operations/sec | Relative Performance |
|-----------|---------------|---------------------|
| Basic HTML template | 81,733 | Baseline (fastest) |
| Multiple head pushes | 51,827 | 1.58x slower |
| Complex HTML template | 33,495 | 2.44x slower |
| Large HTML template | 5,936 | 13.77x slower |

### Test Cases

1. **Basic HTML template**: Simple HTML with basic head data injection
2. **Multiple head pushes**: Simulating multiple components adding head data
3. **Complex HTML template**: HTML with multiple meta tags, links, and scripts
4. **Large HTML template**: Template with 100 sections of content

### Observations

- Template complexity and size significantly impact performance
- Basic templates are processed over 13x faster than large templates
- Multiple head.push() operations have moderate performance impact
- Complex HTML with many existing head elements shows noticeable slowdown

## Performance Comparison

*Results from main branch (without changes) will be added below*

---

## Second Run (Branch: main - with current changes)

Benchmark run on: 2025-09-18

### Results

| Test Case | Operations/sec | Relative Performance |
|-----------|---------------|---------------------|
| Basic HTML template | 86,119 | Baseline (fastest) |
| Multiple head pushes | 54,078 | 1.59x slower |
| Complex HTML template | 38,097 | 2.26x slower |
| Large HTML template | 35,260 | 2.44x slower |

## Performance Analysis

### Key Differences Between Runs

1. **Large HTML Template Performance**:
   - First run: 5,936 ops/sec
   - Second run: 35,260 ops/sec
   - **Improvement: 5.94x faster** ⚡

2. **Complex HTML Template**:
   - First run: 33,495 ops/sec
   - Second run: 38,097 ops/sec
   - **Improvement: 1.14x faster**

3. **Basic & Multiple Head Pushes**: Similar performance with slight improvements

### Observations

- **Dramatic improvement** in large HTML template processing (5.94x faster)
- The performance gap between basic and large templates reduced from 13.77x to 2.44x
- Current changes in packages/unhead/src appear to significantly optimize large HTML processing
- Consistent improvements across all test cases