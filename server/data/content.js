// Contenido editorial propio: sistemas operativos, próximos lanzamientos y la sección Descubrir.
// Todo lo posterior a mediados de 2026 enlaza a la fuente de la que procede.

export const OS = [
  { id: 'ios', name: 'iOS', device: 'iPhone', current: 'iOS 27', since: 2007, note: 'iOS 27 llegó en septiembre de 2026 con la nueva Siri con IA. La generación anterior, iOS 26, estrenó el lenguaje visual Liquid Glass y el salto de numeración al año.',
    history: [['2007', 'iPhone OS 1', 'Multitáctil, Safari y buzón de voz visual. Sin App Store.'], ['2008', 'iPhone OS 2', 'Nace la App Store.'], ['2013', 'iOS 7', 'Adiós al esqueumorfismo: rediseño plano de Jony Ive.'], ['2020', 'iOS 14', 'Widgets en la pantalla de inicio.'], ['2025', 'iOS 26', 'Liquid Glass y numeración por año.'], ['2026', 'iOS 27', 'Siri con IA.']] },
  { id: 'ipados', name: 'iPadOS', device: 'iPad', current: 'iPadOS 27', since: 2019, note: 'Se separó de iOS en 2019. iPadOS 26 introdujo un sistema de ventanas libre parecido al del Mac.',
    history: [['2010', 'iPhone OS 3.2', 'El iPad debuta con una versión adaptada del sistema del iPhone.'], ['2019', 'iPadOS 13', 'Nombre propio, widgets fijos y soporte de ratón poco después.'], ['2022', 'iPadOS 16', 'Stage Manager.'], ['2025', 'iPadOS 26', 'Ventanas redimensionables y barra de menús.']] },
  { id: 'macos', name: 'macOS', device: 'Mac', current: 'macOS 27', since: 2001, note: 'macOS 26 Tahoe fue la última versión compatible con algunos Mac Intel. Los Mac de 2026 se venden con macOS 27.',
    history: [['1984', 'System 1', 'La interfaz gráfica llega al gran público.'], ['2001', 'Mac OS X 10.0 Cheetah', 'Base UNIX y la interfaz Aqua.'], ['2016', 'macOS Sierra', 'OS X pasa a llamarse macOS; llega Siri.'], ['2020', 'macOS 11 Big Sur', 'Rediseño y soporte de Apple Silicon.'], ['2025', 'macOS 26 Tahoe', 'Liquid Glass y app Teléfono.']] },
  { id: 'watchos', name: 'watchOS', device: 'Apple Watch', current: 'watchOS 27', since: 2015, note: 'watchOS 26 añadió el gesto de giro de muñeca y Workout Buddy.',
    history: [['2015', 'watchOS 1', 'Las apps dependían por completo del iPhone.'], ['2016', 'watchOS 3', 'Dock y apps que por fin abren rápido.'], ['2023', 'watchOS 10', 'Rediseño con widgets apilados.'], ['2025', 'watchOS 26', 'Liquid Glass y avisos de hipertensión.']] },
  { id: 'visionos', name: 'visionOS', device: 'Apple Vision Pro', current: 'visionOS 27', since: 2024, note: 'El sistema de computación espacial de Apple. visionOS 26 trajo widgets anclados al espacio y Personas más realistas.',
    history: [['2024', 'visionOS 1', 'Ventanas flotantes controladas con ojos y manos.'], ['2024', 'visionOS 2', 'Fotos 2D convertidas en espaciales.'], ['2025', 'visionOS 26', 'Widgets espaciales.']] },
  { id: 'tvos', name: 'tvOS', device: 'Apple TV', current: 'tvOS 27', since: 2015, note: 'Derivado de iOS para el televisor. Añade perfiles, FaceTime con Cámara de Continuidad y karaoke en Apple Music.',
    history: [['2015', 'tvOS 9', 'App Store en el Apple TV.'], ['2023', 'tvOS 17', 'FaceTime en el televisor.'], ['2025', 'tvOS 26', 'Liquid Glass.']] },
];

