#!/bin/bash

# Pre-push hook to prevent direct pushes to main branch
# This protects your production branch from accidental pushes

protected_branch='main'
current_branch=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

# Check if pushing to main
while read local_ref local_sha remote_ref remote_sha
do
  if [ "$remote_ref" = "refs/heads/$protected_branch" ]; then
    echo ""
    echo "❌ =========================================="
    echo "❌ ERROR: Direct push to $protected_branch blocked!"
    echo "❌ =========================================="
    echo ""
    echo "⚠️  The main branch is protected for production safety."
    echo ""
    echo "📋 To deploy to production:"
    echo "   1. Make sure you're on a draft branch:"
    echo "      git checkout draft/your-feature"
    echo ""
    echo "   2. Merge to main (locally):"
    echo "      git checkout main"
    echo "      git merge draft/your-feature"
    echo ""
    echo "   3. Push main (this will be allowed after merge):"
    echo "      git push origin main"
    echo ""
    echo "💡 Or use a pull request workflow if using GitHub/GitLab"
    echo ""
    exit 1
  fi
done

# Allow push if not to main
exit 0
