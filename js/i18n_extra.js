/* Extra strings (modules, physics, scenarios, pauses, tooltips, onboarding, settings). Merged into App.i18n. */
(function (App) {
  var I = App.i18n;
  function add(k, es, en) { I.es[k] = es; I.en[k] = en; }

  // ---- modules: title / intro / bullets (joined by |) ----
  var M = [
    ['Entrada', 'Entry', 'El proyectil atraviesa la bóveda desde afuera. Observa qué tabla se astilla.', 'The bullet crosses the vault from outside. Watch which table chips off.',
      'Orificio limpio en la tabla externa|cráter amplio en la [[tabla interna]] (bisel interno)|la cara sin apoyo es la que se astilla', 'Clean hole in the outer table|wide crater in the [[inner table]] (internal bevel)|the unsupported face is the one that chips'],
    ['Salida', 'Exit', 'Ahora el proyectil viene desde el encéfalo. ¿Hacia dónde se abre el cráter?', 'Now the bullet comes from the brain. Which way does the crater open?',
      'Orificio limpio en la tabla interna|cráter amplio en la tabla externa (bisel externo)|la presión intracraneal y el proyectil deformado lo agrandan', 'Clean hole in the inner table|wide crater in the outer table (external bevel)|intracranial pressure and the deformed bullet enlarge it'],
    ['Comparar', 'Compare', 'Entrada y salida lado a lado, con el mismo orden de capas.', 'Entry and exit side by side, same layer order.',
      'El cráter se abre en el sentido de la marcha|el bisel indica la dirección del disparo|el orificio de salida suele ser mayor', 'The crater opens in the direction of travel|the bevel tells the direction of fire|the exit hole is usually larger'],
    ['Ondas y fuerzas', 'Waves & forces', 'La física detrás del cráter: compresión, onda reflejada y flexión.', 'The physics behind the crater: compression, reflected wave and bending.',
      'La onda de compresión se refleja invertida en la [[cara libre]]|la tracción supera la resistencia del hueso|la flexión estira la cara opuesta', 'The compression wave reflects inverted at the [[free face]]|tension exceeds bone strength|bending stretches the far face'],
    ['Microestructura', 'Microstructure', 'Zoom ×20 al borde del cráter: trabéculas y grietas.', '×20 zoom at the crater rim: trabeculae and cracks.',
      'Las grietas nacen en el borde del orificio|avanzan oblicuas por el [[diploe]]|aíslan un cono que se desprende en esquirlas', 'Cracks start at the hole edge|run obliquely through the [[diploe]]|isolate a cone that detaches as fragments'],
    ['Disparo oblicuo', 'Oblique shot', 'El proyectil llega en ángulo. Mira la forma del orificio y del bisel.', 'The bullet arrives at an angle. Look at the shape of the hole and bevel.',
      'Orificio oval|bisel excéntrico, más amplio hacia donde va el proyectil|el eje largo indica el plano de la trayectoria', 'Oval hole|eccentric bevel, wider toward where the bullet goes|the long axis shows the trajectory plane'],
    ['Disparo de contacto', 'Contact shot', 'La boca del arma está apoyada sobre la piel que cubre el hueso.', 'The muzzle is pressed on skin overlying bone.',
      'Los gases despegan la piel: [[cámara de mina de Hoffmann]]|desgarro estrellado de la piel|hollín en la tabla externa: [[signo de Benassi]]', "Gases lift the skin: [[Hoffmann's mine chamber]]|stellate skin tear|soot on the outer table: [[Benassi sign]]"],
    ['Disparo tangencial', 'Tangential shot', 'El proyectil roza la bóveda en un ángulo muy bajo.', 'The bullet grazes the vault at a very shallow angle.',
      'Lesión en [[ojo de cerradura]]|porción redondeada con bisel interno (entrada)|porción ensanchada con bisel externo (salida)', '[[Keyhole]] lesion|round part with internal bevel (entry)|flared part with external bevel (exit)'],
    ['Cráneo completo', 'Whole skull', 'Recorre el cráneo y mira cada orificio por fuera y por dentro.', 'Explore the skull and view each hole from outside and inside.',
      'Entrada: pequeño por fuera, amplio por dentro|Salida: pequeño por dentro, amplio por fuera|fracturas radiadas desde cada orificio', 'Entry: small outside, wide inside|Exit: small inside, wide outside|radiating fractures from each hole']
  ];
  M.forEach(function (m, i) {
    var n = i + 1; add('m' + n + '_t', m[0], m[1]); add('m' + n + '_in', m[2], m[3]); add('m' + n + '_s', m[4], m[5]);
  });
  add('modules', '📚 Módulos', '📚 Modules'); add('completed', '{n}/9 completados', '{n}/9 completed'); add('reset_progress', 'Reiniciar progreso', 'Reset progress');
  add('begin', '▶ Empezar', '▶ Begin'); add('repeat', '↺ Repetir', '↺ Repeat'); add('next_module', 'Siguiente módulo →', 'Next module →');

  // ---- physics ----
  add('tab_phys', 'Física', 'Physics');
  add('f1', 'Apoyo vs. cara libre: la cara que toca primero el proyectil está respaldada por el resto del hueso y trabaja a compresión; la cara por donde sale solo tiene tejido blando o aire detrás: es una [[cara libre]] y trabaja a tracción.', 'Support vs. free face: the face the bullet touches first is backed by the rest of the bone and works in compression; the face it leaves through has only soft tissue or air behind it — a [[free face]] — and works in tension.');
  add('f2', 'Onda de esfuerzo: el impacto lanza una onda de compresión por el hueso (≈ 3 000–4 000 m/s). En la cara libre la [[impedancia acústica]] cae y la onda se refleja invertida, como tracción.', 'Stress wave: impact launches a compression wave through the bone (≈ 3,000–4,000 m/s). At the free face the [[acoustic impedance]] drops and the wave reflects inverted, as tension.');
  add('f3', 'Flexión: la placa ósea se dobla en el sentido de la marcha; la cara cercana se acorta (compresión) y la opuesta se estira (tracción).', 'Bending: the bone plate bends in the direction of travel; the near face shortens (compression) and the far face stretches (tension).');
  add('f4', 'Microestructura: las grietas nacen en el borde del orificio, cruzan oblicuas las trabéculas del diploe y aíslan un cono de hueso que se desprende (como el [[cono de Hertz]] en un vidrio).', 'Microstructure: cracks start at the hole edge, cross the diploe trabeculae obliquely and isolate a cone of bone that detaches (like a [[Hertzian cone]] in glass).');
  add('f5', 'El hueso resiste aproximadamente el doble a la compresión que a la tracción: por eso la cara comprimida queda limpia y la traccionada se astilla.', 'Bone resists roughly twice as much compression as tension: that is why the compressed face stays clean and the stretched face chips.');
  add('wv_fact1', 'Velocidad de la onda en hueso cortical: ≈ 3 000–4 000 m/s.', 'Wave speed in cortical bone: ≈ 3,000–4,000 m/s.');
  add('wv_fact2', 'Impedancias: hueso ≈ 6,6 MRayl; encéfalo/piel ≈ 1,6 MRayl → coeficiente de reflexión R ≈ −0,6 (la onda vuelve invertida).', 'Impedances: bone ≈ 6.6 MRayl; brain/scalp ≈ 1.6 MRayl → reflection coefficient R ≈ −0.6 (the wave returns inverted).');
  add('wv_fact3', 'La onda cruza 6 mm de hueso en ~2 µs; el proyectil tarda ~17 µs: el esfuerzo se organiza antes de que el proyectil atraviese.', 'The wave crosses 6 mm of bone in ~2 µs; the bullet takes ~17 µs: the stress field forms before the bullet gets through.');
  add('wv_comp', 'onda de compresión →', 'compression wave →'); add('wv_refl', '← reflejada como tracción', '← reflected as tension'); add('wv_fail', '¡falla por tracción!', 'tensile failure!');
  add('g_ax_x', 'profundidad', 'depth'); add('g_near', 'cara de contacto', 'contact face'); add('g_far', 'cara libre', 'free face'); add('g_ax_y', 'esfuerzo (MPa, esquemático)', 'stress (MPa, schematic)');
  add('g_cs', 'resistencia a compresión ≈ 150 MPa', 'compressive strength ≈ 150 MPa'); add('g_ts', 'resistencia a tracción ≈ 80 MPa', 'tensile strength ≈ 80 MPa');
  add('mi_title', '🔬 Microestructura (×20)', '🔬 Microstructure (×20)');
  add('mi_trab', 'trabéculas (diploe)', 'trabeculae (diploe)'); add('mi_crack', 'grieta oblicua', 'oblique crack'); add('mi_frag', 'fragmento desprendido', 'detached fragment'); add('mi_free', 'cara libre', 'free face');
  add('ov_waves', 'Ondas', 'Waves'); add('ov_bend', 'Flexión', 'Bending'); add('ov_micro', 'Microestructura', 'Microstructure'); add('ov_expl', 'Explicación', 'Explanation'); add('ov_forces', 'Fuerzas', 'Forces');
  add('bend_note', 'deformación ×10', 'deformation ×10'); add('more', 'Más detalle ▾', 'More detail ▾');
  add('lg_comp', '⇢⇠ compresión', '⇢⇠ compression'); add('lg_tens', '⇠⇢ tracción', '⇠⇢ tension');
  add('cd_e2', 'El hueso detrás del punto de contacto lo sostiene: la carga se reparte y la tabla externa se corta casi del tamaño del proyectil, sin astillarse.', "The bone behind the contact point supports it: the load spreads and the outer table is cut almost to the bullet's size, without chipping.");
  add('cd_e3', 'El diploe es esponjoso: absorbe y se tritura; sus fragmentos son empujados por el proyectil hacia adentro.', 'The diploe is spongy: it absorbs and crushes; its fragments are pushed inward by the bullet.');
  add('cd_e4', 'Detrás de la tabla interna solo hay duramadre y encéfalo, que casi no ofrecen apoyo. La onda reflejada y la flexión la traccionan y se desprende un cono de hueso hacia el encéfalo.', 'Behind the inner table there are only dura and brain, giving almost no support. The reflected wave and bending put it in tension and a cone of bone detaches into the brain.');
  add('cd_x2', 'Ahora el apoyo está del lado de afuera: la tabla interna es la cara de contacto y se perfora limpia.', 'Now the support is on the outside: the inner table is the contact face and is punched cleanly.');
  add('cd_x4', 'La tabla externa solo tiene piel y aire por fuera: es la cara libre. Se tracciona y se astilla hacia afuera, ayudada por la presión intracraneal.', 'The outer table has only scalp and air outside: it is the free face. It goes into tension and chips outward, helped by intracranial pressure.');

  // ---- scenarios / projectiles ----
  add('scenario', 'Escenario', 'Scenario'); add('sc_perp', 'Perpendicular', 'Perpendicular'); add('sc_obl', 'Oblicuo', 'Oblique'); add('sc_cont', 'Contacto', 'Contact'); add('sc_tang', 'Tangencial', 'Tangential');
  add('theta', 'Ángulo de incidencia', 'Angle of incidence');
  add('ob_oval', 'orificio oval', 'oval hole'); add('ob_ecc', 'bisel excéntrico (más amplio hacia donde va el proyectil)', 'eccentric bevel (wider toward where the bullet goes)');
  add('ob_axis', 'el eje largo indica el plano de la trayectoria', 'the long axis shows the trajectory plane');
  add('ct_mine', 'cámara de mina de Hoffmann: los gases despegan la piel del hueso', "Hoffmann's mine chamber: gases lift the skin off the bone");
  add('ct_benassi', 'signo de Benassi: hollín en la tabla externa', 'Benassi sign: soot on the outer table');
  add('ct_puppe', 'signo de Puppe-Werkgartner: impronta de la boca del arma', 'Puppe-Werkgartner sign: muzzle imprint');
  add('ct_star', 'desgarro estrellado por expansión de gases', 'stellate tear from gas expansion');
  add('tg_key', 'orificio en ojo de cerradura', 'keyhole defect'); add('tg_in', 'porción de entrada: bisel interno', 'entry portion: internal bevel'); add('tg_out', 'porción de salida: bisel externo', 'exit portion: external bevel');
  add('tg_rule', 'Disparo tangencial: ambos biseles en el mismo defecto (Dixon, 1982).', 'Tangential shot: both bevels in the same defect (Dixon, 1982).');
  add('cutaway', 'Proyectil en corte', 'Cut-away bullet'); add('jacket', 'camisa de cobre', 'copper jacket'); add('core', 'núcleo de plomo', 'lead core'); add('steelcore', 'núcleo de acero', 'steel core');
  add('petals', 'pétalos expandidos (hongo)', 'expanded petals (mushroom)'); add('yaw_note', 'cabeceo/volteo: el proyectil presenta más superficie', 'yaw/tumble: the bullet presents more surface');
  add('frag556', 'a alta velocidad este proyectil tiende a fragmentarse en la canelura', 'at high velocity this bullet tends to break at the cannelure');
  add('mach', 'onda de choque (supersónico, Mach {m})', 'shock wave (supersonic, Mach {m})');
  add('slowmo', 'CÁMARA LENTA ×0,3', 'SLOW-MO ×0.3'); add('freeze', '⏸ Astillado de la cara libre', '⏸ Free-face spalling');
  add('realtime', 'tiempo real (dilatado en pantalla)', 'real time (slowed on screen)');

  // ---- pauses ----
  var P = {
    pe1: ['① Apoyo → punzonado', '① Support → punching', 'La tabla externa está respaldada por el resto del hueso: trabaja a compresión y se corta limpia, casi del tamaño del proyectil.', "The outer table is backed by the rest of the bone: it works in compression and is cut cleanly, almost to the bullet's size."],
    pe2: ['② La onda llega a la cara libre', '② The wave reaches the free face', 'La onda de compresión cruza el hueso y, al llegar a la tabla interna (detrás solo hay encéfalo), se refleja invertida: ahora es tracción.', 'The compression wave crosses the bone and, at the inner table (only brain behind), reflects inverted: now it is tension.'],
    pe3: ['③ Se desprende el cono', '③ The cone detaches', 'La tracción supera la resistencia del hueso: las grietas oblicuas aíslan un cono que se astilla hacia el encéfalo. Ese es el bisel interno.', 'Tension exceeds bone strength: oblique cracks isolate a cone that chips into the brain. That is the internal bevel.'],
    pe4: ['④ Lectura forense', '④ Forensic reading', 'Pequeño por fuera, amplio por dentro = ENTRADA. El cráter apunta hacia donde iba el proyectil.', 'Small outside, wide inside = ENTRY. The crater points where the bullet was going.'],
    px1: ['① Presión intracraneal', '① Intracranial pressure', 'La cavidad temporal empuja la bóveda desde adentro antes de que llegue el proyectil.', 'The temporary cavity pushes the vault from inside before the bullet arrives.'],
    px2: ['② Ahora el apoyo está afuera', '② Now the support is outside', 'La tabla interna es la cara de contacto: se perfora limpia.', 'The inner table is the contact face: it is punched cleanly.'],
    px3: ['③ La cara libre es la externa', '③ The free face is the outer one', 'Solo piel y aire por fuera: la tabla externa se tracciona y se astilla hacia afuera = bisel externo.', 'Only scalp and air outside: the outer table goes into tension and chips outward = external bevel.'],
    px4: ['④ Lectura forense', '④ Forensic reading', 'Pequeño por dentro, amplio por fuera = SALIDA.', 'Small inside, wide outside = EXIT.'],
    po1: ['Bisel excéntrico', 'Eccentric bevel', 'El cráter es más amplio hacia el lado al que se dirige el proyectil; el eje largo del óvalo marca el plano del disparo.', 'The crater is wider on the side the bullet travels toward; the long axis of the oval marks the plane of fire.'],
    pc1: ['Gases bajo la piel', 'Gas under the skin', 'Los gases del disparo entran bajo la piel, chocan con el hueso y la despegan: cámara de mina de Hoffmann.', "Muzzle gases enter under the skin, hit the bone and lift it: Hoffmann's mine chamber."],
    pc2: ['Desgarro estrellado', 'Stellate tear', 'La piel estirada por los gases se rompe en estrella.', 'Skin stretched by the gas tears in a star shape.'],
    pc3: ['Signo de Benassi', 'Benassi sign', 'Anillo de hollín sobre la tabla externa alrededor del orificio: indica disparo de contacto.', 'Ring of soot on the outer table around the hole: indicates a contact shot.']
  };
  Object.keys(P).forEach(function (k) { add(k + '_t', P[k][0], P[k][1]); add(k + '_b', P[k][2], P[k][3]); });
  add('pauses', 'Pausas didácticas', 'Didactic pauses'); add('continue', 'Continuar ▶', 'Continue ▶');

  // ---- tooltips ----
  add('tt_skin', 'Piel (cuero cabelludo) — elástica: el orificio de entrada queda menor que el calibre.', 'Scalp — elastic: the entry hole ends up smaller than the caliber.');
  add('tt_outer', 'Tabla externa — hueso compacto ~1,5 mm; en la entrada está apoyada, en la salida es la cara libre.', 'Outer table — compact bone ~1.5 mm; supported at entry, free face at exit.');
  add('tt_diploe', 'Diploe — hueso esponjoso entre ambas tablas; se tritura y conduce las grietas.', 'Diploe — spongy bone between the tables; it crushes and guides the cracks.');
  add('tt_inner', 'Tabla interna — hueso compacto ~1 mm; en la entrada no tiene apoyo detrás (encéfalo).', 'Inner table — compact bone ~1 mm; at entry it has no support behind (brain).');
  add('tt_dura', 'Duramadre — membrana fibrosa; casi no da apoyo mecánico al hueso.', 'Dura mater — fibrous membrane; gives the bone almost no mechanical support.');
  add('tt_brain', 'Encéfalo — blando y casi incompresible: transmite la presión de la cavidad temporal.', 'Brain — soft and nearly incompressible: transmits the temporary-cavity pressure.');
  add('tt_bullet', '{name} · Ø {cal} mm · {m} g · {v} m/s · {ke} J', '{name} · Ø {cal} mm · {m} g · {v} m/s · {ke} J');

  // ---- onboarding, start, settings, help ----
  add('ob1', 'Elige la vista: Detalle (corte de las capas), Comparar (entrada y salida) o Cráneo (3D completo).', 'Choose the view: Detail (layer cross-section), Compare (entry and exit) or Skull (full 3D).');
  add('ob2', 'Controla el tiempo: reproduce, pausa o arrastra la línea de tiempo. Las marcas son las etapas.', 'Control time: play, pause or drag the timeline. The ticks are the stages.');
  add('ob3', 'Cada etapa explica qué le pasa al hueso. Haz clic en una para saltar a ella.', 'Each stage explains what happens to the bone. Click one to jump to it.');
  add('ob4', '¿Por qué? explica las causas desde el proyectil, el tejido y la física. Pasa el ratón por una tarjeta para resaltarla en 3D.', 'Why? explains the causes from the bullet, the tissue and the physics. Hover a card to highlight it in 3D.');
  add('ob5', 'Sigue los módulos en orden para completar el tema. ¡Empecemos!', "Follow the modules in order to complete the topic. Let's start!");
  add('ob_next', 'Siguiente', 'Next'); add('ob_skip', 'Saltar', 'Skip'); add('ob_again', 'Ver tutorial otra vez', 'Show tutorial again');
  add('shortcuts', 'Atajos de teclado', 'Keyboard shortcuts'); add('hide_panels', 'H: ocultar paneles', 'H: hide panels');
  add('sc1', 'Por qué la entrada deja un cráter interno y la salida uno externo', 'Why entry leaves an internal crater and exit an external one');
  add('sc2', 'Ondas de esfuerzo, fuerzas y grietas dentro del hueso', 'Stress waves, forces and cracks inside the bone');
  add('sc3', 'Disparos oblicuos, de contacto y tangenciales', 'Oblique, contact and tangential shots');
  add('learn_h', '¿Qué vas a aprender?', 'What will you learn?');
  add('credit', "Modelo de cráneo: 'ScatteringSkull' de Vladimir Petkovic (CC0), Khronos glTF Sample Assets.", "Skull model: 'ScatteringSkull' by Vladimir Petkovic (CC0), Khronos glTF Sample Assets.");
  add('settings', 'Ajustes', 'Settings'); add('quality', 'Calidad', 'Quality'); add('q_auto', 'Auto', 'Auto'); add('q_high', 'Alta', 'High'); add('q_save', 'Ahorro', 'Power saver');
  add('cinematic', 'Modo cinematográfico', 'Cinematic mode'); add('def_speed', 'Velocidad por defecto', 'Default speed');
  add('reduce_motion', 'Reducir movimiento', 'Reduce motion'); add('language', 'Idioma', 'Language');
  add('collapse', 'Plegar/desplegar', 'Collapse/expand');
  add('clock_t', 't = {us} µs', 't = {us} µs'); add('clock_v', 'v = {v} m/s', 'v = {v} m/s');
  add('help_h', 'Ayuda', 'Help');
  add('sk_keys', 'Espacio: reproducir/pausa · ←/→: etapa · R: repetir · 1/2/3: vistas · E/X: entrada/salida · L: idioma · S: esfuerzos · W: ondas · B: flexión · M: microestructura · C: cinematográfico · H: ocultar paneles · F: rendimiento · P: pausas didácticas · Esc: cerrar',
    'Space: play/pause · ←/→: stage · R: replay · 1/2/3: views · E/X: entry/exit · L: language · S: stress · W: waves · B: bending · M: microstructure · C: cinematic · H: hide panels · F: performance · P: didactic pauses · Esc: close');

  // ---- glossary additions ----
  add('g12', 'Onda de esfuerzo|Perturbación mecánica que viaja por el hueso tras el impacto; puede ser de compresión o de tracción.', 'Stress wave|Mechanical disturbance travelling through bone after impact; compressive or tensile.');
  add('g13', 'Impedancia acústica|Densidad × velocidad del sonido del material; si cambia bruscamente, la onda se refleja.', 'Acoustic impedance|Density × sound speed of a material; an abrupt change reflects the wave.');
  add('g14', 'Cara libre|Superficie del hueso sin apoyo detrás (tejido blando o aire); allí la onda se refleja como tracción.', 'Free face|Bone surface with no support behind it (soft tissue or air); there the wave reflects as tension.');
  add('g15', 'Astillado (spall)|Desprendimiento de hueso de la cara libre por tracción; forma el cráter.', 'Spalling|Detachment of bone from the free face by tension; it forms the crater.');
  add('g16', 'Cono de Hertz|Fractura cónica que aparece al perforar un material frágil, como el vidrio.', 'Hertzian cone|Cone-shaped fracture formed when a brittle material such as glass is perforated.');
  add('g17', 'Cámara de mina de Hoffmann|Despegamiento de la piel por los gases en disparos de contacto sobre hueso.', "Hoffmann's mine chamber|Skin lifted by muzzle gases in contact shots over bone.");
  add('g18', 'Signo de Benassi|Anillo de hollín sobre la tabla externa alrededor del orificio de entrada en disparos de contacto.', 'Benassi sign|Ring of soot on the outer table around the entry hole in contact shots.');
  add('g19', 'Signo de Puppe-Werkgartner|Impronta de la boca del arma en la piel en disparos de contacto.', 'Puppe-Werkgartner sign|Imprint of the muzzle on the skin in contact shots.');
  add('g20', 'Disparo oblicuo|Disparo que incide en ángulo: orificio oval y bisel excéntrico.', 'Oblique shot|Shot arriving at an angle: oval hole and eccentric bevel.');
  add('g10', 'Ojo de cerradura|Disparo tangencial: bisel interno en el lado de entrada y externo en el de salida del mismo defecto (descrita por Dixon, 1982).', 'Keyhole lesion|Tangential shot: internal bevel at the entry side and external bevel at the exit side of the same defect (described by Dixon, 1982).');

  // ---- interface modes, sharing, mobile ----
  add('ui_study', '🎓 Estudio', '🎓 Study'); add('ui_present', '📽 Presentación', '📽 Presentation');
  add('ui_study_t', 'Modo estudio: todos los paneles, para explorar en la laptop', 'Study mode: all panels, to explore on a laptop');
  add('ui_present_t', 'Modo presentación: letra grande y pantalla limpia para proyectar en clase', 'Presentation mode: large type and a clean screen for projecting in class');
  add('present_btn', '📽 Presentar en clase', '📽 Present in class');
  add('toast_present', 'Modo presentación · avanza con ←/→, RePág/AvPág o el puntero de diapositivas · Espacio: reproducir', 'Presentation mode · step with ←/→, PgUp/PgDn or a slide clicker · Space: play');
  add('toast_study', 'Modo estudio · todos los paneles y parámetros visibles', 'Study mode · all panels and parameters visible');
  add('share', '🔗 Compartir', '🔗 Share'); add('share_h', 'Compartir con los estudiantes', 'Share with students');
  add('share_note', 'Escanea el código con el celular o abre el enlace en cualquier navegador. No requiere instalar nada.', 'Scan the code with a phone or open the link in any browser. Nothing to install.');
  add('copy', 'Copiar enlace', 'Copy link'); add('copied', '¡Enlace copiado!', 'Link copied!');
  add('loading', 'Cargando…', 'Loading…'); add('fullscreen', 'Pantalla completa', 'Full screen');
  add('mob_stage', 'Etapa', 'Stage'); add('mob_why', '¿Por qué?', 'Why?'); add('mob_skin', 'Piel', 'Skin'); add('mob_params', 'Ajustes', 'Controls');
  add('tour_start', '▶ Recorrido guiado (Entrada → Salida → Comparar)', '▶ Guided tour (Entry → Exit → Compare)');

  // alias -> glossary key for [[term]] markers
  I.glossAlias = {
    'tabla interna': 'g2', 'inner table': 'g2', 'diploe': 'g3', 'cara libre': 'g14', 'free face': 'g14',
    'impedancia acústica': 'g13', 'acoustic impedance': 'g13', 'cono de hertz': 'g16', 'hertzian cone': 'g16',
    'cámara de mina de hoffmann': 'g17', "hoffmann's mine chamber": 'g17', 'signo de benassi': 'g18', 'benassi sign': 'g18',
    'ojo de cerradura': 'g10', 'keyhole': 'g10'
  };
  I.glossKeys = function () { var n = [], k; for (k in I.es) if (/^g\d+$/.test(k)) n.push(+k.slice(1)); return n.sort(function (a, b) { return a - b; }); };
  I.fmt = function (key, o) { var s = I.t(key); for (var k in o) s = s.replace('{' + k + '}', o[k]); return s; };
})(window.App = window.App || {});
