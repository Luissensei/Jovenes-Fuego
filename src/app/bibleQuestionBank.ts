export type BibleLevel = "Básico" | "Intermedio" | "Avanzado";

export type BibleQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  reference: string;
  biblicalNote: string;
  hint: string;
  level: BibleLevel;
};

export const bibleQuestionBank: BibleQuestion[] = [
  {
    "id": "jf-001",
    "question": "¿Quién construyó el arca siguiendo las instrucciones de Dios?",
    "options": [
      "Noé",
      "Moisés",
      "Abraham",
      "David"
    ],
    "answer": 0,
    "explanation": "Noé obedeció las instrucciones de Dios y construyó el arca para preservar a su familia y a los animales.",
    "reference": "Génesis 6:13-22",
    "biblicalNote": "Consulta Génesis 6:13-22 para leer el contexto completo.",
    "hint": "Vivió antes de Abraham y caminó con Dios.",
    "level": "Básico"
  },
  {
    "id": "jf-002",
    "question": "¿Quién derrotó a Goliat?",
    "options": [
      "Saúl",
      "Salomón",
      "Jonatán",
      "David"
    ],
    "answer": 3,
    "explanation": "David enfrentó al gigante confiando en el Señor y utilizó una honda y una piedra.",
    "reference": "1 Samuel 17:40-50",
    "biblicalNote": "Consulta 1 Samuel 17:40-50 para leer el contexto completo.",
    "hint": "Antes de ser rey cuidaba ovejas.",
    "level": "Básico"
  },
  {
    "id": "jf-003",
    "question": "¿Quién fue tragado por un gran pez?",
    "options": [
      "Pedro",
      "Amós",
      "Jonás",
      "Elías"
    ],
    "answer": 2,
    "explanation": "Jonás huyó de la misión que Dios le encargó y terminó en el mar.",
    "reference": "Jonás 1:17",
    "biblicalNote": "Consulta Jonás 1:17 para leer el contexto completo.",
    "hint": "Fue enviado a predicar a Nínive.",
    "level": "Básico"
  },
  {
    "id": "jf-004",
    "question": "¿Quién interpretó los sueños del faraón?",
    "options": [
      "Aarón",
      "José",
      "Daniel",
      "Moisés"
    ],
    "answer": 1,
    "explanation": "José explicó que los sueños anunciaban siete años de abundancia y siete de hambre.",
    "reference": "Génesis 41:14-32",
    "biblicalNote": "Consulta Génesis 41:14-32 para leer el contexto completo.",
    "hint": "Era hijo de Jacob y fue llevado a Egipto.",
    "level": "Intermedio"
  },
  {
    "id": "jf-005",
    "question": "¿Quién recibió los Diez Mandamientos?",
    "options": [
      "Moisés",
      "Josué",
      "Aarón",
      "Samuel"
    ],
    "answer": 0,
    "explanation": "Dios entregó los mandamientos a Moisés en el monte Sinaí.",
    "reference": "Éxodo 20:1-17",
    "biblicalNote": "Consulta Éxodo 20:1-17 para leer el contexto completo.",
    "hint": "Guio la salida de Egipto.",
    "level": "Básico"
  },
  {
    "id": "jf-006",
    "question": "¿Qué ciudad vio caer sus muros después de que Israel obedeciera las instrucciones de Dios?",
    "options": [
      "Jerusalén",
      "Belén",
      "Nínive",
      "Jericó"
    ],
    "answer": 3,
    "explanation": "Los muros de Jericó cayeron después de que el pueblo siguió las instrucciones recibidas.",
    "reference": "Josué 6:1-20",
    "biblicalNote": "Consulta Josué 6:1-20 para leer el contexto completo.",
    "hint": "Rahab vivía en esa ciudad.",
    "level": "Intermedio"
  },
  {
    "id": "jf-007",
    "question": "¿Quién fue la madre de Samuel?",
    "options": [
      "Ester",
      "Débora",
      "Ana",
      "Rut"
    ],
    "answer": 2,
    "explanation": "Ana oró por un hijo y dedicó a Samuel al servicio del Señor.",
    "reference": "1 Samuel 1:9-28",
    "biblicalNote": "Consulta 1 Samuel 1:9-28 para leer el contexto completo.",
    "hint": "Su historia comienza en Silo.",
    "level": "Básico"
  },
  {
    "id": "jf-008",
    "question": "¿Quién pidió sabiduría a Dios para gobernar?",
    "options": [
      "Ezequías",
      "Salomón",
      "Saúl",
      "David"
    ],
    "answer": 1,
    "explanation": "Salomón pidió un corazón entendido para juzgar al pueblo.",
    "reference": "1 Reyes 3:5-12",
    "biblicalNote": "Consulta 1 Reyes 3:5-12 para leer el contexto completo.",
    "hint": "Fue hijo del rey David.",
    "level": "Intermedio"
  },
  {
    "id": "jf-009",
    "question": "¿Qué profeta desafió a los profetas de Baal en el monte Carmelo?",
    "options": [
      "Elías",
      "Eliseo",
      "Isaías",
      "Jeremías"
    ],
    "answer": 0,
    "explanation": "Elías convocó al pueblo y mostró que el Señor es Dios cuando respondió con fuego.",
    "reference": "1 Reyes 18:20-39",
    "biblicalNote": "Consulta 1 Reyes 18:20-39 para leer el contexto completo.",
    "hint": "Fue alimentado por cuervos junto al arroyo de Querit.",
    "level": "Intermedio"
  },
  {
    "id": "jf-010",
    "question": "¿Qué mujer moabita acompañó a Noemí?",
    "options": [
      "Ester",
      "Abigail",
      "Mical",
      "Rut"
    ],
    "answer": 3,
    "explanation": "Rut decidió permanecer con Noemí y adoptar al Dios y al pueblo de ella.",
    "reference": "Rut 1:14-18",
    "biblicalNote": "Consulta Rut 1:14-18 para leer el contexto completo.",
    "hint": "Después se casó con Booz.",
    "level": "Básico"
  },
  {
    "id": "jf-011",
    "question": "¿Quién fue lanzado al foso de los leones?",
    "options": [
      "Nehemías",
      "Esdras",
      "Daniel",
      "Ezequiel"
    ],
    "answer": 2,
    "explanation": "Daniel siguió orando a Dios y fue protegido en el foso de los leones.",
    "reference": "Daniel 6:10-23",
    "biblicalNote": "Consulta Daniel 6:10-23 para leer el contexto completo.",
    "hint": "Sirvió durante el gobierno de Darío.",
    "level": "Básico"
  },
  {
    "id": "jf-012",
    "question": "¿Qué reina arriesgó su vida para interceder por su pueblo?",
    "options": [
      "Atalía",
      "Ester",
      "Vasti",
      "Jezabel"
    ],
    "answer": 1,
    "explanation": "Ester se presentó ante el rey para pedir protección para los judíos.",
    "reference": "Ester 4:13-16; 5:1-3",
    "biblicalNote": "Consulta Ester 4:13-16; 5:1-3 para leer el contexto completo.",
    "hint": "Era prima e hija adoptiva de Mardoqueo.",
    "level": "Intermedio"
  },
  {
    "id": "jf-013",
    "question": "¿Quién guio al pueblo después de Moisés?",
    "options": [
      "Josué",
      "Caleb",
      "Aarón",
      "Gedeón"
    ],
    "answer": 0,
    "explanation": "Josué recibió el encargo de conducir al pueblo a la tierra prometida.",
    "reference": "Josué 1:1-9",
    "biblicalNote": "Consulta Josué 1:1-9 para leer el contexto completo.",
    "hint": "Fue uno de los espías que confiaron en Dios.",
    "level": "Básico"
  },
  {
    "id": "jf-014",
    "question": "¿Qué juez pidió una señal mediante un vellón?",
    "options": [
      "Sansón",
      "Samuel",
      "Otoniel",
      "Gedeón"
    ],
    "answer": 3,
    "explanation": "Gedeón pidió confirmación mediante un vellón antes de avanzar en la misión.",
    "reference": "Jueces 6:36-40",
    "biblicalNote": "Consulta Jueces 6:36-40 para leer el contexto completo.",
    "hint": "Venció a los madianitas con un grupo reducido.",
    "level": "Intermedio"
  },
  {
    "id": "jf-015",
    "question": "¿Quién fue conocido por su fuerza extraordinaria?",
    "options": [
      "Goliat",
      "Abner",
      "Sansón",
      "Jonatán"
    ],
    "answer": 2,
    "explanation": "Sansón recibió una fuerza extraordinaria relacionada con su consagración.",
    "reference": "Jueces 13-16",
    "biblicalNote": "Consulta Jueces 13-16 para leer el contexto completo.",
    "hint": "Su cabello estaba relacionado con su voto nazareo.",
    "level": "Básico"
  },
  {
    "id": "jf-016",
    "question": "¿Quién reconstruyó los muros de Jerusalén?",
    "options": [
      "Daniel",
      "Nehemías",
      "Esdras",
      "Zorobabel"
    ],
    "answer": 1,
    "explanation": "Nehemías organizó al pueblo y dirigió la reconstrucción de los muros.",
    "reference": "Nehemías 2:17-20; 6:15",
    "biblicalNote": "Consulta Nehemías 2:17-20; 6:15 para leer el contexto completo.",
    "hint": "Trabajaba como copero del rey.",
    "level": "Intermedio"
  },
  {
    "id": "jf-017",
    "question": "¿Quién fue vendido por sus hermanos y llegó a gobernar en Egipto?",
    "options": [
      "José",
      "Benjamín",
      "Judá",
      "Rubén"
    ],
    "answer": 0,
    "explanation": "José pasó por la esclavitud y la prisión antes de ser puesto sobre Egipto.",
    "reference": "Génesis 37; 41:39-44",
    "biblicalNote": "Consulta Génesis 37; 41:39-44 para leer el contexto completo.",
    "hint": "Interpretó sueños en la cárcel.",
    "level": "Básico"
  },
  {
    "id": "jf-018",
    "question": "¿Qué instrumento tocaba David para tranquilizar a Saúl?",
    "options": [
      "Trompeta",
      "Flauta",
      "Tambor",
      "Arpa"
    ],
    "answer": 3,
    "explanation": "David tocaba el arpa y Saúl encontraba alivio al escucharlo.",
    "reference": "1 Samuel 16:14-23",
    "biblicalNote": "Consulta 1 Samuel 16:14-23 para leer el contexto completo.",
    "hint": "Era músico y pastor.",
    "level": "Intermedio"
  },
  {
    "id": "jf-019",
    "question": "¿Quién fue la esposa de Abraham?",
    "options": [
      "Raquel",
      "Lea",
      "Sara",
      "Rebeca"
    ],
    "answer": 2,
    "explanation": "Sara fue la esposa de Abraham y madre de Isaac.",
    "reference": "Génesis 17:15-19; 21:1-3",
    "biblicalNote": "Consulta Génesis 17:15-19; 21:1-3 para leer el contexto completo.",
    "hint": "Dios cambió su nombre de Sarai a Sara.",
    "level": "Básico"
  },
  {
    "id": "jf-020",
    "question": "¿Quién fue el padre de Isaac?",
    "options": [
      "Noé",
      "Abraham",
      "Lot",
      "Jacob"
    ],
    "answer": 1,
    "explanation": "Isaac nació de Abraham y Sara como cumplimiento de la promesa de Dios.",
    "reference": "Génesis 21:1-7",
    "biblicalNote": "Consulta Génesis 21:1-7 para leer el contexto completo.",
    "hint": "Dios le pidió que saliera de su tierra.",
    "level": "Básico"
  },
  {
    "id": "jf-021",
    "question": "¿Qué profeta fue llevado al cielo en un torbellino?",
    "options": [
      "Elías",
      "Eliseo",
      "Isaías",
      "Oseas"
    ],
    "answer": 0,
    "explanation": "Elías fue llevado al cielo en un torbellino mientras Eliseo observaba.",
    "reference": "2 Reyes 2:1-12",
    "biblicalNote": "Consulta 2 Reyes 2:1-12 para leer el contexto completo.",
    "hint": "Dejó caer su manto.",
    "level": "Avanzado"
  },
  {
    "id": "jf-022",
    "question": "¿Quién interpretó la escritura en la pared durante el banquete de Belsasar?",
    "options": [
      "Esdras",
      "Nehemías",
      "Ezequiel",
      "Daniel"
    ],
    "answer": 3,
    "explanation": "Daniel explicó el mensaje escrito en la pared durante el banquete del rey.",
    "reference": "Daniel 5:1-28",
    "biblicalNote": "Consulta Daniel 5:1-28 para leer el contexto completo.",
    "hint": "También interpretó sueños de Nabucodonosor.",
    "level": "Avanzado"
  },
  {
    "id": "jf-023",
    "question": "¿Quién fue el padre de Juan el Bautista?",
    "options": [
      "Simeón",
      "Herodes",
      "Zacarías",
      "José"
    ],
    "answer": 2,
    "explanation": "Zacarías era sacerdote y esposo de Elisabet; recibió el anuncio del nacimiento de Juan.",
    "reference": "Lucas 1:5-25; 57-66",
    "biblicalNote": "Consulta Lucas 1:5-25; 57-66 para leer el contexto completo.",
    "hint": "Quedó sin hablar durante un tiempo.",
    "level": "Intermedio"
  },
  {
    "id": "jf-024",
    "question": "¿En qué ciudad nació Jesús?",
    "options": [
      "Jericó",
      "Belén",
      "Nazaret",
      "Jerusalén"
    ],
    "answer": 1,
    "explanation": "Jesús nació en Belén de Judea durante el tiempo del censo.",
    "reference": "Lucas 2:1-7; Mateo 2:1",
    "biblicalNote": "Consulta Lucas 2:1-7; Mateo 2:1 para leer el contexto completo.",
    "hint": "Miqueas había anunciado que de allí saldría el gobernante.",
    "level": "Básico"
  },
  {
    "id": "jf-025",
    "question": "¿Quién bautizó a Jesús?",
    "options": [
      "Juan el Bautista",
      "Pedro",
      "Andrés",
      "Felipe"
    ],
    "answer": 0,
    "explanation": "Juan bautizó a Jesús en el río Jordán.",
    "reference": "Mateo 3:13-17",
    "biblicalNote": "Consulta Mateo 3:13-17 para leer el contexto completo.",
    "hint": "Predicaba en el desierto.",
    "level": "Básico"
  },
  {
    "id": "jf-026",
    "question": "¿Cuántos apóstoles escogió Jesús?",
    "options": [
      "Siete",
      "Diez",
      "Quince",
      "Doce"
    ],
    "answer": 3,
    "explanation": "Jesús escogió a doce apóstoles para que estuvieran con él y fueran enviados.",
    "reference": "Lucas 6:12-16",
    "biblicalNote": "Consulta Lucas 6:12-16 para leer el contexto completo.",
    "hint": "El número coincide con las tribus de Israel.",
    "level": "Básico"
  },
  {
    "id": "jf-027",
    "question": "¿Quién negó a Jesús tres veces?",
    "options": [
      "Tomás",
      "Judas",
      "Pedro",
      "Juan"
    ],
    "answer": 2,
    "explanation": "Pedro negó conocer a Jesús tres veces antes de que cantara el gallo.",
    "reference": "Lucas 22:54-62",
    "biblicalNote": "Consulta Lucas 22:54-62 para leer el contexto completo.",
    "hint": "Era pescador y hermano de Andrés.",
    "level": "Básico"
  },
  {
    "id": "jf-028",
    "question": "¿Qué discípulo dudó al escuchar que Jesús había resucitado?",
    "options": [
      "Bartolomé",
      "Tomás",
      "Mateo",
      "Santiago"
    ],
    "answer": 1,
    "explanation": "Tomás dijo que necesitaba ver las señales para creer, y Jesús se le apareció.",
    "reference": "Juan 20:24-29",
    "biblicalNote": "Consulta Juan 20:24-29 para leer el contexto completo.",
    "hint": "También era llamado Dídimo.",
    "level": "Intermedio"
  },
  {
    "id": "jf-029",
    "question": "¿Quién subió a un árbol para ver a Jesús?",
    "options": [
      "Zaqueo",
      "Nicodemo",
      "Lázaro",
      "Bartimeo"
    ],
    "answer": 0,
    "explanation": "Zaqueo subió a un sicómoro porque era pequeño de estatura y quería ver a Jesús.",
    "reference": "Lucas 19:1-10",
    "biblicalNote": "Consulta Lucas 19:1-10 para leer el contexto completo.",
    "hint": "Era jefe de los publicanos.",
    "level": "Básico"
  },
  {
    "id": "jf-030",
    "question": "¿Qué hizo Jesús en las bodas de Caná?",
    "options": [
      "Sanó a un ciego",
      "Multiplicó panes",
      "Calmó una tormenta",
      "Convirtió agua en vino"
    ],
    "answer": 3,
    "explanation": "Jesús convirtió el agua en vino en las bodas de Caná.",
    "reference": "Juan 2:1-11",
    "biblicalNote": "Consulta Juan 2:1-11 para leer el contexto completo.",
    "hint": "Fue una señal al comienzo de su ministerio.",
    "level": "Básico"
  },
  {
    "id": "jf-031",
    "question": "¿A quién resucitó Jesús después de cuatro días en el sepulcro?",
    "options": [
      "Esteban",
      "Bartimeo",
      "Lázaro",
      "Jairo"
    ],
    "answer": 2,
    "explanation": "Jesús llamó a Lázaro fuera del sepulcro en Betania.",
    "reference": "Juan 11:1-44",
    "biblicalNote": "Consulta Juan 11:1-44 para leer el contexto completo.",
    "hint": "Era hermano de Marta y María.",
    "level": "Intermedio"
  },
  {
    "id": "jf-032",
    "question": "¿Qué mujer escuchó a Jesús mientras su hermana atendía los quehaceres?",
    "options": [
      "Priscila",
      "María",
      "Marta",
      "Salomé"
    ],
    "answer": 1,
    "explanation": "María se sentó a los pies de Jesús para escuchar su palabra.",
    "reference": "Lucas 10:38-42",
    "biblicalNote": "Consulta Lucas 10:38-42 para leer el contexto completo.",
    "hint": "Su hermana se preocupó por muchos quehaceres.",
    "level": "Intermedio"
  },
  {
    "id": "jf-033",
    "question": "¿Qué apóstol era recaudador de impuestos antes de seguir a Jesús?",
    "options": [
      "Mateo",
      "Juan",
      "Pedro",
      "Andrés"
    ],
    "answer": 0,
    "explanation": "Jesús llamó a Mateo mientras estaba sentado en el banco de los tributos.",
    "reference": "Mateo 9:9-13",
    "biblicalNote": "Consulta Mateo 9:9-13 para leer el contexto completo.",
    "hint": "También era llamado Leví.",
    "level": "Intermedio"
  },
  {
    "id": "jf-034",
    "question": "¿Quién ayudó a llevar la cruz de Jesús?",
    "options": [
      "José de Arimatea",
      "Nicodemo",
      "Bartimeo",
      "Simón de Cirene"
    ],
    "answer": 3,
    "explanation": "Los soldados obligaron a Simón de Cirene a llevar la cruz detrás de Jesús.",
    "reference": "Lucas 23:26",
    "biblicalNote": "Consulta Lucas 23:26 para leer el contexto completo.",
    "hint": "Venía del campo.",
    "level": "Intermedio"
  },
  {
    "id": "jf-035",
    "question": "¿Quién traicionó a Jesús?",
    "options": [
      "Tomás",
      "Felipe",
      "Judas Iscariote",
      "Pedro"
    ],
    "answer": 2,
    "explanation": "Judas entregó a Jesús a sus adversarios.",
    "reference": "Mateo 26:14-16; 47-50",
    "biblicalNote": "Consulta Mateo 26:14-16; 47-50 para leer el contexto completo.",
    "hint": "Identificó a Jesús con un beso.",
    "level": "Básico"
  },
  {
    "id": "jf-036",
    "question": "¿Qué discípulo era hermano de Pedro?",
    "options": [
      "Judas",
      "Andrés",
      "Felipe",
      "Mateo"
    ],
    "answer": 1,
    "explanation": "Andrés era hermano de Simón Pedro y uno de los primeros llamados por Jesús.",
    "reference": "Juan 1:40-42",
    "biblicalNote": "Consulta Juan 1:40-42 para leer el contexto completo.",
    "hint": "Antes había seguido a Juan el Bautista.",
    "level": "Intermedio"
  },
  {
    "id": "jf-037",
    "question": "¿Qué parábola presenta a un hombre que ayuda a un herido en el camino?",
    "options": [
      "El buen samaritano",
      "El sembrador",
      "La oveja perdida",
      "Los talentos"
    ],
    "answer": 0,
    "explanation": "El samaritano se compadeció del hombre herido y se ocupó de él.",
    "reference": "Lucas 10:25-37",
    "biblicalNote": "Consulta Lucas 10:25-37 para leer el contexto completo.",
    "hint": "Un sacerdote y un levita pasaron de largo.",
    "level": "Básico"
  },
  {
    "id": "jf-038",
    "question": "¿Cuántos leprosos regresaron a dar gracias a Jesús?",
    "options": [
      "Dos",
      "Cinco",
      "Diez",
      "Uno"
    ],
    "answer": 3,
    "explanation": "De los diez que fueron limpiados, solo uno volvió para dar gracias.",
    "reference": "Lucas 17:11-19",
    "biblicalNote": "Consulta Lucas 17:11-19 para leer el contexto completo.",
    "hint": "Era samaritano.",
    "level": "Intermedio"
  },
  {
    "id": "jf-039",
    "question": "¿En qué camino tuvo Saulo el encuentro que cambió su vida?",
    "options": [
      "Camino a Jericó",
      "Camino a Belén",
      "Camino a Damasco",
      "Camino a Emaús"
    ],
    "answer": 2,
    "explanation": "Saulo viajaba hacia Damasco cuando una luz del cielo lo rodeó.",
    "reference": "Hechos 9:1-19",
    "biblicalNote": "Consulta Hechos 9:1-19 para leer el contexto completo.",
    "hint": "Después fue conocido como Pablo.",
    "level": "Básico"
  },
  {
    "id": "jf-040",
    "question": "¿Quién fue el primer mártir cristiano mencionado en Hechos?",
    "options": [
      "Timoteo",
      "Esteban",
      "Felipe",
      "Bernabé"
    ],
    "answer": 1,
    "explanation": "Esteban fue apedreado después de dar testimonio ante el concilio.",
    "reference": "Hechos 6:8-15; 7:54-60",
    "biblicalNote": "Consulta Hechos 6:8-15; 7:54-60 para leer el contexto completo.",
    "hint": "Fue uno de los siete elegidos para servir.",
    "level": "Avanzado"
  },
  {
    "id": "jf-041",
    "question": "¿En qué día descendió el Espíritu Santo sobre los discípulos reunidos?",
    "options": [
      "Pentecostés",
      "Pascua",
      "Día de reposo",
      "Hanukkah"
    ],
    "answer": 0,
    "explanation": "En Pentecostés, los discípulos fueron llenos del Espíritu Santo.",
    "reference": "Hechos 2:1-4",
    "biblicalNote": "Consulta Hechos 2:1-4 para leer el contexto completo.",
    "hint": "Se escuchó un estruendo como de viento recio.",
    "level": "Básico"
  },
  {
    "id": "jf-042",
    "question": "¿Quién acompañó a Pablo en su primer viaje misionero?",
    "options": [
      "Silas",
      "Lucas",
      "Marcos",
      "Bernabé"
    ],
    "answer": 3,
    "explanation": "Bernabé acompañó a Pablo en el primer viaje misionero.",
    "reference": "Hechos 13:1-4",
    "biblicalNote": "Consulta Hechos 13:1-4 para leer el contexto completo.",
    "hint": "Su nombre significa hijo de consolación.",
    "level": "Avanzado"
  },
  {
    "id": "jf-043",
    "question": "¿Quién fue la vendedora de púrpura que recibió el mensaje en Filipos?",
    "options": [
      "Febe",
      "Dorcas",
      "Lidia",
      "Priscila"
    ],
    "answer": 2,
    "explanation": "Lidia escuchó a Pablo y el Señor abrió su corazón.",
    "reference": "Hechos 16:11-15",
    "biblicalNote": "Consulta Hechos 16:11-15 para leer el contexto completo.",
    "hint": "Era de la ciudad de Tiatira.",
    "level": "Avanzado"
  },
  {
    "id": "jf-044",
    "question": "¿En qué isla naufragó Pablo durante su viaje a Roma?",
    "options": [
      "Chipre",
      "Malta",
      "Creta",
      "Patmos"
    ],
    "answer": 1,
    "explanation": "Después del naufragio, los sobrevivientes llegaron a Malta.",
    "reference": "Hechos 27:39-44; 28:1",
    "biblicalNote": "Consulta Hechos 27:39-44; 28:1 para leer el contexto completo.",
    "hint": "Allí Pablo fue mordido por una víbora y no sufrió daño.",
    "level": "Avanzado"
  },
  {
    "id": "jf-045",
    "question": "¿Quién escribió Apocalipsis según su propio testimonio?",
    "options": [
      "Juan",
      "Pedro",
      "Pablo",
      "Lucas"
    ],
    "answer": 0,
    "explanation": "El autor se identifica como Juan y dice que estaba en Patmos.",
    "reference": "Apocalipsis 1:1-9",
    "biblicalNote": "Consulta Apocalipsis 1:1-9 para leer el contexto completo.",
    "hint": "Estaba desterrado en una isla.",
    "level": "Intermedio"
  },
  {
    "id": "jf-046",
    "question": "¿Qué evangelista era médico según Colosenses?",
    "options": [
      "Marcos",
      "Mateo",
      "Juan",
      "Lucas"
    ],
    "answer": 3,
    "explanation": "Pablo menciona a Lucas como el médico amado.",
    "reference": "Colosenses 4:14",
    "biblicalNote": "Consulta Colosenses 4:14 para leer el contexto completo.",
    "hint": "También escribió Hechos.",
    "level": "Avanzado"
  },
  {
    "id": "jf-047",
    "question": "¿Qué joven colaborador recibió dos cartas pastorales de Pablo?",
    "options": [
      "Onésimo",
      "Silas",
      "Timoteo",
      "Tito"
    ],
    "answer": 2,
    "explanation": "Pablo escribió dos cartas a Timoteo para orientarlo en su servicio.",
    "reference": "1 Timoteo 1:1-2; 2 Timoteo 1:1-2",
    "biblicalNote": "Consulta 1 Timoteo 1:1-2; 2 Timoteo 1:1-2 para leer el contexto completo.",
    "hint": "Su madre era Eunice y su abuela Loida.",
    "level": "Intermedio"
  },
  {
    "id": "jf-048",
    "question": "¿Quién explicó el evangelio al funcionario etíope en el camino?",
    "options": [
      "Bernabé",
      "Felipe",
      "Pedro",
      "Esteban"
    ],
    "answer": 1,
    "explanation": "Felipe explicó al funcionario el pasaje que estaba leyendo de Isaías.",
    "reference": "Hechos 8:26-39",
    "biblicalNote": "Consulta Hechos 8:26-39 para leer el contexto completo.",
    "hint": "Fue guiado al camino que descendía de Jerusalén a Gaza.",
    "level": "Avanzado"
  },
  {
    "id": "jf-049",
    "question": "¿Quién fue el maestro de Saulo mencionado en Hechos?",
    "options": [
      "Gamaliel",
      "Caifás",
      "Anás",
      "Nicodemo"
    ],
    "answer": 0,
    "explanation": "Pablo dijo que fue instruido a los pies de Gamaliel.",
    "reference": "Hechos 22:3",
    "biblicalNote": "Consulta Hechos 22:3 para leer el contexto completo.",
    "hint": "Era fariseo y doctor de la ley.",
    "level": "Avanzado"
  },
  {
    "id": "jf-050",
    "question": "¿En qué ciudad fueron llamados cristianos por primera vez los discípulos?",
    "options": [
      "Jerusalén",
      "Éfeso",
      "Corinto",
      "Antioquía"
    ],
    "answer": 3,
    "explanation": "En Antioquía los discípulos fueron llamados cristianos por primera vez.",
    "reference": "Hechos 11:26",
    "biblicalNote": "Consulta Hechos 11:26 para leer el contexto completo.",
    "hint": "Era una ciudad importante de Siria.",
    "level": "Intermedio"
  },
  {
    "id": "jf-051",
    "question": "¿Quién fue el primer gentil que recibió a Pedro en su casa después de una visión?",
    "options": [
      "Lidia",
      "Apolos",
      "Cornelio",
      "Sergio Paulo"
    ],
    "answer": 2,
    "explanation": "Cornelio reunió a su familia y amigos para escuchar el mensaje de Pedro.",
    "reference": "Hechos 10:1-48",
    "biblicalNote": "Consulta Hechos 10:1-48 para leer el contexto completo.",
    "hint": "Era centurión de la compañía llamada la Italiana.",
    "level": "Avanzado"
  },
  {
    "id": "jf-052",
    "question": "¿Qué mujer fue conocida por hacer túnicas y ayudar a los necesitados en Jope?",
    "options": [
      "Febe",
      "Tabita (Dorcas)",
      "Lidia",
      "Marta"
    ],
    "answer": 1,
    "explanation": "Tabita abundaba en buenas obras y Pedro oró por ella.",
    "reference": "Hechos 9:36-42",
    "biblicalNote": "Consulta Hechos 9:36-42 para leer el contexto completo.",
    "hint": "Su nombre griego era Dorcas.",
    "level": "Intermedio"
  },
  {
    "id": "jf-053",
    "question": "¿A qué ciudad iban dos discípulos cuando Jesús resucitado se acercó a ellos?",
    "options": [
      "Emaús",
      "Betania",
      "Jericó",
      "Cesarea"
    ],
    "answer": 0,
    "explanation": "Jesús caminó con dos discípulos y les explicó las Escrituras.",
    "reference": "Lucas 24:13-35",
    "biblicalNote": "Consulta Lucas 24:13-35 para leer el contexto completo.",
    "hint": "Reconocieron a Jesús al partir el pan.",
    "level": "Intermedio"
  },
  {
    "id": "jf-054",
    "question": "¿Qué hombre recibió a Jesús de noche para hablar con él?",
    "options": [
      "Zaqueo",
      "José de Arimatea",
      "Jairo",
      "Nicodemo"
    ],
    "answer": 3,
    "explanation": "Nicodemo, un principal entre los judíos, fue a Jesús de noche.",
    "reference": "Juan 3:1-21",
    "biblicalNote": "Consulta Juan 3:1-21 para leer el contexto completo.",
    "hint": "Era fariseo y miembro del concilio.",
    "level": "Intermedio"
  },
  {
    "id": "jf-055",
    "question": "¿Qué hizo Jesús con cinco panes y dos peces?",
    "options": [
      "Los cambió por monedas",
      "Los entregó a sacerdotes",
      "Alimentó a una multitud",
      "Los guardó"
    ],
    "answer": 2,
    "explanation": "Jesús dio gracias y repartió el alimento hasta que la multitud quedó satisfecha.",
    "reference": "Juan 6:1-14",
    "biblicalNote": "Consulta Juan 6:1-14 para leer el contexto completo.",
    "hint": "Los alimentos los ofreció un muchacho.",
    "level": "Básico"
  },
  {
    "id": "jf-056",
    "question": "¿Qué discípulo caminó sobre el agua hacia Jesús?",
    "options": [
      "Felipe",
      "Pedro",
      "Juan",
      "Andrés"
    ],
    "answer": 1,
    "explanation": "Pedro salió de la barca y caminó hacia Jesús, pero tuvo miedo al ver el viento.",
    "reference": "Mateo 14:22-33",
    "biblicalNote": "Consulta Mateo 14:22-33 para leer el contexto completo.",
    "hint": "Después comenzó a hundirse y pidió ayuda.",
    "level": "Intermedio"
  },
  {
    "id": "jf-057",
    "question": "¿Quién pidió el cuerpo de Jesús para sepultarlo?",
    "options": [
      "José de Arimatea",
      "Simón de Cirene",
      "Nicodemo",
      "Gamaliel"
    ],
    "answer": 0,
    "explanation": "José de Arimatea pidió a Pilato el cuerpo de Jesús y lo colocó en un sepulcro.",
    "reference": "Mateo 27:57-60",
    "biblicalNote": "Consulta Mateo 27:57-60 para leer el contexto completo.",
    "hint": "Era un discípulo que esperaba el reino de Dios.",
    "level": "Intermedio"
  },
  {
    "id": "jf-058",
    "question": "¿Qué hicieron Pablo y Silas mientras estaban presos en Filipos?",
    "options": [
      "Escaparon antes de medianoche",
      "Se escondieron",
      "Guardaron silencio",
      "Oraron y cantaron himnos"
    ],
    "answer": 3,
    "explanation": "Pablo y Silas oraban y cantaban; un terremoto abrió las puertas de la cárcel.",
    "reference": "Hechos 16:22-34",
    "biblicalNote": "Consulta Hechos 16:22-34 para leer el contexto completo.",
    "hint": "El carcelero preguntó cómo podía ser salvo.",
    "level": "Intermedio"
  },
  {
    "id": "jf-059",
    "question": "¿Qué pareja instruyó con más exactitud a Apolos?",
    "options": [
      "Marta y María",
      "Zacarías y Elisabet",
      "Priscila y Aquila",
      "Ananías y Safira"
    ],
    "answer": 2,
    "explanation": "Priscila y Aquila explicaron a Apolos con más precisión el camino de Dios.",
    "reference": "Hechos 18:24-28",
    "biblicalNote": "Consulta Hechos 18:24-28 para leer el contexto completo.",
    "hint": "Eran fabricantes de tiendas como Pablo.",
    "level": "Avanzado"
  },
  {
    "id": "jf-060",
    "question": "¿Qué discípulo fue llamado Dídimo?",
    "options": [
      "Mateo",
      "Tomás",
      "Pedro",
      "Juan"
    ],
    "answer": 1,
    "explanation": "El evangelio identifica a Tomás con el nombre Dídimo.",
    "reference": "Juan 20:24",
    "biblicalNote": "Consulta Juan 20:24 para leer el contexto completo.",
    "hint": "También dudó al escuchar la noticia de la resurrección.",
    "level": "Avanzado"
  },
  {
    "id": "jf-061",
    "question": "¿Qué escribió Jesús en el suelo durante el episodio de la mujer acusada?",
    "options": [
      "El texto no lo especifica",
      "Los diez mandamientos",
      "Los nombres de los acusadores",
      "Una parábola"
    ],
    "answer": 0,
    "explanation": "El relato dice que Jesús escribió en tierra, pero no revela qué escribió.",
    "reference": "Juan 8:1-11",
    "biblicalNote": "Consulta Juan 8:1-11 para leer el contexto completo.",
    "hint": "La Biblia no da el contenido de esas palabras.",
    "level": "Avanzado"
  },
  {
    "id": "jf-062",
    "question": "¿Quién fue el juez zurdo que liberó a Israel de Moab?",
    "options": [
      "Gedeón",
      "Sansón",
      "Barac",
      "Aod"
    ],
    "answer": 3,
    "explanation": "Aod fue levantado como libertador y derrotó al rey Eglón.",
    "reference": "Jueces 3:15-30",
    "biblicalNote": "Consulta Jueces 3:15-30 para leer el contexto completo.",
    "hint": "Su historia aparece en el libro de Jueces.",
    "level": "Avanzado"
  },
  {
    "id": "jf-063",
    "question": "¿Quién dirigió el canto de victoria después de cruzar el mar?",
    "options": [
      "Débora y Jael",
      "Josué y Caleb",
      "Moisés y María",
      "David y Mical"
    ],
    "answer": 2,
    "explanation": "Moisés y los israelitas cantaron al Señor y María dirigió a las mujeres con panderos.",
    "reference": "Éxodo 15:1-21",
    "biblicalNote": "Consulta Éxodo 15:1-21 para leer el contexto completo.",
    "hint": "El cántico celebra la liberación de Egipto.",
    "level": "Avanzado"
  }
];

