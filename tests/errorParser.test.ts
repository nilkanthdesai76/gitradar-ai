import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ErrorParser } from '../src/parser/errorParser.ts';

describe('ErrorParser Multi-Language Diagnostics', () => {
  test('parses Swift compiler diagnostics', () => {
    const output = `
Building for debugging...
/Users/dev/Work/Notchy/Sources/Engine.swift:42:15: error: cannot find 'buffer' in scope
let x = buffer.count
        ^~~~~~
`;
    const diags = ErrorParser.parse(output, 'swift');
    assert.strictEqual(diags.length, 1);
    assert.strictEqual(diags[0].filePath, '/Users/dev/Work/Notchy/Sources/Engine.swift');
    assert.strictEqual(diags[0].lineNumber, 42);
    assert.strictEqual(diags[0].column, 15);
    assert.strictEqual(diags[0].message, "cannot find 'buffer' in scope");
    assert.strictEqual(diags[0].language, 'swift');
  });

  test('parses Rust compiler errors', () => {
    const output = `
error[E0308]: mismatched types
 --> src/main.rs:18:9
  |
18|     let x: i32 = "string";
  |                  ^^^^^^^^ expected i32, found &str
`;
    const diags = ErrorParser.parse(output, 'rust');
    assert.strictEqual(diags.length, 1);
    assert.strictEqual(diags[0].filePath, 'src/main.rs');
    assert.strictEqual(diags[0].lineNumber, 18);
    assert.strictEqual(diags[0].column, 9);
    assert.strictEqual(diags[0].message, 'mismatched types');
    assert.strictEqual(diags[0].language, 'rust');
  });

  test('parses Pytest assertion errors', () => {
    const output = `
_________________________________ test_calculate _________________________________
tests/test_math.py:25: AssertionError: assert 4 == 5
`;
    const diags = ErrorParser.parse(output, 'python');
    assert.strictEqual(diags.length, 1);
    assert.strictEqual(diags[0].filePath, 'tests/test_math.py');
    assert.strictEqual(diags[0].lineNumber, 25);
    assert.ok(diags[0].message.includes('AssertionError: assert 4 == 5'));
  });

  test('parses Go test failures', () => {
    const output = `
--- FAIL: TestCalculation (0.00s)
    calc_test.go:14: expected result 10, got 8
FAIL
`;
    const diags = ErrorParser.parse(output, 'go');
    assert.strictEqual(diags.length, 1);
    assert.strictEqual(diags[0].filePath, 'calc_test.go');
    assert.strictEqual(diags[0].lineNumber, 14);
    assert.strictEqual(diags[0].message, 'expected result 10, got 8');
  });
});
