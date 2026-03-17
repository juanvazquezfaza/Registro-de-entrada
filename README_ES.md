# Registro de entrada - versión GitHub Pages

## Qué hace
- Fichar entrada con un botón.
- Ver saldo total y del mes.
- Verde si vas a favor.
- Rojo suave si debes minutos a la empresa.
- Importar histórico desde tu Excel anual.
- Exportar / importar JSON.
- Exportar CSV.

## Cómo subirlo a GitHub Pages
1. Descomprime este paquete.
2. Entra en tu repositorio de GitHub.
3. Pulsa **Add file > Upload files**.
4. Sube **todo lo que hay dentro de esta carpeta**.
5. Haz **Commit changes**.
6. Ve a **Settings > Pages**.
7. En **Source** elige **Deploy from a branch**.
8. En **Branch** elige **main** y carpeta **/(root)**.
9. Guarda y espera a que salga la URL.

## Cómo cargar tu Excel
1. Abre la app ya publicada.
2. Pulsa **Importar Excel**.
3. Elige tu archivo `Registro_entradas_2026_saldo_simple_FINAL.xlsx`.
4. La app leerá:
   - `CONFIG!B3` = hora objetivo
   - `REGISTRO!A` = fecha
   - `REGISTRO!C` = entrada
   - `REGISTRO!H` = observaciones
5. Acepta reemplazar los datos actuales.

## Importante
- Esta versión guarda los datos en el navegador.
- En GitHub Pages no hay base de datos.
- Cuando te guste, la pasamos al Synology para que los datos estén centralizados.
