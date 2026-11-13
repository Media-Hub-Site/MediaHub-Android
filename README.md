# MediaHub Mobile (Android) 📱⚡

Versión móvil y multiplataforma del ecosistema **Media Hub**, diseñada con una arquitectura híbrida moderna de alto rendimiento impulsada por **React (TypeScript), TailwindCSS y Capacitor**.

---

## 🎯 Objetivo y Filosofía

Llevar la versatilidad de la suite de escritorio de **Media Hub** a dispositivos móviles **Android**, manteniendo:
- **Estética Bento Grid:** Misma identidad visual, diseño oscuro/claro y respuesta táctil con retroalimentación háptica nativa (`@capacitor/haptics`).
- **Procesamiento Local-First:** Las conversiones de imágenes y síntesis de audio se realizan directamente en el dispositivo sin enviar datos a servidores externos.
- **Soporte Bilingüe:** Interfaz completa en **Español** e **Inglés**.

---

## 🚀 Módulos Activos (Fase 1)

### 1. 🖼️ Convertidor de Imágenes (Image Tools Mobile)
- **Conversión de Formatos:** Intercambio instantáneo entre `WEBP`, `JPEG`, `PNG` y `BMP`.
- **Compresión Inteligente:** Control fino de calidad (10% - 100%) con cálculo visual del porcentaje de ahorro de espacio.
- **Escalado y Redimensión:** Preajustes de escala (25%, 50%, 75%, 100%, 150%) con retención de relación de aspecto.
- **Filtros Visuales:** Escala de grises, inversión de color, tono sepia, control de brillo y contraste.
- **Marca de Agua:** Inserción de texto personalizado con posición y opacidad ajustables.
- **Procesamiento por Lotes:** Procesa múltiples fotos de la galería o cámara a la vez.
- **Integración Nativa:** Guardado directo en el almacenamiento o envío mediante la hoja de compartir nativa de Android (`@capacitor/share`).

### 2. 🎧 AudioLab Mobile (Laboratorio de Síntesis Matemática & SFX)
- **Fórmulas Bytebeat en Vivo:** Evaluación en tiempo real de expresiones matemáticas basadas en la variable de tiempo `t`.
- **Biblioteca de Presets:** Incluye fórmulas icónicas como *Classic 42 (viznut)*, *Cyberpunk Arp*, *Techno Beat*, *Glitch Machine* y *Space Siren*.
- **Frecuencias de Muestreo:** Ajustable entre 8000 Hz (retro 8-bit), 11025 Hz, 22050 Hz y 44100 Hz (alta fidelidad).
- **Osciloscopio Visual:** Gráfico en tiempo real de la forma de onda sintetizada en un canvas reactivo de 60 FPS.
- **Generador de SFX Procedural:** Efectos de sonido instantáneos generados algorítmicamente (*Burbuja Zen*, *Moneda Arcade*, *Láser*, *Salto*, *Explosión*, *Campana*).
- **Exportación WAV Estándar:** Generación y descarga directa de archivos PCM WAV de 16 bits sin pérdidas para compartir o utilizar en otros proyectos.

---

## 📋 Módulos en Hoja de Ruta (Próximas Fases)
- **Convertidor de Documentos:** Herramientas y conversor inteligente PDF.
- **Convertidor de Links:** Descargas batch móviles con backend / workers.
- **BlueGuard Mobile:** Diagnóstico de seguridad de red y puertos locales.
- **StreamStudio Mobile:** Visor de alertas y chat Twitch para streamers en movilidad.
- **ChilePlanos Mobile:** Visor de planimetría técnica y especificaciones.
- **Gestor Presupuestario Mobile:** Registro de transacciones y cuotas en base de datos local SQLite.

---

## 💻 Desarrollo y Ejecución Local

### Prerrequisitos
- **Node.js:** v18+ (recomendado v22+)
- **NPM:** v9+
- **Android Studio & SDK:** Para compilación o emulación local.

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar entorno web de desarrollo
```bash
npm run dev
```

### 3. Compilar y sincronizar con Android
```bash
npm run build
npx cap sync android
```

### 4. Abrir en Android Studio
```bash
npx cap open android
```

---

## 🤖 Integración Continua y Compilaciones Automáticas (CI/CD)

El repositorio cuenta con un flujo automatizado en `.github/workflows/build-android.yml`:
- **Compilación automática de APK:** Cada vez que se realiza un push a la rama `main` o `develop`, GitHub Actions compila el proyecto y genera el instalador `MediaHub-Mobile.apk` como artefacto descargable.
- **Releases automáticas:** Al crear una etiqueta de versión (ejemplo: `git tag v1.0.0 && git push origin v1.0.0`), la acción publica automáticamente una nueva Release en GitHub con el archivo APK listo para instalar en cualquier teléfono Android.