export const UPCOMING = [
  { title: 'Apple HomeView', when: '13 de noviembre de 2026', kind: 'oficial', text: 'Pantalla doméstica de 7 pulgadas con chip A18, a 299 $. En reserva.', productId: 'homeview', source: { label: 'MacRumors', url: 'https://macrumors.com/2026/11/02/apple-isnt-done-with-2026-heres-whats-still-coming/' } },
  { title: 'Apple TV 4K con chip A19', when: '13 de noviembre de 2026', kind: 'oficial', text: 'Nueva generación del Apple TV con Siri Remote renovado. En reserva.', productId: 'apple-tv-4k-2026', source: { label: 'MacRumors', url: 'https://www.macrumors.com/2026/10/30/25-new-apple-products/' } },
  { title: 'Apple Home Collection', when: 'A partir de diciembre de 2026', kind: 'oficial', text: 'Cámaras, termostatos y una cerradura de terceros respaldados por Apple.', source: { label: 'MacRumors', url: 'https://macrumors.com/2026/11/02/apple-isnt-done-with-2026-heres-whats-still-coming/' } },
  { title: 'iPhone 18 y iPhone 18e', when: 'Primavera de 2027', kind: 'rumor', text: 'El iPhone 18 estándar no salió en otoño; los medios lo sitúan en torno a marzo de 2027, con batería mayor y posible subida de precio.', source: { label: '91mobiles', url: 'https://www.91mobiles.com/hub/iphone-18-pro-series-launched-india-price-specifications/' } },
  { title: 'Nuevos iPad, iPad Air y iPad Pro', when: 'Primera mitad de 2027', kind: 'rumor', text: 'Según Mark Gurman (Bloomberg), Apple renovará los tres modelos en la primera mitad de 2027.', source: { label: 'MacRumors', url: 'https://www.macrumors.com/2026/10/30/25-new-apple-products/' } },
];

// Hitos de la compañía (línea temporal de Descubrir e Historia).
export const TIMELINE = [
  { year: 1976, title: 'Nace Apple', text: 'Steve Jobs, Steve Wozniak y Ronald Wayne fundan Apple Computer el 1 de abril. Wayne vende su 10 % a los doce días por 800 dólares.' },
  { year: 1977, title: 'Apple II', text: 'Uno de los primeros ordenadores personales de éxito masivo, con gráficos en color y carcasa de plástico.' },
  { year: 1984, title: 'Macintosh', text: 'La interfaz gráfica y el ratón llegan al gran público con un anuncio que hizo historia en la Super Bowl.', productId: 'macintosh-128k' },
  { year: 1985, title: 'Jobs deja Apple', text: 'Tras perder el pulso con el consejo, Steve Jobs se marcha y funda NeXT.' },
  { year: 1997, title: 'El regreso', text: 'Apple compra NeXT, Jobs vuelve como consejero delegado interino y lanza la campaña «Think Different».' },
  { year: 1998, title: 'iMac', text: 'El iMac translúcido salva a la compañía y jubila el disquete.', productId: 'imac-g3' },
  { year: 2001, title: 'Mac OS X, Apple Store y iPod', text: 'En un solo año: nuevo sistema operativo, primeras tiendas propias y «1000 canciones en tu bolsillo».', productId: 'ipod-2001' },
  { year: 2003, title: 'iTunes Music Store', text: 'Canciones a 99 centavos: la música digital legal se vuelve sencilla.' },
  { year: 2006, title: 'Salto a Intel', text: 'El Mac abandona PowerPC. El primer MacBook Pro llega en enero.' },
  { year: 2007, title: 'iPhone', text: '«Un iPod, un teléfono y un comunicador de internet». La empresa pasa a llamarse Apple Inc.', productId: 'iphone-2007' },
  { year: 2008, title: 'App Store y MacBook Air', text: 'Las apps de terceros transforman el iPhone; el Air sale de un sobre de oficina.' },
  { year: 2010, title: 'iPad y chip A4', text: 'Apple empieza a diseñar sus propios procesadores.', productId: 'ipad-2010' },
  { year: 2011, title: 'Tim Cook, consejero delegado', text: 'Steve Jobs dimite en agosto y fallece el 5 de octubre.' },
  { year: 2015, title: 'Apple Watch', text: 'Primera categoría nueva de la era Cook.', productId: 'apple-watch-2015' },
  { year: 2016, title: 'AirPods', text: 'Adiós al minijack del iPhone y nacimiento de los auriculares más vendidos.', productId: 'airpods-2016' },
  { year: 2017, title: 'iPhone X', text: 'Face ID y pantalla de borde a borde redefinen el iPhone.', productId: 'iphone-x' },
  { year: 2020, title: 'Apple Silicon', text: 'El Mac abandona Intel: el M1 demuestra que rendimiento y autonomía no están reñidos.', productId: 'macbook-air-m1' },
  { year: 2024, title: 'Apple Vision Pro', text: 'El primer «ordenador espacial» de la compañía.', productId: 'vision-pro' },
  { year: 2025, title: 'Liquid Glass e iPhone Air', text: 'Mayor rediseño de software desde iOS 7 y el iPhone más fino hasta la fecha.', productId: 'iphone-air' },
  { year: 2026, title: 'Relevo y primer plegable', text: 'John Ternus sucede a Tim Cook el 1 de septiembre; días después Apple presenta el iPhone Duo.', productId: 'iphone-duo', source: { label: 'BGR', url: 'https://www.bgr.com/2254009/iphone-18-pro-price-release-date-new-features/' } },
];

