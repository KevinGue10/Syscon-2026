# Pagos con Cobru

El backend reemplaza la creación, captura y webhook de PayPal por checkout alojado de Cobru. PayPhone manual, transferencia bancaria y cupones conservan sus rutas. Los registros históricos de PayPal permanecen en la base, pero ya no se crean ni procesan pagos nuevos de ese proveedor.

## Configuración

Requiere Node.js 18 o superior y las tablas existentes de pagos, historial y auditoría; no agrega columnas ni dependencias. Añadir a `backend/.env`:

```dotenv
COBRU_BASE_URL=https://dev.cobru.co
COBRU_API_KEY=<llave de integración de sandbox>
COBRU_REFRESH_TOKEN=<refresh token de sandbox>
COBRU_CALLBACK_TOKEN=<secreto aleatorio largo generado para esta aplicación>
COBRU_CALLBACK_URL=https://<dominio público del backend>/api/payments/cobru/webhook
COBRU_RETURN_URL=https://<dominio del frontend>/<página de resultado>
COBRU_EXPIRATION_DAYS=1
COBRU_TIMEOUT_MS=15000
```

El archivo `.env` local no se modificó. Las credenciales se obtienen en la cuenta Cobru; no enviarlas al frontend. El servicio renueva el token con `POST /token/refresh/`, usando `refresh` en el body, y lo guarda en memoria por un máximo de 50 minutos por proceso. La consulta reintenta una vez tras HTTP 401; la creación nunca se repite automáticamente. Un 401 en creación invalida el token para la siguiente operación.

En producción, Cobru documenta `https://prod.cobru.co` como servidor. Cambiar dominio y credenciales después de validar sandbox. Las URLs de retorno y callback deben ser HTTPS. Para desarrollo local usar una URL pública HTTPS que apunte al backend, manteniendo `/api/payments/cobru/webhook`.

Los logs del backend omiten query strings para evitar registrar el secreto del callback. Configurar también el proxy/hosting para omitir o redactar `token` en sus logs. El secreto no se almacena en respuestas de pago ni en snapshots de creación.

## API para el frontend

Las rutas de creación y consulta requieren `Authorization: Bearer <JWT del usuario>`. Solo el propietario de la inscripción o un administrador puede usarlas.

### Crear checkout

`POST /api/payments/cobru/create-payment`

```json
{
  "registrationId": 123,
  "includesTour": false,
  "requiresInvoice": false
}
```

Los booleanos son opcionales: si faltan, se usan las preferencias guardadas. No enviar `amount`, `amountUsd`, `amountCop`, `currency` ni `taxAmount`; se rechazan. Se cobra el saldo pendiente completo en USD, convertido a COP con la última tasa vigente de `dollar_rates`. La tasa debe existir y ser positiva. Se guardan ambos importes y la tasa utilizada; los pagos posteriores usan su propia cotización.

La respuesta conserva el contrato `data.payment`, `data.registration`, `data.paymentSummary`. Redirigir al usuario a `data.payment.paymentUrl`. Cobru devuelve un slug: el servicio construye `baseUrl/slug`. Los métodos habilitados en `src/config/env.js` son Bre-B, PSE, Nequi y tarjeta; confirmar su disponibilidad en la cuenta.

Las preferencias de factura e importes mantienen la lógica de precios existente. Se envía `iva: 0` porque el importe ya contiene los impuestos calculados localmente y `client_assume_costs: false` para conservar el importe bruto esperado. No se modificó la política fiscal ni se utiliza `payed_amount` como importe pagado por el cliente: puede representar el neto después de comisiones.

Se reutiliza un checkout pendiente para la inscripción y se serializa su reserva con bloqueo de fila. Si cambian el saldo o las opciones, se requiere expirar y reconciliar el checkout previo. Un timeout o respuesta inválida deja el intento en `pending_link` con referencia `SYSCON-<paymentId>`; no crea otro cobro al reintentar. Revisar ese intento en Cobru y resolverlo con soporte antes de autorizar uno nuevo. No hay una API pública que borre/reinicie intentos ambiguos.

### Consultar y conciliar

`POST /api/payments/cobru/:paymentId/refresh`

Consultar esta ruta al volver de Cobru; `COBRU_RETURN_URL` recibirá `paymentId` como query parameter. Una redirección por sí sola nunca acredita el pago. También se puede usar para conciliación administrativa de pagos existentes, incluyendo reembolsos.

### Callback

`POST /api/payments/cobru/webhook?paymentId=<id>&token=<secreto>`

El servicio construye esa URL al crear el cobro. No requiere JWT de usuario. Primero valida el secreto y persiste el body en `audit_logs`; después consulta `GET /cobru_detail/{slug}` con las credenciales Cobru. Comprueba slug, PK si está presente, importe COP bruto y moneda si el proveedor la informa. Solo utiliza el estado de esa consulta autenticada.

| Estado Cobru | Estado local |
| --- | --- |
| 0 / 1 | pending_payment |
| 2 | rejected |
| 3 | approved |
| 4 | refunded |
| 5 | cancelled |

Actualiza pago, historial y saldo dentro de una transacción con bloqueos. Los callbacks repetidos no generan nuevos abonos ni correos de aprobación. Un pago aprobado solo puede pasar a reembolsado; el reembolsado permanece final. Pagos rechazados o expirados pueden recibir una confirmación tardía auténtica. Se conservan metadatos de creación y conversión al consultar.

El callback responde después de la conciliación. Si Cobru o la base fallan, devuelve error para permitir reentrega; el evento ya registrado permite investigar. No hay cola de procesamiento asíncrono ni conciliación programada: usar `refresh` para recuperar callbacks perdidos. Los endpoints administrativos de aprobación, rechazo y cancelación manual bloquean Cobru; su estado debe provenir del proveedor. Los reembolsos se realizan en Cobru y se concilian aquí, no se solicitan mediante esta API.

## Validación

`npm run test:cobru` ejecuta pruebas con HTTP y persistencia simulados: autenticación, contrato de creación, caché, errores, conversión, autorización, verificación de importes/identidad, callbacks falsos y repetidos, reembolsos y prevención de nuevos cobros ante intentos ambiguos. No realiza cargos ni se conecta a MySQL/Cobru.

Antes de usar pagos reales, completar una prueba en sandbox con credenciales propias, tasa vigente, callback público y retorno funcional. Confirmar especialmente `GET /cobru_detail/{slug}`: la documentación narrativa lo identifica como un endpoint legacy que debe revalidarse en la cuenta. La implementación rechaza la confirmación si no puede consultarlo. Las pruebas no comprueban bloqueos contra un servidor MySQL real.

El frontend conserva referencias y rutas PayPal del proyecto anterior. Para consumir esta integración debe llamar a las rutas Cobru anteriores, redirigir a `paymentUrl` y consultar `refresh` al retorno; esa modificación del frontend no forma parte de este cambio del backend.

Fuentes oficiales: [autenticación](https://docs.cobru.co/es/docs/authentication), [crear cobro](https://docs.cobru.co/es/docs/api/cobrus/create), [consulta](https://docs.cobru.co/es/docs/api/cobrus/consult), [referencia de consulta](https://docs.cobru.co/es/docs/api/reference/cobrus/consultCobru), [callbacks](https://docs.cobru.co/es/docs/webhooks).
