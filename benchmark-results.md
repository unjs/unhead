# transformHtmlTemplate Benchmark Results

## Current Implementation (With Changes)

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

## Main Branch Results (Without Changes)

*To be filled after running benchmark on main branch*