export const SILICON = [
  { chip: 'A4', year: 2010, text: 'Primer chip diseñado por Apple. Debuta en el iPad y el iPhone 4.' },
  { chip: 'A7', year: 2013, text: 'Primer procesador de 64 bits en un smartphone; pilló por sorpresa a toda la industria.' },
  { chip: 'A11 Bionic', year: 2017, text: 'Primer motor neuronal y primera GPU diseñada por Apple.' },
  { chip: 'M1', year: 2020, text: 'Apple Silicon llega al Mac: más rápido que los Intel a los que sustituye y con el doble de batería.' },
  { chip: 'M1 Pro / Max / Ultra', year: 2021, text: 'La arquitectura escala hasta estaciones de trabajo con memoria unificada.' },
  { chip: 'A17 Pro', year: 2023, text: 'Primer chip de 3 nm en un teléfono y trazado de rayos por hardware.' },
  { chip: 'M4', year: 2024, text: 'Estrena en el iPad Pro, antes que en ningún Mac.' },
  { chip: 'M5', year: 2025, text: 'Aceleradores neuronales en cada núcleo de la GPU.' },
  { chip: 'A20 Pro y M6', year: 2026, text: 'Primeros chips de Apple fabricados en 2 nanómetros.', source: { label: 'TidBITS', url: 'https://tidbits.com/2026/08/25/m6-and-m5-ultra-debut-in-updated-mac-mini-and-mac-studio/' } },
];

// Evolución del diseño del iPhone: cada parada enlaza a una ficha del catálogo.
export const IPHONE_DESIGN = [
  { productId: 'iphone-2007', title: 'Aluminio y plástico', text: 'Dorso de aluminio con una franja negra de plástico para las antenas.' },
  { productId: 'iphone-4', title: 'El sándwich de vidrio', text: 'Dos láminas de vidrio y un marco de acero que hace de antena.' },
  { productId: 'iphone-x', title: 'Todo pantalla', text: 'Desaparece el botón de inicio y aparece la muesca.' },
  { productId: 'iphone-13', title: 'Bordes planos', text: 'Vuelve el lenguaje del iPhone 4, ahora en aluminio.' },
  { productId: 'iphone-15-pro', title: 'Titanio', text: 'Más ligero, con cantos suavizados y Botón de Acción.' },
  { productId: 'iphone-17-pro', title: 'La meseta', text: 'Unibody de aluminio y un módulo de cámara de lado a lado.' },
  { productId: 'iphone-air', title: 'El más fino', text: '5,64 mm de titanio con toda la electrónica en la franja superior.' },
  { productId: 'iphone-duo', title: 'Se pliega', text: 'Dos pantallas y 5,2 mm de grosor abierto.' },
];

