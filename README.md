# Marisquería El Gallego · Toledo

Web estática (HTML + CSS + JS sin dependencias). Abre `index.html` o sírvela con cualquier hosting estático (Netlify, Vercel, GitHub Pages).

```
python3 -m http.server 8000   # http://localhost:8000
```

## Monitor abierto / cerrado
El horario está en `js/main.js`, constante `SCHEDULE` (minutos desde medianoche, 0 = domingo).
Se calcula siempre con la hora de Toledo (`Europe/Madrid`), aunque el visitante esté en otra zona horaria.
Muestra tablero split‑flap, cuenta atrás, aviso de "cierra pronto" (30 min) y línea de tiempo del día.

| Día | Mediodía | Noche |
|---|---|---|
| Lunes | Cerrado | Cerrado |
| Martes–Miércoles | 13:00–17:00 | 20:00–23:30 |
| Jueves–Domingo | 13:00–17:00 | 20:00–24:00 |

Si cambia el horario, actualiza también el texto de la sección *Visítanos* y el bloque JSON‑LD de `index.html`.

## Fotos
Las imágenes actuales son fotos de stock (Unsplash) de muestra. Sustitúyelas por fotos reales del local:
coloca los archivos en `assets/img/` y cambia el `src` de cada `<img>` en `index.html`
(hero, "La casa", galería con categorías `local`, `comida`, `detras`, y `data-img` de cada plato de la carta).
Si una imagen no carga, se muestra un marcador con el nombre de la foto.

## Pendiente de confirmar con el restaurante
- Teléfono (en fuentes públicas aparecen 925 21 51 22 y 925 21 25 82).
- Platos de la carta y precio del menú del día (15 €).
