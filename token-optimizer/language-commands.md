# Language-Specific Token-Saving Commands

## Python
```bash
# Syntax check
python -m py_compile file.py

# Lint specific rules only
python -m flake8 file.py --select=E1,E2,W6 --max-line-length=100

# Find undefined names
python -m pyflakes file.py

# Type check (fast)
python -m mypy file.py --ignore-missing-imports --no-error-summary

# Show only class/function signatures
grep -n "^class \|^def \|^    def \|^        def " file.py

# Show imports only
grep -n "^import\|^from" file.py

# Find where a function is called
grep -rn "function_name(" src/ --include="*.py"

# Run only related tests
python -m pytest tests/ -k "test_name" -x -q --tb=short
```

## JavaScript / TypeScript
```bash
# Syntax check (no execution)
node --check file.js
npx tsc --noEmit --skipLibCheck

# Lint
npx eslint file.js --quiet  # errors only
npx eslint file.js --rule '{"no-unused-vars": "error"}'

# Find exports
grep -n "^export\|module.exports" file.js

# Find function definitions
grep -n "function \|const .* = \(.*\) =>\|async function" file.js

# Run specific test
npx jest tests/specific.test.js --no-coverage -t "test name"
```

## Go
```bash
# Fast syntax + type check
go vet ./...
go build ./... 2>&1 | head -20

# Find function signatures
grep -n "^func " *.go

# Run specific test
go test ./pkg/... -run TestName -v

# Check imports
goimports -l file.go
```

## Rust
```bash
# Check without full compile
cargo check 2>&1 | head -40

# Lint
cargo clippy -- -D warnings 2>&1 | head -30

# Run specific test
cargo test test_name -- --nocapture

# Show public API
grep -n "^pub fn\|^pub struct\|^pub enum" src/lib.rs
```

## Shell / Bash
```bash
# Syntax check
bash -n script.sh
shellcheck script.sh

# Show function definitions
grep -n "^function \|^[a-z_]*() {" script.sh
```

## JSON / YAML / TOML
```bash
# JSON validate
python -m json.tool file.json > /dev/null && echo "valid"
cat file.json | python -c "import sys,json; json.load(sys.stdin); print('OK')"

# YAML validate
python -c "import yaml; yaml.safe_load(open('file.yaml')); print('OK')"

# TOML validate (Python 3.11+)
python -c "import tomllib; tomllib.load(open('file.toml','rb')); print('OK')"

# Show YAML keys only (top level)
python -c "import yaml; d=yaml.safe_load(open('f.yaml')); print(list(d.keys()))"
```

## SQL
```bash
# Validate syntax (PostgreSQL)
psql -c "EXPLAIN $(cat query.sql)" 2>&1 | head -5

# Show table structure only
psql -c "\d tablename"
```