export const TIPS = [
  { os: 'iOS', title: 'El teclado es un trackpad', text: 'Mantén pulsada la barra espaciadora y desliza para mover el cursor con precisión.' },
  { os: 'iOS', title: 'Toque en la parte trasera', text: 'En Ajustes › Accesibilidad › Tocar › Tocar atrás puedes asignar una acción a dos o tres toques en el dorso.' },
  { os: 'iOS', title: 'Escanear documentos sin apps', text: 'En Notas o Archivos, mantén pulsado y elige «Escanear documentos»: recorta y endereza solo.' },
  { os: 'iOS', title: 'Agitar para deshacer', text: 'Si borras texto por error, agita el iPhone o desliza tres dedos hacia la izquierda.' },
  { os: 'iOS', title: 'Arrastrar entre apps', text: 'Mantén pulsada una foto, y con otro dedo cambia de app y suéltala allí.' },
  { os: 'iOS', title: 'Texto en vivo', text: 'Apunta la cámara a un texto o abre una foto: puedes copiarlo, traducirlo o llamar al teléfono que aparece.' },
  { os: 'macOS', title: 'Captura a medida', text: 'Mayús + Comando + 5 abre el panel de capturas y grabación de pantalla.' },
  { os: 'macOS', title: 'Vista rápida', text: 'Selecciona un archivo en el Finder y pulsa la barra espaciadora para previsualizarlo sin abrirlo.' },
  { os: 'macOS', title: 'Portapapeles Universal', text: 'Copia en el iPhone y pega en el Mac (o al revés) si ambos comparten cuenta de Apple, Wi-Fi y Bluetooth.' },
  { os: 'macOS', title: 'Esquinas activas', text: 'En Ajustes › Escritorio y Dock puedes asignar acciones a cada esquina de la pantalla.' },
  { os: 'macOS', title: 'Firmar PDF con el iPhone', text: 'En Vista Previa, crea una firma usando la cámara o la pantalla del iPhone.' },
  { os: 'macOS', title: 'Volumen fino', text: 'Mantén Opción + Mayús al pulsar las teclas de volumen o brillo para ajustar en pasos de un cuarto.' },
];

export const TRIVIA = [
  { title: 'Las 9:41', text: 'Los iPhone de los anuncios marcan las 9:41 porque esa era, aproximadamente, la hora a la que Steve Jobs mostró el primero en la keynote de 2007.' },
  { title: 'El tercer fundador', text: 'Ronald Wayne dibujó el primer logotipo de Apple y vendió su participación por 800 dólares.' },
  { title: 'El sobre', text: 'El primer MacBook Air se presentó saliendo de un sobre de papel manila.' },
  { title: 'Un Mac firmado', text: 'El interior de la carcasa del primer Macintosh lleva grabadas las firmas del equipo que lo creó.' },
  { title: 'Sosumi', text: 'El sonido de alerta «Sosumi» se llama así por «so sue me» («pues demándame»), un guiño a los pleitos con el sello de los Beatles.' },
  { title: 'La manzana mordida', text: 'El logotipo de 1977, obra de Rob Janoff, lleva un mordisco para que nadie lo confunda con una cereza.' },
  { title: 'Proyecto Purple', text: 'El iPhone se desarrolló en un edificio sellado de Cupertino apodado «Purple Dorm».' },
  { title: 'El primer producto', text: 'El Apple I se vendía como una placa sin carcasa, teclado ni monitor por 666,66 dólares.' },
];

export const TECH = [
  { title: 'Banda ultraancha', text: 'Los chips U1 y U2 miden distancias con precisión de centímetros: por eso el iPhone puede guiarte con una flecha hasta un AirTag.' },
  { title: 'Memoria unificada', text: 'En Apple Silicon, CPU y GPU comparten la misma memoria, sin copiar datos entre una y otra.' },
  { title: 'Taptic Engine', text: 'Un actuador lineal que simula clics: el trackpad del MacBook no se hunde, solo lo parece.' },
  { title: 'Secure Enclave', text: 'Un procesador aislado guarda los datos de Face ID y Touch ID; ni el propio sistema puede leerlos.' },
  { title: 'ProMotion', text: 'Pantallas que varían su refresco entre 1 y 120 Hz para ganar fluidez sin gastar batería en imágenes fijas.' },
  { title: 'Thread', text: 'Una red de malla de bajo consumo que conecta los accesorios del hogar sin depender del router.' },
];
