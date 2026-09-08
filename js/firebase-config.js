/* ============================================================
   CONFIGURACIÓN DE FIREBASE
   ------------------------------------------------------------
   1. Entra a https://console.firebase.google.com
   2. Crea un proyecto (gratis, plan "Spark").
   3. Menú "Realtime Database" -> Crear base de datos.
   4. Configuración del proyecto -> Tus apps -> icono Web (</>)
   5. Copia el objeto firebaseConfig y pégalo abajo.

   IMPORTANTE: debe incluir "databaseURL".
   Se ve así:  https://TU-PROYECTO-default-rtdb.firebaseio.com
   ============================================================ */

const firebaseConfig = {
  apiKey: "PEGA_TU_API_KEY",
  authDomain: "TU-PROYECTO.firebaseapp.com",
  databaseURL: "https://TU-PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU-PROYECTO",
  storageBucket: "TU-PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxx"
};

/* Identificador interno de la conversación. NO se muestra en pantalla:
   solo define en qué rama de la base de datos se guardan los mensajes.
   Cámbialo por algo impredecible si quieres que sea privado,
   por ejemplo: "7f3a91c4". Todos deben tener el mismo valor. */
const ROOM_ID = "general";
