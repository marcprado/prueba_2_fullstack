const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
// cors: Cross-Origin Resource Sharing. Sin esto, los navegadores bloquean las peticiones
// entre diferentes dominios por seguridad. Lo necesitamos para que nuestro HTML pueda
// comunicarse con nuestro servidor Node.js (localhost:3000 hablando con localhost:3000)
const cors = require('cors');

// nodemailer: La libreria mas usada para enviar correos desde Node.js. Funciona con Gmail,
// Outlook, Yahoo y casi cualquier proveedor. Maneja toda la complejidad de SMTP por nosotros
const nodemailer = require('nodemailer');

require('dotenv').config();

// cors(): Permite peticiones desde diferentes dominios. Sin esto, el navegador bloquea
// las peticiones del frontend al backend por seguridad (CORS policy)
app.use(cors());

// express.json(): Permite que el servidor entienda JSON en el body de las peticiones
// Cuando el frontend envia fetch() con JSON, esto lo convierte en un objeto JavaScript
app.use(express.json());

// express.urlencoded(): Permite procesar datos de formularios tradicionales
// extended: true permite objetos anidados y arrays en los datos del formulario
app.use(express.urlencoded({ extended: true }));

// Sirve todos los archivos estáticos desde la carpeta 'public'.
app.use(express.static(path.join(__dirname, '../public')));

// Antes de continuar, verificamos que las credenciales de Gmail esten configuradas
// Si faltan, es mejor fallar inmediatamente con un mensaje claro

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('ERROR: Faltan variables de entorno EMAIL_USER y/o EMAIL_PASS');
    console.log('Asegurate de crear el archivo .env con las credenciales de Gmail');
    process.exit(1); // Termina el proceso inmediatamente - no puede funcionar sin credenciales
}

// Nodemailer necesita saber que servicio de correo usar y las credenciales para acceder

const transporter = nodemailer.createTransport({
    service: 'gmail', // Le decimos que use Gmail (podria ser 'outlook', 'yahoo', etc)
    auth: {
        user: process.env.EMAIL_USER, // Tu correo de Gmail desde el archivo .env
        pass: process.env.EMAIL_PASS  // La contraseña de aplicacion de 16 caracteres desde .env
    }
});

// Antes de que lleguen peticiones, probamos si podemos conectarnos a Gmail
// Esto nos avisa temprano si hay problemas con las credenciales

transporter.verify((error, success) => {
    if (error) {
        console.error('ERROR conectando con Gmail:', error.message);
        console.log('Verifica que:');
        console.log('1. Hayas habilitado la verificacion en 2 pasos en Gmail');
        console.log('2. Hayas creado una contraseña de aplicacion');
        console.log('3. Las credenciales en .env sean correctas');
        // No terminamos el proceso aqui, pero el usuario vera el error
    } else {
        console.log('✓ Servidor listo para enviar correos');
    }
});

// Las rutas determinan como responde el servidor a diferentes URLs que reciba

