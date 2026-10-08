# Actualización automática USD/COP

El backend consulta la TRM oficial del conjunto `32sa-8pi3` de Datos Abiertos Colombia, suministrado por la Superintendencia Financiera. El valor representa COP por 1 USD.

- Horarios: **06:00 y 18:00, America/Bogota (UTC-05:00)**, independientemente de la zona horaria del servidor.
- Arranque: consulta adicional inmediata para recuperar la tasa después de un apagado. No bloquea el inicio de la API.
- Persistencia: un nuevo registro en `dollar_rates` por consulta exitosa, con `rate` y `effective_date` como **DATETIME de la consulta en UTC**. Ejecutar primero `sql/05-dollar-rate-datetime.sql` para migrar la columna DATE existente. Los valores antiguos quedan a medianoche; no es posible recuperar sus horas originales. Dos consultas pueden guardar el mismo valor porque la TRM es diaria. La vigencia oficial diaria se conserva en la auditoría.
- Auditoría: `audit_logs`, acción `update-dollar-rate`, conserva fecha/hora de consulta, vigencia oficial, fuente e ID del registro.
- Selección de tasa para pagos: última fecha/hora de consulta no futura, luego mayor ID. El filtro compara con el instante actual, no con la medianoche del día. Se conserva la conversión guardada en los checkouts ya creados.
- Validación: moneda COP, importe positivo, vigencia que incluye el día consultado. No acepta la tasa de mañana aunque ya esté publicada.
- Fallos: timeout de 15 segundos; máximo tres intentos por ejecución, con esperas de 30 y 60 segundos. No escribe valores vacíos ni elimina tasas anteriores. Registra el error y conserva el siguiente horario.

La programación vive dentro del proceso del backend: este debe estar encendido a las horas indicadas. Al reiniciar se consulta la tasa vigente, sin reconstruir consultas históricas perdidas. En un despliegue con varias instancias, habilitar la tarea en **una sola instancia** para evitar registros duplicados entre procesos.

## Variables

```dotenv
DOLLAR_RATE_JOB_ENABLED=true
DOLLAR_RATE_RUN_ON_START=true
DOLLAR_RATE_TIMEOUT_MS=15000
```

No requiere una nueva credencial para el endpoint público consultado. Los defaults habilitan la tarea incluso si no están las variables. En réplicas secundarias usar `DOLLAR_RATE_JOB_ENABLED=false`.

## Comandos

Desde `backend`:

- `npm run rates:check`: consulta y valida la fuente; no escribe en la base.
- `npm run rates:update`: consulta y guarda una tasa de inmediato.
- `npm run test:rates`: pruebas de horarios, validación, reintentos y persistencia simulada.

Es necesario que existan `dollar_rates` y `audit_logs` y que la red permita HTTPS a `www.datos.gov.co`. Los errores pueden consultarse en la consola con el prefijo `[TRM]`.

```sql
SELECT id, rate, effective_date
FROM dollar_rates ORDER BY effective_date DESC, id DESC LIMIT 10;
```

Fuente: https://www.datos.gov.co/Econom-a-y-Finanzas/Tasa-de-Cambio-Representativa-del-Mercado-TRM/32sa-8pi3
