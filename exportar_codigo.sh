#!/bin/bash

# Nombre del archivo de salida
OUTPUT="codigo_completo_bitafly.txt"

# Limpiar el archivo si ya existe y poner el encabezado inicial
echo "--- START OF FILE $OUTPUT ---" > $OUTPUT

echo "🚀 Iniciando consolidación de código..."

# Buscar archivos ignorando carpetas innecesarias y archivos binarios
# Incluimos: .js, .json (excepto lock), .css, .mjs, .sql, .env.example
find . -maxdepth 10 \
    -not -path '*/.*' \
    -not -path './node_modules*' \
    -not -path './.next*' \
    -not -path './public/*' \
    -not -path './package-lock.json' \
    -not -path "./$OUTPUT" \
    -not -path "./exportar_codigo.sh" \
    -type f \( \
        -name "*.js" -o \
        -name "*.json" -o \
        -name "*.css" -o \
        -name "*.mjs" -o \
        -name "*.sql" -o \
        -name "*.env*" -o \
        -name "README.md" \
    \) | while read -r file; do

    echo "📄 Agregando: $file"
    echo "" >> $OUTPUT
    echo "--- FILE: $file ---" >> $OUTPUT
    echo "" >> $OUTPUT
    cat "$file" >> $OUTPUT
    echo "" >> $OUTPUT
done

echo "" >> $OUTPUT
echo "--- END OF FILE ---" >> $OUTPUT

echo "✅ ¡Listo! Todo tu código se ha guardado en: $OUTPUT"