// RUTA GET / (raiz) - Sirve la pagina principal
// Cuando alguien va a localhost:3000, le enviamos el archivo index.html
app.get('/', (req, res) => {
    // path.join() construye la ruta de forma segura: server/../index.html = index.html
    // res.sendFile() envia el archivo HTML al navegador
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// RUTA GET /api/test - Endpoint para verificar que el servidor funciona
// Util para debugging: ve a localhost:3000/api/test para ver si el servidor responde
app.get('/api/test', (req, res) => {
    // res.json() envia una respuesta en formato JSON al cliente
    res.json({ message: 'Servidor funcionando correctamente' });
});

// RUTA POST /api/contact - LA MAS IMPORTANTE: recibe y procesa el formulario
// Esta ruta se ejecuta cuando el JavaScript del frontend envia los datos del formulario
// Es async porque enviar correos toma tiempo y no queremos bloquear el servidor
app.post('/api/contact', async (req, res) => {
    // Logs para debugging - aparecen en la consola del servidor
    console.log('=== NUEVA PETICION ===');
    console.log('Datos recibidos:', req.body); // Los datos que envio el frontend
    console.log('Headers:', req.headers);      // Informacion adicional de la peticion

    // DESTRUCTURING: extraemos los campos del objeto req.body
    // Se agregaron los nuevos campos tipoAsunto y telefono
    const { nombre, email, tipoAsunto, telefono, asunto, conociste, mensaje } = req.body;

    // SECCION 8A: VALIDACION EN EL SERVIDOR (BACKEND)
    // Aunque el frontend ya valida, SIEMPRE debemos validar en el servidor
    // Los usuarios maliciosos pueden saltarse la validacion del frontend

    // Validar que todos los campos existan y no esten vacios
    if (!nombre || !email || !tipoAsunto || !asunto || !mensaje) {
        console.log('ERROR: Faltan campos requeridos');
        // return termina la funcion inmediatamente y envia la respuesta de error
        return res.status(400).json({
            success: false,
            message: 'Todos los campos son requeridos'
        });
    }

    // REGEX para validar formato de email
    // ^[^\s@]+ = inicio, uno o mas caracteres que no sean espacio o @
    // @ = debe tener exactamente un @
    // [^\s@]+ = uno o mas caracteres que no sean espacio o @
    // \. = debe tener exactamente un punto
    // [^\s@]+$ = uno o mas caracteres hasta el final
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('ERROR: Email invalido');
        return res.status(400).json({
            success: false,
            message: 'Email invalido'
        });
    }

    // Validación del teléfono: solo si se envió un valor, validar que sea numérico y de 9 dígitos.
    if (telefono && (telefono.length !== 9 || isNaN(telefono))) {
        console.log('ERROR: Telefono invalido');
        return res.status(400).json({
            success: false,
            message: 'El teléfono debe ser de 9 dígitos.'
        });
    }

    // mailOptions es el objeto que le dice a Nodemailer que correo enviar y como
    const mailOptions = {
        from: process.env.EMAIL_USER,// Quien envia (nuestra cuenta Gmail)
        to: email || process.env.EMAIL_USER, // Lo recibe la persona quien escribe el formulario o nosotros
        subject: `[${tipoAsunto.toUpperCase()}] Nuevo mensaje de ${nombre}: ${asunto}`,   // Asunto del correo actualizado con el tipo de asunto
        html: `
            <h2>Nuevo mensaje desde Aura Viva Spa</h2>
            <p><strong>Nombre:</strong> ${nombre}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Teléfono:</strong> ${telefono || 'No proporcionado'}</p>
            <p><strong>Tipo de Asunto:</strong> ${tipoAsunto}</p>
            <p><strong>Asunto:</strong> ${asunto}</p>
            <p><strong>¿Donde nos conociste?:</strong> ${conociste}</p>
            <p><strong>Mensaje:</strong></p>
            <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb;">
                ${mensaje.replace(/\n/g, '<br>')}
            </div>
            <hr>
            <p><small>Este mensaje fue enviado desde tu formulario de contacto el ${new Date().toLocaleString()}</small></p>
        `
        // html: permite usar HTML en el correo (colores, estilos, etc)
        // replace(/\n/g, '<br>') convierte saltos de linea en <br> para HTML
    };

    // Usamos try/catch porque enviar correos puede fallar por muchas razones
    // (sin internet, credenciales malas, Gmail caido, etc)
    try {
        console.log('Enviando correo...');

        // await pausa la ejecucion hasta que se envie el correo
        // transporter.sendMail() retorna una promesa que se resuelve cuando el correo se envia
        const info = await transporter.sendMail(mailOptions);

        // Si llegamos aqui, el correo se envio exitosamente
        console.log('✓ Correo enviado exitosamente:', info.messageId);

        // Enviar respuesta de exito al frontend
        res.json({
            success: true,
            message: 'Mensaje enviado correctamente'
        });

    } catch (error) {
        // Si algo falla, capturamos el error aqui
        console.error('ERROR enviando correo:', error);

        // Diferentes errores requieren diferentes mensajes para el usuario
        let errorMessage = 'Error al enviar el mensaje';

        if (error.code === 'EAUTH') {
            // Error de autenticacion = credenciales de Gmail incorrectas
            errorMessage = 'Error de autenticacion con Gmail. Verifica las credenciales';
        } else if (error.code === 'ENOTFOUND') {
            // Error de DNS/conexion = sin internet o Gmail no disponible
            errorMessage = 'Error de conexion. Verifica tu conexion a internet';
        }
        // Podriamos agregar mas casos: ETIMEDOUT, ECONNREFUSED, etc

        // Enviar respuesta de error al frontend
        res.status(500).json({
            success: false,
            message: errorMessage,
            debug: error.message // Informacion tecnica adicional para desarrollo
        });
    }
});

// Si alguien va a una URL que no existe, este middleware la captura.
// Debe ser el ultimo middleware en tu archivo, justo antes de app.listen.
app.use((req, res, next) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

// Si algo explota en cualquier parte del servidor, este middleware lo captura
// Es el "plan de emergencia" para errores no manejados
app.use((error, req, res, next) => {
    console.error('Error del servidor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
});
// Aqui "encendemos" el servidor y lo ponemos a escuchar en un puerto

const PORT = process.env.PORT || 3000; // Usa PORT del .env o 3000 por defecto

// app.listen() inicia el servidor HTTP en el puerto especificado

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});