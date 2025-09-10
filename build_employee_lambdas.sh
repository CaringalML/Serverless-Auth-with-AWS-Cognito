#!/bin/bash

# Build script for employee Lambda functions with all dependencies

echo "Building Employee Lambda Functions with dependencies..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# List of employee functions
FUNCTIONS=("employees_create" "employees_list" "employees_update" "employees_delete")

# Base directory
BASE_DIR="/mnt/c/Javascript projects/Serverless-Auth-Cognito/lambda_functions"

for FUNCTION in "${FUNCTIONS[@]}"; do
    echo -e "${YELLOW}Building ${FUNCTION}...${NC}"
    
    # Navigate to function directory
    cd "${BASE_DIR}/${FUNCTION}"
    
    # Clean up old build artifacts
    rm -rf package temp_build ${FUNCTION}.zip
    
    # Create temp build directory
    mkdir -p temp_build
    
    # Copy function code
    cp ${FUNCTION}.py temp_build/
    
    # Copy shared utilities
    cp ../shared/utils.py temp_build/
    cp ../shared/turnstile.py temp_build/
    
    # Install Python dependencies if requirements.txt exists
    if [ -f requirements.txt ]; then
        echo "Installing Python dependencies..."
        pip install -r requirements.txt -t temp_build/ --quiet --disable-pip-version-check
    fi
    
    # Create the deployment package
    cd temp_build
    zip -r ../${FUNCTION}.zip . -q
    cd ..
    
    # Clean up temp directory
    rm -rf temp_build
    
    echo -e "${GREEN}✓ ${FUNCTION}.zip created${NC}"
done

echo -e "${GREEN}All employee Lambda functions built successfully!${NC}"

# Return to base directory
cd "${BASE_DIR}/.."

echo ""
echo "Next steps:"
echo "1. Run 'terraform apply' to deploy the updated Lambda functions"
echo "2. Test the employee management features in the frontend"