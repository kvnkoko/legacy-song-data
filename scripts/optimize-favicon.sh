#!/bin/bash

# Script to optimize favicon for web use
# This creates multiple sizes and formats for better browser support

INPUT="public/favicon.png"
OUTPUT_DIR="public"

if [ ! -f "$INPUT" ]; then
  echo "❌ Error: $INPUT not found"
  exit 1
fi

echo "🖼️  Optimizing favicon..."

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
  echo "Using ImageMagick..."
  
  # Create optimized favicon.ico (multi-size ICO file)
  convert "$INPUT" \
    -resize 32x32 \
    -define icon:auto-resize=16,32,48 \
    "$OUTPUT_DIR/favicon.ico" 2>/dev/null || echo "Could not create .ico"
  
  # Create optimized PNG sizes
  convert "$INPUT" -resize 32x32 "$OUTPUT_DIR/favicon-32x32.png" 2>/dev/null
  convert "$INPUT" -resize 16x16 "$OUTPUT_DIR/favicon-16x16.png" 2>/dev/null
  convert "$INPUT" -resize 192x192 "$OUTPUT_DIR/android-chrome-192x192.png" 2>/dev/null
  convert "$INPUT" -resize 512x512 "$OUTPUT_DIR/android-chrome-512x512.png" 2>/dev/null
  convert "$INPUT" -resize 180x180 "$OUTPUT_DIR/apple-touch-icon.png" 2>/dev/null
  
  # Optimize the main favicon.png (resize to reasonable size)
  convert "$INPUT" -resize 512x512 -strip "$OUTPUT_DIR/favicon.png" 2>/dev/null
  
  echo "✅ Favicon optimized using ImageMagick"
  
# Check if sips (macOS) is available
elif command -v sips &> /dev/null; then
  echo "Using macOS sips..."
  
  # Create optimized sizes
  sips -z 32 32 "$INPUT" --out "$OUTPUT_DIR/favicon-32x32.png" 2>/dev/null
  sips -z 16 16 "$INPUT" --out "$OUTPUT_DIR/favicon-16x16.png" 2>/dev/null
  sips -z 192 192 "$INPUT" --out "$OUTPUT_DIR/android-chrome-192x192.png" 2>/dev/null
  sips -z 512 512 "$INPUT" --out "$OUTPUT_DIR/android-chrome-512x512.png" 2>/dev/null
  sips -z 180 180 "$INPUT" --out "$OUTPUT_DIR/apple-touch-icon.png" 2>/dev/null
  
  # Optimize main favicon (resize to 512x512 max)
  sips -z 512 512 "$INPUT" --out "$OUTPUT_DIR/favicon-optimized.png" 2>/dev/null
  
  echo "✅ Favicon optimized using macOS sips"
  echo "⚠️  Note: Created favicon-optimized.png. You may want to replace favicon.png with this."
  
else
  echo "⚠️  No image optimization tools found (ImageMagick or sips)"
  echo "💡 Your favicon is very large (3.6MB, 7493x7272px)"
  echo "💡 For best results, manually resize it to 512x512 or smaller"
  echo "💡 You can use online tools like:"
  echo "   - https://realfavicongenerator.net/"
  echo "   - https://favicon.io/"
  exit 1
fi

echo ""
echo "✅ Favicon optimization complete!"
echo "📁 Optimized files created in $OUTPUT_DIR"