export type VerseChallenge = {
  reference: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

export const bibleVerseChallenges: VerseChallenge[] = [
  {
    "reference": "Salmo 23:1",
    "prompt": "David presenta al Señor como el buen...",
    "options": [
      "Pastor",
      "Rey",
      "Juez",
      "Soldado"
    ],
    "answer": "Pastor",
    "explanation": "La imagen del pastor expresa cuidado, guía y provisión."
  },
  {
    "reference": "Filipenses 4:13",
    "prompt": "Pablo explica que puede enfrentar cada situación por medio de...",
    "options": [
      "Sus riquezas",
      "Sus amigos",
      "Su inteligencia",
      "Cristo que le fortalece"
    ],
    "answer": "Cristo que le fortalece",
    "explanation": "El contexto habla de aprender a vivir con abundancia o necesidad."
  },
  {
    "reference": "Proverbios 3:5",
    "prompt": "El proverbio enseña a confiar en Jehová con todo el...",
    "options": [
      "Tiempo",
      "Talento",
      "Corazón",
      "Dinero"
    ],
    "answer": "Corazón",
    "explanation": "La confianza en Dios debe ser completa."
  },
  {
    "reference": "Josué 1:9",
    "prompt": "Dios anima a Josué a ser fuerte y...",
    "options": [
      "Veloz",
      "Valiente",
      "Famoso",
      "Rico"
    ],
    "answer": "Valiente",
    "explanation": "La valentía está unida a la promesa de la presencia de Dios."
  },
  {
    "reference": "Mateo 5:14",
    "prompt": "Jesús compara a sus seguidores con la luz del...",
    "options": [
      "Mundo",
      "Templo",
      "Desierto",
      "Cielo"
    ],
    "answer": "Mundo",
    "explanation": "Los discípulos deben reflejar la luz mediante sus buenas obras."
  },
  {
    "reference": "1 Corintios 13:4",
    "prompt": "Una cualidad del amor descrita por Pablo es la...",
    "options": [
      "Envidia",
      "Vanidad",
      "Prisa",
      "Paciencia"
    ],
    "answer": "Paciencia",
    "explanation": "El capítulo describe el amor mediante actitudes concretas."
  },
  {
    "reference": "Romanos 12:2",
    "prompt": "Pablo anima a no conformarse a este...",
    "options": [
      "Pueblo",
      "Desierto",
      "Mundo",
      "Templo"
    ],
    "answer": "Mundo",
    "explanation": "El pasaje llama a una transformación de la mente."
  },
  {
    "reference": "Efesios 6:11",
    "prompt": "Pablo invita a vestirse de toda la armadura de...",
    "options": [
      "Un rey",
      "Dios",
      "Hierro",
      "Un soldado"
    ],
    "answer": "Dios",
    "explanation": "La armadura representa recursos espirituales para permanecer firmes."
  },
  {
    "reference": "Génesis 1:1",
    "prompt": "La Biblia comienza presentando a Dios como creador de los cielos y la...",
    "options": [
      "Tierra",
      "Luna",
      "Luz",
      "Mar"
    ],
    "answer": "Tierra",
    "explanation": "El primer versículo presenta a Dios como creador."
  },
  {
    "reference": "Juan 11:35",
    "prompt": "Ante la tumba de Lázaro, Jesús...",
    "options": [
      "Cantó",
      "Corrió",
      "Durmió",
      "Lloró"
    ],
    "answer": "Lloró",
    "explanation": "El relato muestra la compasión y cercanía de Jesús."
  },
  {
    "reference": "Mateo 6:33",
    "prompt": "Jesús enseña a buscar primeramente el reino de Dios y su...",
    "options": [
      "Tesoro",
      "Casa",
      "Justicia",
      "Poder"
    ],
    "answer": "Justicia",
    "explanation": "El pasaje enseña a priorizar el reino y la justicia de Dios."
  },
  {
    "reference": "Salmo 119:105",
    "prompt": "El salmista compara la palabra de Dios con una lámpara para los pies y luz para el...",
    "options": [
      "Monte",
      "Camino",
      "Templo",
      "Pueblo"
    ],
    "answer": "Camino",
    "explanation": "La Palabra orienta las decisiones y el andar diario."
  },
  {
    "reference": "Juan 14:6",
    "prompt": "Jesús se presenta como el camino, la verdad y la...",
    "options": [
      "Vida",
      "Ley",
      "Historia",
      "Promesa"
    ],
    "answer": "Vida",
    "explanation": "Jesús declara que el acceso al Padre es por medio de él."
  },
  {
    "reference": "Miqueas 6:8",
    "prompt": "El profeta resume lo que Dios pide: hacer justicia, amar misericordia y...",
    "options": [
      "Buscar riquezas",
      "Ser famoso",
      "Vencer ejércitos",
      "Caminar humildemente"
    ],
    "answer": "Caminar humildemente",
    "explanation": "El texto resalta justicia, misericordia y humildad."
  },
  {
    "reference": "Gálatas 5:22-23",
    "prompt": "Una característica del fruto del Espíritu es...",
    "options": [
      "Orgullo",
      "Rivalidad",
      "Paciencia",
      "Envidia"
    ],
    "answer": "Paciencia",
    "explanation": "Pablo menciona amor, gozo, paz, paciencia y otras virtudes."
  },
  {
    "reference": "Mateo 7:7",
    "prompt": "Jesús invita a pedir, buscar y...",
    "options": [
      "Huir",
      "Llamar",
      "Juzgar",
      "Esconderse"
    ],
    "answer": "Llamar",
    "explanation": "La enseñanza anima a acercarse a Dios con confianza."
  },
  {
    "reference": "Santiago 1:5",
    "prompt": "Si alguien tiene falta de sabiduría, Santiago le anima a...",
    "options": [
      "Pedirla a Dios",
      "Comprar un libro",
      "Guardar silencio",
      "Alejarse"
    ],
    "answer": "Pedirla a Dios",
    "explanation": "Dios da sabiduría abundantemente a quien la pide con fe."
  },
  {
    "reference": "1 Pedro 5:7",
    "prompt": "Pedro anima a echar sobre Dios toda vuestra...",
    "options": [
      "Riqueza",
      "Fama",
      "Fuerza",
      "Ansiedad"
    ],
    "answer": "Ansiedad",
    "explanation": "El pasaje invita a confiar en el cuidado de Dios."
  },
  {
    "reference": "Mateo 22:37",
    "prompt": "Jesús enseña a amar a Dios con todo el corazón, alma y...",
    "options": [
      "Poder",
      "Tiempo libre",
      "Entendimiento",
      "Dinero"
    ],
    "answer": "Entendimiento",
    "explanation": "El mandamiento llama a amar a Dios con todo el ser."
  },
  {
    "reference": "Juan 8:12",
    "prompt": "Jesús se presenta como la luz del...",
    "options": [
      "Mar",
      "Mundo",
      "Templo",
      "Desierto"
    ],
    "answer": "Mundo",
    "explanation": "Seguir a Jesús significa no andar en tinieblas."
  },
  {
    "reference": "Romanos 8:28",
    "prompt": "Pablo enseña que Dios dispone todas las cosas para bien de quienes...",
    "options": [
      "Le aman",
      "Son famosos",
      "Nunca fallan",
      "Tienen riquezas"
    ],
    "answer": "Le aman",
    "explanation": "La promesa se dirige a quienes aman a Dios y son llamados conforme a su propósito."
  },
  {
    "reference": "Salmo 46:1",
    "prompt": "El salmista llama a Dios nuestro amparo y...",
    "options": [
      "Rival",
      "Juez humano",
      "Tesoro",
      "Fortaleza"
    ],
    "answer": "Fortaleza",
    "explanation": "El salmo expresa confianza en Dios en medio de la dificultad."
  },
  {
    "reference": "Mateo 5:9",
    "prompt": "Jesús llama bienaventurados a los...",
    "options": [
      "Ricos",
      "Vengativos",
      "Pacificadores",
      "Orgullosos"
    ],
    "answer": "Pacificadores",
    "explanation": "Los que trabajan por la paz son llamados hijos de Dios."
  },
  {
    "reference": "2 Timoteo 1:7",
    "prompt": "Pablo recuerda que Dios nos ha dado espíritu de poder, amor y...",
    "options": [
      "Temor",
      "Dominio propio",
      "Riqueza",
      "Fama"
    ],
    "answer": "Dominio propio",
    "explanation": "El texto une poder, amor y dominio propio."
  },
  {
    "reference": "Hebreos 11:1",
    "prompt": "La fe es la certeza de lo que se espera y la convicción de lo que no se...",
    "options": [
      "Ve",
      "Recuerda",
      "Compra",
      "Escucha"
    ],
    "answer": "Ve",
    "explanation": "El capítulo presenta personas que vivieron confiando en Dios."
  },
  {
    "reference": "Colosenses 3:23",
    "prompt": "Pablo anima a hacer todo de corazón, como para...",
    "options": [
      "La multitud",
      "El jefe",
      "Los amigos",
      "El Señor"
    ],
    "answer": "El Señor",
    "explanation": "El pasaje enseña a servir con sinceridad."
  },
  {
    "reference": "Salmo 34:8",
    "prompt": "El salmista invita a probar y ver que Jehová es...",
    "options": [
      "Rico",
      "Famoso",
      "Bueno",
      "Fuerte físicamente"
    ],
    "answer": "Bueno",
    "explanation": "El salmo invita a confiar en la bondad de Dios."
  }
];

export function shuffleBibleQuestions<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
