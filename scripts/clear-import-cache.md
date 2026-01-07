# Clear Import CSV Page Cache

To clear the import CSV page cache, you can:

1. **Browser Cache**: Clear your browser's localStorage and sessionStorage for this site
2. **Next.js Cache**: Already cleared (`.next` directory removed)
3. **Database Import Sessions**: Will be cleared by the cleanup script

## Manual Browser Cache Clear

Open your browser's developer console (F12) and run:

```javascript
// Clear localStorage
localStorage.clear();

// Clear sessionStorage  
sessionStorage.clear();

// Clear specific import-related keys
Object.keys(localStorage).forEach(key => {
  if (key.includes('import') || key.includes('csv') || key.includes('mapping')) {
    localStorage.removeItem(key);
  }
});

Object.keys(sessionStorage).forEach(key => {
  if (key.includes('import') || key.includes('csv') || key.includes('mapping')) {
    sessionStorage.removeItem(key);
  }
});

console.log('✅ Import cache cleared');
```



