# Registro de entrada

App web estática para fichar entrada y salida con un toque y controlar el saldo horario.

## Qué hace

- Botón **Fichar entrada ahora**
- Botón **Fichar salida ahora**
- Cálculo automático de horas trabajadas
- Saldo total y saldo del mes
- Estado en **verde** si vas a favor
- Estado en **rojo suave** si debes minutos a la empresa
- Edición manual de cualquier día
- Exportación a **JSON** y **CSV**
- Funciona también como **PWA** si la publicas en un hosting estático

## Configuración inicial

La app trae por defecto:

- Jornada objetivo: **7 h 30 min**
- Pausa habitual: **0 min**
- Texto empresa: **la empresa**

Todo eso se puede cambiar dentro de la propia app.

## Cómo usarla

1. Abre `index.html`
2. Pulsa **Fichar entrada ahora** al llegar
3. Pulsa **Fichar salida ahora** al salir
4. Mira el saldo en el bloque de resumen

## Dónde guarda los datos

Los datos se guardan en el **navegador del dispositivo** mediante `localStorage`.

Eso significa:

- si la usas en tu iPhone, se queda en el iPhone
- si la usas en otro navegador o en otro dispositivo, no aparecerán los mismos registros
- para copiar tus datos, usa **Exportar JSON**

## Publicarla en Synology / hosting estático

Sube todos los archivos de esta carpeta a tu carpeta web y abre `index.html`.

Archivos principales:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `sw.js`
- carpeta `icons`

## Siguiente mejora posible

Se puede hacer una versión conectada a tu Excel o al export de ClicTac/BadgeBox para sincronizar los fichajes.
