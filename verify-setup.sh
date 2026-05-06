#!/bin/bash
# Installation & Verification Checklist

echo "================================================"
echo "Slip in Bloom - POS System Verification"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js ${VERSION} installed${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
fi

# Check npm
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm ${VERSION} installed${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
fi

# Check Rust
echo "3. Checking Rust..."
if command -v rustc &> /dev/null; then
    VERSION=$(rustc --version)
    echo -e "${GREEN}✓ ${VERSION}${NC}"
else
    echo -e "${RED}✗ Rust not found${NC}"
fi

# Check Cargo
echo "4. Checking Cargo..."
if command -v cargo &> /dev/null; then
    VERSION=$(cargo --version)
    echo -e "${GREEN}✓ ${VERSION}${NC}"
else
    echo -e "${RED}✗ Cargo not found${NC}"
fi

# Check project files
echo ""
echo "5. Checking project files..."

FILES=(
    "package.json"
    "tsconfig.json"
    "vite.config.ts"
    "index.html"
    ".env.example"
    ".gitignore"
    "src/App.tsx"
    "src/main.tsx"
    "src/components/BillingScreen.tsx"
    "src/services/db.ts"
    "src/services/sync.ts"
    "src/services/printer.ts"
    "src/types/index.ts"
    "src-tauri/src/main.rs"
    "src-tauri/src/db.rs"
    "src-tauri/src/commands.rs"
    "src-tauri/Cargo.toml"
    "src-tauri/tauri.conf.json"
    "docs/README.md"
    "docs/SETUP_GUIDE.md"
    "docs/DATABASE_SCHEMA.md"
    "docs/IMPLEMENTATION_GUIDE.md"
)

MISSING=0
for file in "${FILES[@]}"; do
    if [ -f "$file" ] || [ -d "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file"
        MISSING=$((MISSING + 1))
    fi
done

echo ""
if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✓ All project files present${NC}"
else
    echo -e "${RED}✗ Missing $MISSING files${NC}"
fi

# Check dependencies
echo ""
echo "6. Checking npm dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ node_modules exists${NC}"
else
    echo -e "${YELLOW}⚠ node_modules not installed (run: npm install)${NC}"
fi

# Check environment
echo ""
echo "7. Checking environment configuration..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local configured${NC}"
else
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}⚠ .env.local not found (copy from .env.example)${NC}"
    else
        echo -e "${RED}✗ .env.example not found${NC}"
    fi
fi

echo ""
echo "================================================"
echo "Installation Summary"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. npm install                 # Install dependencies"
echo "2. cp .env.example .env.local  # Setup environment"
echo "3. npm run tauri:dev           # Start development"
echo ""
echo "Documentation:"
echo "- Setup Guide: docs/SETUP_GUIDE.md"
echo "- Quick Ref:   docs/QUICK_REFERENCE.md"
echo "- Architecture: docs/IMPLEMENTATION_GUIDE.md"
echo ""
echo "================================================"
