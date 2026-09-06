# NEW-18 — prueba tras rotación declarada

2026-09-06 16:20:43.045070 UTC. Una llamada por endpoint desde pg_net/Vault:
notify request 6 HTTP 401; commerce-order-sync?limit=25 request 7 HTTP 401;
expire-chips request 8 HTTP 401. Los tres sin timeout. No se repitieron llamadas.

Revisión limitada a lectura de Vault y construcción del Authorization header:
una entrada coincidente; no vacía; sin whitespace ni caracteres de control;
sin prefijo Bearer preexistente; sin comillas exteriores. Serialización JSON
conserva exactamente Bearer + espacio + valor de Vault. Job lee la misma entrada
con INTO STRICT. No se imprimieron valores, headers ni hashes del secreto.

Los cuerpos de las tres respuestas coinciden con el error de aplicación
No autorizado, no con una página Authentication Required de protección de deploy.
No se detectó defecto en lectura/concatenación. Esto no demuestra qué valor recibió
finalmente la aplicación ni igualdad con su entorno runtime. No se investigó ni
modificó Vercel, de acuerdo con el alcance limitado pedido después de un 401.

Estado: job INACTIVO; NEW-18 OPEN; NO-GO provisional. Cadencia y heartbeats de
este scheduler no aprobados. No se modificó arquitectura ni credenciales.
