#!/bin/bash

# Helper script to create a draft branch
# Usage: ./scripts/create-draft-branch.sh feature-name

if [ -z "$1" ]; then
  echo "❌ Error: Please provide a branch name"
  echo ""
  echo "Usage: ./scripts/create-draft-branch.sh feature-name"
  echo "Example: ./scripts/create-draft-branch.sh add-user-profile"
  exit 1
fi

BRANCH_NAME="draft/$1"
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

if [ -z "$CURRENT_BRANCH" ]; then
  echo "❌ Error: Not in a git repository or no commits yet"
  exit 1
fi

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  echo "⚠️  Branch $BRANCH_NAME already exists"
  read -p "Switch to it? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout "$BRANCH_NAME"
    echo "✅ Switched to $BRANCH_NAME"
  fi
  exit 0
fi

# Check if we're on main
if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "⚠️  You're on main branch. Creating draft branch..."
  git checkout -b "$BRANCH_NAME"
  echo "✅ Created and switched to $BRANCH_NAME"
  echo ""
  echo "💡 Tip: Make your changes and commit them here."
  echo "   When ready, merge back to main with: git checkout main && git merge $BRANCH_NAME"
else
  echo "ℹ️  You're currently on: $CURRENT_BRANCH"
  read -p "Create new draft branch '$BRANCH_NAME' from here? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout -b "$BRANCH_NAME"
    echo "✅ Created and switched to $BRANCH_NAME"
  else
    echo "Cancelled."
  fi
fi
