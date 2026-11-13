# MediaHub Mobile (Android)

Versión móvil y multiplataforma del ecosistema **Media Hub**, construida con **React + TypeScript + TailwindCSS v4 + Capacitor 8**.

---

## Módulos Activos en Android (3 / 10)

### 1. Herramientas de Imagen (`Image Tools`)
- Conversión local entre **WEBP**, **JPEG**, **PNG** y **BMP** (codificador binario 24-bit real).
- Compresión inteligente con control de calidad, escalado porcentual (`25%` a `150%`).
- Filtros (`Blanco y Negro`, `Sepia`, `Invertir`), sliders de **Brillo** y **Contraste** (50% - 150%).
- **Marca de Agua** personalizable (texto, opacidad y 5 posiciones).
- Procesamiento por lotes con guardado local y compartir nativo.

### 2. AudioLab Mobile
- **Fórmulas Bytebeat** en vivo con biblioteca de presets y frecuencias de `8k` a `44k` Hz.
- **Analizador Acústico Real (`AnalyserNode`)** con 3 modos visuales: **Onda (Osciloscopio)**, **Espectro FFT** y **Barrido Continuo (Sweep)** + Zoom (`1x`, `2x`, `4x`).
- Modo **Sin límite de tiempo** (bloquea exportación WAV mientras está activo) y duración configurable (`3s`, `6s`, `10s`, `15s`) en modo finito.
- **Generador Procedural SFX** con 6 efectos y exportación directa a **WAV PCM 16-bit**.

### 3. Convertidor de Documentos (`Document Converter`)
- **Imágenes a PDF**: generación local de PDF 1.4 multipágina (A4 o ajustado a imagen).
- **Texto a PDF**: creación de documentos A4 paginados desde notas o texto plano.
- **CSV ↔ JSON**: conversión bidireccional instantánea con copiado, descarga y compartir.

---

## Scripts de Desarrollo y Verificación

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npx cap sync android
```

---

## CI/CD en GitHub Actions

El workflow [`.github/workflows/build-android.yml`](.github/workflows/build-android.yml) ejecuta en cada push y pull request:
1. `npm ci`
2. `npm run typecheck`, `npm run lint` y `npm test`
3. `npm run build` + `npx cap sync android`
4. `./gradlew assembleDebug` (JDK 21) y publica `MediaHub-Mobile.apk` como artefacto (y Release automático en tags `v*`).
