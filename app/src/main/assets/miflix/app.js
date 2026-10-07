/* MiFlix V1.9.5 - personal media center prototype.
   V1.2 added:
   - Live TMDB metadata/catalog/search (user supplies their own API key/read token)
   - English/Spanish UI + TMDB language switching
   - Add-on manifest import by URL or local JSON file
   - A playable Open Movies demo add-on
   - TMDB backdrop ambience + lazy YouTube trailer previews
   - Local-first favorites/progress/settings cache
   - Stremio-compatible stream add-on bridge (manifest + stream resources)
   - TMDB → IMDb mapping for stream add-ons
*/

const APP_VERSION = '1.9.5';
const PERSONAL_DEFAULTS = Object.freeze(window.MIFLIX_DEFAULTS || {});
const IS_ANDROID_TV = (()=>{try{return window.MiFlixAndroid?.platform?.()==='android-tv';}catch{return false;}})();
const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/';
const TMDB_LOGO = 'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_1-5bdc75aaebeb75dc7ae79426ddd9be3b2be1e342510f8202baf6bffa71d7f5c4.svg';

const LOCAL_MEDIA_API = 'http://127.0.0.1:19286';
const PLATFORM_ART = {
  'netflix': {
    cover:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/netflix/netflix-landscape.gif',
    focus:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/netflix/netflix.gif'
  },
  'disney-plus': {
    cover:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/disney/disney-landscape.png',
    focus:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/disney/disney.gif'
  },
  'prime-video': {
    cover:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/prime-video/prime-video-landscape.png',
    focus:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/prime-video/prime-video.gif'
  },
  'hbo-max': {
    cover:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/hbo-max/hbo-max-landscape.gif',
    focus:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/hbo-max/hbo-max-landscape.gif'
  },
  'apple-tv': {
    cover:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/apple-tv/apple-tv-landscape.jpg',
    focus:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/apple-tv/apple-tv.gif'
  },
  'paramount-plus': {
    cover:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/paramount/paramount.gif',
    focus:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/paramount/paramount.gif'
  },
  'peacock': {
    cover:'https://nuvioapp.space/uploads/covers/1d9c3371-5fcd-422c-b967-64a5d3847889.png',
    focus:'https://64.media.tumblr.com/a378bf124ed7d00c8d7430cb8a9ae0cc/9e0da9dbc32641f6-b2/s1280x1920/e8c0ba2f6aadae5b6f532a177926528e94b04d68.gifv'
  },
  'hulu': {
    cover:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/hulu/hulu.gif',
    focus:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/hulu/hulu.gif'
  },
  'crunchyroll': {
    cover:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/crunchyroll/crunchyroll-landscape.gif',
    focus:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/crunchyroll/crunchyroll.gif'
  },
  'shudder': {
    cover:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/shudder/shudder-landscape.gif',
    focus:'https://raw.githubusercontent.com/rrevanth/nuvio-assets/main/streaming/shudder/shudder-landscape.gif'
  }
};


const OFFICIAL_OPENSUBTITLES = {
  id:'org.stremio.opensubtitlesv3', name:'OpenSubtitles v3', version:'1.0.0',
  description:'Official Stremio OpenSubtitles v3 provider.', description_es:'Proveedor oficial OpenSubtitles v3 de Stremio.',
  types:['movie','series'], resources:['subtitles'], protocol:'stremio', builtIn:true,
  source:'https://opensubtitles-v3.strem.io/manifest.json', baseUrl:'https://opensubtitles-v3.strem.io'
};
const OFFICIAL_OPENSUBTITLES_LEGACY = {
  id:'org.stremio.opensubtitles.legacy', name:'OpenSubtitles fallback', version:'0.24.0',
  description:'Official OpenSubtitles fallback provider.', description_es:'Proveedor alternativo oficial de OpenSubtitles.',
  types:['movie','series'], resources:['subtitles'], protocol:'stremio', builtIn:true,
  source:'https://opensubtitles.strem.io/stremio/v1', baseUrl:'https://opensubtitles.strem.io/stremio/v1'
};
const AVATAR_PRESETS = [
  ['nebula','Nebula'],['robot','Robot'],['fox','Fox'],['planet','Planet'],
  ['ghost','Ghost'],['rocket','Rocket'],['cat','Cat'],['wave','Wave']
];
const CLOUD_PROFILE_ACCOUNT='__account__';

const ASSET = slug => ({
  backdrop:`assets/backdrops/${slug}.jpg`,
  trailer:`assets/trailers/${slug}.mp4`
});

const DEFAULT_CATALOG = [
  {id:'mfx:movie:aurora',type:'movie',title:'Aurora Protocol',year:2026,rating:8.6,duration:'2h 14m',genre:'Sci‑Fi',genre_es:'Ciencia ficción',description:'A rescue mission encounters an impossible signal at the edge of the solar system.',description_es:'Una misión de rescate encuentra una señal imposible en el borde del sistema solar.',featured:true,...ASSET('aurora'),streams:[]},
  {id:'mfx:movie:nocturne',type:'movie',title:'Nocturne City',year:2025,rating:8.1,duration:'1h 58m',genre:'Thriller',description:'A detective follows a clue that only appears after midnight.',description_es:'Una detective sigue una pista que solo aparece después de medianoche.',...ASSET('nocturne'),streams:[]},
  {id:'mfx:series:frontier',type:'series',title:'Frontier Zero',year:2026,rating:8.8,duration:'8 episodes',duration_es:'8 episodios',genre:'Drama',description:'The first permanent colony on Mars discovers it did not arrive alone.',description_es:'La primera colonia permanente de Marte descubre que no llegó sola.',...ASSET('frontier'),streams:[]},
  {id:'mfx:movie:velocity',type:'movie',title:'Velocity',year:2024,rating:7.9,duration:'2h 03m',genre:'Action',genre_es:'Acción',description:'An underground race crosses five countries in a single night.',description_es:'Una carrera clandestina atraviesa cinco países en una sola noche.',...ASSET('velocity'),streams:[]},
  {id:'mfx:series:signal',type:'series',title:'The Signal Room',year:2025,rating:8.4,duration:'10 episodes',duration_es:'10 episodios',genre:'Mystery',genre_es:'Misterio',description:'Five strangers receive the same transmission from a number that does not exist.',description_es:'Cinco desconocidos reciben la misma transmisión desde un número que no existe.',...ASSET('signal'),streams:[]},
  {id:'mfx:movie:dust',type:'movie',title:'Dust & Steel',year:2023,rating:7.7,duration:'1h 49m',genre:'Western',description:'A frontier town bets its future on one final delivery.',description_es:'Un pueblo fronterizo apuesta su futuro a una última entrega.',...ASSET('dust'),streams:[]},
  {id:'mfx:series:atlas',type:'series',title:'Atlas Division',year:2026,rating:9.0,duration:'6 episodes',duration_es:'6 episodios',genre:'Sci‑Fi',genre_es:'Ciencia ficción',description:'A secret agency investigates places that appear on maps before they exist.',description_es:'Una agencia secreta investiga lugares que aparecen en mapas antes de existir.',...ASSET('atlas'),streams:[]},
  {id:'mfx:movie:echo',type:'movie',title:'Echoes of Tomorrow',year:2025,rating:8.2,duration:'2h 21m',genre:'Drama',description:'A composer begins to hear songs written by her future self.',description_es:'Una compositora empieza a escuchar canciones escritas por su yo del futuro.',...ASSET('echo'),streams:[]},
  {id:'mfx:movie:drift',type:'movie',title:'Drift',year:2024,rating:7.6,duration:'1h 42m',genre:'Adventure',genre_es:'Aventura',description:'Two siblings cross an archipelago that moves every dawn.',description_es:'Dos hermanos cruzan un archipiélago que cambia de lugar cada amanecer.',...ASSET('drift'),streams:[]},
  {id:'mfx:series:cipher',type:'series',title:'Cipher House',year:2025,rating:8.0,duration:'12 episodes',duration_es:'12 episodios',genre:'Crime',genre_es:'Crimen',description:'A family of cryptographers works for clients they can never meet.',description_es:'Una familia de criptógrafos trabaja para clientes que nunca pueden conocer.',...ASSET('cipher'),streams:[]},
  {id:'mfx:movie:monolith',type:'movie',title:'Monolith',year:2026,rating:8.5,duration:'2h 08m',genre:'Sci‑Fi',genre_es:'Ciencia ficción',description:'A structure appears in the ocean and begins answering questions.',description_es:'Una estructura aparece en el océano y comienza a responder preguntas.',...ASSET('monolith'),streams:[]},
  {id:'mfx:series:afterlight',type:'series',title:'Afterlight',year:2024,rating:7.8,duration:'9 episodes',duration_es:'9 episodios',genre:'Fantasy',genre_es:'Fantasía',description:'In a city without sunrise, light has become currency.',description_es:'En una ciudad sin amanecer, la luz se ha convertido en moneda.',...ASSET('afterlight'),streams:[]}
];

const DEFAULT_SETTINGS = {
  theme:'nuvio', accent:'#8b5cf6', cardSize:'medium', radius:18, density:'comfortable', blur:18,
  motion:true, showRatings:true, showYear:true, showDescription:true, autoPreviews:true, previewDelay:11,
  language:'es', autoFullscreen:true, autoplayFirst:true, autoplayNext:true, skipIntro:true, introSkipSeconds:90,
  preferredAudio:'', preferredSubtitle:'es', watchRegion:'DO', playerEngine:'builtin', externalPlayer:'mpv', tvCompatibilityMode:true, watchPartyRelayUrl:''
};

const BUILTIN_ADDONS = [
  OFFICIAL_OPENSUBTITLES, OFFICIAL_OPENSUBTITLES_LEGACY,
  {id:'mfx.metadata.tmdb',name:'TMDB Metadata',name_es:'Metadata TMDB',version:APP_VERSION,description:'Live movie/TV metadata, artwork, search and trailers from TMDB.',description_es:'Metadata, imágenes, búsqueda y trailers en vivo desde TMDB.',types:['catalog','meta','search','trailers'],builtIn:true},
  {id:'mfx.player.direct',name:'Direct Stream Player',version:APP_VERSION,description:'Plays direct HTTP video links supported by the browser player.',description_es:'Reproduce enlaces HTTP directos compatibles con el navegador.',types:['stream'],builtIn:true},
  {id:'mfx.bridge.stremio',name:'Stremio Add-on Bridge',name_es:'Puente de Add-ons Stremio',version:APP_VERSION,description:'Reads standard Stremio manifests and stream endpoints for compatible add-ons.',description_es:'Lee manifests y endpoints de streams del protocolo estándar de Stremio.',types:['stream','stremio'],builtIn:true}
];

const I18N = {
  es:{
    home:'Inicio',movies:'Películas',series:'Series',library:'Mi lista',collections:'Colecciones',addons:'Add-ons',party:'Watch Party',settings:'Configuración',
    personalCenter:'TU MEDIA CENTER PERSONAL',catalog:'CATÁLOGO',localLibrary:'BIBLIOTECA LOCAL',modular:'SISTEMA MODULAR',personalization:'PERSONALIZACIÓN',results:'RESULTADOS',
    searchPlaceholder:'Buscar películas, series…',featured:'DESTACADO EN MIFLIX',watchDetails:'▶ Ver detalles',myList:'＋ Mi lista',inMyList:'♥ En mi lista',removeList:'♥ Quitar de mi lista',addList:'♡ Mi lista',
    continueWatching:'Continuar viendo',continueSub:'Retoma desde donde lo dejaste',recommended:'Recomendado para ti',recommendedSub:'Una selección para probar MiFlix',recent:'Añadido recientemente',recentSub:'Más contenido del catálogo',
    titlesAvailable:'títulos disponibles',savedThisPc:'guardados en este PC',emptyList:'Tu lista está vacía',emptyListText:'Abre cualquier película o serie y pulsa “Mi lista”.',
    noResults:'Sin resultados',tryAnother:'Prueba con otro término de búsqueda.',searchFor:'Resultados para',matches:'coincidencias',nothingFound:'No encontramos nada',noMatches:'No hay coincidencias para',searchingTmdb:'Buscando también en TMDB…',
    movie:'PELÍCULA',show:'SERIE',previewIn:'Preview en',play:'▶ Reproducir',availableSources:'Fuentes disponibles',streamsFromAddons:'Los streams vendrán de tus add-ons. TMDB solo aporta metadata e imágenes.',noStreams:'Sin streams configurados',noStreamsInfo:'Instala un add-on con una fuente compatible o usa el player manual para probar un enlace directo.',openPlayer:'Abrir player',source:'Fuente',direct:'Directo',
    playerTitle:'Reproductor MiFlix',pasteDirect:'Pega un enlace directo MP4/WebM para probar el reproductor.',load:'Cargar',localProgress:'Player local · progreso guardado en este PC',markHalf:'Simular 50% visto',
    installAddon:'Instalar add-on',addonIntro:'Pega un manifest MiFlix o Stremio, importa un JSON local o instala el demo. Los manifests configurados se guardan solo en este PC.',install:'Instalar',importJson:'Importar JSON',openMoviesDemo:'Open Movies demo',active:'ACTIVO',delete:'Eliminar',noDescription:'Sin descripción.',
    addonMissingUrl:'Falta la URL',addonMissingUrlText:'Pega primero la URL del manifest.',addonInstallFailed:'No se pudo instalar',addonCors:'El servidor debe permitir CORS y devolver JSON válido.',invalidManifest:'Manifest inválido',invalidManifestText:'Debe incluir al menos id y name.',alreadyInstalled:'Ya está instalado',addonInstalled:'Add-on instalado',addonRemoved:'Add-on eliminado',fileReadFailed:'No se pudo leer el archivo',
    appearance:'Apariencia',appearanceIntro:'Los cambios se aplican al instante y se guardan solo en este equipo.',preset:'Preset',accent:'Color de acento',cardSize:'Tamaño de tarjetas',medium:'Mediano',large:'Grande',rounding:'Redondeo',panelBlur:'Blur de paneles',density:'Densidad',comfortable:'Cómoda',compact:'Compacta',animations:'Animaciones',autoPreviews:'Previews automáticos',previewHelp:'Al dejar mouse/foco sobre una tarjeta durante {seconds} segundos.',ratings:'Mostrar ratings',heroDescription:'Mostrar descripción en hero',resetAppearance:'Restaurar apariencia',
    livePreview:'PREVIEW EN VIVO',yourMiflix:'Tu MiFlix, a tu gusto.',previewCopy:'Las tarjetas son horizontales, el fondo reacciona al título enfocado y las previews pueden arrancar solas.',
    language:'Idioma',spanish:'Español',english:'English',
    tmdbTitle:'Conexión TMDB',tmdbIntro:'Conecta tu propio API key v3 o API Read Access Token. La credencial se guarda localmente en este PC.',tmdbCredential:'API key / Read Access Token',tmdbPlaceholder:'Pega aquí tu API key o token…',saveConnect:'Guardar y conectar',testConnection:'Probar conexión',refreshCatalog:'Actualizar catálogo',disconnect:'Desconectar',connected:'Conectado',notConnected:'No conectado',lastSync:'Última actualización',never:'Nunca',tmdbReady:'TMDB conectado',tmdbReadyText:'La conexión funciona. Ya podemos cargar metadata real.',tmdbError:'Error de TMDB',tmdbSaved:'Credencial guardada',tmdbRefreshing:'Actualizando catálogo…',tmdbUpdated:'Catálogo actualizado',tmdbDisconnected:'TMDB desconectado',tmdbNeedCredential:'Primero guarda una API key o Read Access Token.',getCredential:'Obtener credencial en TMDB',
    tmdbNotice:'Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.',tmdbNoticeEn:'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    appearanceRestored:'Apariencia restaurada',appearanceRestoredText:'Volvimos a los valores predeterminados de MiFlix V1.9.3.',addedList:'Añadido a Mi lista',removedList:'Quitado de Mi lista',progressSaved:'Progreso guardado',progressSavedText:'Marcado temporalmente en 50% para probar Continuar viendo.',
    noTrailer:'Trailer no disponible',demoAddonDesc:'Add-on de prueba con videos públicos de demostración y streams directos.',demoMovieDesc:'Contenido de demostración para verificar que un add-on puede inyectar catálogo y reproducir un stream directo.',
    stremioCompatible:'Compatible con Stremio',stremioAddon:'Add-on Stremio',streamAddon:'Add-on de streams',loadSources:'Buscar fuentes',refreshSources:'Actualizar fuentes',loadingSources:'Buscando fuentes…',sourceCount:'fuentes encontradas',noStreamAddons:'No hay add-ons de streams instalados',noStreamAddonsText:'Instala un add-on compatible con Stremio desde la sección Add-ons.',noCompatibleStreams:'No se encontraron fuentes reproducibles',noCompatibleStreamsText:'El add-on respondió, pero no devolvió URLs directas compatibles con esta versión del player.',sourceLookupFailed:'No se pudieron consultar las fuentes',noImdbId:'No encontramos IMDb ID para este título.',season:'Temporada',episode:'Episodio',seriesSourceHint:'Elige temporada y episodio antes de buscar fuentes.',addonHost:'Servidor',protocol:'Protocolo',playable:'Reproducible',torrentOnly:'Torrent sin URL directa',hideSecret:'La URL configurada se guarda localmente y no se muestra completa.',pasteStremio:'También puedes pegar una URL de manifest de Stremio (https://…/manifest.json o stremio://…).',stremioInstalled:'Add-on Stremio instalado',stremioInstalledText:'Ya puede responder a búsquedas de fuentes para títulos TMDB.',playerMayFail:'MiFlix intentará normalizar audio y contenedor con el motor multimedia integrado. Puedes usar un reproductor externo cuando prefieras.',tvCompatibility:'Modo compatibilidad TV',tvCompatibilityHelp:'Prioriza 1080p/H.264 y evita Dolby Vision, AV1 o HEVC cuando sea posible para reducir pantallas negras en Android TV.',
    collectionsTitle:'Colecciones',collectionsIntro:'MiFlix puede importar colecciones compatibles con el formato de Nuvio y abrir catálogos desde add-ons Stremio o desde TMDB.',nuvioCommunity:'Importar Nuvio Community',importCollection:'Importar JSON',collectionUrl:'URL de colección',collectionInstalled:'Colección importada',collectionFailed:'No se pudo importar la colección',collectionNeedsAddon:'Esta carpeta usa un add-on que no está instalado',collectionEmpty:'No hay contenido disponible para esta carpeta',platforms:'Plataformas',browseCategories:'Explorar categorías',trendingNow:'Tendencias',popularMovies:'Películas populares',popularSeries:'Series populares',topRated:'Mejor valoradas',moviesByYear:'Películas por año',popularOn:'Popular en',top10Tmdb:'Top 10 por popularidad TMDB',action:'Acción',comedy:'Comedia',horror:'Terror',animation:'Animación',documentary:'Documental',scifi:'Ciencia ficción',drama:'Drama',crime:'Crimen',family:'Familiar',playerPlayback:'Reproducción',autoplayFirst:'Autoplay first link',autoplayFirstHelp:'Un toque en Reproducir abre automáticamente la primera fuente disponible. Mantén Reproducir presionado 1 segundo para Play Manually.',autoplayNext:'Autoplay next episode',autoplayNextHelp:'Al terminar un episodio busca el siguiente y trata de mantener el mismo binge group/fuente.',fullscreenPlayback:'Abrir reproducción en pantalla completa',skipIntro:'Mostrar Skip Intro',introLength:'Final estimado del intro',seconds:'segundos',preferredAudio:'Audio preferido',preferredSubtitle:'Subtítulo preferido',audioTracks:'Audio',subtitles:'Subtítulos',off:'Desactivados',defaultTrack:'Predeterminado',trackUnavailable:'El navegador no expone múltiples pistas de audio para este stream.',subtitleNone:'Sin subtítulos',skipIntroButton:'Saltar intro',nextEpisode:'Siguiente episodio',playingNext:'Reproduciendo siguiente episodio…',playManually:'Play Manually',chooseSource:'Selecciona una fuente',findingFirst:'Buscando la primera fuente…',noPlayableSource:'No hay una fuente reproducible disponible.',collectionSourceMissing:'Falta el add-on requerido para esta fuente.',watchRegion:'Región de plataformas',regionHelp:'Se usa para disponibilidad de plataformas en TMDB. Ej.: DO, US, ES.',nuvioFormat:'Formato de colecciones Nuvio',communityNote:'La colección comunitaria usa fuentes de AIO Metadata cuando están disponibles; MiFlix también resuelve varios catálogos TMDB comunes de forma nativa.',top10Note:'Los Top 10 nativos son por popularidad TMDB, no rankings oficiales diarios de cada plataforma.',audioBrowserNote:'El reproductor integrado usa la interfaz de MiFlix. Con FFmpeg instalado puede normalizar audio/contenedor; también puedes elegir MPV, VLC o Windows como reproductor externo.',manualSource:'Selección manual',loadingCollection:'Cargando colección…',openCollection:'Abrir',noCollections:'No hay colecciones importadas todavía.',installCollectionHelp:'Puedes usar el JSON de colecciones de Nuvio directamente.',year:'Año',back:'Volver',nativePlayer:'Player nativo (MPV)',browserPlayer:'Player del navegador',playerEngine:'Motor de reproducción',nativePlayerHelp:'En Windows usamos MPV para codecs, audio y subtítulos más confiables. ExoPlayer se reservará para Android/Android TV.',nativeHostMissing:'MPV no está disponible. MiFlix usará el player del navegador.',nativeOpening:'Abriendo player nativo…',nativeControls:'MPV: A cambia audio · S cambia subtítulos · V muestra/oculta subtítulos',manifestDetected:'Manifest detectado',manifestCollectionAdded:'Se instaló el add-on y sus catálogos se agregaron a Colecciones.',carouselPrev:'Anterior',carouselNext:'Siguiente',deleteCollection:'Eliminar colección',deleteCollectionConfirm:'¿Eliminar esta colección de MiFlix?',collectionDeleted:'Colección eliminada',kaptainCollection:'Importar Kaptain/Nuvio',kaptainHelp:'Colección comunitaria con portadas y GIFs de enfoque estilo Nuvio.',episodes:'Episodios',episodeLoading:'Cargando episodios…',noEpisodes:'No encontramos episodios para esta temporada.',resume:'Reanudar',
    builtInPlayer:'Reproductor integrado MiFlix',externalPlayerMode:'Reproductor externo',externalPlayerChoice:'Reproductor externo',externalPlayerHelp:'Puedes abrir el stream en MPV, VLC o el reproductor predeterminado de Windows cuando quieras.',builtInPlayerHelp:'Player integrado estilo Nuvio. Cuando FFmpeg está disponible, MiFlix normaliza el audio para mejorar compatibilidad con MKV/HEVC.',mpvPlayer:'MPV',vlcPlayer:'VLC',systemPlayer:'Predeterminado de Windows',mediaEngineReady:'Motor multimedia listo',mediaEngineMissing:'FFmpeg no está disponible; el player integrado usará reproducción directa.',preparingPlayback:'Preparando reproducción…',switchingAudio:'Cambiando pista de audio…',noExtraAudio:'No se detectaron pistas de audio adicionales.',playerBack:'Volver',playerOptions:'Opciones',playerSpeed:'Velocidad',openExternal:'Abrir externamente',playEpisodeNow:'Reproducir episodio',
    profiles:'Perfiles',profile:'Perfil',mainProfile:'Principal',addProfile:'Agregar perfil',switchProfile:'Cambiar perfil',profileNameLabel:'Nombre del perfil',shareMainSetup:'Compartir configuración del perfil principal',shareMainSetupHelp:'Comparte TMDB, add-ons, colecciones, apariencia y reproducción. Mi lista e historial siguen separados.',deleteProfile:'Eliminar perfil',deleteProfileConfirm:'¿Eliminar este perfil y su historial local?',profileCreated:'Perfil creado',profileDeleted:'Perfil eliminado',watchParty:'Watch Party',partyIntro:'Crea una sesión y mantén sincronizados el contenido, play, pause y posición hasta que salgas.',createParty:'Crear sesión',joinParty:'Unirse',joinCode:'Código o invitación',partyCode:'Código',partyInvite:'Invitación',copyInvite:'Copiar invitación',leaveParty:'Salir de la sesión',endParty:'Finalizar sesión',partyHost:'Host',partyGuest:'Invitado',partyParticipants:'Participantes',partyWaiting:'Esperando contenido…',partyActive:'Sesión activa',partyLan:'LAN / misma red',partyRemote:'Relay remoto',partyMode:'Modo',partyRelayUrl:'URL del relay remoto',partyRelayHelp:'Opcional. Sin relay, Watch Party funciona dentro de la misma red local. Incluimos un Cloudflare Worker listo para desplegar.',allowGuestControls:'Permitir controles de invitados',partyJoined:'Te uniste al Watch Party',partyCreated:'Watch Party creado',partyLeft:'Saliste del Watch Party',partyNoSource:'El contenido cambió, pero este perfil no encontró una fuente reproducible.',partySyncing:'Sincronizando con el host…',partyNeedEngine:'El servicio local de MiFlix debe estar activo para Watch Party.',partySameNetwork:'Comparte el QR o el código. Sin relay configurado, los invitados deben estar en la misma red.',partyQr:'QR de invitación',copyCode:'Copiar código',builtInCompat:'Compatibilidad del player',builtInCompatHelp:'MiFlix usa FFmpeg para entregar H.264 + AAC al player integrado cuando el stream original no es compatible.',playbackStarting:'Iniciando video…',clickToStart:'Haz clic para iniciar',    demoUsing:'Usando catálogo demo local',tmdbUsing:'Usando catálogo TMDB',tmdbCache:'TMDB cacheado',aboutData:'Datos y créditos'
  },
  en:{
    home:'Home',movies:'Movies',series:'Series',library:'My list',collections:'Collections',addons:'Add-ons',party:'Watch Party',settings:'Settings',
    personalCenter:'YOUR PERSONAL MEDIA CENTER',catalog:'CATALOG',localLibrary:'LOCAL LIBRARY',modular:'MODULAR SYSTEM',personalization:'PERSONALIZATION',results:'RESULTS',
    searchPlaceholder:'Search movies, series…',featured:'FEATURED ON MIFLIX',watchDetails:'▶ View details',myList:'＋ My list',inMyList:'♥ In my list',removeList:'♥ Remove from list',addList:'♡ My list',
    continueWatching:'Continue watching',continueSub:'Pick up where you left off',recommended:'Recommended for you',recommendedSub:'A selection to test MiFlix',recent:'Recently added',recentSub:'More content from your catalog',
    titlesAvailable:'titles available',savedThisPc:'saved on this PC',emptyList:'Your list is empty',emptyListText:'Open any movie or series and press “My list”.',
    noResults:'No results',tryAnother:'Try another search term.',searchFor:'Results for',matches:'matches',nothingFound:'Nothing found',noMatches:'No matches for',searchingTmdb:'Also searching TMDB…',
    movie:'MOVIE',show:'SERIES',previewIn:'Preview in',play:'▶ Play',availableSources:'Available sources',streamsFromAddons:'Streams come from your add-ons. TMDB only provides metadata and artwork.',noStreams:'No streams configured',noStreamsInfo:'Install an add-on with a compatible source or use the manual player to test a direct link.',openPlayer:'Open player',source:'Source',direct:'Direct',
    playerTitle:'MiFlix Player',pasteDirect:'Paste a direct MP4/WebM link to test the player.',load:'Load',localProgress:'Local player · progress saved on this PC',markHalf:'Simulate 50% watched',
    installAddon:'Install add-on',addonIntro:'Paste a MiFlix or Stremio manifest, import a local JSON, or install the demo. Configured manifests are stored only on this PC.',install:'Install',importJson:'Import JSON',openMoviesDemo:'Open Movies demo',active:'ACTIVE',delete:'Delete',noDescription:'No description.',
    addonMissingUrl:'Missing URL',addonMissingUrlText:'Paste the manifest URL first.',addonInstallFailed:'Could not install',addonCors:'The server must allow CORS and return valid JSON.',invalidManifest:'Invalid manifest',invalidManifestText:'It must include at least id and name.',alreadyInstalled:'Already installed',addonInstalled:'Add-on installed',addonRemoved:'Add-on removed',fileReadFailed:'Could not read the file',
    appearance:'Appearance',appearanceIntro:'Changes apply instantly and are stored only on this computer.',preset:'Preset',accent:'Accent color',cardSize:'Card size',medium:'Medium',large:'Large',rounding:'Corner radius',panelBlur:'Panel blur',density:'Density',comfortable:'Comfortable',compact:'Compact',animations:'Animations',autoPreviews:'Automatic previews',previewHelp:'When mouse/focus stays on a card for {seconds} seconds.',ratings:'Show ratings',heroDescription:'Show hero description',resetAppearance:'Reset appearance',
    livePreview:'LIVE PREVIEW',yourMiflix:'Your MiFlix, your way.',previewCopy:'Cards are horizontal, the background reacts to the focused title, and previews can start automatically.',
    language:'Language',spanish:'Español',english:'English',
    tmdbTitle:'TMDB connection',tmdbIntro:'Connect your own v3 API key or API Read Access Token. The credential is stored locally on this PC.',tmdbCredential:'API key / Read Access Token',tmdbPlaceholder:'Paste your API key or token here…',saveConnect:'Save & connect',testConnection:'Test connection',refreshCatalog:'Refresh catalog',disconnect:'Disconnect',connected:'Connected',notConnected:'Not connected',lastSync:'Last sync',never:'Never',tmdbReady:'TMDB connected',tmdbReadyText:'The connection works. We can now load real metadata.',tmdbError:'TMDB error',tmdbSaved:'Credential saved',tmdbRefreshing:'Refreshing catalog…',tmdbUpdated:'Catalog updated',tmdbDisconnected:'TMDB disconnected',tmdbNeedCredential:'Save an API key or Read Access Token first.',getCredential:'Get credentials on TMDB',
    tmdbNotice:'This product uses the TMDB API but is not endorsed or certified by TMDB.',tmdbNoticeEn:'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    appearanceRestored:'Appearance restored',appearanceRestoredText:'MiFlix V1.9.3 default appearance is back.',addedList:'Added to My list',removedList:'Removed from My list',progressSaved:'Progress saved',progressSavedText:'Temporarily marked at 50% to test Continue Watching.',
    noTrailer:'Trailer unavailable',demoAddonDesc:'Test add-on with public demo videos and direct streams.',demoMovieDesc:'Demo content to verify that an add-on can inject catalog items and play a direct stream.',
    stremioCompatible:'Stremio compatible',stremioAddon:'Stremio add-on',streamAddon:'Stream add-on',loadSources:'Find sources',refreshSources:'Refresh sources',loadingSources:'Finding sources…',sourceCount:'sources found',noStreamAddons:'No stream add-ons installed',noStreamAddonsText:'Install a Stremio-compatible add-on from the Add-ons section.',noCompatibleStreams:'No playable sources found',noCompatibleStreamsText:'The add-on responded, but it did not return direct URLs compatible with this player version.',sourceLookupFailed:'Could not query sources',noImdbId:'No IMDb ID was found for this title.',season:'Season',episode:'Episode',seriesSourceHint:'Choose a season and episode before finding sources.',addonHost:'Server',protocol:'Protocol',playable:'Playable',torrentOnly:'Torrent without direct URL',hideSecret:'The configured URL is stored locally and is not displayed in full.',pasteStremio:'You can also paste a Stremio manifest URL (https://…/manifest.json or stremio://…).',stremioInstalled:'Stremio add-on installed',stremioInstalledText:'It can now answer source lookups for TMDB titles.',playerMayFail:'MiFlix will try to normalize audio and container with the built-in media engine. You can use an external player whenever you prefer.',tvCompatibility:'TV compatibility mode',tvCompatibilityHelp:'Prioritizes 1080p/H.264 and avoids Dolby Vision, AV1 or HEVC when possible to reduce black-screen playback on Android TV.',
    collectionsTitle:'Collections',collectionsIntro:'MiFlix can import collections compatible with the Nuvio format and open catalogs from Stremio add-ons or TMDB.',nuvioCommunity:'Import Nuvio Community',importCollection:'Import JSON',collectionUrl:'Collection URL',collectionInstalled:'Collection imported',collectionFailed:'Could not import collection',collectionNeedsAddon:'This folder uses an add-on that is not installed',collectionEmpty:'No content is available for this folder',platforms:'Platforms',browseCategories:'Browse categories',trendingNow:'Trending now',popularMovies:'Popular movies',popularSeries:'Popular series',topRated:'Top rated',moviesByYear:'Movies by year',popularOn:'Popular on',top10Tmdb:'Top 10 by TMDB popularity',action:'Action',comedy:'Comedy',horror:'Horror',animation:'Animation',documentary:'Documentary',scifi:'Science fiction',drama:'Drama',crime:'Crime',family:'Family',playerPlayback:'Playback',autoplayFirst:'Autoplay first link',autoplayFirstHelp:'A tap on Play automatically opens the first available source. Hold Play for 1 second to Play Manually.',autoplayNext:'Autoplay next episode',autoplayNextHelp:'When an episode ends, MiFlix finds the next one and tries to keep the same binge group/source.',fullscreenPlayback:'Open playback fullscreen',skipIntro:'Show Skip Intro',introLength:'Estimated intro end',seconds:'seconds',preferredAudio:'Preferred audio',preferredSubtitle:'Preferred subtitles',audioTracks:'Audio',subtitles:'Subtitles',off:'Off',defaultTrack:'Default',trackUnavailable:'The browser does not expose multiple audio tracks for this stream.',subtitleNone:'No subtitles',skipIntroButton:'Skip intro',nextEpisode:'Next episode',playingNext:'Playing next episode…',playManually:'Play Manually',chooseSource:'Choose a source',findingFirst:'Finding the first source…',noPlayableSource:'No playable source is available.',collectionSourceMissing:'The required add-on for this source is missing.',watchRegion:'Platform region',regionHelp:'Used for TMDB platform availability. Example: DO, US, ES.',nuvioFormat:'Nuvio collections format',communityNote:'The community collection uses AIO Metadata sources when available; MiFlix also resolves several common TMDB catalogs natively.',top10Note:'Native Top 10 lists are based on TMDB popularity, not official daily platform rankings.',audioBrowserNote:'The built-in player uses the MiFlix interface. With FFmpeg installed it can normalize audio/container formats; you can also choose MPV, VLC or Windows as an external player.',manualSource:'Manual source selection',loadingCollection:'Loading collection…',openCollection:'Open',noCollections:'No collections have been imported yet.',installCollectionHelp:'You can use Nuvio collection JSON directly.',year:'Year',back:'Back',nativePlayer:'Native player (MPV)',browserPlayer:'Browser player',playerEngine:'Playback engine',nativePlayerHelp:'On Windows MiFlix uses MPV for more reliable codecs, audio and subtitles. ExoPlayer will be used for Android/Android TV.',nativeHostMissing:'MPV is unavailable. MiFlix will use the browser player.',nativeOpening:'Opening native player…',nativeControls:'MPV: A cycles audio · S cycles subtitles · V toggles subtitles',manifestDetected:'Manifest detected',manifestCollectionAdded:'The add-on was installed and its catalogs were added to Collections.',carouselPrev:'Previous',carouselNext:'Next',deleteCollection:'Delete collection',deleteCollectionConfirm:'Remove this collection from MiFlix?',collectionDeleted:'Collection removed',kaptainCollection:'Import Kaptain/Nuvio',kaptainHelp:'Community collection with Nuvio-style cover art and focus GIFs.',episodes:'Episodes',episodeLoading:'Loading episodes…',noEpisodes:'No episodes were found for this season.',resume:'Resume',
    builtInPlayer:'MiFlix built-in player',externalPlayerMode:'External player',externalPlayerChoice:'External player',externalPlayerHelp:'You can open the stream in MPV, VLC or the Windows default player whenever you prefer.',builtInPlayerHelp:'Nuvio-style built-in player. When FFmpeg is available, MiFlix normalizes audio for better MKV/HEVC compatibility.',mpvPlayer:'MPV',vlcPlayer:'VLC',systemPlayer:'Windows default',mediaEngineReady:'Media engine ready',mediaEngineMissing:'FFmpeg is unavailable; the built-in player will use direct playback.',preparingPlayback:'Preparing playback…',switchingAudio:'Switching audio track…',noExtraAudio:'No additional audio tracks were detected.',playerBack:'Back',playerOptions:'Options',playerSpeed:'Speed',openExternal:'Open externally',playEpisodeNow:'Play episode',
    profiles:'Profiles',profile:'Profile',mainProfile:'Main',addProfile:'Add profile',switchProfile:'Switch profile',profileNameLabel:'Profile name',shareMainSetup:'Share main profile setup',shareMainSetupHelp:'Shares TMDB, add-ons, collections, appearance and playback settings. My List and watch history stay separate.',deleteProfile:'Delete profile',deleteProfileConfirm:'Delete this profile and its local history?',profileCreated:'Profile created',profileDeleted:'Profile deleted',watchParty:'Watch Party',partyIntro:'Create a session and keep content, play, pause and position synced until you leave.',createParty:'Create session',joinParty:'Join',joinCode:'Code or invite',partyCode:'Code',partyInvite:'Invite',copyInvite:'Copy invite',leaveParty:'Leave session',endParty:'End session',partyHost:'Host',partyGuest:'Guest',partyParticipants:'Participants',partyWaiting:'Waiting for content…',partyActive:'Session active',partyLan:'LAN / same network',partyRemote:'Remote relay',partyMode:'Mode',partyRelayUrl:'Remote relay URL',partyRelayHelp:'Optional. Without a relay, Watch Party works on the same local network. A ready-to-deploy Cloudflare Worker is included.',allowGuestControls:'Allow guest controls',partyJoined:'Joined Watch Party',partyCreated:'Watch Party created',partyLeft:'Left Watch Party',partyNoSource:'The content changed, but this profile could not find a playable source.',partySyncing:'Syncing with host…',partyNeedEngine:'MiFlix local service must be running for Watch Party.',partySameNetwork:'Share the QR or code. Without a relay configured, guests must be on the same network.',partyQr:'Invite QR',copyCode:'Copy code',builtInCompat:'Player compatibility',builtInCompatHelp:'MiFlix uses FFmpeg to deliver H.264 + AAC to the built-in player when the original stream is not browser-compatible.',playbackStarting:'Starting video…',clickToStart:'Click to start',    demoUsing:'Using local demo catalog',tmdbUsing:'Using TMDB catalog',tmdbCache:'TMDB cached',aboutData:'Data & credits'
  }
};


Object.assign(I18N.es,{
  avatar:'Avatar',chooseAvatar:'Elegir avatar',avatarUrl:'URL de imagen personalizada',avatarUrlHelp:'Opcional. Usa una URL HTTPS directa de una imagen.',editAvatar:'Cambiar avatar',saveAvatar:'Guardar avatar',
  cloudSync:'Cuenta y sincronización',cloudIntro:'Inicia sesión para compartir progreso, Mi lista y perfiles entre PC y Android TV.',cloudUrl:'Supabase URL',cloudKey:'Supabase public / anon key',cloudEmail:'Email',cloudPassword:'Contraseña',cloudSignIn:'Iniciar sesión',cloudSignUp:'Crear cuenta',cloudSignOut:'Cerrar sesión',cloudSyncNow:'Sincronizar ahora',cloudConnected:'Cuenta conectada',cloudDisconnected:'Sin cuenta',cloudSetupHelp:'Usa el mismo proyecto Supabase en todos tus dispositivos. Los add-ons y tokens privados permanecen locales.',cloudLastSync:'Última sincronización',cloudNever:'Nunca',cloudSaved:'Configuración cloud guardada',cloudSignedIn:'Sesión iniciada',cloudSignedOut:'Sesión cerrada',cloudSyncDone:'Progreso sincronizado',cloudSyncError:'Error de sincronización',cloudNeedsSetup:'Configura Supabase URL y public key primero.',cloudNeedsLogin:'Inicia sesión primero.',
  openSubtitlesBuiltIn:'OpenSubtitles v3 está incluido como proveedor de subtítulos.',subtitleLoading:'Buscando subtítulos…',nativeAndroidPlayer:'Player nativo Android TV'
});
Object.assign(I18N.en,{
  avatar:'Avatar',chooseAvatar:'Choose avatar',avatarUrl:'Custom image URL',avatarUrlHelp:'Optional. Use a direct HTTPS image URL.',editAvatar:'Change avatar',saveAvatar:'Save avatar',
  cloudSync:'Account & sync',cloudIntro:'Sign in to share progress, My List and profiles between PC and Android TV.',cloudUrl:'Supabase URL',cloudKey:'Supabase public / anon key',cloudEmail:'Email',cloudPassword:'Password',cloudSignIn:'Sign in',cloudSignUp:'Create account',cloudSignOut:'Sign out',cloudSyncNow:'Sync now',cloudConnected:'Account connected',cloudDisconnected:'No account',cloudSetupHelp:'Use the same Supabase project on every device. Add-ons and private tokens stay local.',cloudLastSync:'Last sync',cloudNever:'Never',cloudSaved:'Cloud configuration saved',cloudSignedIn:'Signed in',cloudSignedOut:'Signed out',cloudSyncDone:'Progress synced',cloudSyncError:'Sync error',cloudNeedsSetup:'Configure Supabase URL and public key first.',cloudNeedsLogin:'Sign in first.',
  openSubtitlesBuiltIn:'OpenSubtitles v3 is included as a subtitle provider.',subtitleLoading:'Looking for subtitles…',nativeAndroidPlayer:'Native Android TV player'
});

const rawStore = {
  get(key, fallback){ try{ const v=localStorage.getItem('miflix.'+key); return v?JSON.parse(v):fallback; }catch{return fallback;} },
  set(key,val){ try{localStorage.setItem('miflix.'+key,JSON.stringify(val));}catch{} },
  remove(key){ try{localStorage.removeItem('miflix.'+key);}catch{} }
};

// Subtitle acceleration: cache metadata for 24h, share in-flight requests, and keep
// converted subtitle blobs in memory for the current app session.
const SUBTITLE_CACHE_TTL = 24*60*60*1000;
const SUBTITLE_CACHE_MAX = 80;
const subtitleBlobCache = new Map();
const subtitleTextCache = new Map();
const subtitlePrefetchInFlight = new Map();
function subtitleCacheKey(item,season=1,episode=1){
  const base=String(item?.imdbId||item?.id||item?.tmdbId||'unknown');
  return item?.type==='series'?`${base}:s${Number(season)||1}e${Number(episode)||1}`:`${base}:movie`;
}
function readSubtitleCache(key){
  const all=rawStore.get('subtitleCache',{}),row=all?.[key];
  if(!row||!Array.isArray(row.rows)||Date.now()-Number(row.at||0)>SUBTITLE_CACHE_TTL)return null;
  return row.rows;
}
function writeSubtitleCache(key,rows){
  try{
    const all=rawStore.get('subtitleCache',{}),now=Date.now();
    all[key]={at:now,rows:(rows||[]).filter(x=>x?.url).slice(0,60)};
    const keys=Object.keys(all).sort((a,b)=>Number(all[b]?.at||0)-Number(all[a]?.at||0));
    keys.slice(SUBTITLE_CACHE_MAX).forEach(k=>delete all[k]);
    for(const k of keys){if(now-Number(all[k]?.at||0)>SUBTITLE_CACHE_TTL)delete all[k];}
    rawStore.set('subtitleCache',all);
  }catch{}
}
function mergeSubtitleRows(...groups){
  const map=new Map();
  groups.flat().filter(Boolean).forEach(x=>{if(x?.url)map.set(`${x.id||x.url}|${x.lang||''}|${x.label||''}`,x);});
  const pref=settings.preferredSubtitle||'';
  return [...map.values()].sort((a,b)=>{
    const ap=languageMatches(a.lang,pref)?1:0,bp=languageMatches(b.lang,pref)?1:0;
    if(ap!==bp)return bp-ap;
    return String(a.lang||'').localeCompare(String(b.lang||''));
  });
}

let profiles = rawStore.get('profiles',[]);
if(!Array.isArray(profiles)||!profiles.length){
  profiles=[{id:'main',name:'Principal',avatar:'P',primary:true,shareSetup:false,createdAt:Date.now()}];
  rawStore.set('profiles',profiles);
}
if(!profiles.some(p=>p.primary)){profiles[0].primary=true;rawStore.set('profiles',profiles);}
let activeProfileId=rawStore.get('activeProfile',profiles[0].id);
if(!profiles.some(p=>p.id===activeProfileId))activeProfileId=profiles[0].id;
const PROFILE_SHARED_KEYS=new Set(['settings','addons','addonCatalog','collections','tmdbCatalog','tmdbAuth','tmdbLastSync']);
function primaryProfile(){return profiles.find(p=>p.primary)||profiles[0];}
function activeProfile(){return profiles.find(p=>p.id===activeProfileId)||primaryProfile();}
function profileStorageId(key){const p=activeProfile();return (!p.primary&&p.shareSetup&&PROFILE_SHARED_KEYS.has(key))?primaryProfile().id:p.id;}
const store = {
  get(key,fallback){
    try{
      const pid=profileStorageId(key),scoped='miflix.profile.'+pid+'.'+key;let v=localStorage.getItem(scoped);
      if(v===null&&pid===primaryProfile().id){const legacy=localStorage.getItem('miflix.'+key);if(legacy!==null){v=legacy;localStorage.setItem(scoped,legacy);}}
      return v?JSON.parse(v):fallback;
    }catch{return fallback;}
  },
  set(key,val){try{localStorage.setItem('miflix.profile.'+profileStorageId(key)+'.'+key,JSON.stringify(val));}catch{}},
  remove(key){try{localStorage.removeItem('miflix.profile.'+profileStorageId(key)+'.'+key);}catch{}}
};

let settings = {...DEFAULT_SETTINGS,...store.get('settings',{})};
if(settings.playerEngine==='native' || settings.playerEngine==='browser') settings.playerEngine='builtin';
if(!settings.externalPlayer) settings.externalPlayer='mpv';
let favorites = new Set(store.get('favorites',[]));
let progress = store.get('progress',{});
let installedAddons = store.get('addons',[]);
let addonCatalog = store.get('addonCatalog',[]);
let collections = store.get('collections',[]);
let homeSections = {};
let dynamicCatalog = [];
let homeSectionsLoadedAt = 0;
let platformProviders = null;
let activePlayerContext = null;
let smartPlayTimer = null;
let smartPlayLong = false;
let tmdbCatalog = store.get('tmdbCatalog',[]);
let tmdbAuth = store.get('tmdbAuth',{credential:''});
if(!tmdbAuth.credential && PERSONAL_DEFAULTS.tmdbToken){tmdbAuth={credential:String(PERSONAL_DEFAULTS.tmdbToken)};store.set('tmdbAuth',tmdbAuth);}
let tmdbLastSync = store.get('tmdbLastSync',null);
let remoteSearchResults = [];
let currentView = 'home';
let searchTerm = '';
let activePreviewCard = null;
let previewTimer = null;
let ambientTimer = null;
let searchTimer = null;
let searchSeq = 0;
let railSeq = 0;
let backAction = null;
let categoryPreviewCache = {};
let nativePlayerAvailable = false;
let mediaEngineStatus = null;
let playerControlsTimer = null;
let partySession = rawStore.get('partySession',null);
let partyPollTimer = null;
let partyApplyingRemote = false;
let partyLastSentAt = 0;
let partyLastRevision = 0;
let partyTargetState = null;
let cloudConfig = rawStore.get('cloudConfig',{url:'',key:''});
if(!cloudConfig.url && PERSONAL_DEFAULTS.supabaseUrl)cloudConfig.url=String(PERSONAL_DEFAULTS.supabaseUrl);
if(!cloudConfig.key && PERSONAL_DEFAULTS.supabaseKey)cloudConfig.key=String(PERSONAL_DEFAULTS.supabaseKey);
rawStore.set('cloudConfig',cloudConfig);
let cloudSession = rawStore.get('cloudSession',null);
let cloudLastSync = rawStore.get('cloudLastSync',null);
let cloudSyncTimer = null;
let cloudSyncBusy = false;
let nativePlaybackState = {position:0,duration:0,playing:false};


const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const view = $('#view');
const pageTitle = $('#pageTitle');
const pageEyebrow = $('#pageEyebrow');
const searchInput = $('#searchInput');
const ambientBackdrop = $('#ambientBackdrop');
const backButton = $('#backButton');

function t(key, vars={}){
  let value = I18N[settings.language]?.[key] ?? I18N.en[key] ?? key;
  Object.entries(vars).forEach(([k,v])=>value=value.replaceAll(`{${k}}`,String(v)));
  return value;
}
function langCode(){ return settings.language==='es'?'es-ES':'en-US'; }
function mediaField(item,key){ return settings.language==='es' ? (item[`${key}_es`] ?? item[key] ?? '') : (item[key] ?? item[`${key}_es`] ?? ''); }
function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function hexToRgb(hex){ const v=hex.replace('#',''); const x=parseInt(v.length===3?v.split('').map(c=>c+c).join(''):v,16); return `${(x>>16)&255},${(x>>8)&255},${x&255}`; }

function applySettings(){
  document.documentElement.style.setProperty('--accent',settings.accent);
  document.documentElement.style.setProperty('--accent-rgb',hexToRgb(settings.accent));
  document.documentElement.style.setProperty('--radius',`${settings.radius}px`);
  document.documentElement.style.setProperty('--blur',`${settings.blur}px`);
  document.documentElement.lang=settings.language;
  document.body.dataset.lang=settings.language;
  document.body.classList.toggle('compact',settings.density==='compact');
  document.body.classList.toggle('large-cards',settings.cardSize==='large');
  document.body.classList.toggle('square-cards',settings.radius<=7);
  document.body.classList.toggle('reduce-motion',!settings.motion);
  document.body.classList.toggle('oled',settings.theme==='oled');
  applyStaticTranslations();
}
function applyStaticTranslations(){
  const labels={navHome:'home',navMovies:'movies',navSeries:'series',navLibrary:'library',navCollections:'collections',navAddons:'addons',navParty:'party',navSettings:'settings'};
  Object.entries(labels).forEach(([id,key])=>{const el=$(`#${id}`);if(el)el.textContent=t(key);});
  if(searchInput) searchInput.placeholder=t('searchPlaceholder');
  const toggle=$('#languageToggle');
  if(toggle) toggle.innerHTML=`<span class="${settings.language==='es'?'active':''}">ES</span><i></i><span class="${settings.language==='en'?'active':''}">EN</span>`;
  const title=$('.version-pill'); if(title) title.textContent='V'+APP_VERSION;
  updateProfileChip();
}

function saveSettings(rerender=false){ store.set('settings',settings); if(rerender) renderSettings(); }
function saveFavorites(){ store.set('favorites',[...favorites]); scheduleCloudSync(); }
function saveProgress(){ store.set('progress',progress); scheduleCloudSync(); }
function profileInitial(name=''){return (String(name||'P').trim()[0]||'P').toUpperCase();}
function avatarSrc(p){if(!p)return '';if(p.avatarKind==='url'&&p.avatarValue)return p.avatarValue;if(p.avatarKind==='preset'&&p.avatarValue)return `assets/avatars/${p.avatarValue}.svg`;if(p.avatarUrl)return p.avatarUrl;return '';}
function avatarInner(p){const src=avatarSrc(p),initial=esc(p?.avatar||profileInitial(p?.name));return `${src?`<img src="${esc(src)}" alt="" onerror="this.remove()">`:''}<em>${initial}</em>`;}
function avatarHtml(p,cls='profile-card-avatar'){return `<span class="${cls}">${avatarInner(p)}</span>`;}
function updateProfileChip(){const p=activeProfile();const n=$('#profileName'),a=$('#profileAvatar');if(n)n.textContent=p.name||t('mainProfile');if(a)a.innerHTML=avatarInner(p);}
function persistProfiles(){rawStore.set('profiles',profiles);rawStore.set('activeProfile',activeProfileId);updateProfileChip();scheduleCloudSync(true);}
function reloadProfileState(){
  settings={...DEFAULT_SETTINGS,...store.get('settings',{})};if(settings.playerEngine==='native'||settings.playerEngine==='browser')settings.playerEngine='builtin';if(!settings.externalPlayer)settings.externalPlayer='mpv';
  favorites=new Set(store.get('favorites',[]));progress=store.get('progress',{});installedAddons=store.get('addons',[]);addonCatalog=store.get('addonCatalog',[]);collections=store.get('collections',[]);tmdbCatalog=store.get('tmdbCatalog',[]);tmdbAuth=store.get('tmdbAuth',{credential:''});if(!tmdbAuth.credential&&PERSONAL_DEFAULTS.tmdbToken){tmdbAuth={credential:String(PERSONAL_DEFAULTS.tmdbToken)};store.set('tmdbAuth',tmdbAuth);}tmdbLastSync=store.get('tmdbLastSync',null);
  homeSections={};dynamicCatalog=[];remoteSearchResults=[];platformProviders=null;homeSectionsLoadedAt=0;mediaEngineStatus=null;applySettings();setView('home');if(tmdbAuth.credential)setTimeout(()=>loadHomeSections(),350);
}
function switchProfile(id){if(!profiles.some(p=>p.id===id)||id===activeProfileId)return;closePlayerModalSafe();activeProfileId=id;persistProfiles();reloadProfileState();toast(t('switchProfile'),activeProfile().name);}
function closePlayerModalSafe(){try{if(activePlayerContext?.nativeAndroid&&window.MiFlixAndroid?.command){window.MiFlixAndroid.command(JSON.stringify({action:'close'}));activePlayerContext=null;}if($('#videoPlayer'))closePlayerModal();else $('#modalRoot').innerHTML='';}catch{try{$('#modalRoot').innerHTML='';}catch{}}}
function createProfile(name,shareSetup=true,avatarKind='preset',avatarValue='nebula'){name=String(name||'').trim();if(!name)return;const id='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);profiles.push({id,name,avatar:profileInitial(name),avatarKind,avatarValue,primary:false,shareSetup:!!shareSetup,createdAt:Date.now()});persistProfiles();toast(t('profileCreated'),name);renderProfilesModal();}
function deleteProfile(id){const p=profiles.find(x=>x.id===id);if(!p||p.primary)return;if(!confirm(`${t('deleteProfileConfirm')}

${p.name}`))return;const keys=['settings','favorites','progress','addons','addonCatalog','collections','tmdbCatalog','tmdbAuth','tmdbLastSync'];keys.forEach(k=>localStorage.removeItem(`miflix.profile.${id}.${k}`));profiles=profiles.filter(x=>x.id!==id);if(activeProfileId===id)activeProfileId=primaryProfile().id;persistProfiles();reloadProfileState();toast(t('profileDeleted'),p.name);}
function avatarPicker(selected='nebula',name='profileAvatarPreset'){return `<div class="avatar-picker">${AVATAR_PRESETS.map(([id,label])=>`<label class="avatar-option ${selected===id?'selected':''}" title="${esc(label)}"><input type="radio" name="${name}" value="${id}" ${selected===id?'checked':''}><img src="assets/avatars/${id}.svg" alt="${esc(label)}"></label>`).join('')}</div>`;}
function renderAvatarEditor(id){const p=profiles.find(x=>x.id===id);if(!p)return;const preset=p.avatarKind==='preset'?p.avatarValue:'nebula';$('#modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal avatar-modal" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal>✕</button><div class="picker-head"><div class="eyebrow">${t('avatar')}</div><h2>${esc(p.name)}</h2><p>${t('chooseAvatar')}</p></div>${avatarPicker(preset,'editAvatarPreset')}<div class="setting"><label>${t('avatarUrl')}</label><input id="editAvatarUrl" class="addon-input" value="${esc(p.avatarKind==='url'?p.avatarValue:'')}" placeholder="https://..."><small>${t('avatarUrlHelp')}</small></div><button class="btn primary" id="saveAvatarBtn">${t('saveAvatar')}</button></div></div>`;$('#saveAvatarBtn').onclick=()=>{const url=$('#editAvatarUrl').value.trim(),picked=document.querySelector('input[name="editAvatarPreset"]:checked')?.value||'nebula';p.avatarKind=url?'url':'preset';p.avatarValue=url||picked;p.avatar=profileInitial(p.name);persistProfiles();renderProfilesModal();};}
function renderProfilesModal(){const current=activeProfile();$('#modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal profile-modal" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal>✕</button><div class="picker-head"><div class="eyebrow">${t('profiles')}</div><h2>${t('switchProfile')}</h2><p>${t('shareMainSetupHelp')}</p></div><div class="profile-grid">${profiles.map(p=>`<div class="profile-card-wrap"><button class="profile-card ${p.id===current.id?'active':''}" data-switch-profile="${esc(p.id)}">${avatarHtml(p)}<b>${esc(p.name)}</b><small>${p.primary?t('mainProfile'):(p.shareSetup?t('shareMainSetup'):'')}</small></button><button class="profile-avatar-edit" data-edit-avatar="${esc(p.id)}" aria-label="${esc(t('editAvatar'))}">✎</button>${!p.primary?`<button class="profile-delete" data-delete-profile="${esc(p.id)}" aria-label="${esc(t('deleteProfile'))}">✕</button>`:''}</div>`).join('')}</div><div class="profile-create"><h3>${t('addProfile')}</h3><div class="install-row"><input id="newProfileName" class="addon-input" maxlength="24" placeholder="${esc(t('profileNameLabel'))}"><button class="btn primary" id="createProfileBtn">＋ ${t('addProfile')}</button></div><h4 class="avatar-create-label">${t('chooseAvatar')}</h4>${avatarPicker('nebula','newProfileAvatar')}<div class="setting"><label>${t('avatarUrl')}</label><input id="newProfileAvatarUrl" class="addon-input" placeholder="https://..."><small>${t('avatarUrlHelp')}</small></div><label class="profile-share-toggle"><input id="newProfileShare" type="checkbox" checked><span><b>${t('shareMainSetup')}</b><small>${t('shareMainSetupHelp')}</small></span></label></div></div></div>`;const create=$('#createProfileBtn');if(create)create.onclick=()=>{const url=$('#newProfileAvatarUrl').value.trim(),picked=document.querySelector('input[name="newProfileAvatar"]:checked')?.value||'nebula';createProfile($('#newProfileName').value,$('#newProfileShare').checked,url?'url':'preset',url||picked);};}


function coreCatalog(){ return tmdbCatalog.length ? tmdbCatalog : DEFAULT_CATALOG; }
function allCatalog(){
  const map = new Map();
  [...coreCatalog(),...addonCatalog,...remoteSearchResults,...dynamicCatalog].forEach(item=>{ if(item?.id) map.set(item.id,item); });
  return [...map.values()];
}
function itemById(id){ return allCatalog().find(x=>x.id===id); }
function cardImageUrl(item){
  let src=item?.cardImage||item?.backdrop||item?.poster||'';
  // Older cached TMDB rows may only have the large w1280 backdrop. Cards do not
  // need that much bandwidth, so transparently request a smaller image.
  if(item?.provider==='tmdb'&&/image\.tmdb\.org\/t\/p\/w1280\//i.test(src))src=src.replace('/w1280/','/w500/');
  return src;
}
function imageMarkup(item, cls='media-image'){
  const hero=cls==='hero-image',src=hero?(item.backdrop||item.poster||''):cardImageUrl(item),fallback=item.poster&&item.poster!==src?item.poster:'';
  if(!src)return '';
  const fallbackAttr=fallback?` data-fallback="${esc(fallback)}"`:'';
  // Edge app-mode + file:// showed an intermittent lazy-loading regression on
  // horizontal rails. Cards are intentionally eager again; w500 keeps payloads modest.
  const priority=hero?' loading="eager" fetchpriority="high"':' loading="eager" fetchpriority="auto"';
  return `<img class="${cls}" src="${esc(src)}"${fallbackAttr}${priority} decoding="async" referrerpolicy="no-referrer" alt="" draggable="false" onerror="if(this.dataset.fallback&&!this.dataset.fallbackUsed){this.dataset.fallbackUsed='1';this.src=this.dataset.fallback}else{this.style.display='none'}">`;
}
function mediaTypeLabel(item){ return item.type==='series'?t('show'):t('movie'); }
function mediaDescription(item){ return mediaField(item,'description'); }
function mediaGenre(item){ return mediaField(item,'genre') || (item.provider==='tmdb'?'TMDB':''); }
function mediaDuration(item){ return mediaField(item,'duration'); }

function mediaCard(item){
  const p = progress[item.id]?.percent || 0;
  const hasPreview = !!item.trailer || item.provider==='tmdb';
  return `<article class="media-card" tabindex="0" data-open="${esc(item.id)}" data-media-id="${esc(item.id)}">
    <div class="poster">
      ${imageMarkup(item,'poster-image')}
      ${item.trailer?`<video class="card-trailer" muted loop playsinline preload="none" data-trailer="${esc(item.trailer)}"></video>`:''}
      <div class="trailer-host"></div>
      <div class="poster-shade"></div>
      <span class="poster-type">${mediaTypeLabel(item)}</span>
      ${hasPreview?`<span class="preview-hint">${t('previewIn')} ${settings.previewDelay}s</span>`:''}
      <button class="favorite-badge ${favorites.has(item.id)?'active':''}" data-fav="${esc(item.id)}" title="${esc(t('library'))}" aria-label="${esc(t('library'))}">♥</button>
      <div class="poster-title">${esc(item.title)}</div>
      ${p?`<div class="progress"><span style="width:${Math.min(100,p)}%"></span></div>`:''}
    </div>
  </article>`;
}
function railShell(inner, trackClass='media-rail'){
  const id=`rail-${++railSeq}`;
  return `<div class="rail-shell"><button class="rail-nav rail-prev" data-rail-scroll="${id}" data-dir="-1" aria-label="${esc(t('carouselPrev'))}">‹</button><div id="${id}" class="${trackClass}">${inner}</div><button class="rail-nav rail-next" data-rail-scroll="${id}" data-dir="1" aria-label="${esc(t('carouselNext'))}">›</button></div>`;
}
function section(title, subtitle, items){
  if(!items.length) return '';
  return `<section class="section"><div class="section-head"><div><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div></div>${railShell(items.map(mediaCard).join(''))}</section>`;
}
function hero(item){
  if(!item) return '';
  return `<section class="hero">
    <div class="hero-backdrop">${imageMarkup(item,'hero-image')}<div class="hero-image-shade"></div></div>
    <div class="hero-content">
      <div class="hero-kicker"><span class="dot"></span> ${t('featured')}</div>
      <h2>${esc(item.title)}</h2>
      <div class="hero-meta"><span>${esc(item.year||'—')}</span><span>•</span><span>${esc(mediaDuration(item)||mediaTypeLabel(item))}</span>${mediaGenre(item)?`<span class="badge">${esc(mediaGenre(item))}</span>`:''}<span class="rating">★ ${Number(item.rating||0).toFixed(1)}</span></div>
      ${settings.showDescription?`<p>${esc(mediaDescription(item))}</p>`:''}
      <div class="hero-actions"><button class="btn primary" data-open="${esc(item.id)}">${t('watchDetails')}</button><button class="btn ghost" data-fav="${esc(item.id)}">${favorites.has(item.id)?t('inMyList'):t('myList')}</button></div>
    </div>
  </section>`;
}
function categoryTile(key,label){
  const imgs=(categoryPreviewCache[key]||[]).slice(0,3);
  const stack=imgs.length?imgs.map((x,i)=>`<img style="--stack:${i}" src="${esc(x.poster||cardImageUrl(x)||'')}" alt="" loading="lazy" decoding="async">`).join(''):`<i></i><i></i><i></i>`;
  return `<button class="category-tile" data-category="${key}"><div class="category-copy"><b>${esc(label)}</b><small>${imgs.length?`${imgs.length}+`:'TMDB'}</small></div><div class="category-stack">${stack}</div></button>`;
}
function platformTile(slug,label){
  const art=PLATFORM_ART[slug]||{};
  const p=platformProviders?.[slug]?.movie||platformProviders?.[slug]?.tv;
  const fallback=p?.logo_path?tmdbImage(p.logo_path,'w500'):'';
  const cover=art.cover||fallback;
  let focus=art.focus||cover;
  if(/\.gifv(?:\?|$)/i.test(focus)) focus=focus.replace(/\.gifv(?=\?|$)/i,'.gif');
  return `<button class="platform-tile" data-platform="${slug}" aria-label="${esc(label)}">
    ${cover?`<img class="platform-cover" src="${esc(cover)}" alt="${esc(label)}" loading="lazy">`:`<span class="platform-fallback">${esc(label)}</span>`}
    ${focus?`<img class="platform-focus" src="${esc(focus)}" alt="" loading="lazy">`:''}
    <span class="platform-label">${esc(label)}</span>
  </button>`;
}
function rankedSection(title, subtitle, items){
  if(!items?.length) return '';
  const rows=items.slice(0,10).map((x,i)=>`<div class="ranked-card"><span class="rank-number">${i+1}</span>${mediaCard(x)}</div>`).join('');
  return `<section class="section"><div class="section-head"><div><h3>${esc(title)}</h3><p>${esc(subtitle||'')}</p></div></div>${railShell(rows,'ranked-row')}</section>`;
}
function setBack(action){backAction=action;if(backButton){backButton.hidden=!action;}}
function clearBack(){setBack(null);}
function goBack(){if(backAction)backAction();}
function renderHome(){
  clearBack();
  const catalog=allCatalog(); const featured=catalog.find(x=>x.featured)||catalog[0];
  const continueItems = catalog.filter(x=>progress[x.id]?.percent>0 && progress[x.id]?.percent<95).slice(0,12);
  const fallbackPopular = [...catalog].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,12);
  const dataBadge = tmdbCatalog.length ? `<div class="data-source-badge tmdb-dot">${t('tmdbUsing')}</div>` : `<div class="data-source-badge">${t('demoUsing')}</div>`;
  const categories=`<section class="section compact-section"><div class="section-head"><div><h3>${t('browseCategories')}</h3></div></div>${railShell([
    ['action',t('action')],['animation',t('animation')],['comedy',t('comedy')],['documentary',t('documentary')],['horror',t('horror')],['scifi',t('scifi')],['drama',t('drama')],['crime',t('crime')],['family',t('family')]
  ].map(x=>categoryTile(...x)).join(''),'category-row')}</section>`;
  const platforms=`<section class="section compact-section"><div class="section-head"><div><h3>${t('platforms')}</h3></div></div>${railShell([
    ['netflix','Netflix'],['disney-plus','Disney+'],['prime-video','Prime Video'],['hbo-max','HBO Max'],['apple-tv','Apple TV+'],['paramount-plus','Paramount+'],['peacock','Peacock'],['hulu','Hulu'],['crunchyroll','Crunchyroll'],['shudder','Shudder']
  ].map(x=>platformTile(...x)).join(''),'platform-row')}</section>`;
  const yearNow=new Date().getFullYear();
  const years=`<section class="section compact-section"><div class="section-head"><div><h3>${t('moviesByYear')}</h3></div></div>${railShell([yearNow,yearNow-1,yearNow-2,yearNow-3,yearNow-4,yearNow-5].map(y=>`<button class="year-tile" data-year="${y}"><b>${y}</b><small>${t('movies')}</small></button>`).join(''),'year-row')}</section>`;
  const collectionRows=collections.length?collections.map(c=>collectionBlock(c,false)).join(''):'';
  const trending=homeSections.trending?.length?homeSections.trending:fallbackPopular;
  const popularMovies=homeSections.popularMovies||catalog.filter(x=>x.type==='movie').slice(0,12);
  const popularSeries=homeSections.popularSeries||catalog.filter(x=>x.type==='series').slice(0,12);
  const topRated=homeSections.topRated||fallbackPopular;
  const byYear=homeSections.byYear||[];
  view.innerHTML = `${dataBadge}${hero(featured)}${section(t('continueWatching'),t('continueSub'),continueItems)}${collectionRows}${platforms}${section(t('trendingNow'),'TMDB',trending)}${section(t('popularMovies'),'TMDB',popularMovies)}${section(t('popularSeries'),'TMDB',popularSeries)}${categories}${years}${section(t('topRated'),'TMDB',topRated)}${section(`${t('moviesByYear')} ${new Date().getFullYear()}`,'TMDB Discover',byYear)}`;
  setAmbient(featured,false);
  if(tmdbAuth.credential && (!homeSectionsLoadedAt || Date.now()-homeSectionsLoadedAt>30*60*1000)) loadHomeSections();
  if(tmdbAuth.credential) loadDiscoveryArt();
}
async function loadDiscoveryArt(){
  if(!tmdbAuth.credential)return;
  try{
    if(!platformProviders){await getPlatformProviders();if(currentView==='home'&&!searchTerm)renderHome();}
    const missing=Object.keys(CATEGORY_FILTERS).filter(k=>!categoryPreviewCache[k]);
    if(!missing.length)return;
    await Promise.all(missing.map(async k=>{const f=CATEGORY_FILTERS[k];const d=await tmdbFetch('/discover/movie',{with_genres:f.movie,sort_by:'popularity.desc',include_adult:'false',page:1});categoryPreviewCache[k]=(d.results||[]).slice(0,3).map(x=>mapTmdb(x,'movie')).filter(Boolean);}));
    if(currentView==='home'&&!searchTerm)renderHome();
  }catch{}
}
async function loadHomeSections(){
  if(!tmdbAuth.credential)return;
  homeSectionsLoadedAt=Date.now();
  try{
    const y=new Date().getFullYear();
    const [trending,pm,ps,trm,trt,yr]=await Promise.all([
      tmdbFetch('/trending/all/week',{}),tmdbFetch('/movie/popular',{page:1}),tmdbFetch('/tv/popular',{page:1}),tmdbFetch('/movie/top_rated',{page:1}),tmdbFetch('/tv/top_rated',{page:1}),tmdbFetch('/discover/movie',{primary_release_year:y,sort_by:'popularity.desc',include_adult:'false',page:1})
    ]);
    homeSections={
      trending:(trending.results||[]).map(mapTmdb).filter(Boolean).slice(0,12),
      popularMovies:(pm.results||[]).map(x=>mapTmdb(x,'movie')).filter(Boolean).slice(0,12),
      popularSeries:(ps.results||[]).map(x=>mapTmdb(x,'tv')).filter(Boolean).slice(0,12),
      topRated:dedupeTmdb([...(trm.results||[]).map(x=>mapTmdb(x,'movie')),...(trt.results||[]).map(x=>mapTmdb(x,'tv'))]).sort((a,b)=>b.rating-a.rating).slice(0,12),
      byYear:(yr.results||[]).map(x=>mapTmdb(x,'movie')).filter(Boolean).slice(0,12)
    };
    dynamicCatalog=dedupeTmdb([...dynamicCatalog,...Object.values(homeSections).flat()]);
    if(currentView==='home'&&!searchTerm)renderHome();
  }catch(err){ homeSectionsLoadedAt=0; }
}
const CATEGORY_FILTERS={action:{movie:'28',tv:'10759'},comedy:{movie:'35',tv:'35'},horror:{movie:'27',tv:'9648'},animation:{movie:'16',tv:'16'},documentary:{movie:'99',tv:'99'},scifi:{movie:'878',tv:'10765'},drama:{movie:'18',tv:'18'},crime:{movie:'80',tv:'80'},family:{movie:'10751',tv:'10751'}};
async function openCategory(key){
  if(!tmdbAuth.credential)return toast(t('tmdbError'),t('tmdbNeedCredential'));
  const f=CATEGORY_FILTERS[key];if(!f)return;
  currentView='category';setBack(()=>setView('home')); pageTitle.textContent=t(key);pageEyebrow.textContent=t('browseCategories');view.innerHTML=empty('⌛',t('loadingSources'),'TMDB Discover');clearAmbient();
  try{const [m,v]=await Promise.all([tmdbFetch('/discover/movie',{with_genres:f.movie,sort_by:'popularity.desc',include_adult:'false',page:1}),tmdbFetch('/discover/tv',{with_genres:f.tv,sort_by:'popularity.desc',page:1})]);const items=dedupeTmdb([...(m.results||[]).map(x=>mapTmdb(x,'movie')),...(v.results||[]).map(x=>mapTmdb(x,'tv'))]);dynamicCatalog=dedupeTmdb([...dynamicCatalog,...items]);view.innerHTML=section(t(key),`TMDB · ${items.length} ${t('titlesAvailable')}`,items);}catch(err){view.innerHTML=empty('!',t('tmdbError'),esc(err.message));}
}
async function openYear(year){
  if(!tmdbAuth.credential)return toast(t('tmdbError'),t('tmdbNeedCredential'));
  currentView='year';setBack(()=>setView('home'));pageTitle.textContent=`${t('moviesByYear')} ${year}`;pageEyebrow.textContent=t('year');view.innerHTML=empty('⌛',t('loadingSources'),String(year));clearAmbient();
  try{const d=await tmdbFetch('/discover/movie',{primary_release_year:year,sort_by:'popularity.desc',include_adult:'false',page:1});const items=(d.results||[]).map(x=>mapTmdb(x,'movie')).filter(Boolean);dynamicCatalog=dedupeTmdb([...dynamicCatalog,...items]);view.innerHTML=section(`${t('moviesByYear')} ${year}`,'TMDB Discover',items);}catch(err){view.innerHTML=empty('!',t('tmdbError'),esc(err.message));}
}
const PLATFORM_NAMES={'netflix':['Netflix'],'disney-plus':['Disney Plus','Disney+'],'prime-video':['Amazon Prime Video','Prime Video'],'hbo-max':['Max','HBO Max'],'apple-tv':['Apple TV Plus','Apple TV+'],'paramount-plus':['Paramount Plus','Paramount+'],'peacock':['Peacock'],'hulu':['Hulu'],'crunchyroll':['Crunchyroll'],'shudder':['Shudder']};
const PLATFORM_PROVIDER_IDS={
  'netflix':[8,1796], 'disney-plus':[337], 'prime-video':[119,9], 'hbo-max':[1899,384,1825],
  'apple-tv':[350], 'paramount-plus':[531,582,633,1770,1853,2303,2616,37],
  'peacock':[386], 'hulu':[15], 'crunchyroll':[283], 'shudder':[99,204]
};
const PLATFORM_FALLBACK_REGION={'apple-tv':'US','peacock':'US','hulu':'US','shudder':'US','paramount-plus':'US','hbo-max':'US'};
async function getPlatformProviders(){
  if(platformProviders)return platformProviders;
  const region=(settings.watchRegion||'DO').toUpperCase();
  const [m,tv]=await Promise.all([tmdbFetch('/watch/providers/movie',{watch_region:region}),tmdbFetch('/watch/providers/tv',{watch_region:region})]);
  const find=(list,names)=>list.find(p=>names.some(n=>String(p.provider_name||'').toLowerCase()===n.toLowerCase())) || list.find(p=>names.some(n=>String(p.provider_name||'').toLowerCase().includes(n.toLowerCase())));
  platformProviders={};Object.entries(PLATFORM_NAMES).forEach(([slug,names])=>platformProviders[slug]={movie:find(m.results||[],names),tv:find(tv.results||[],names)});return platformProviders;
}
async function fetchPlatformMedia(slug,type='movie',limit=20){
  const kind=type==='series'?'tv':'movie', path=type==='series'?'/discover/tv':'/discover/movie';
  const selectedRegion=(settings.watchRegion||'DO').toUpperCase();
  const providers=await getPlatformProviders(); const discovered=providers?.[slug]?.[kind];
  const fallbackIds=PLATFORM_PROVIDER_IDS[slug]||[];
  const tryFetch=async(providerIds,region)=>{
    const ids=[...new Set((providerIds||[]).filter(Boolean).map(Number))]; if(!ids.length)return [];
    const data=await tmdbFetch(path,{with_watch_providers:ids.join('|'),watch_region:region,with_watch_monetization_types:'flatrate',sort_by:'popularity.desc',include_adult:'false',page:1});
    return (data.results||[]).map(x=>mapTmdb(x,type==='series'?'tv':'movie')).filter(Boolean).slice(0,limit);
  };
  let ids=discovered?.provider_id?[discovered.provider_id,...fallbackIds]:fallbackIds;
  let items=await tryFetch(ids,selectedRegion);
  if(!items.length){
    const fallbackRegion=PLATFORM_FALLBACK_REGION[slug]||'US';
    if(fallbackRegion!==selectedRegion)items=await tryFetch(fallbackIds.length?fallbackIds:ids,fallbackRegion);
  }
  return items;
}
async function openPlatform(slug){
  if(!tmdbAuth.credential)return toast(t('tmdbError'),t('tmdbNeedCredential'));
  const label=PLATFORM_NAMES[slug]?.[0]||slug;currentView='platform';setBack(()=>setView('home'));pageTitle.textContent=label;pageEyebrow.textContent=t('platforms');view.innerHTML=empty('⌛',t('loadingSources'),label);clearAmbient();
  try{const [movies,series]=await Promise.all([fetchPlatformMedia(slug,'movie',20),fetchPlatformMedia(slug,'series',20)]);dynamicCatalog=dedupeTmdb([...dynamicCatalog,...movies,...series]);const top=dedupeTmdb([...movies.slice(0,6),...series.slice(0,6)]).sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,10);view.innerHTML=`${rankedSection(`${label} · ${t('top10Tmdb')}`,t('top10Note'),top)}${section(`${label} · ${t('movies')}`,'TMDB',movies)}${section(`${label} · ${t('series')}`,'TMDB',series)}`;}catch(err){view.innerHTML=empty('!',t('tmdbError'),esc(err.message));}
}
function renderCatalog(type){
  const label=type==='movie'?t('movies'):t('series');
  let items=allCatalog().filter(x=>x.type===type);
  if(searchTerm) items=items.filter(matchesSearch);
  view.innerHTML = items.length ? `<section class="section"><div class="section-head"><div><h3>${label}</h3><p>${items.length} ${t('titlesAvailable')}</p></div></div><div class="card-row">${items.map(mediaCard).join('')}</div></section>` : empty('⌕',t('noResults'),t('tryAnother'));
  clearAmbient();
}
function matchesSearch(x){
  const q=searchTerm.toLowerCase(); return [x.title,mediaGenre(x),mediaDescription(x),x.year].join(' ').toLowerCase().includes(q);
}
function renderLibrary(){
  let items=allCatalog().filter(x=>favorites.has(x.id)); if(searchTerm) items=items.filter(matchesSearch);
  view.innerHTML = items.length ? `<section class="section"><div class="section-head"><div><h3>${t('library')}</h3><p>${items.length} ${t('savedThisPc')}</p></div></div><div class="card-row">${items.map(mediaCard).join('')}</div></section>` : empty('♡',t('emptyList'),t('emptyListText'));
  clearAmbient();
}
function empty(icon,title,text,button=''){ return `<div class="empty-state"><div><div class="big">${icon}</div><h3>${esc(title)}</h3><p>${text}</p>${button}</div></div>`; }
function renderSearch(isRemoteLoading=false){
  const items=allCatalog().filter(matchesSearch);
  const loading = isRemoteLoading && tmdbAuth.credential ? `<p class="search-status">${t('searchingTmdb')}</p>`:'';
  view.innerHTML = items.length ? `<section class="section"><div class="section-head"><div><h3>${t('searchFor')} “${esc(searchTerm)}”</h3><p>${items.length} ${t('matches')}</p>${loading}</div></div><div class="card-row">${items.map(mediaCard).join('')}</div></section>` : empty('⌕',t('nothingFound'),`${t('noMatches')} “${esc(searchTerm)}”.${loading}`);
  clearAmbient();
}

function addonName(a){ return settings.language==='es'?(a.name_es||a.name):(a.name||a.name_es); }
function addonDescription(a){ return settings.language==='es'?(a.description_es||a.description||t('noDescription')):(a.description||a.description_es||t('noDescription')); }
function normalizeAddonManifestUrl(raw){
  let url=(raw||'').trim();
  if(!url) return '';
  if(url.startsWith('stremio://')) url='https://'+url.slice('stremio://'.length);
  if(!/^https?:\/\//i.test(url)) return url;
  try{
    const u=new URL(url);
    if(!u.pathname.endsWith('/manifest.json')) u.pathname=u.pathname.replace(/\/$/,'')+'/manifest.json';
    return u.href;
  }catch{return url;}
}
function addonBaseFromManifest(url){ return String(url||'').replace(/\/manifest\.json(?:\?.*)?$/i,'').replace(/\/$/,''); }
function addonDisplayHost(url){ try{return new URL(normalizeAddonManifestUrl(url)).host;}catch{return 'local';} }
function isStremioManifest(m){ return !!(m && (Array.isArray(m.resources) || Array.isArray(m.catalogs) || m.behaviorHints)); }
function stremioSupportsStream(a){
  const resources=a.resources||[];
  return resources.some(r=>typeof r==='string'?r==='stream':r?.name==='stream') || (a.types||[]).includes('stream');
}
function renderAddons(){
  const all=[...BUILTIN_ADDONS,...installedAddons];
  view.innerHTML = `<div class="install-box"><h3 style="margin:0 0 4px">${t('installAddon')}</h3><p style="margin:0;color:var(--muted);font-size:12px">${t('addonIntro')} ${t('pasteStremio')}</p><div class="install-row"><input id="addonUrl" class="addon-input" placeholder="https://your-addon.com/manifest.json"><button class="btn primary" id="installAddon">${t('install')}</button><button class="btn ghost" id="importAddon">${t('importJson')}</button><button class="btn ghost" id="installSample">${t('openMoviesDemo')}</button><input type="file" id="addonFile" accept="application/json,.json" hidden></div><small style="display:block;margin-top:8px;color:var(--muted)">${t('hideSecret')}</small></div>
    <div class="addon-grid">${all.map(a=>{const protocol=a.protocol==='stremio'?t('stremioAddon'):(a.builtIn?'MiFlix Core':'MiFlix');const host=a.source?addonDisplayHost(a.source):'local';return `<div class="addon-card"><div class="addon-top"><div class="addon-icon">${a.builtIn?'M':a.protocol==='stremio'?'S':'A'}</div><span class="status-pill">${t('active')}</span></div><h3>${esc(addonName(a))}</h3><p>${esc(addonDescription(a))}</p><div class="addon-meta"><span>${esc(a.version||'1.0')}</span><span>${esc(protocol)}</span></div>${a.source?`<div class="addon-meta"><span>${t('addonHost')}: ${esc(host)}</span><span>${(a.resources||a.types||[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean).join(' · ')}</span></div>`:''}${a.builtIn?'':`<div style="margin-top:12px"><button class="btn danger" data-remove-addon="${esc(a.id)}">${t('delete')}</button></div>`}</div>`}).join('')}</div>`;
  $('#installAddon').onclick=()=>installAddonFromUrl($('#addonUrl').value.trim());
  $('#installSample').onclick=installSampleAddon;
  $('#importAddon').onclick=()=>$('#addonFile').click();
  $('#addonFile').onchange=async e=>{ const file=e.target.files?.[0]; if(!file)return; try{const manifest=JSON.parse(await file.text());await installManifest(manifest,`file://${file.name}`);}catch(err){toast(t('fileReadFailed'),err.message);} };
  clearAmbient();
}
async function installAddonFromUrl(rawUrl){
  if(!rawUrl) return toast(t('addonMissingUrl'),t('addonMissingUrlText'));
  const url=normalizeAddonManifestUrl(rawUrl);
  try{ const res=await fetch(url,{cache:'no-store'}); if(!res.ok) throw new Error(`HTTP ${res.status}`); const manifest=await res.json(); await installManifest(manifest,url); }
  catch(err){ toast(t('addonInstallFailed'),`${t('addonCors')} ${err.message}`); }
}
async function installSampleAddon(){
  const manifest={
    id:'demo.open.movies',name:'Open Movies Demo',version:'1.3.0',description:'Public demo streams used to test the MiFlix add-on/player flow.',description_es:t('demoAddonDesc'),types:['catalog','meta','stream'],
    catalog:[
      {id:'addon:movie:big-buck-bunny',type:'movie',title:'Big Buck Bunny (Demo)',year:2008,rating:8.0,duration:'9m 56s',genre:'Open movie',genre_es:'Película abierta',description:t('demoMovieDesc'),description_es:t('demoMovieDesc'),...ASSET('nebula'),streams:[{name:'1080p · Google sample',quality:'1080p',url:'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}]},
      {id:'addon:movie:elephants-dream',type:'movie',title:'Elephants Dream (Demo)',year:2006,rating:7.5,duration:'10m 53s',genre:'Open movie',genre_es:'Película abierta',description:t('demoMovieDesc'),description_es:t('demoMovieDesc'),...ASSET('parallel'),streams:[{name:'Direct demo stream',quality:'HD',url:'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'}]}
    ]
  };
  await installManifest(manifest,'builtin://open-movies-demo');
}
async function installManifest(m,url){
  if(!m || !m.id || !m.name) return toast(t('invalidManifest'),t('invalidManifestText'));
  if([...BUILTIN_ADDONS,...installedAddons].some(a=>a.id===m.id)) return toast(t('alreadyInstalled'),m.name);
  if(isStremioManifest(m)){
    const manifestUrl=normalizeAddonManifestUrl(url);
    const addon={id:m.id,name:m.name,name_es:m.name_es,version:m.version||'1.0.0',description:m.description||'',description_es:m.description_es,types:m.types||[],resources:m.resources||[],catalogs:m.catalogs||[],idPrefixes:m.idPrefixes||[],source:manifestUrl,baseUrl:addonBaseFromManifest(manifestUrl),protocol:'stremio'};
    installedAddons.push(addon); store.set('addons',installedAddons); toast(t('stremioInstalled'),t('stremioInstalledText')); renderAddons(); return;
  }
  let catalog=Array.isArray(m.catalog)?m.catalog:[];
  if(m.catalogUrl){
    const absolute = new URL(m.catalogUrl,url.startsWith('http')?url:location.href).href;
    const res=await fetch(absolute,{cache:'no-store'}); if(!res.ok) throw new Error(`catalogUrl HTTP ${res.status}`); const data=await res.json(); catalog=Array.isArray(data)?data:(data.catalog||[]);
  }
  installedAddons.push({id:m.id,name:m.name,name_es:m.name_es,version:m.version||'1.0.0',description:m.description||'',description_es:m.description_es,types:m.types||[],source:url,protocol:'miflix'});
  addonCatalog.push(...catalog.map(x=>normalizeMedia(x,m.id)).filter(Boolean));
  store.set('addons',installedAddons); store.set('addonCatalog',addonCatalog); toast(t('addonInstalled'),m.name); renderAddons();
}
async function ensurePersonalDefaultAddon(){
  const raw=String(PERSONAL_DEFAULTS.torrentioManifest||'').trim();if(!raw)return false;
  const url=normalizeAddonManifestUrl(raw);
  if(installedAddons.some(a=>a.source===url||a.baseUrl===addonBaseFromManifest(url)))return true;
  try{
    const m=await fetchJsonTimeout(url,12000);
    if(!m?.id||!m?.name||!isStremioManifest(m))return false;
    const addon={id:m.id,name:m.name,name_es:m.name_es,version:m.version||'1.0.0',description:m.description||'',description_es:m.description_es,types:m.types||[],resources:m.resources||[],catalogs:m.catalogs||[],idPrefixes:m.idPrefixes||[],source:url,baseUrl:addonBaseFromManifest(url),protocol:'stremio'};
    installedAddons.push(addon);store.set('addons',installedAddons);return true;
  }catch{return false;}
}

function normalizeMedia(x,addonId){ if(!x||!x.id||!x.title||!['movie','series'].includes(x.type)) return null; return {rating:0,year:'—',duration:'',genre:'Add-on',description:'',streams:[],...x,_addonId:addonId}; }
function removeAddon(id){
  const addon=installedAddons.find(a=>a.id===id); installedAddons=installedAddons.filter(a=>a.id!==id); addonCatalog=addonCatalog.filter(x=>x._addonId!==id);
  store.set('addons',installedAddons);store.set('addonCatalog',addonCatalog);toast(t('addonRemoved'),addon?.name||id);renderAddons();
}


const NUVIO_COMMUNITY_COLLECTION='https://raw.githubusercontent.com/jyan1992/nuviocollection/main/collections/nuvio-collections.json';
const KAPTAIN_NUVIO_COLLECTION='https://gist.githubusercontent.com/ImKaptain/c17022f90afd234b9a51ef4a56d6a568/raw';
function normalizeCollectionUrl(url=''){
  const raw=String(url||'').trim();
  try{
    const u=new URL(raw);
    if(u.hostname==='gist.github.com'){
      const bits=u.pathname.split('/').filter(Boolean);
      if(bits.length>=2)return `https://gist.githubusercontent.com/${bits[0]}/${bits[1]}/raw`;
    }
    if(u.hostname==='github.com'){
      const bits=u.pathname.split('/').filter(Boolean);
      const blob=bits.indexOf('blob');
      if(blob>=2&&bits[blob+1])return `https://raw.githubusercontent.com/${bits[0]}/${bits[1]}/${bits.slice(blob+1).join('/')}`;
    }
  }catch{}
  return raw;
}
function focusGifMedia(f){
  if(!f?.focusGifEnabled||!f?.focusGifUrl)return '';
  let src=String(f.focusGifUrl);
  const isGifv=/\.gifv(?:\?|$)/i.test(src);
  if(isGifv)src=src.replace(/\.gifv(?=\?|$)/i,'.mp4');
  if(isGifv||/\.(mp4|webm)(?:\?|$)/i.test(src))return `<video class="collection-focus-media" muted loop playsinline preload="none" data-focus-src="${esc(src)}"></video>`;
  return `<img class="collection-focus-media" alt="" data-focus-src="${esc(src)}">`;
}
function renderCollections(){
  view.innerHTML=`<div class="install-box"><h3 style="margin:0 0 4px">${t('collectionsTitle')}</h3><p style="margin:0;color:var(--muted);font-size:12px">${t('collectionsIntro')}</p><div class="install-row"><input id="collectionUrl" class="addon-input" placeholder="${t('collectionUrl')}" value=""><button class="btn primary" id="installCollection">${t('install')}</button><button class="btn ghost" id="kaptainCollection">${t('kaptainCollection')}</button><button class="btn ghost" id="nuvioCommunity">${t('nuvioCommunity')}</button><button class="btn ghost" id="importCollection">${t('importCollection')}</button><input type="file" id="collectionFile" accept="application/json,.json" hidden></div><small style="display:block;margin-top:8px;color:var(--muted)">${t('kaptainHelp')} ${t('communityNote')}</small></div>${collections.length?collections.map(c=>collectionBlock(c,true)).join(''):empty('▦',t('noCollections'),t('installCollectionHelp'))}`;
  $('#installCollection').onclick=()=>installCollectionUrl($('#collectionUrl').value.trim());
  $('#kaptainCollection').onclick=()=>installCollectionUrl(KAPTAIN_NUVIO_COLLECTION);
  $('#nuvioCommunity').onclick=()=>installCollectionUrl(NUVIO_COMMUNITY_COLLECTION);
  $('#importCollection').onclick=()=>$('#collectionFile').click();
  $('#collectionFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{installCollectionData(JSON.parse(await f.text()),f.name);}catch(err){toast(t('collectionFailed'),err.message);}};
  clearAmbient();
}
function collectionBlock(c,manageable=false){
  const folders=c.folders||[];
  const cards=folders.map(f=>{const art=f.coverImageUrl||f.heroBackdropUrl||c._manifestBackground||'';const count=(f.catalogSources||f.sources||[]).length||1;return `<button class="collection-folder" data-collection-folder="${esc(c.id)}|${esc(f.id)}"><div class="collection-folder-copy"><b>${esc(f.title||'Folder')}</b><small>${count} source${count===1?'':'s'}</small></div><div class="collection-folder-art">${art?`<img class="collection-cover-media" src="${esc(art)}" alt="">`:`<i></i><i></i><i></i>`}${focusGifMedia(f)}</div></button>`}).join('');
  return `<section class="section collection-section"><div class="section-head"><div><h3>${esc(c.title||'Collection')}</h3><p>${folders.length} folders</p></div>${manageable?`<button class="collection-delete" data-delete-collection="${esc(c.id)}">${t('deleteCollection')}</button>`:''}</div>${railShell(cards,'collection-folder-row')}</section>`;
}
function deleteCollection(id){
  const c=collections.find(x=>x.id===id);if(!c)return;
  if(!window.confirm(`${t('deleteCollectionConfirm')}\n\n${c.title||'Collection'}`))return;
  collections=collections.filter(x=>x.id!==id);store.set('collections',collections);toast(t('collectionDeleted'),c.title||'');renderCollections();
}
async function installCollectionUrl(url){
  if(!url)return toast(t('collectionFailed'),t('addonMissingUrlText'));
  const resolved=normalizeCollectionUrl(url);toast(t('loadingCollection'),resolved);
  try{const data=await fetchJsonTimeout(resolved,22000);if(isStremioManifest(data)){await installManifestCollection(data,resolved);return;}installCollectionData(data,resolved);}catch(err){toast(t('collectionFailed'),err.message);}
}
async function installManifestCollection(m,url){
  const manifestUrl=normalizeAddonManifestUrl(url);let addon=installedAddons.find(a=>a.id===m.id);
  if(!addon){addon={id:m.id,name:m.name,name_es:m.name_es,version:m.version||'1.0.0',description:m.description||'',description_es:m.description_es,types:m.types||[],resources:m.resources||[],catalogs:m.catalogs||[],idPrefixes:m.idPrefixes||[],source:manifestUrl,baseUrl:addonBaseFromManifest(manifestUrl),protocol:'stremio',logo:m.logo||'',background:m.background||''};installedAddons.push(addon);store.set('addons',installedAddons);}
  const folders=(m.catalogs||[]).map((cat,i)=>{const req=(cat.extra||[]).find(x=>x.name==='genre'&&x.isRequired);return {id:`catalog-${i}-${cat.type}-${cat.id}`,title:cat.name||cat.id,tileShape:'LANDSCAPE',hideTitle:false,heroBackdropUrl:m.background||'',coverImageUrl:'',catalogSources:[{addonId:m.id,catalogId:cat.id,type:cat.type,genre:req?.default||null}]};});
  const row={id:`manifest:${m.id}`,title:m.name||'Add-on Catalogs',folders,_source:manifestUrl,_addonId:m.id,_manifestBackground:m.background||m.logo||''};const ix=collections.findIndex(x=>x.id===row.id);if(ix>=0)collections[ix]=row;else collections.push(row);store.set('collections',collections);toast(t('manifestDetected'),t('manifestCollectionAdded'));renderCollections();
}
function installCollectionData(data,source='local'){const list=Array.isArray(data)?data:(Array.isArray(data.collections)?data.collections:(data?.folders?[data]:[]));if(!list.length)throw new Error('No collections');let imported=0;for(const c of list){if(!c?.id||!Array.isArray(c.folders))continue;const row={...c,_source:source};const i=collections.findIndex(x=>x.id===row.id);if(i>=0)collections[i]=row;else collections.push(row);imported++;}store.set('collections',collections);toast(t('collectionInstalled'),`${imported}`);renderCollections();}
function findCollectionFolder(key){const [cid,...rest]=String(key).split('|');const fid=rest.join('|');const c=collections.find(x=>x.id===cid);return {collection:c,folder:c?.folders?.find(x=>x.id===fid)};}
function installedAddonById(id){return installedAddons.find(a=>a.id===id||String(a.id).endsWith(id)||String(a.name||'').toLowerCase().replace(/\s/g,'').includes(String(id).toLowerCase().replace(/[-_.\s]/g,'')));}
function mapStremioMeta(meta,source){if(!meta?.id||!meta?.name)return null;const mt=String(meta.type||source.type||'movie').toLowerCase();const type=mt.includes('series')||mt==='tv'?'series':'movie';return {id:`stremio:${source.addonId||'addon'}:${type}:${meta.id}`,provider:'addonCatalog',imdbId:String(meta.id).startsWith('tt')?meta.id:'',type,title:meta.name,year:meta.releaseInfo||meta.year||'—',rating:Number(meta.imdbRating||meta.rating||0),duration:meta.runtime||'',genre:Array.isArray(meta.genres)?meta.genres.slice(0,3).join(' · '):(meta.genre||'Add-on'),description:meta.description||'',backdrop:meta.background||meta.poster||'',poster:meta.poster||meta.background||'',streams:[],_catalogMetaId:meta.id};}
async function nativeNuvioCatalog(source){
  const id=String(source.catalogId||'');
  const type=String(source.type||'movie').includes('series')?'series':'movie';
  if(id==='tmdb.top'){const arr=type==='series'?(homeSections.popularSeries||[]):(homeSections.popularMovies||[]);if(arr.length)return arr;}
  if(id==='tmdb.trending'){const d=await tmdbFetch(`/trending/${type==='series'?'tv':'movie'}/week`,{});return (d.results||[]).map(x=>mapTmdb(x,type==='series'?'tv':'movie')).filter(Boolean);}
  if(id==='tmdb.top_rated'){const d=await tmdbFetch(`/${type==='series'?'tv':'movie'}/top_rated`,{page:1});return (d.results||[]).map(x=>mapTmdb(x,type==='series'?'tv':'movie')).filter(Boolean);}
  const m=id.match(/^tmdb\.discover\.(movie|series)\.streaming\.([\w-]+)$/);if(m)return fetchPlatformMedia(m[2],m[1]==='series'?'series':'movie',20);
  const providerIds={
    'streaming.nfx':'netflix','streaming.amp':'prime-video','streaming.hbm':'hbo-max','streaming.dnp':'disney-plus',
    'streaming.hlu':'hulu','streaming.atp':'apple-tv','streaming.pmp':'paramount-plus','streaming.pcp':'peacock'
  };
  if(providerIds[id])return fetchPlatformMedia(providerIds[id],type,24);
  return null;
}
async function resolveCollectionSource(source){const native=tmdbAuth.credential?await nativeNuvioCatalog(source):null;if(native)return native;const addon=installedAddonById(source.addonId);if(!addon?.baseUrl)throw new Error(`${t('collectionSourceMissing')} (${source.addonId})`);const type=String(source.type||'movie');let extra='';if(source.genre)extra=`/genre=${encodeURIComponent(source.genre)}`;const data=await fetchJsonTimeout(`${addon.baseUrl}/catalog/${encodeURIComponent(type)}/${encodeURIComponent(source.catalogId)}${extra}.json`,18000);return (data.metas||[]).map(x=>mapStremioMeta(x,source)).filter(Boolean);}
async function openCollectionFolder(key){const {collection,folder}=findCollectionFolder(key);if(!folder)return;currentView='collection-folder';setBack(()=>setView('collections'));pageTitle.textContent=folder.title||collection?.title||t('collections');pageEyebrow.textContent=collection?.title||t('collections');view.innerHTML=empty('⌛',t('loadingCollection'),folder.title||'');clearAmbient();const sources=folder.sources?.length?folder.sources:(folder.catalogSources||[]);const settled=await Promise.allSettled(sources.map(resolveCollectionSource));const items=dedupeTmdb(settled.filter(x=>x.status==='fulfilled').flatMap(x=>x.value));dynamicCatalog=dedupeTmdb([...dynamicCatalog,...items]);const errors=settled.filter(x=>x.status==='rejected').map(x=>x.reason?.message).filter(Boolean);view.innerHTML=items.length?`${folder.heroBackdropUrl?`<div class="collection-hero" style="background-image:linear-gradient(90deg,rgba(7,7,10,.96),rgba(7,7,10,.35)),url('${String(folder.heroBackdropUrl).replace(/'/g,'%27')}')"><h2>${esc(folder.title)}</h2></div>`:''}${section(folder.title||t('collections'),errors.join(' · '),items)}`:empty('▦',t('collectionEmpty'),esc(errors.join(' · ')||t('collectionSourceMissing')));}

function renderSettings(){
  const profile=activeProfile();
  const status=tmdbAuth.credential?t('connected'):t('notConnected');
  const last=tmdbLastSync?new Date(tmdbLastSync).toLocaleString(settings.language==='es'?'es-DO':'en-US'):t('never');
  view.innerHTML = `<div class="settings-stack">
    <div class="settings-panel profile-settings-panel"><div class="tmdb-head"><div><h3>${t('profile')}: ${esc(profile.name)}</h3><p>${profile.primary?t('mainProfile'):t('shareMainSetupHelp')}</p></div><button class="btn ghost" id="manageProfilesBtn">${t('profiles')}</button></div>${!profile.primary?`<label class="profile-share-toggle"><input id="shareProfileSetup" type="checkbox" ${profile.shareSetup?'checked':''}><span><b>${t('shareMainSetup')}</b><small>${t('shareMainSetupHelp')}</small></span></label>`:''}</div>
    <div class="settings-grid"><div class="settings-panel"><h3>${t('appearance')}</h3><p>${t('appearanceIntro')}</p>
      <div class="setting"><label>${t('language')}</label><select id="languageSelect"><option value="es" ${settings.language==='es'?'selected':''}>${t('spanish')}</option><option value="en" ${settings.language==='en'?'selected':''}>${t('english')}</option></select></div>
      <div class="setting"><label>${t('preset')}</label><div class="theme-pills"><button class="theme-pill ${settings.theme==='nuvio'?'active':''}" data-theme="nuvio">Nuvio-ish</button><button class="theme-pill ${settings.theme==='oled'?'active':''}" data-theme="oled">OLED</button><button class="theme-pill ${settings.theme==='stremio'?'active':''}" data-theme="stremio">Stremio-ish</button><button class="theme-pill ${settings.theme==='custom'?'active':''}" data-theme="custom">Custom</button></div></div>
      <div class="setting"><label>${t('accent')} <small>${settings.accent}</small></label><input id="accent" type="color" value="${settings.accent}"></div>
      <div class="setting"><label>${t('cardSize')}</label><select id="cardSize"><option value="medium" ${settings.cardSize==='medium'?'selected':''}>${t('medium')}</option><option value="large" ${settings.cardSize==='large'?'selected':''}>${t('large')}</option></select></div>
      <div class="setting"><label>${t('rounding')} <small id="radiusVal">${settings.radius}px</small></label><input id="radius" type="range" min="4" max="28" value="${settings.radius}"></div>
      <div class="setting"><label>${t('panelBlur')} <small id="blurVal">${settings.blur}px</small></label><input id="blur" type="range" min="0" max="30" value="${settings.blur}"></div>
      <div class="setting"><label>${t('density')}</label><select id="density"><option value="comfortable" ${settings.density==='comfortable'?'selected':''}>${t('comfortable')}</option><option value="compact" ${settings.density==='compact'?'selected':''}>${t('compact')}</option></select></div>
      <div class="setting"><label><span>${t('animations')}</span><input id="motion" type="checkbox" ${settings.motion?'checked':''}></label></div>
      <div class="setting"><label><span>${t('autoPreviews')}</span><input id="previews" type="checkbox" ${settings.autoPreviews?'checked':''}></label><small>${t('previewHelp',{seconds:settings.previewDelay})}</small></div>
      <div class="setting"><label><span>${t('ratings')}</span><input id="ratings" type="checkbox" ${settings.showRatings?'checked':''}></label></div>
      <div class="setting"><label><span>${t('heroDescription')}</span><input id="desc" type="checkbox" ${settings.showDescription?'checked':''}></label></div>
      <button class="btn ghost" id="resetSettings">${t('resetAppearance')}</button>
    </div><div class="settings-panel"><h3>${t('playerPlayback')}</h3><p>${t('autoplayFirstHelp')}</p>
      <div class="setting"><label>${t('playerEngine')}</label><select id="playerEngine"><option value="builtin" ${settings.playerEngine==='builtin'?'selected':''}>${t('builtInPlayer')}</option><option value="external" ${settings.playerEngine==='external'?'selected':''}>${t('externalPlayerMode')}</option></select><small>${t('builtInPlayerHelp')}</small></div>
      ${IS_ANDROID_TV?`<div class="setting tv-compat-setting"><label><span>${t('tvCompatibility')}</span><input id="tvCompatibilityMode" type="checkbox" ${settings.tvCompatibilityMode!==false?'checked':''}></label><small>${t('tvCompatibilityHelp')}</small></div>`:''}
      <div class="setting"><label>${t('externalPlayerChoice')}</label><select id="externalPlayer"><option value="mpv" ${settings.externalPlayer==='mpv'?'selected':''}>${t('mpvPlayer')}</option><option value="vlc" ${settings.externalPlayer==='vlc'?'selected':''}>${t('vlcPlayer')}</option><option value="system" ${settings.externalPlayer==='system'?'selected':''}>${t('systemPlayer')}</option></select><small>${t('externalPlayerHelp')}</small></div>
      <div class="setting"><label><span>${t('autoplayFirst')}</span><input id="autoplayFirst" type="checkbox" ${settings.autoplayFirst?'checked':''}></label></div>
      <div class="setting"><label><span>${t('autoplayNext')}</span><input id="autoplayNext" type="checkbox" ${settings.autoplayNext?'checked':''}></label><small>${t('autoplayNextHelp')}</small></div>
      <div class="setting"><label><span>${t('fullscreenPlayback')}</span><input id="autoFullscreen" type="checkbox" ${settings.autoFullscreen?'checked':''}></label></div>
      <div class="setting"><label><span>${t('skipIntro')}</span><input id="skipIntro" type="checkbox" ${settings.skipIntro?'checked':''}></label></div>
      <div class="setting"><label>${t('introLength')} <small id="introVal">${settings.introSkipSeconds}s</small></label><input id="introSeconds" type="range" min="30" max="180" step="5" value="${settings.introSkipSeconds}"></div>
      <div class="setting"><label>${t('preferredAudio')}</label><select id="preferredAudio"><option value="" ${!settings.preferredAudio?'selected':''}>${t('defaultTrack')}</option><option value="es" ${settings.preferredAudio==='es'?'selected':''}>Español</option><option value="en" ${settings.preferredAudio==='en'?'selected':''}>English</option><option value="ja" ${settings.preferredAudio==='ja'?'selected':''}>日本語</option></select></div>
      <div class="setting"><label>${t('preferredSubtitle')}</label><select id="preferredSubtitle"><option value="" ${!settings.preferredSubtitle?'selected':''}>${t('off')}</option><option value="es" ${settings.preferredSubtitle==='es'?'selected':''}>Español</option><option value="en" ${settings.preferredSubtitle==='en'?'selected':''}>English</option></select></div>
      <div class="setting"><label>${t('watchRegion')}</label><input id="watchRegion" maxlength="2" value="${esc((settings.watchRegion||'DO').toUpperCase())}"><small>${t('regionHelp')}</small></div>
      <div class="setting"><label>${t('partyRelayUrl')}</label><input id="partyRelayUrl" class="addon-input" value="${esc(settings.watchPartyRelayUrl||'')}" placeholder="https://your-worker.workers.dev"><small>${t('partyRelayHelp')}</small></div>
      <small class="settings-note">${t('audioBrowserNote')}</small>
    </div></div>
    ${cloudSettingsPanel()}
    <div class="settings-panel tmdb-panel"><div class="tmdb-head"><div><h3>${t('tmdbTitle')}</h3><p>${t('tmdbIntro')}</p></div><span class="connection-pill ${tmdbAuth.credential?'ok':''}">${status}</span></div>
      <div class="setting"><label>${t('tmdbCredential')}</label><input id="tmdbCredential" class="addon-input" type="password" value="${esc(tmdbAuth.credential||'')}" placeholder="${esc(t('tmdbPlaceholder'))}"><small>${t('lastSync')}: ${esc(last)}</small></div>
      <div class="tmdb-actions"><button class="btn primary" id="saveTmdb">${t('saveConnect')}</button><button class="btn ghost" id="testTmdb">${t('testConnection')}</button><button class="btn ghost" id="refreshTmdb">${t('refreshCatalog')}</button><button class="btn danger" id="disconnectTmdb">${t('disconnect')}</button><a class="btn link-btn" href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">${t('getCredential')} ↗</a></div>
      <div class="tmdb-credit"><img src="${TMDB_LOGO}" alt="TMDB" onerror="this.style.display='none'"><div><b>TMDB</b><p>${t('tmdbNoticeEn')}</p></div></div>
    </div>
  </div>`;
  bindSettings(); bindCloudSettings(); clearAmbient();
}
function bindSettings(){
  const manage=$('#manageProfilesBtn');if(manage)manage.onclick=renderProfilesModal;const share=$('#shareProfileSetup');if(share)share.onchange=e=>{const p=activeProfile();p.shareSetup=e.target.checked;persistProfiles();reloadProfileState();};
  $$('.theme-pill').forEach(b=>b.onclick=()=>{settings.theme=b.dataset.theme;if(settings.theme==='stremio')settings.accent='#7c6cff';if(settings.theme==='nuvio')settings.accent='#8b5cf6';if(settings.theme==='oled')settings.accent='#9b7cff';saveSettingsAndRerender();});
  $('#languageSelect').onchange=e=>changeLanguage(e.target.value,true);
  $('#accent').oninput=e=>{settings.accent=e.target.value;settings.theme='custom';saveSettings(false);applySettings();};
  $('#cardSize').onchange=e=>{settings.cardSize=e.target.value;saveSettings(false);applySettings();};
  $('#radius').oninput=e=>{settings.radius=+e.target.value;$('#radiusVal').textContent=settings.radius+'px';saveSettings(false);applySettings();};
  $('#blur').oninput=e=>{settings.blur=+e.target.value;$('#blurVal').textContent=settings.blur+'px';saveSettings(false);applySettings();};
  $('#density').onchange=e=>{settings.density=e.target.value;saveSettings(false);applySettings();};
  $('#motion').onchange=e=>{settings.motion=e.target.checked;saveSettings(false);applySettings();};
  $('#previews').onchange=e=>{settings.autoPreviews=e.target.checked;saveSettings(false);};
  $('#ratings').onchange=e=>{settings.showRatings=e.target.checked;saveSettings(false);};
  $('#desc').onchange=e=>{settings.showDescription=e.target.checked;saveSettings(false);};
  $('#playerEngine').onchange=e=>{settings.playerEngine=e.target.value;saveSettings(false);};
  const tvCompat=$('#tvCompatibilityMode');if(tvCompat)tvCompat.onchange=e=>{settings.tvCompatibilityMode=e.target.checked;saveSettings(false);};
  $('#externalPlayer').onchange=e=>{settings.externalPlayer=e.target.value;saveSettings(false);};
  $('#autoplayFirst').onchange=e=>{settings.autoplayFirst=e.target.checked;saveSettings(false);};
  $('#autoplayNext').onchange=e=>{settings.autoplayNext=e.target.checked;saveSettings(false);};
  $('#autoFullscreen').onchange=e=>{settings.autoFullscreen=e.target.checked;saveSettings(false);};
  $('#skipIntro').onchange=e=>{settings.skipIntro=e.target.checked;saveSettings(false);};
  $('#introSeconds').oninput=e=>{settings.introSkipSeconds=+e.target.value;$('#introVal').textContent=settings.introSkipSeconds+'s';saveSettings(false);};
  $('#preferredAudio').onchange=e=>{settings.preferredAudio=e.target.value;saveSettings(false);};
  $('#preferredSubtitle').onchange=e=>{settings.preferredSubtitle=e.target.value;saveSettings(false);};
  $('#watchRegion').onchange=e=>{settings.watchRegion=(e.target.value||'DO').toUpperCase().slice(0,2);platformProviders=null;saveSettings(false);};
  $('#partyRelayUrl').onchange=e=>{settings.watchPartyRelayUrl=normalizePartyBase(e.target.value);saveSettings(false);};
  $('#resetSettings').onclick=()=>{const language=settings.language;settings={...DEFAULT_SETTINGS,language};saveSettingsAndRerender();toast(t('appearanceRestored'),t('appearanceRestoredText'));};
  $('#saveTmdb').onclick=async()=>{tmdbAuth={credential:$('#tmdbCredential').value.trim()};store.set('tmdbAuth',tmdbAuth);toast(t('tmdbSaved'),tmdbAuth.credential?'TMDB':'');if(tmdbAuth.credential){if(await testTmdbConnection(false))await refreshTmdbCatalog(true);}renderSettings();};
  $('#testTmdb').onclick=()=>testTmdbConnection(true);
  $('#refreshTmdb').onclick=()=>refreshTmdbCatalog(true);
  $('#disconnectTmdb').onclick=disconnectTmdb;
}
function saveSettingsAndRerender(){ store.set('settings',settings); applySettings(); renderSettings(); }

async function changeLanguage(language,rerender=true){
  if(!['es','en'].includes(language) || language===settings.language) return;
  settings.language=language; store.set('settings',settings); homeSections={};homeSectionsLoadedAt=0;platformProviders=null; applySettings();
  if(tmdbAuth.credential){ try{ await refreshTmdbCatalog(false); }catch{} }
  if(rerender) setView(currentView);
}

function tmdbAuthOptions(params={}){
  const credential=(tmdbAuth.credential||'').trim();
  const urlParams=new URLSearchParams(params);
  if(!urlParams.has('language')) urlParams.set('language',langCode());
  const options={headers:{accept:'application/json'}};
  if(credential.startsWith('eyJ') || credential.length>80) options.headers.Authorization=`Bearer ${credential}`;
  else if(credential) urlParams.set('api_key',credential);
  return {urlParams,options};
}
async function tmdbFetch(path,params={}){
  if(!tmdbAuth.credential) throw new Error(t('tmdbNeedCredential'));
  const {urlParams,options}=tmdbAuthOptions(params);
  const res=await fetch(`${TMDB_API}${path}?${urlParams.toString()}`,options);
  if(!res.ok){ let msg=`HTTP ${res.status}`; try{const j=await res.json();msg=j.status_message||msg;}catch{} throw new Error(msg); }
  return res.json();
}
async function testTmdbConnection(showToast=true){
  if(!tmdbAuth.credential){if(showToast)toast(t('tmdbError'),t('tmdbNeedCredential'));return false;}
  try{await tmdbFetch('/configuration',{});if(showToast)toast(t('tmdbReady'),t('tmdbReadyText'));return true;}catch(err){if(showToast)toast(t('tmdbError'),err.message);return false;}
}
function tmdbImage(path,size='w780'){ return path?`${TMDB_IMG}${size}${path}`:''; }
function mapTmdb(x,forcedType){
  const rawType=forcedType||x.media_type; if(!['movie','tv'].includes(rawType)) return null;
  const type=rawType==='tv'?'series':'movie'; const title=x.title||x.name||x.original_title||x.original_name||'Untitled';
  const date=x.release_date||x.first_air_date||''; const year=date?date.slice(0,4):'—';
  return {id:`tmdb:${type}:${x.id}`,tmdbId:x.id,provider:'tmdb',type,title,year,rating:Number(x.vote_average||0),duration:type==='series'?(settings.language==='es'?'Serie':'Series'):(settings.language==='es'?'Película':'Movie'),genre:'TMDB',description:x.overview||'',backdrop:tmdbImage(x.backdrop_path||x.poster_path,'w1280'),cardImage:tmdbImage(x.backdrop_path||x.poster_path,'w500'),poster:tmdbImage(x.poster_path||x.backdrop_path,'w500'),streams:[],popularity:x.popularity||0};
}
function dedupeTmdb(items){ const map=new Map();items.filter(Boolean).forEach(x=>map.set(x.id,x));return [...map.values()]; }
async function refreshTmdbCatalog(showToast=true){
  if(!tmdbAuth.credential){if(showToast)toast(t('tmdbError'),t('tmdbNeedCredential'));return false;}
  if(showToast)toast(t('tmdbRefreshing'),'TMDB');
  try{
    const [trending,movies,tv]=await Promise.all([
      tmdbFetch('/trending/all/week',{}), tmdbFetch('/movie/popular',{page:1}), tmdbFetch('/tv/popular',{page:1})
    ]);
    const trendItems=(trending.results||[]).map(x=>mapTmdb(x)).filter(Boolean);
    const movieItems=(movies.results||[]).map(x=>mapTmdb(x,'movie')).filter(Boolean);
    const tvItems=(tv.results||[]).map(x=>mapTmdb(x,'tv')).filter(Boolean);
    const merged=dedupeTmdb([...trendItems,...movieItems,...tvItems]); if(merged[0]) merged[0].featured=true;
    tmdbCatalog=merged; tmdbLastSync=Date.now(); store.set('tmdbCatalog',tmdbCatalog);store.set('tmdbLastSync',tmdbLastSync);
    if(showToast)toast(t('tmdbUpdated'),`${merged.length} ${t('titlesAvailable')}`);
    renderCurrent(); return true;
  }catch(err){if(showToast)toast(t('tmdbError'),err.message);return false;}
}
function disconnectTmdb(){
  tmdbAuth={credential:''};tmdbCatalog=[];tmdbLastSync=null;remoteSearchResults=[];store.set('tmdbAuth',tmdbAuth);store.set('tmdbCatalog',[]);store.remove('tmdbLastSync');toast(t('tmdbDisconnected'),'');renderSettings();
}
async function searchTmdb(query){
  const seq=++searchSeq;
  try{const data=await tmdbFetch('/search/multi',{query,include_adult:'false',page:1});if(seq!==searchSeq)return;remoteSearchResults=(data.results||[]).map(x=>mapTmdb(x)).filter(Boolean).slice(0,20);renderSearch(false);}catch(err){if(seq===searchSeq){remoteSearchResults=[];renderSearch(false);}}
}
function queueRemoteSearch(){
  clearTimeout(searchTimer); remoteSearchResults=[];
  if(!tmdbAuth.credential || searchTerm.length<2) return renderSearch(false);
  renderSearch(true); searchTimer=setTimeout(()=>searchTmdb(searchTerm),450);
}
async function enrichTmdbItem(item,needVideos=false){
  if(item?.provider!=='tmdb') return item;
  if(item._detailsLoaded && (!needVideos || item._videosLoaded)) return item;
  try{
    const endpoint=item.type==='series'?`/tv/${item.tmdbId}`:`/movie/${item.tmdbId}`;
    const data=await tmdbFetch(endpoint,needVideos?{append_to_response:'videos'}:{});
    const genres=(data.genres||[]).map(g=>g.name).slice(0,3).join(' · ');
    item.genre=genres||item.genre;
    item.description=data.overview||item.description;
    if(item.type==='movie' && data.runtime) item.duration=formatMinutes(data.runtime);
    if(item.type==='series'){
      const n=data.number_of_episodes||0; item.duration=n?(settings.language==='es'?`${n} episodios`:`${n} episodes`):(settings.language==='es'?'Serie':'Series');
      item.seasons=(data.seasons||[]).filter(x=>Number(x.season_number)>0).map(x=>({season:x.season_number,episodes:x.episode_count||0,name:x.name||''}));
    }
    item.backdrop=tmdbImage(data.backdrop_path||data.poster_path,'w1280')||item.backdrop;
    item.poster=tmdbImage(data.poster_path||data.backdrop_path,'w500')||item.poster;
    item._detailsLoaded=true;
    if(needVideos){ item.trailerKey=pickYoutubeTrailer(data.videos?.results||[]); item._videosLoaded=true; }
    store.set('tmdbCatalog',tmdbCatalog);
    return item;
  }catch{return item;}
}
function formatMinutes(min){ const h=Math.floor(min/60),m=min%60; return h?`${h}h ${String(m).padStart(2,'0')}m`:`${m}m`; }
function pickYoutubeTrailer(videos){
  const yt=videos.filter(v=>v.site==='YouTube');
  return (yt.find(v=>v.type==='Trailer'&&v.official)||yt.find(v=>v.type==='Trailer')||yt.find(v=>v.type==='Teaser')||yt[0])?.key||'';
}
async function ensureTmdbTrailer(item){
  await enrichTmdbItem(item,true);
  if(item.trailerKey) return item.trailerKey;
  try{
    const endpoint=item.type==='series'?`/tv/${item.tmdbId}/videos`:`/movie/${item.tmdbId}/videos`;
    const {urlParams,options}=tmdbAuthOptions({language:'en-US'}); const res=await fetch(`${TMDB_API}${endpoint}?${urlParams}`,options); if(res.ok){const data=await res.json();item.trailerKey=pickYoutubeTrailer(data.results||[]);item._videosLoaded=true;store.set('tmdbCatalog',tmdbCatalog);}
  }catch{}
  return item.trailerKey||'';
}


async function ensureTmdbImdbId(item){
  if(!item) return '';
  if(item.imdbId) return item.imdbId;
  if(item.provider!=='tmdb') return '';
  if(item.imdbId) return item.imdbId;
  try{
    const endpoint=item.type==='series'?`/tv/${item.tmdbId}/external_ids`:`/movie/${item.tmdbId}/external_ids`;
    const data=await tmdbFetch(endpoint,{});
    item.imdbId=data.imdb_id||'';
    return item.imdbId;
  }catch{return '';}
}
function streamAddons(){ return installedAddons.filter(a=>a.protocol==='stremio' && stremioSupportsStream(a)); }
function streamQuality(text=''){
  const x=String(text);
  const m=x.match(/(?:^|\b)(2160p|4k|1080p|720p|480p|360p)(?:\b|$)/i);
  return m?m[1].toUpperCase().replace('2160P','4K'):t('direct');
}
function normalizeStremioStream(raw,addon,index){
  const title=String(raw?.title||raw?.description||raw?.behaviorHints?.filename||'').trim();
  const name=String(raw?.name||addon?.name||`${t('source')} ${index+1}`).trim();
  const url=typeof raw?.url==='string'?raw.url:'';
  return {
    name,title,quality:streamQuality(`${name} ${title}`),url,playable:!!url,infoHash:raw?.infoHash||'',fileIdx:raw?.fileIdx,
    sourceAddon:addon?.name||'Stremio',sourceAddonId:addon?.id||'',behaviorHints:raw?.behaviorHints||{},subtitles:Array.isArray(raw?.subtitles)?raw.subtitles:[],stremio:true
  };
}
async function fetchJsonTimeout(url,ms=18000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{
    const res=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{accept:'application/json'}});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }finally{clearTimeout(timer);}
}
async function resolveStremioStreams(item,season=1,episode=1){
  const addons=streamAddons();
  item._streamLoading=true; item._streamQueried=true; item._streamError=''; item._selectedSeason=Number(season)||1; item._selectedEpisode=Number(episode)||1;
  if(!addons.length){ item.streams=[]; item._streamLoading=false; item._streamError=t('noStreamAddons'); return []; }
  const imdbId=await ensureTmdbImdbId(item);
  if(!imdbId){ item.streams=[]; item._streamLoading=false; item._streamError=t('noImdbId'); return []; }
  const type=item.type==='series'?'series':'movie';
  const videoId=type==='series'?`${imdbId}:${item._selectedSeason}:${item._selectedEpisode}`:imdbId;
  const settled=await Promise.allSettled(addons.map(async addon=>{
    const url=`${addon.baseUrl}/stream/${type}/${encodeURIComponent(videoId)}.json`;
    const data=await fetchJsonTimeout(url);
    return (data?.streams||[]).map((x,i)=>normalizeStremioStream(x,addon,i));
  }));
  const streams=[]; const errors=[];
  settled.forEach((r,i)=>{ if(r.status==='fulfilled') streams.push(...r.value); else errors.push(`${addons[i]?.name||'Add-on'}: ${r.reason?.message||'Error'}`); });
  item.streams=streams;
  item._streamLoading=false;
  item._streamErrors=errors;
  item._streamError=streams.length?'':(errors.length?errors.join(' · '):'');
  return streams;
}
function streamRow(s,i,item){
  const info=(s.title||'').replace(/\s*\n\s*/g,' · ').slice(0,260);
  const state=s.playable?t('playable'):t('torrentOnly');
  return `<div class="stream-item"><div class="stream-copy"><div class="stream-name">${esc(s.sourceAddon||s.name)} · ${esc(s.quality||t('direct'))}</div><div class="stream-info">${esc(info||s.name)} · ${esc(state)}</div></div>${s.playable?`<button class="btn" data-stream-index="${i}" data-item="${esc(item.id)}">${t('play')}</button>`:`<button class="btn ghost" disabled>${t('torrentOnly')}</button>`}</div>`;
}
function episodeProgress(item,season,episode){return progress[playerProgressKey(item,season,episode)]||null;}
async function ensureSeasonEpisodes(item,season){
  if(item?.provider!=='tmdb'||item.type!=='series')return [];
  const sn=Number(season)||1;item._episodesBySeason=item._episodesBySeason||{};
  if(item._episodesBySeason[sn])return item._episodesBySeason[sn];
  item._episodeLoading=true;
  try{
    const data=await tmdbFetch(`/tv/${item.tmdbId}/season/${sn}`,{});
    const rows=(data.episodes||[]).map(ep=>({season:sn,episode:Number(ep.episode_number)||1,title:ep.name||`${t('episode')} ${ep.episode_number}`,description:ep.overview||'',date:ep.air_date||'',rating:Number(ep.vote_average||0),runtime:ep.runtime||0,backdrop:tmdbImage(ep.still_path,'w780')||item.backdrop}));
    item._episodesBySeason[sn]=rows;return rows;
  }catch{return [];}finally{item._episodeLoading=false;}
}
function episodeCard(item,ep){
  const selected=Number(item._selectedSeason||1)===Number(ep.season)&&Number(item._selectedEpisode||1)===Number(ep.episode);
  const p=episodeProgress(item,ep.season,ep.episode);const pct=Math.min(100,Number(p?.percent||0));
  return `<button class="episode-card ${selected?'selected':''}" data-episode-play="${ep.season}|${ep.episode}"><div class="episode-art">${ep.backdrop?`<img src="${esc(ep.backdrop)}" alt="">`:''}<div class="episode-shade"></div><span class="episode-badge">S${ep.season}E${ep.episode}</span>${pct?`<div class="episode-progress"><span style="width:${pct}%"></span></div>`:''}</div><div class="episode-copy"><b>${esc(ep.title)}</b>${ep.description?`<p>${esc(ep.description)}</p>`:''}<div class="episode-meta">${settings.showRatings&&ep.rating?`<span class="rating">★ ${ep.rating.toFixed(1)}</span>`:''}${ep.date?`<span>${esc(ep.date)}</span>`:''}</div></div></button>`;
}
function episodeBrowser(item){
  if(item.type!=='series')return '';
  const seasons=(item.seasons||[]);const selected=Number(item._selectedSeason||seasons[0]?.season||1);const rows=item._episodesBySeason?.[selected]||[];
  const seasonOptions=(seasons.length?seasons:[{season:selected}]).map(x=>`<option value="${x.season}" ${Number(x.season)===selected?'selected':''}>${t('season')} ${x.season}</option>`).join('');
  const body=item._episodeLoading?`<div class="episode-loading">${t('episodeLoading')}</div>`:(rows.length?railShell(rows.map(ep=>episodeCard(item,ep)).join(''),'episode-row'):`<div class="episode-loading">${t('noEpisodes')}</div>`);
  return `<section class="episode-section"><div class="episode-section-head"><h3>${t('season')} ${selected}</h3><select id="detailSeasonSelect" aria-label="${esc(t('season'))}">${seasonOptions}</select></div>${body}</section>`;
}
async function selectSeason(item,season){
  item._selectedSeason=Number(season)||1;item._selectedEpisode=1;item.streams=[];item._streamQueried=false;item._streamError='';renderDetail(item);await ensureSeasonEpisodes(item,item._selectedSeason);if($(`[data-modal-id="${CSS.escape(item.id)}"]`))renderDetail(item);
}
function selectEpisode(item,season,episode){
  item._selectedSeason=Number(season)||1;item._selectedEpisode=Number(episode)||1;item.streams=[];item._streamQueried=false;item._streamError='';renderDetail(item);
}
function androidTvStreamScore(stream,index=0){
  if(!stream?.playable||!stream.url)return -1e9;
  if(!IS_ANDROID_TV||settings.tvCompatibilityMode===false)return 100000-index;
  const text=[stream.name,stream.title,stream.quality,stream.behaviorHints?.filename].filter(Boolean).join(' ').toLowerCase();
  let score=1000-index;
  if(/1080p/.test(text))score+=280;else if(/720p/.test(text))score+=210;else if(/2160p|4k/.test(text))score+=80;
  if(/\b(h264|x264|avc)\b/.test(text))score+=350;
  if(/dolby\s*vision|\bdv\b/.test(text))score-=900;
  if(/\bav1\b/.test(text))score-=700;
  if(/hevc|h\.?265|x265/.test(text))score-=420;
  if(/hdr10\+|hdr10|\bhdr\b/.test(text))score-=100;
  if(/web[- .]?dl|webrip|bluray/.test(text))score+=40;
  return score;
}
function bestPlayableStreamIndex(item){
  let best=-1,bestScore=-1e12;(item.streams||[]).forEach((st,i)=>{const score=androidTvStreamScore(st,i);if(score>bestScore){bestScore=score;best=i;}});return best;
}

async function playEpisode(item,season,episode){
  item._selectedSeason=Number(season)||1;
  item._selectedEpisode=Number(episode)||1;
  item.streams=[];item._streamQueried=false;item._streamError='';
  toast(t('findingFirst'),`${item.title} · S${item._selectedSeason}E${item._selectedEpisode}`);
  await resolveStremioStreams(item,item._selectedSeason,item._selectedEpisode);
  const idx=bestPlayableStreamIndex(item);
  if(idx<0){toast(t('noPlayableSource'),`${item.title} · S${item._selectedSeason}E${item._selectedEpisode}`);return;}
  prefetchSubtitleMetadata(item,item.streams[idx],item._selectedSeason,item._selectedEpisode);
  openPlayer(item.id,idx,{season:item._selectedSeason,episode:item._selectedEpisode});
}
function sourceControls(item){
  if(item.provider!=='tmdb') return '';
  if(item.type==='series'){
    const season=Number(item._selectedSeason||1),episode=Number(item._selectedEpisode||1);
    return `<div class="source-controls source-controls-compact"><div class="selected-episode">S${season}E${episode}</div><button class="btn primary" data-load-sources="${esc(item.id)}">${item._streamQueried?t('refreshSources'):t('loadSources')}</button></div>`;
  }
  return `<div class="source-controls source-controls-compact"><button class="btn primary" data-load-sources="${esc(item.id)}">${item._streamQueried?t('refreshSources'):t('loadSources')}</button></div>`;
}
function sourceList(item){
  const streams=item.streams||[];
  if(item._streamLoading) return `<div class="stream-loading"><span class="source-spinner"></span>${t('loadingSources')}</div>`;
  if(streams.length) return `<div class="source-summary">${streams.length} ${t('sourceCount')}</div><div class="stream-list">${streams.map((s,i)=>streamRow(s,i,item)).join('')}</div>${item._streamErrors?.length?`<div class="source-warning">${esc(item._streamErrors.join(' · '))}</div>`:''}`;
  if(item.provider==='tmdb' && item._streamQueried){
    const title=item._streamError?t('sourceLookupFailed'):t('noCompatibleStreams');
    const copy=item._streamError||t('noCompatibleStreamsText');
    return `<div class="stream-list"><div class="stream-item"><div><div class="stream-name">${esc(title)}</div><div class="stream-info">${esc(copy)}</div></div></div></div>`;
  }
  if(item.provider==='tmdb'){
    const none=streamAddons().length? t('loadSources') : t('noStreamAddons');
    const copy=streamAddons().length?t('streamsFromAddons'):t('noStreamAddonsText');
    return `<div class="stream-list"><div class="stream-item"><div><div class="stream-name">${esc(none)}</div><div class="stream-info">${esc(copy)}</div></div></div></div>`;
  }
  return `<div class="stream-list"><div class="stream-item"><div><div class="stream-name">${t('noStreams')}</div><div class="stream-info">${t('noStreamsInfo')}</div></div><button class="btn" data-play="${esc(item.id)}">${t('openPlayer')}</button></div></div>`;
}
async function loadSourcesForModal(id){
  const item=itemById(id); if(!item)return;
  const season=Number($('#sourceSeason')?.value||item._selectedSeason||1);
  const episode=Number($('#sourceEpisode')?.value||item._selectedEpisode||1);
  item._streamLoading=true; item._selectedSeason=season; item._selectedEpisode=episode; renderDetail(item);
  await resolveStremioStreams(item,season,episode);
  if($(`[data-modal-id="${CSS.escape(id)}"]`)) renderDetail(item);
}

function renderDetail(item){
  const streams=item.streams||[];
  const p=progress[item.id];
  const playLabel=item.type==='series'&&p?.episode&&Number(p.percent||0)>1&&Number(p.percent||0)<99?`▶ ${t('resume')} S${p.season||1}E${p.episode}`:t('play');
  const primary=`<button class="btn primary smart-play" data-smart-play="${esc(item.id)}">${playLabel}</button><span class="hold-hint">${settings.autoplayFirst?'1s → '+t('playManually'):t('manualSource')}</span>`;
  $('#modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(item.title)}" data-modal-id="${esc(item.id)}">
    <div class="detail-hero">${imageMarkup(item,'detail-backdrop-image')}<button class="modal-close" data-close-modal aria-label="Close">✕</button><div class="detail-gradient"></div><div class="detail-content"><div class="eyebrow">${mediaTypeLabel(item)}</div><h2>${esc(item.title)}</h2><div class="hero-meta"><span>${esc(item.year||'—')}</span><span>•</span><span>${esc(mediaDuration(item)||mediaTypeLabel(item))}</span>${mediaGenre(item)?`<span class="badge">${esc(mediaGenre(item))}</span>`:''}<span class="rating">★ ${Number(item.rating||0).toFixed(1)}</span></div><p>${esc(mediaDescription(item))}</p><div class="hero-actions">${primary}<button class="btn ghost" data-fav="${esc(item.id)}">${favorites.has(item.id)?t('removeList'):t('addList')}</button></div></div></div>
    <div class="detail-body">${item.type==='series'?episodeBrowser(item):''}<div class="sources-section"><h3 style="margin:0">${t('availableSources')}</h3><p style="margin:4px 0;color:var(--muted);font-size:11px">${t('streamsFromAddons')}</p>${sourceControls(item)}${sourceList(item)}${item.provider==='tmdb'?`<p class="player-note">${t('playerMayFail')}</p>`:''}</div></div>
  </div></div>`;
  const seasonSelect=$('#detailSeasonSelect');if(seasonSelect)seasonSelect.onchange=e=>selectSeason(item,+e.target.value);
}
async function openDetail(id){
  stopAllPreviews(); const item=itemById(id); if(!item)return; renderDetail(item);
  if(item.provider==='tmdb'){
    await enrichTmdbItem(item,false);
    if(item.type==='series'){
      const saved=progress[item.id];
      if(!item._selectedSeason)item._selectedSeason=Number(saved?.season||item.seasons?.[0]?.season||1);
      if(!item._selectedEpisode)item._selectedEpisode=Number(saved?.episode||1);
      renderDetail(item);
      await ensureSeasonEpisodes(item,item._selectedSeason);
    }
    await ensureTmdbImdbId(item);
    // Warm subtitle metadata while the user is still reading the details screen.
    prefetchSubtitleMetadata(item,null,Number(item._selectedSeason||1),Number(item._selectedEpisode||1));
    if($(`[data-modal-id="${CSS.escape(id)}"]`)) renderDetail(item);
    if(streamAddons().length && !item._streamQueried && item.type==='movie') loadSourcesForModal(id);
  }
}

function playbackVideoId(item,season,episode){
  const base=item.imdbId||''; return item.type==='series'?`${base}:${season||1}:${episode||1}`:base;
}
function playerProgressKey(item,season,episode){ return item.type==='series'?`${item.id}:s${season||1}e${episode||1}`:item.id; }
async function smartPlay(id,manual=false){
  const item=itemById(id);if(!item)return;
  if(manual || !settings.autoplayFirst) return openManualSourcePicker(item);
  toast(t('findingFirst'),item.title);
  const season=Number($('#sourceSeason')?.value||item._selectedSeason||1), episode=Number($('#sourceEpisode')?.value||item._selectedEpisode||1);
  if(!item.streams?.some(s=>s.playable)) await resolveStremioStreams(item,season,episode);
  const idx=bestPlayableStreamIndex(item);
  if(idx<0)return toast(t('noPlayableSource'),item.title);
  prefetchSubtitleMetadata(item,item.streams[idx],season,episode);
  openPlayer(item.id,idx,{season,episode});
}
async function openManualSourcePicker(item){
  const season=Number($('#sourceSeason')?.value||item._selectedSeason||1), episode=Number($('#sourceEpisode')?.value||item._selectedEpisode||1);
  if(!item.streams?.length) await resolveStremioStreams(item,season,episode);
  const playable=(item.streams||[]).map((s,i)=>({s,i})).filter(x=>x.s.playable&&x.s.url);
  if(!playable.length)return toast(t('noPlayableSource'),item.title);
  $('#modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal source-picker" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal>✕</button><div class="picker-head"><div class="eyebrow">${t('playManually')}</div><h2>${esc(item.title)}</h2><p>${t('chooseSource')}</p></div><div class="stream-list manual-list">${playable.map(({s,i})=>streamRow(s,i,item)).join('')}</div></div></div>`;
}

function encodeNativePayload(value){
  const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function probeNativePlayer(){nativePlayerAvailable=true;try{mediaEngineStatus=await mediaApi('/api/status',{},2500);}catch{}return true;}
async function launchExternalPlayer(item,stream,season,episode){
  try{
    if(window.MiFlixAndroid?.openExternal&&stream?.url){window.MiFlixAndroid.openExternal(stream.url,item?.title||'MiFlix');toast(t('openExternal'),item?.title||'MiFlix');return true;}
    let subtitles=[];try{subtitles=await resolveAddonSubtitles(item,stream,season,episode);}catch{}
    const body={player:settings.externalPlayer||'mpv',url:stream.url,season,episode,fullscreen:settings.autoFullscreen,audio:settings.preferredAudio||'',subtitle:settings.preferredSubtitle||'',title:item.title||'MiFlix',subtitles:(subtitles||[]).filter(x=>x?.url).slice(0,20).map(x=>({url:x.url,lang:x.lang||'',label:x.label||''}))};
    const href=`miflix://play/${encodeNativePayload(body)}`;const a=document.createElement('a');a.href=href;a.style.display='none';a.setAttribute('aria-hidden','true');document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),500);
    toast(t('openExternal'),`${item.title} · ${(settings.externalPlayer||'mpv').toUpperCase()}`);return true;
  }catch(err){toast(t('nativeHostMissing'),err?.message||'');return false;}
}
async function mediaApi(path,params={},timeout=12000){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);const q=new URLSearchParams();
  Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')q.set(k,String(v));});
  try{const res=await fetch(`${LOCAL_MEDIA_API}${path}${q.toString()?`?${q}`:''}`,{cache:'no-store',signal:controller.signal});if(!res.ok)throw new Error(`HTTP ${res.status}`);const type=res.headers.get('content-type')||'';return type.includes('application/json')?await res.json():await res.text();}finally{clearTimeout(timer);}
}
async function getMediaEngineStatus(force=false){if(mediaEngineStatus&&!force)return mediaEngineStatus;try{mediaEngineStatus=await mediaApi('/api/status',{},2500);}catch{mediaEngineStatus={ok:false,ffmpeg:false,ffprobe:false};}return mediaEngineStatus;}
function normalizedLanguage(code=''){const x=String(code||'').toLowerCase();const map={spa:'es',esl:'es',eng:'en',jpn:'ja',por:'pt',fra:'fr',fre:'fr',deu:'de',ger:'de',ita:'it',kor:'ko',zho:'zh',chi:'zh'};return map[x]||x.split('-')[0];}
function languageMatches(code,pref){if(!code||!pref)return false;return normalizedLanguage(code)===normalizedLanguage(pref);}
function fmtClock(seconds){const s=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`:`${m}:${String(ss).padStart(2,'0')}`;}
function srtToVtt(text){let x=String(text||'').replace(/^\uFEFF/,'').replace(/\r+/g,'').trim();x=x.replace(/^(\d+)\n(?=\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->)/gm,'');x=x.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2');return 'WEBVTT\n\n'+x+'\n';}
async function subtitleBlobUrl(sub){
  if(!sub?.url)return '';
  if(subtitleBlobCache.has(sub.url))return subtitleBlobCache.get(sub.url);
  const task=(async()=>{
    const fetchText=async(url,ms=4500)=>{const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);try{const res=await fetch(url,{cache:'no-store',signal:c.signal});if(!res.ok)throw new Error(`HTTP ${res.status}`);return await res.text();}finally{clearTimeout(timer);}};
    try{
      const status=await getMediaEngineStatus();
      if(status?.ok){const text=await fetchText(`${LOCAL_MEDIA_API}/api/subtitle?url=${encodeURIComponent(sub.url)}`,4500);return URL.createObjectURL(new Blob([text],{type:'text/vtt'}));}
    }catch{}
    try{const text=await fetchText(sub.url,4500);const vtt=/^WEBVTT/i.test(text.trim())?text:srtToVtt(text);return URL.createObjectURL(new Blob([vtt],{type:'text/vtt'}));}catch{return '';}
  })();
  subtitleBlobCache.set(sub.url,task);
  const result=await task;if(!result)subtitleBlobCache.delete(sub.url);return result;
}
async function subtitleTextVtt(sub){
  if(!sub?.url)return '';
  if(subtitleTextCache.has(sub.url))return subtitleTextCache.get(sub.url);
  const task=(async()=>{
    const fetchText=async(url,ms=5500)=>{const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);try{const res=await fetch(url,{cache:'no-store',signal:c.signal});if(!res.ok)throw new Error(`HTTP ${res.status}`);return await res.text();}finally{clearTimeout(timer);}};
    try{const status=await getMediaEngineStatus();if(status?.ok){const text=await fetchText(`${LOCAL_MEDIA_API}/api/subtitle?url=${encodeURIComponent(sub.url)}`,5500);return /^WEBVTT/i.test(text.trim())?text:srtToVtt(text);}}catch{}
    try{const text=await fetchText(sub.url,5500);return /^WEBVTT/i.test(text.trim())?text:srtToVtt(text);}catch{return '';}
  })();
  subtitleTextCache.set(sub.url,task);const result=await task;if(!result)subtitleTextCache.delete(sub.url);return result;
}
function parseVttTimestamp(value=''){
  const p=String(value).trim().replace(',', '.').split(':').map(Number);if(p.some(x=>!Number.isFinite(x)))return NaN;
  if(p.length===3)return p[0]*3600+p[1]*60+p[2];if(p.length===2)return p[0]*60+p[1];return p[0]||0;
}
function subtitlePlainText(value=''){
  const div=document.createElement('div');div.innerHTML=String(value).replace(/<br\s*\/?>/gi,'\n').replace(/<\/?(c(?:\.[^>]*)?|v|lang|ruby|rt)[^>]*>/gi,'');
  return (div.textContent||'').replace(/\u200b/g,'').trim();
}
function parseVttCues(text=''){
  const lines=String(text||'').replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n'),cues=[];let i=0;
  while(i<lines.length){let line=lines[i].trim();if(!line||/^WEBVTT/i.test(line)||/^NOTE(?:\s|$)/i.test(line)){i++;continue;}
    if(!line.includes('-->')&&i+1<lines.length&&lines[i+1].includes('-->')){i++;line=lines[i].trim();}
    if(!line.includes('-->')){i++;continue;}
    const [a,braw]=line.split('-->'),b=(braw||'').trim().split(/\s+/)[0],start=parseVttTimestamp(a),end=parseVttTimestamp(b);i++;const body=[];
    while(i<lines.length&&lines[i].trim()!==''){body.push(lines[i]);i++;}
    const cue=subtitlePlainText(body.join('\n'));if(Number.isFinite(start)&&Number.isFinite(end)&&end>=start&&cue)cues.push({start,end,text:cue});
  }
  return cues;
}
function renderSubtitleOverlay(ctx,time=playerAbsoluteTime()){
  const el=$('#subtitleOverlay');if(!el)return;const choice=ctx?.activeSubtitleChoice;
  if(!choice?.cues?.length){el.textContent='';el.hidden=true;return;}
  const visible=[];for(const cue of choice.cues){if(cue.start>time+.25)break;if(time>=cue.start-.08&&time<=cue.end+.08)visible.push(cue.text);}
  const text=visible.join('\n');if(el.textContent!==text)el.textContent=text;el.hidden=!text;
}
function clearSubtitleOverlay(){const el=$('#subtitleOverlay');if(el){el.textContent='';el.hidden=true;}}

function subtitleAddons(){const all=[...BUILTIN_ADDONS,...installedAddons];const map=new Map();all.filter(a=>a.protocol==='stremio'&&(a.resources||[]).some(r=>(typeof r==='string'?r:r?.name)==='subtitles')).forEach(a=>map.set(a.id,a));return [...map.values()];}
function addonPathId(value=''){return encodeURIComponent(String(value||'')).replace(/%3A/gi,':');}
async function querySubtitleAddon(a,type,videoId,h={}){
  const base=(a.baseUrl||addonBaseFromManifest(a.source||'')).replace(/\/$/,'');if(!base)return [];
  const extra=[];if(h.videoHash)extra.push(`videoHash=${encodeURIComponent(h.videoHash)}`);if(h.videoSize)extra.push(`videoSize=${encodeURIComponent(h.videoSize)}`);if(h.filename)extra.push(`filename=${encodeURIComponent(h.filename)}`);
  const candidates=[],id=addonPathId(videoId);
  if(extra.length)candidates.push(`${base}/subtitles/${type}/${id}/${extra.join('&')}.json`);
  candidates.push(`${base}/subtitles/${type}/${id}.json`);
  if(h.videoHash){let legacy=`videoID=${encodeURIComponent(videoId)}`;if(h.videoSize)legacy+=`&videoSize=${encodeURIComponent(h.videoSize)}`;if(h.filename)legacy+=`&filename=${encodeURIComponent(h.filename)}`;candidates.push(`${base}/subtitles/${type}/${addonPathId(h.videoHash)}/${legacy}.json`);}
  // Query compatible routes in parallel. A slow provider can no longer block CC for 10-40s.
  const settled=await Promise.allSettled([...new Set(candidates)].map(url=>fetchJsonTimeout(url,3200)));
  const rows=[];for(const r of settled){if(r.status==='fulfilled'&&Array.isArray(r.value?.subtitles))rows.push(...r.value.subtitles.map(x=>({...x,sourceAddon:x.sourceAddon||a.name||a.id})));}
  return mergeSubtitleRows(rows);
}
async function resolveAddonSubtitles(item,stream,season=1,episode=1,force=false){
  const direct=(stream?.subtitles||[]).filter(x=>x?.url),imdb=await ensureTmdbImdbId(item);if(!imdb)return direct;
  const key=subtitleCacheKey(item,season,episode),cached=!force?readSubtitleCache(key):null;
  if(cached)return mergeSubtitleRows(direct,cached);
  if(subtitlePrefetchInFlight.has(key))return mergeSubtitleRows(direct,await subtitlePrefetchInFlight.get(key));
  const task=(async()=>{
    const addons=subtitleAddons(),type=item.type==='series'?'series':'movie',videoId=item.type==='series'?`${imdb}:${season||1}:${episode||1}`:imdb,h={...(stream?.behaviorHints||{})};if(!h.filename&&stream?.name)h.filename=stream.name;
    const settled=await Promise.allSettled(addons.map(a=>querySubtitleAddon(a,type,videoId,h)));
    const rows=mergeSubtitleRows(...settled.filter(x=>x.status==='fulfilled').map(x=>x.value));
    writeSubtitleCache(key,rows);return rows;
  })();
  subtitlePrefetchInFlight.set(key,task);
  try{return mergeSubtitleRows(direct,await task);}finally{subtitlePrefetchInFlight.delete(key);}
}
function prefetchSubtitleMetadata(item,stream=null,season=1,episode=1){
  if(!item)return Promise.resolve([]);
  return resolveAddonSubtitles(item,stream,season,episode).catch(()=>[]);
}
function prefetchNextEpisodeSubtitles(ctx){
  if(!ctx?.item||ctx.item.type!=='series')return;const next=nextEpisodeNumbers(ctx.item,ctx.season,ctx.episode);
  setTimeout(()=>prefetchSubtitleMetadata(ctx.item,null,next.season,next.episode),900);
}
function playerAbsoluteTime(video=$('#videoPlayer')){if(!video)return 0;const ctx=activePlayerContext||{};return Math.max(0,(ctx.bridge?Number(ctx.baseOffset||0):0)+Number(video.currentTime||0));}
function playerTotalDuration(video=$('#videoPlayer')){const d=Number(activePlayerContext?.mediaDuration||0);if(d>0&&isFinite(d))return d;const vd=Number(video?.duration||0);return vd>0&&isFinite(vd)?vd:0;}
function setPlayerLoading(show,text=''){const el=$('#playerLoading');if(!el)return;el.hidden=!show;const copy=el.querySelector('span');if(copy)copy.textContent=text||t('preparingPlayback');}
function showPlayerControls(){const shell=$('.player-shell');if(!shell)return;shell.classList.remove('controls-hidden');clearTimeout(playerControlsTimer);const video=$('#videoPlayer');if(video&&!video.paused)playerControlsTimer=setTimeout(()=>shell.classList.add('controls-hidden'),3200);}
function hidePlayerMenus(){$$('.player-popover').forEach(x=>x.hidden=true);}
function togglePlayerMenu(id){const el=$(id);if(!el)return;const willOpen=el.hidden;hidePlayerMenus();el.hidden=!willOpen;showPlayerControls();}
function updatePlayerChrome(){
  const video=$('#videoPlayer');if(!video)return;const current=playerAbsoluteTime(video),total=playerTotalDuration(video),time=$('#playerTime');if(time)time.textContent=`${fmtClock(current)} / ${fmtClock(total)}`;
  const seek=$('#playerSeek');if(seek&&total>0){seek.max=String(total);if(document.activeElement!==seek)seek.value=String(Math.min(total,current));seek.style.setProperty('--seek-progress',`${Math.max(0,Math.min(100,(current/total)*100))}%`);}
  const play=$('#playerPlayToggle');if(play)play.textContent=video.paused?'▶':'❚❚';const vol=$('#playerVolumeToggle');if(vol)vol.textContent=video.muted||video.volume===0?'🔇':video.volume<.5?'🔉':'🔊';
}
async function probeBuiltInStream(ctx){
  if(ctx.probe||!ctx.stream?.url)return ctx.probe||null;const status=await getMediaEngineStatus();if(!status?.ffprobe)return null;
  try{ctx.probe=await mediaApi('/api/probe',{url:ctx.stream.url},18000);const dur=Number(ctx.probe?.format?.duration||0);if(dur>0)ctx.mediaDuration=dur;ctx.audioStreams=(ctx.probe?.streams||[]).filter(x=>x.codec_type==='audio');ctx.subtitleStreams=(ctx.probe?.streams||[]).filter(x=>x.codec_type==='subtitle');return ctx.probe;}catch{return null;}
}
function preferredAudioIndex(ctx){const list=ctx.audioStreams||[];if(!list.length)return '';if(ctx.selectedAudioIndex!==undefined&&ctx.selectedAudioIndex!=='')return ctx.selectedAudioIndex;const pref=settings.preferredAudio||'',match=pref?list.find(x=>languageMatches(x.tags?.language,pref)):null;return (match||list[0])?.index ?? '';}
async function restartBuiltInBridge(ctx,seek=0,videoMode='copy',audioIndex){
  const video=$('#videoPlayer');if(!video||!ctx?.stream?.url)return false;setPlayerLoading(true,t('preparingPlayback'));
  try{const index=(audioIndex!==undefined&&audioIndex!=='')?audioIndex:preferredAudioIndex(ctx),data=await mediaApi('/api/media/start',{url:ctx.stream.url,seek:+seek||0,audioIndex:index,mode:videoMode},18000);ctx.bridge=true;ctx.baseOffset=+seek||0;ctx.videoMode=videoMode;ctx.selectedAudioIndex=index;video.removeAttribute('src');video.load();video.src=data.url;video.load();const p=video.play();if(p?.catch)p.catch(()=>showPlayerStartOverlay(true));return true;}catch(err){setPlayerLoading(false);return false;}
}
function updateSubtitleButton(ctx,loading=false){
  const b=$('#playerSubtitleButton');if(!b)return;const count=(ctx?.subtitleChoices||[]).filter(x=>!x.failed).length;
  b.textContent=loading?`CC •`:(count?`CC ${count}`:'CC');b.title=loading?t('subtitleLoading'):(count?`${count} ${t('subtitles')}`:t('subtitleNone'));
}
function createSubtitleTrack(ctx,choice,src){
  // Kept as a compatibility hook for older cached sessions. V1.9.4 renders
  // subtitles itself so Edge text-track quirks cannot hide valid captions.
  choice.src=src;return null;
}
async function loadSubtitleChoice(ctx,choice){
  if(!choice||choice.failed)return false;if(choice.cues?.length)return true;if(choice.loading&&choice.loadPromise)return choice.loadPromise;
  choice.loading=true;refreshBuiltInMenus(ctx);
  choice.loadPromise=(async()=>{
    try{
      let text='';
      if(choice.kind==='embedded'){
        const status=await getMediaEngineStatus();if(!status?.ffmpeg)throw new Error('FFmpeg unavailable');
        const c=new AbortController(),timer=setTimeout(()=>c.abort(),7000);
        try{const res=await fetch(`${LOCAL_MEDIA_API}/api/subtitle/extract?url=${encodeURIComponent(ctx.stream.url)}&index=${encodeURIComponent(choice.streamIndex)}`,{cache:'no-store',signal:c.signal});if(!res.ok)throw new Error(`HTTP ${res.status}`);text=await res.text();}finally{clearTimeout(timer);}
      }else text=await subtitleTextVtt(choice.raw);
      if(!text)throw new Error('Subtitle unavailable');choice.cues=parseVttCues(/^WEBVTT/i.test(text.trim())?text:srtToVtt(text));if(!choice.cues.length)throw new Error('No subtitle cues');choice.loading=false;return true;
    }catch{choice.loading=false;choice.failed=true;return false;}
    finally{refreshBuiltInMenus(ctx);updateSubtitleButton(ctx,false);}
  })();
  return choice.loadPromise;
}
async function activateSubtitleChoice(ctx,index){
  const choices=(ctx.subtitleChoices||[]).filter(x=>!x.failed);
  choices.forEach(x=>x.selected=false);
  if(index<0){ctx.activeSubtitleChoice=null;clearSubtitleOverlay();refreshBuiltInMenus(ctx);return;}
  const choice=choices[index];if(!choice)return;choice.selected=true;refreshBuiltInMenus(ctx);
  if(!await loadSubtitleChoice(ctx,choice)){choice.selected=false;ctx.activeSubtitleChoice=null;clearSubtitleOverlay();refreshBuiltInMenus(ctx);return;}
  ctx.activeSubtitleChoice=choice;renderSubtitleOverlay(ctx);
}

function appendEmbeddedSubtitleChoices(ctx){
  if(!ctx)return;ctx.subtitleChoices=ctx.subtitleChoices||[];
  for(const sub of (ctx.subtitleStreams||[]).filter(x=>x.index!==undefined)){
    if(ctx.subtitleChoices.some(x=>x.kind==='embedded'&&String(x.streamIndex)===String(sub.index)))continue;
    ctx.subtitleChoices.push({kind:'embedded',streamIndex:sub.index,label:sub.tags?.title||sub.tags?.language||`Embedded ${sub.index}`,lang:sub.tags?.language||'und',source:'embedded',failed:false,loading:false,selected:false});
  }
  refreshBuiltInMenus(ctx);updateSubtitleButton(ctx,false);
}
async function setupBuiltinSubtitles(ctx){
  const video=$('#videoPlayer');if(!video)return;[...video.querySelectorAll('track')].forEach(x=>x.remove());ctx.subtitleChoices=[];
  const menu=$('#subtitleMenu');if(menu)menu.innerHTML=`<div class="player-menu-empty">${t('subtitleLoading')}</div>`;updateSubtitleButton(ctx,true);
  let external=[];try{external=await resolveAddonSubtitles(ctx.item,ctx.stream,ctx.season,ctx.episode);}catch{}ctx.externalSubtitles=external;
  ctx.subtitleChoices=external.slice(0,40).map(sub=>({kind:'external',raw:sub,label:sub.label||sub.lang||'OpenSubtitles',lang:sub.lang||'und',source:sub.sourceAddon||'addon',failed:false,loading:false,selected:false}));
  appendEmbeddedSubtitleChoices(ctx);
  refreshBuiltInMenus(ctx);updateSubtitleButton(ctx,false);
  // Only the preferred track is downloaded/extracted up front. All other subtitle
  // files load on demand when selected, so opening CC is immediate.
  const pref=settings.preferredSubtitle||'';const preferredIndex=pref?ctx.subtitleChoices.findIndex(x=>languageMatches(x.lang,pref)):-1;
  if(preferredIndex>=0)activateSubtitleChoice(ctx,preferredIndex).catch(()=>{});
}
function applyPreferredSubtitle(ctx){
  const choices=(ctx.subtitleChoices||[]).filter(x=>!x.failed),pref=settings.preferredSubtitle||'';if(!pref||!choices.length)return;
  const idx=choices.findIndex(x=>languageMatches(x.lang,pref));if(idx>=0&&!choices.some(x=>x.selected))activateSubtitleChoice(ctx,idx).catch(()=>{});
}
function refreshBuiltInMenus(ctx){
  const audio=$('#audioMenu'),subs=$('#subtitleMenu');if(!audio||!subs)return;const audios=ctx.audioStreams||[];
  audio.innerHTML=audios.length?audios.map((a,i)=>{const lang=a.tags?.language||'',title=a.tags?.title||'',name=title||lang||`${t('audioTracks')} ${i+1}`,active=String(a.index)===String(ctx.selectedAudioIndex??preferredAudioIndex(ctx));return `<button class="player-menu-item ${active?'active':''}" data-audio-stream="${a.index}"><span>${esc(name)}</span><small>${esc(a.codec_name||'')}</small></button>`;}).join(''):`<div class="player-menu-empty">${t('noExtraAudio')}</div>`;
  const choices=(ctx.subtitleChoices||[]).filter(x=>!x.failed),active=choices.findIndex(x=>x.selected);
  subs.innerHTML=`<button class="player-menu-item ${active<0?'active':''}" data-sub-choice="-1"><span>${t('off')}</span></button>`+choices.map((x,i)=>`<button class="player-menu-item ${i===active?'active':''}" data-sub-choice="${i}"><span>${esc(x.label||x.lang||`${t('subtitles')} ${i+1}`)}</span><small>${x.loading?'… ':''}${esc(x.lang||'')} ${x.source==='embedded'?'· embedded':''}</small></button>`).join('');
  $$('[data-audio-stream]').forEach(b=>b.onclick=async()=>{const pos=playerAbsoluteTime();ctx.selectedAudioIndex=+b.dataset.audioStream;toast(t('switchingAudio'),b.textContent.trim());await restartBuiltInBridge(ctx,pos,ctx.videoMode||'copy',ctx.selectedAudioIndex);refreshBuiltInMenus(ctx);hidePlayerMenus();});
  $$('[data-sub-choice]').forEach(b=>b.onclick=async()=>{await activateSubtitleChoice(ctx,+b.dataset.subChoice);hidePlayerMenus();});
}
function guessedInitialVideoMode(ctx){
  const text=[ctx?.stream?.name,ctx?.stream?.title,ctx?.stream?.description,ctx?.stream?.quality].filter(Boolean).join(' ').toLowerCase();
  return /(hevc|h\.?265|x265|av1|dolby\s*vision|dv\b)/i.test(text)?'transcode':'copy';
}
async function startBuiltinPlayback(ctx){
  const video=$('#videoPlayer');if(!video||!ctx?.stream?.url)return;const key=playerProgressKey(ctx.item,ctx.season,ctx.episode),saved=progress[key]||progress[ctx.item.id],resume=(saved?.position&&Number(saved.percent||0)<95)?Number(saved.position):0;
  // Keep controls responsive immediately, but resolve stream/audio metadata BEFORE opening
  // the FFmpeg bridge. V1.9.1 started the bridge before audio discovery, which could
  // leave some TorBox files playing video with no selected audio track.
  trackVideo(ctx.item,ctx.stream,ctx.season,ctx.episode);bindBuiltinPlayerControls(ctx);
  video.muted=false;video.volume=1;
  // Subtitle metadata begins loading with playback, not when the CC button is opened.
  // Expose external subtitle choices in parallel with ffprobe/audio detection.
  const subtitleSetupPromise=setupBuiltinSubtitles(ctx).catch(()=>{});
  prefetchNextEpisodeSubtitles(ctx);
  const statusPromise=getMediaEngineStatus();
  const probePromise=probeBuiltInStream(ctx);
  const [status]=await Promise.all([statusPromise,probePromise]);
  appendEmbeddedSubtitleChoices(ctx);
  if(activePlayerContext!==ctx)return;
  let started=false;const vstream=(ctx.probe?.streams||[]).find(x=>x.codec_type==='video')||{},vcodec=String(vstream.codec_name||'').toLowerCase(),pix=String(vstream.pix_fmt||'').toLowerCase();
  const firstMode=(vcodec==='h264'&&(!pix||pix==='yuv420p'||pix==='yuvj420p'))?'copy':'transcode';
  const initialAudio=preferredAudioIndex(ctx);
  if(status?.ffmpeg)started=await restartBuiltInBridge(ctx,resume,firstMode,initialAudio);
  if(!started){ctx.bridge=false;ctx.baseOffset=0;ctx.mediaDuration=0;video.src=ctx.stream.url;video.load();video.addEventListener('loadedmetadata',()=>{video.muted=false;video.volume=1;if(resume&&resume<video.duration*.95)video.currentTime=resume;},{once:true});const p=video.play();if(p?.catch)p.catch(()=>showPlayerStartOverlay(true));if(!status?.ffmpeg)toast('MiFlix',t('mediaEngineMissing'));}
  refreshBuiltInMenus(ctx);subtitleSetupPromise.then(()=>appendEmbeddedSubtitleChoices(ctx)).catch(()=>{});
  if(started)setTimeout(async()=>{if(activePlayerContext!==ctx||!ctx.bridge)return;if(video.currentTime<.15&&video.readyState<3){if(ctx.videoMode==='copy'&&!ctx.triedTranscode){ctx.triedTranscode=true;await restartBuiltInBridge(ctx,resume,'transcode',ctx.selectedAudioIndex);}else{setPlayerLoading(false);showPlayerStartOverlay(true);}}},6500);
}
async function seekPlayerTo(seconds,immediate=false){
  const ctx=activePlayerContext,video=$('#videoPlayer');if(!ctx||!video)return;const total=playerTotalDuration(video),target=Math.max(0,Math.min(total||Number.MAX_SAFE_INTEGER,Number(seconds)||0));
  if(!ctx.bridge){try{video.currentTime=target;}catch{}updatePlayerChrome();renderSubtitleOverlay(ctx,target);partySendPlaybackState('seek',true);return;}
  ctx.pendingSeekTarget=target;const seek=$('#playerSeek'),time=$('#playerTime');if(seek)seek.value=String(target);if(time)time.textContent=`${fmtClock(target)} / ${fmtClock(total)}`;renderSubtitleOverlay(ctx,target);
  clearTimeout(ctx.seekTimer);const run=async()=>{const wanted=ctx.pendingSeekTarget;ctx.pendingSeekTarget=null;const wasPaused=video.paused;setPlayerLoading(true,t('playbackStarting'));await restartBuiltInBridge(ctx,wanted,ctx.videoMode||'copy',ctx.selectedAudioIndex);if(wasPaused){try{video.pause();}catch{}}updatePlayerChrome();renderSubtitleOverlay(ctx,wanted);partySendPlaybackState('seek',true);};
  if(immediate)await run();else ctx.seekTimer=setTimeout(run,140);
}
function seekPlayerBy(delta){const ctx=activePlayerContext,video=$('#videoPlayer');if(!ctx||!video)return;const base=ctx.pendingSeekTarget??playerAbsoluteTime(video);seekPlayerTo(base+Number(delta||0));}
function showPlayerStartOverlay(show){const el=$('#playerStartOverlay');if(!el)return;el.hidden=!show;if(show)el.onclick=()=>{const v=$('#videoPlayer');if(v){const p=v.play();if(p?.then)p.then(()=>showPlayerStartOverlay(false)).catch(()=>{});}};}
function bindBuiltinPlayerControls(ctx){
  const video=$('#videoPlayer');if(!video)return;const shell=$('.player-shell'),seek=$('#playerSeek');
  let bufferingTimer=null,lastTime=-1,lastAdvanceAt=Date.now();
  const clearBuffering=()=>{clearTimeout(bufferingTimer);bufferingTimer=null;setPlayerLoading(false);};
  const delayedBuffering=()=>{clearTimeout(bufferingTimer);bufferingTimer=setTimeout(()=>{if(!video.paused&&Date.now()-lastAdvanceAt>450)setPlayerLoading(true,t('playbackStarting'));},550);};
  video.addEventListener('play',()=>{showPlayerStartOverlay(false);updatePlayerChrome();showPlayerControls();partySendPlaybackState('play');});
  video.addEventListener('playing',()=>{video.muted=false;if(video.volume===0)video.volume=1;lastAdvanceAt=Date.now();clearBuffering();showPlayerStartOverlay(false);});
  video.addEventListener('canplay',()=>{video.muted=false;if(video.volume===0)video.volume=1;clearBuffering();if(video.paused){const p=video.play();if(p?.catch)p.catch(()=>showPlayerStartOverlay(true));}});
  video.addEventListener('pause',()=>{clearTimeout(bufferingTimer);updatePlayerChrome();showPlayerControls();partySendPlaybackState('pause');});
  video.addEventListener('waiting',delayedBuffering);video.addEventListener('stalled',delayedBuffering);
  video.addEventListener('volumechange',updatePlayerChrome);
  video.addEventListener('timeupdate',()=>{const now=playerAbsoluteTime(video);if(now>lastTime+.03){lastAdvanceAt=Date.now();lastTime=now;clearBuffering();}updatePlayerChrome();renderSubtitleOverlay(ctx,now);partySendPlaybackState('tick');});
  video.addEventListener('durationchange',updatePlayerChrome);video.addEventListener('click',()=>{video.paused?video.play():video.pause();showPlayerControls();});video.addEventListener('dblclick',()=>togglePlayerFullscreen());
  shell?.addEventListener('mousemove',showPlayerControls);shell?.addEventListener('pointerdown',showPlayerControls);
  $('#playerPlayToggle').onclick=()=>video.paused?video.play():video.pause();$('#playerBack10').onclick=()=>seekPlayerBy(-10);$('#playerForward10').onclick=()=>seekPlayerBy(10);$('#playerVolumeToggle').onclick=()=>{video.muted=!video.muted;updatePlayerChrome();};
  $('#playerAudioButton').onclick=()=>togglePlayerMenu('#audioMenu');$('#playerSubtitleButton').onclick=()=>togglePlayerMenu('#subtitleMenu');$('#playerOptionsButton').onclick=()=>togglePlayerMenu('#playerOptionsMenu');$('#playerFullscreenButton').onclick=togglePlayerFullscreen;$('#playerExternalButton').onclick=()=>launchExternalPlayer(ctx.item,ctx.stream,ctx.season,ctx.episode);
  if(seek){seek.oninput=()=>{const time=$('#playerTime');if(time)time.textContent=`${fmtClock(+seek.value)} / ${fmtClock(playerTotalDuration(video))}`;};seek.onchange=()=>seekPlayerTo(+seek.value,true);}
  $$('#playerOptionsMenu [data-speed]').forEach(b=>b.onclick=()=>{video.playbackRate=+b.dataset.speed||1;$$('#playerOptionsMenu [data-speed]').forEach(x=>x.classList.toggle('active',x===b));hidePlayerMenus();});
  const keyHandler=e=>{if(!$('#videoPlayer'))return;if(e.key===' '){e.preventDefault();video.paused?video.play():video.pause();}else if(e.key==='ArrowLeft'){e.preventDefault();seekPlayerBy(-10);}else if(e.key==='ArrowRight'){e.preventDefault();seekPlayerBy(10);}else if(e.key.toLowerCase()==='f'){e.preventDefault();togglePlayerFullscreen();}else if(e.key.toLowerCase()==='m'){e.preventDefault();video.muted=!video.muted;}};
  ctx.keyHandler=keyHandler;document.addEventListener('keydown',keyHandler);updatePlayerChrome();showPlayerControls();
}
function togglePlayerFullscreen(){const shell=$('.player-shell');if(!shell)return;if(document.fullscreenElement){const p=document.exitFullscreen?.();if(p?.catch)p.catch(()=>{});}else{const p=shell.requestFullscreen?.();if(p?.catch)p.catch(()=>{});}}
function closePlayerModal(){partySendPlaybackState('pause',true);const ctx=activePlayerContext;if(ctx?.keyHandler)document.removeEventListener('keydown',ctx.keyHandler);clearTimeout(playerControlsTimer);if(ctx?.seekTimer)clearTimeout(ctx.seekTimer);if(ctx?.bridge)mediaApi('/api/media/stop',{},1800).catch(()=>{});activePlayerContext=null;$('#modalRoot').innerHTML='';if(document.fullscreenElement){const p=document.exitFullscreen?.();if(p?.catch)p.catch(()=>{});}restoreAmbient();}
function openPlayer(id,streamIndex,context={}){
  stopAllPreviews();const item=itemById(id);if(!item)return;const stream=Number.isInteger(streamIndex)?item.streams?.[streamIndex]:null,season=Number(context.season||item._selectedSeason||1),episode=Number(context.episode||item._selectedEpisode||1);
  activePlayerContext={item,stream,streamIndex,season,episode,bridge:false,baseOffset:0,mediaDuration:0,audioStreams:[],subtitleStreams:[],selectedAudioIndex:'',nativeAndroid:false,activeSubtitleChoice:null,pendingSeekTarget:null,seekTimer:null};
  if(stream?.url&&!context.fromParty)partyBroadcastContent(item,season,episode);
  if(stream?.url&&window.MiFlixAndroid?.play){const ctx=activePlayerContext;ctx.nativeAndroid=true;(async()=>{let subtitles=[];try{subtitles=await resolveAddonSubtitles(item,stream,season,episode);}catch{}const saved=progress[playerProgressKey(item,season,episode)]||progress[item.id]||{};const payload={url:stream.url,title:item.title||'MiFlix',season,episode,position:Number(saved.position||0),preferredAudio:settings.preferredAudio||'',preferredSubtitle:settings.preferredSubtitle||'',subtitles:(subtitles||[]).filter(x=>x?.url).slice(0,30).map(x=>({url:x.url,lang:x.lang||'',label:x.label||''}))};window.MiFlixAndroid.play(JSON.stringify(payload));toast(t('nativeAndroidPlayer'),item.title);})();return;}
  if(stream?.url&&settings.playerEngine==='external'&&!partySession){launchExternalPlayer(item,stream,season,episode);return;}if(stream?.url&&settings.playerEngine==='external'&&partySession)toast(t('watchParty'),t('builtInPlayer'));
  $('#modalRoot').innerHTML=`<div class="modal-backdrop player-backdrop"><div class="player-shell nuvio-player" role="dialog" aria-modal="true">
    <div class="player-wrap">${stream?.url?`<video id="videoPlayer" autoplay playsinline preload="auto"></video>`:`<div class="player-empty"><div class="big">▶</div><h3>${t('playerTitle')}</h3><p>${t('pasteDirect')}</p><div class="install-row" style="width:min(620px,75vw)"><input id="manualStream" class="addon-input" placeholder="https://.../video.mp4"><button class="btn primary" id="loadManualStream">${t('load')}</button></div></div>`}</div>
    <div id="playerLoading" class="player-loading"><div class="source-spinner"></div><span>${t('preparingPlayback')}</span></div><div id="subtitleOverlay" class="player-subtitle-overlay" hidden></div><button id="playerStartOverlay" class="player-start-overlay" hidden><span>▶</span><b>${t('clickToStart')}</b></button>
    <div class="player-chrome player-top-chrome"><button class="player-round" data-close-player aria-label="${esc(t('playerBack'))}">←</button></div>
    <div class="player-chrome player-bottom-chrome"><input id="playerSeek" class="player-seek" type="range" min="0" max="100" value="0" step=".25" aria-label="Seek"><div class="player-control-row">
      <div class="player-control-group"><button id="playerPlayToggle" class="player-control primary-control">▶</button><button id="playerBack10" class="player-control rewind-control">↶<small>10</small></button><button id="playerForward10" class="player-control rewind-control">↷<small>10</small></button><button id="playerVolumeToggle" class="player-control">🔊</button><span id="playerTime" class="player-time">0:00 / 0:00</span></div>
      <div class="player-now-playing"><b>${esc(item.title)}</b><span>${item.type==='series'?`S${season} E${episode}`:''}${stream?.sourceAddon?`${item.type==='series'?' · ':''}${esc(stream.sourceAddon)}`:''}</span></div>
      <div class="player-control-group player-control-right"><button id="playerAudioButton" class="player-control text-control">${t('audioTracks')}</button><button id="playerSubtitleButton" class="player-control text-control">CC</button><button id="playerOptionsButton" class="player-control">⋮</button><button id="playerFullscreenButton" class="player-control">⛶</button></div>
    </div></div>
    <div id="audioMenu" class="player-popover player-popover-right" hidden></div><div id="subtitleMenu" class="player-popover player-popover-right" hidden></div>
    <div id="playerOptionsMenu" class="player-popover player-popover-right" hidden><div class="player-menu-title">${t('playerOptions')}</div><div class="player-menu-label">${t('playerSpeed')}</div><div class="player-speed-row"><button class="player-menu-chip" data-speed=".75">0.75×</button><button class="player-menu-chip active" data-speed="1">1×</button><button class="player-menu-chip" data-speed="1.25">1.25×</button><button class="player-menu-chip" data-speed="1.5">1.5×</button></div><button id="playerExternalButton" class="player-menu-item"><span>${t('openExternal')}</span><small>${esc((settings.externalPlayer||'mpv').toUpperCase())}</small></button></div>
    <button id="skipIntroBtn" class="skip-intro-btn" hidden>${t('skipIntroButton')} ›</button><div id="upNext" class="up-next" hidden></div>
  </div></div>`;
  const shell=$('.player-shell'),close=$('[data-close-player]');if(close)close.onclick=closePlayerModal;if(settings.autoFullscreen&&shell?.requestFullscreen){try{const p=shell.requestFullscreen();if(p?.catch)p.catch(()=>{});}catch{}}
  if(stream?.url)setTimeout(()=>startBuiltinPlayback(activePlayerContext),0);else{setPlayerLoading(false);const load=$('#loadManualStream');if(load)load.onclick=()=>{const url=$('#manualStream').value.trim();if(url)openDirectVideo(item,url);};}
}
function openDirectVideo(item,url){item.streams=item.streams||[];item.streams.push({url,sourceAddon:'Manual',quality:'Direct',playable:true});openPlayer(item.id,item.streams.length-1,{season:1,episode:1});}
function trackVideo(item,stream,season=1,episode=1){
  const video=$('#videoPlayer');if(!video)return;const key=playerProgressKey(item,season,episode),showKey=item.id;let lastSaved=-1;
  video.addEventListener('timeupdate',()=>{const current=playerAbsoluteTime(video),total=playerTotalDuration(video);if(total>0&&isFinite(total)){const percent=(current/total)*100,row={percent:+Math.min(100,percent).toFixed(1),position:current,duration:total,updatedAt:Date.now(),season,episode};progress[key]=row;progress[showKey]=row;const sec=Math.floor(current);if(sec%5===0&&sec!==lastSaved){lastSaved=sec;saveProgress();}if(settings.skipIntro&&item.type==='series'){const b=$('#skipIntroBtn');if(b){const show=current>=5&&current<Math.max(settings.introSkipSeconds+15,110);b.hidden=!show;b.onclick=()=>{seekPlayerTo(Math.max(current,settings.introSkipSeconds||90));b.hidden=true;};}}}});
  video.addEventListener('ended',async()=>{progress[key]={percent:100,updatedAt:Date.now(),season,episode};progress[showKey]=progress[key];saveProgress();if(item.type==='series'&&settings.autoplayNext&&(!partySession||partySession.role==='host'))await playNextEpisode(item,stream,season,episode);});
  video.addEventListener('error',async()=>{const ctx=activePlayerContext;if(ctx?.bridge&&ctx.videoMode==='copy'&&!ctx.triedTranscode){ctx.triedTranscode=true;const pos=playerAbsoluteTime(video),ok=await restartBuiltInBridge(ctx,pos,'transcode',ctx.selectedAudioIndex);if(ok)return;}toast('MiFlix Player',t('playerMayFail'));});
}
function nextEpisodeNumbers(item,season,episode){
  const seasons=(item.seasons||[]).filter(x=>x.season>0);const row=seasons.find(x=>Number(x.season)===Number(season));if(row&&episode<(row.episodes||999))return {season,episode:episode+1};const idx=seasons.findIndex(x=>Number(x.season)===Number(season));if(idx>=0&&seasons[idx+1])return {season:seasons[idx+1].season,episode:1};return {season,episode:episode+1};
}
async function playNextEpisode(item,currentStream,season,episode){
  const next=nextEpisodeNumbers(item,season,episode);const up=$('#upNext');if(up){up.hidden=false;up.textContent=`${t('playingNext')} S${next.season} E${next.episode}`;}
  await resolveStremioStreams(item,next.season,next.episode);let idx=-1;const group=currentStream?.behaviorHints?.bingeGroup;if(group)idx=(item.streams||[]).findIndex(s=>s.playable&&s.behaviorHints?.bingeGroup===group);if(idx<0)idx=(item.streams||[]).findIndex(s=>s.playable&&s.url);if(idx>=0)openPlayer(item.id,idx,next);else toast(t('noPlayableSource'),`${item.title} · S${next.season} E${next.episode}`);
}
function normalizePartyBase(base){return String(base||'').trim().replace(/\/+$/,'');}
async function partyFetch(base,path,params={},timeout=7000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout),q=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null)q.set(k,String(v));});
  try{const res=await fetch(`${normalizePartyBase(base)}${path}?${q}`,{cache:'no-store',signal:controller.signal});const data=await res.json().catch(()=>({ok:false,error:`HTTP ${res.status}`}));if(!res.ok||data.ok===false)throw new Error(data.error||`HTTP ${res.status}`);return data;}finally{clearTimeout(timer);}
}
function activeProfileName(){return activeProfile()?.name||t('mainProfile');}
function partyInviteText(){return partySession?.invite||'';}
function copyText(value){if(!value)return;try{navigator.clipboard?.writeText(value);toast(t('copyInvite'),value);}catch{const ta=document.createElement('textarea');ta.value=value;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}}
function renderParty(){
  clearAmbient();
  if(!partySession){
    const relay=esc(settings.watchPartyRelayUrl||'');
    view.innerHTML=`<div class="party-page"><section class="party-hero"><div><div class="eyebrow">WATCH PARTY</div><h2>${t('watchParty')}</h2><p>${t('partyIntro')}</p></div><div class="party-hero-orb">◎</div></section><div class="party-grid"><section class="settings-panel party-panel"><h3>${t('createParty')}</h3><p>${settings.watchPartyRelayUrl?t('partyRemote'):t('partySameNetwork')}</p><button class="btn primary party-main-btn" id="createPartyBtn">＋ ${t('createParty')}</button></section><section class="settings-panel party-panel"><h3>${t('joinParty')}</h3><p>${t('partySameNetwork')}</p><div class="install-row"><input id="partyJoinInput" class="addon-input" placeholder="ABC123  ·  MFXP1|192.168.1.5|ABC123"><button class="btn primary" id="joinPartyBtn">${t('joinParty')}</button></div></section></div><section class="settings-panel party-relay-card"><h3>${t('partyRemote')}</h3><p>${t('partyRelayHelp')}</p><div class="setting"><label>${t('partyRelayUrl')}</label><input class="addon-input" id="partyRelayInline" value="${relay}" placeholder="https://your-worker.workers.dev"></div></section></div>`;
    $('#createPartyBtn').onclick=createPartySession;$('#joinPartyBtn').onclick=()=>joinPartySession($('#partyJoinInput').value);$('#partyJoinInput').onkeydown=e=>{if(e.key==='Enter')joinPartySession(e.target.value);};$('#partyRelayInline').onchange=e=>{settings.watchPartyRelayUrl=normalizePartyBase(e.target.value);saveSettings(false);};return;
  }
  const members=partySession.participants||[],state=partySession.state||{},host=partySession.role==='host',invite=partyInviteText(),qr=(window.MiFlixQRCodeDataUrl?window.MiFlixQRCodeDataUrl(invite):'');
  view.innerHTML=`<div class="party-page"><section class="party-active-card"><div class="party-session-copy"><div class="eyebrow">${t('partyActive')}</div><h2>${esc(state.title||t('partyWaiting'))}</h2><div class="party-code-row"><div><small>${t('partyCode')}</small><strong>${esc(partySession.room)}</strong></div><button class="btn ghost" id="copyPartyCode">${t('copyCode')}</button><button class="btn primary" id="copyPartyInvite">${t('copyInvite')}</button></div><p>${partySession.remote?t('partyRemote'):t('partyLan')} · ${host?t('partyHost'):t('partyGuest')}</p>${host?`<label class="profile-share-toggle compact"><input id="allowGuestControls" type="checkbox" ${partySession.allowGuests!==false?'checked':''}><span><b>${t('allowGuestControls')}</b></span></label>`:''}<button class="btn danger" id="leavePartyBtn">${host?t('endParty'):t('leaveParty')}</button></div><div class="party-qr"><img src="${esc(qr)}" alt="${esc(t('partyQr'))}"><small>${t('partyQr')}</small></div></section><section class="settings-panel party-members"><div class="section-head"><div><h3>${t('partyParticipants')}</h3><p>${members.length}</p></div><span class="connection-pill ok">● ${t('partyActive')}</span></div><div class="party-member-list">${members.map(m=>`<div class="party-member"><span class="profile-card-avatar small">${esc(profileInitial(m.name))}</span><div><b>${esc(m.name)}</b><small>${m.role==='host'?t('partyHost'):t('partyGuest')}</small></div></div>`).join('')||`<p>${t('partyWaiting')}</p>`}</div></section></div>`;
  $('#copyPartyCode').onclick=()=>copyText(partySession.room);$('#copyPartyInvite').onclick=()=>copyText(invite);$('#leavePartyBtn').onclick=leavePartySession;const ag=$('#allowGuestControls');if(ag)ag.onchange=()=>partyUpdate({allowGuests:ag.checked?1:0,event:'permissions'},true);
}
async function createPartySession(){
  try{const relay=normalizePartyBase(settings.watchPartyRelayUrl),base=relay||LOCAL_MEDIA_API,data=relay?await partyFetch(base,'/api/party/create',{name:activeProfileName()}):await mediaApi('/api/party/create',{name:activeProfileName()},7000);const invite=relay?`MFXP2|${encodeURIComponent(relay)}|${data.room}`:(data.invite||`MFXP1|${data.host}|${data.room}`);partySession={room:data.room,token:data.token,role:'host',hostApi:base,remote:!!relay,invite,participants:data.participants||[{name:activeProfileName(),role:'host'}],state:data.state||{},allowGuests:true,lastRevision:data.revision||0};rawStore.set('partySession',partySession);partyLastRevision=partySession.lastRevision||0;toast(t('partyCreated'),partySession.room);renderParty();startPartyPolling();}catch(err){toast(t('partyNeedEngine'),err.message);}
}
function parsePartyInvite(value){const v=String(value||'').trim();if(!v)return null;if(v.startsWith('MFXP1|')){const a=v.split('|');return {room:(a[2]||'').toUpperCase(),base:`http://${a[1]}:19286`,remote:false,invite:v};}if(v.startsWith('MFXP2|')){const a=v.split('|');return {room:(a[2]||'').toUpperCase(),base:decodeURIComponent(a[1]||''),remote:true,invite:v};}const at=v.match(/^([A-Z0-9]{4,8})@([\d.]+)$/i);if(at)return {room:at[1].toUpperCase(),base:`http://${at[2]}:19286`,remote:false,invite:v};return {room:v.toUpperCase(),base:'',remote:false,invite:v};}
async function joinPartySession(value){
  const parsed=parsePartyInvite(value);if(!parsed?.room)return;
  try{let base=parsed.base,remote=parsed.remote;if(!base){const relay=normalizePartyBase(settings.watchPartyRelayUrl);if(relay){base=relay;remote=true;}else if(window.MiFlixAndroid?.discoverParty){const raw=window.MiFlixAndroid.discoverParty(parsed.room);let d={};try{d=typeof raw==='string'?JSON.parse(raw):raw;}catch{}if(!d?.host)throw new Error(d?.error||'Party host not found on LAN');base=`http://${d.host}:19286`;}else{const d=await mediaApi('/api/party/discover',{room:parsed.room},3500);base=`http://${d.host}:19286`;}}
    const data=await partyFetch(base,'/api/party/join',{room:parsed.room,name:activeProfileName()},7000);const invite=parsed.invite.startsWith('MFXP')?parsed.invite:(remote?`MFXP2|${encodeURIComponent(base)}|${parsed.room}`:`MFXP1|${base.replace(/^https?:\/\//,'').replace(/:19286$/,'')}|${parsed.room}`);partySession={room:data.room,token:data.token,role:data.role||'guest',hostApi:base,remote,invite,participants:data.participants||[],state:data.state||{},allowGuests:data.allowGuests!==false,lastRevision:data.revision||0};rawStore.set('partySession',partySession);partyLastRevision=0;toast(t('partyJoined'),data.room);renderParty();startPartyPolling();if(data.state?.mediaId)partyApplyRemoteState(data.state,data.revision,data.origin);
  }catch(err){toast(t('partyNeedEngine'),err.message);}
}
async function leavePartySession(){if(!partySession)return;try{await partyFetch(partySession.hostApi,'/api/party/leave',{room:partySession.room,token:partySession.token},3500);}catch{}clearInterval(partyPollTimer);partyPollTimer=null;partySession=null;rawStore.remove('partySession');partyLastRevision=0;toast(t('partyLeft'),'');renderParty();}
async function partyUpdate(fields={},force=false){if(!partySession||partyApplyingRemote)return null;const now=Date.now();if(!force&&fields.event==='tick'&&now-partyLastSentAt<1800)return null;partyLastSentAt=now;try{const data=await partyFetch(partySession.hostApi,'/api/party/update',{room:partySession.room,token:partySession.token,...fields},4500);partySession.state=data.state||partySession.state;partySession.participants=data.participants||partySession.participants;partySession.allowGuests=data.allowGuests!==false;partySession.lastRevision=data.revision||partySession.lastRevision;rawStore.set('partySession',partySession);return data;}catch{return null;}}
function partySendPlaybackState(event='tick',force=false){if(!partySession||partyApplyingRemote)return;const ctx=activePlayerContext,video=$('#videoPlayer');if(!ctx)return;if(!video&&!ctx.nativeAndroid)return;if(partySession.role!=='host'&&event==='tick')return;if(partySession.role!=='host'&&partySession.allowGuests===false)return;const position=ctx.nativeAndroid?Number(nativePlaybackState.position||0):playerAbsoluteTime(video),playing=ctx.nativeAndroid?(nativePlaybackState.playing?1:0):(video.paused?0:1);partyUpdate({mediaId:ctx.item.id,mediaType:ctx.item.type,tmdbId:ctx.item.tmdbId||'',imdbId:ctx.item.imdbId||'',title:ctx.item.title,season:ctx.season||1,episode:ctx.episode||1,position,playing,event},force);}
function partyBroadcastContent(item,season=1,episode=1){if(!partySession||partyApplyingRemote)return;partyUpdate({mediaId:item.id,mediaType:item.type,tmdbId:item.tmdbId||'',imdbId:item.imdbId||'',title:item.title,season,episode,position:0,playing:1,event:'content'},true);}
async function startPartyPolling(){clearInterval(partyPollTimer);if(!partySession)return;const poll=async()=>{if(!partySession)return;try{const data=await partyFetch(partySession.hostApi,'/api/party/poll',{room:partySession.room,token:partySession.token,last:partyLastRevision},4500);partySession.participants=data.participants||[];partySession.state=data.state||{};partySession.allowGuests=data.allowGuests!==false;partySession.lastRevision=data.revision||0;rawStore.set('partySession',partySession);if(data.revision>partyLastRevision&&data.origin!==partySession.token)await partyApplyRemoteState(data.state,data.revision,data.origin);partyLastRevision=Math.max(partyLastRevision,data.revision||0);if(currentView==='party')renderParty();}catch(err){if(String(err.message).includes('ended')||String(err.message).includes('404')){partySession=null;rawStore.remove('partySession');clearInterval(partyPollTimer);partyPollTimer=null;if(currentView==='party')renderParty();}}};await poll();partyPollTimer=setInterval(poll,900);}
async function ensurePartyItem(state){let item=itemById(state.mediaId);if(item)return item;if(!tmdbAuth.credential)return null;try{let kind=state.mediaType==='series'?'series':'movie',id=Number(state.tmdbId||0);const m=String(state.mediaId||'').match(/^tmdb:(movie|series):(\d+)$/);if(m){kind=m[1];id=+m[2];}if(!id&&state.imdbId){const found=await tmdbFetch(`/find/${encodeURIComponent(state.imdbId)}`,{external_source:'imdb_id'});const row=(found.movie_results||[])[0]||(found.tv_results||[])[0];if(row){kind=(found.movie_results||[])[0]?'movie':'series';id=row.id;}}if(!id)return null;const data=await tmdbFetch(`/${kind==='series'?'tv':'movie'}/${id}`,{});item=mapTmdb({...data,media_type:kind==='series'?'tv':'movie'},kind==='series'?'tv':'movie');if(!item)return null;dynamicCatalog=dedupeTmdb([...dynamicCatalog,item]);await enrichTmdbItem(item,false);return item;}catch{return null;}}
async function partyApplyRemoteState(state,revision,origin){if(!partySession||!state?.mediaId)return;partyLastRevision=Math.max(partyLastRevision,revision||0);const ctx=activePlayerContext,video=$('#videoPlayer');if(!ctx||ctx.item.id!==state.mediaId||Number(ctx.season||1)!==Number(state.season||1)||Number(ctx.episode||1)!==Number(state.episode||1)){
    const item=await ensurePartyItem(state);if(!item)return toast(t('partyNoSource'),state.title||'');partyApplyingRemote=true;try{if(item.provider==='tmdb')await ensureTmdbImdbId(item);item._selectedSeason=Number(state.season||1);item._selectedEpisode=Number(state.episode||1);await resolveStremioStreams(item,item._selectedSeason,item._selectedEpisode);const idx=(item.streams||[]).findIndex(x=>x.playable&&x.url);if(idx<0){toast(t('partyNoSource'),item.title);return;}openPlayer(item.id,idx,{season:item._selectedSeason,episode:item._selectedEpisode,fromParty:true});partyTargetState=state;setTimeout(()=>partyApplyRemoteState(state,revision,origin),1600);}finally{partyApplyingRemote=false;}return;
  }
  const target=Math.max(0,Number(state.position||0)+(state.playing?Math.max(0,(Date.now()-Number(state.updatedAt||Date.now()))/1000):0));if(ctx?.nativeAndroid&&window.MiFlixAndroid?.command){partyApplyingRemote=true;try{const current=Number(nativePlaybackState.position||0);if(Math.abs(current-target)>2.2)window.MiFlixAndroid.command(JSON.stringify({action:'seek',position:target}));window.MiFlixAndroid.command(JSON.stringify({action:state.playing?'play':'pause'}));}finally{setTimeout(()=>{partyApplyingRemote=false;},150);}return;}const current=playerAbsoluteTime(video);partyApplyingRemote=true;try{if(Math.abs(current-target)>2.2)await seekPlayerTo(target);if(state.playing&&video.paused){const p=video.play();if(p?.catch)p.catch(()=>showPlayerStartOverlay(true));}if(!state.playing&&!video.paused)video.pause();}finally{setTimeout(()=>{partyApplyingRemote=false;},150);}
}
function setAmbient(item,animate=true){
  if(!ambientBackdrop||!item?.backdrop)return clearAmbient();clearTimeout(ambientTimer);
  const apply=()=>{ambientBackdrop.style.backgroundImage=`linear-gradient(90deg, rgba(9,9,13,.98) 0%, rgba(9,9,13,.76) 38%, rgba(9,9,13,.22) 72%, rgba(9,9,13,.72) 100%), url("${String(item.backdrop).replace(/"/g,'%22')}")`;ambientBackdrop.classList.add('visible');};
  if(animate){ambientBackdrop.classList.remove('visible');ambientTimer=setTimeout(apply,90);}else apply();
}
function clearAmbient(){if(!ambientBackdrop)return;clearTimeout(ambientTimer);ambientBackdrop.classList.remove('visible');}
function restoreAmbient(){if(currentView==='home'&&!searchTerm){const featured=allCatalog().find(x=>x.featured)||allCatalog()[0];setAmbient(featured,true);}else clearAmbient();}

async function playTmdbCardTrailer(card,item){
  const key=await ensureTmdbTrailer(item); if(activePreviewCard!==card)return;
  if(!key){card.querySelector('.preview-hint')?.remove();return;}
  const host=card.querySelector('.trailer-host'); if(!host)return;
  host.innerHTML=`<iframe class="card-youtube" title="Trailer" src="https://www.youtube.com/embed/${encodeURIComponent(key)}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&loop=1&playlist=${encodeURIComponent(key)}" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  card.classList.add('preview-playing');
}
function startCardInteraction(card){
  if(!card||activePreviewCard===card)return;if(activePreviewCard)endCardInteraction(activePreviewCard,false);activePreviewCard=card;card.classList.add('is-active');const item=itemById(card.dataset.mediaId);if(item)setAmbient(item,true);clearTimeout(previewTimer);
  if(settings.autoPreviews&&(item?.trailer||item?.provider==='tmdb')) previewTimer=setTimeout(()=>{if(activePreviewCard!==card)return;if(item.provider==='tmdb'){playTmdbCardTrailer(card,item);return;}const video=card.querySelector('.card-trailer');if(!video)return;if(!video.src)video.src=video.dataset.trailer;video.currentTime=0;video.classList.add('playing');const p=video.play();if(p?.catch)p.catch(()=>video.classList.remove('playing'));card.classList.add('preview-playing');},Math.max(1000,(settings.previewDelay||11)*1000));
}
function endCardInteraction(card,restore=true){
  if(!card)return;clearTimeout(previewTimer);previewTimer=null;const video=card.querySelector('.card-trailer');if(video){try{video.pause();video.currentTime=0;}catch{}video.classList.remove('playing');}const host=card.querySelector('.trailer-host');if(host)host.innerHTML='';card.classList.remove('is-active','preview-playing');if(activePreviewCard===card)activePreviewCard=null;if(restore)restoreAmbient();
}
function stopAllPreviews(){if(activePreviewCard)endCardInteraction(activePreviewCard,false);clearTimeout(previewTimer);previewTimer=null;}
function toast(title,text){const el=document.createElement('div');el.className='toast';el.innerHTML=`<b>${esc(title)}</b>${text?`<span>${esc(text)}</span>`:''}`;$('#toastRoot').appendChild(el);setTimeout(()=>el.remove(),3600);}

function viewLabels(name){
  const map={home:[t('home'),t('personalCenter')],movies:[t('movies'),t('catalog')],series:[t('series'),t('catalog')],library:[t('library'),t('localLibrary')],collections:[t('collections'),t('catalog')],addons:[t('addons'),t('modular')],party:[t('watchParty'),'SYNC'],settings:[t('settings'),t('personalization')]};return map[name]||['MiFlix',''];
}
function setView(name){
  stopAllPreviews();clearBack();currentView=name;searchTerm='';remoteSearchResults=[];searchInput.value='';$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));const labels=viewLabels(name);pageTitle.textContent=labels[0];pageEyebrow.textContent=labels[1];
  if(name==='home')renderHome();if(name==='movies')renderCatalog('movie');if(name==='series')renderCatalog('series');if(name==='library')renderLibrary();if(name==='collections')renderCollections();if(name==='addons')renderAddons();if(name==='party')renderParty();if(name==='settings')renderSettings();window.scrollTo({top:0,behavior:settings.motion?'smooth':'auto'});
}
function renderCurrent(){stopAllPreviews();applyStaticTranslations();if(searchTerm){pageTitle.textContent=settings.language==='es'?'Buscar':'Search';pageEyebrow.textContent=t('results');renderSearch(false);return;}setView(currentView);}

// Dynamic actions.
document.addEventListener('click',e=>{
  const rail=e.target.closest('[data-rail-scroll]');if(rail){const el=document.getElementById(rail.dataset.railScroll);if(el)el.scrollBy({left:(+rail.dataset.dir||1)*Math.max(320,el.clientWidth*.82),behavior:settings.motion?'smooth':'auto'});return;}
  const nav=e.target.closest('[data-view]');if(nav){setView(nav.dataset.view);return;}
  if(e.target.classList?.contains('modal-backdrop')){if($('#videoPlayer'))closePlayerModal();else{$('#modalRoot').innerHTML='';restoreAmbient();}return;}
  const close=e.target.closest('[data-close-modal]');if(close){if($('#videoPlayer'))closePlayerModal();else{$('#modalRoot').innerHTML='';restoreAmbient();}return;}
  const fav=e.target.closest('[data-fav]');if(fav){e.stopPropagation();const id=fav.dataset.fav;favorites.has(id)?favorites.delete(id):favorites.add(id);saveFavorites();toast(favorites.has(id)?t('addedList'):t('removedList'),itemById(id)?.title||'');if($('#modalRoot').innerHTML)openDetail(id);else renderCurrent();return;}
  const cat=e.target.closest('[data-category]');if(cat){openCategory(cat.dataset.category);return;}
  const plat=e.target.closest('[data-platform]');if(plat){openPlatform(plat.dataset.platform);return;}
  const yr=e.target.closest('[data-year]');if(yr){openYear(+yr.dataset.year);return;}
  const delCollection=e.target.closest('[data-delete-collection]');if(delCollection){e.preventDefault();e.stopPropagation();deleteCollection(delCollection.dataset.deleteCollection);return;}
  const ep=e.target.closest('[data-episode-play]');if(ep){e.preventDefault();const detail=$('[data-modal-id]');const item=detail?itemById(detail.dataset.modalId):null;if(item){const [sn,en]=ep.dataset.episodePlay.split('|');playEpisode(item,+sn,+en);}return;}
  const folder=e.target.closest('[data-collection-folder]');if(folder){openCollectionFolder(folder.dataset.collectionFolder);return;}
  const loadSources=e.target.closest('[data-load-sources]');if(loadSources){e.preventDefault();loadSourcesForModal(loadSources.dataset.loadSources);return;}
  const smart=e.target.closest('[data-smart-play]');if(smart){e.preventDefault();return;}
  const play=e.target.closest('[data-play]');if(play){e.preventDefault();openPlayer(play.dataset.play);return;}
  const si=e.target.closest('[data-stream-index]');if(si){e.preventDefault();openPlayer(si.dataset.item,+si.dataset.streamIndex);return;}
  const open=e.target.closest('[data-open]');if(open){openDetail(open.dataset.open);return;}
  const rm=e.target.closest('[data-remove-addon]');if(rm){removeAddon(rm.dataset.removeAddon);return;}
  const sp=e.target.closest('[data-switch-profile]');if(sp){switchProfile(sp.dataset.switchProfile);return;}
  const dp=e.target.closest('[data-delete-profile]');if(dp){e.preventDefault();e.stopPropagation();deleteProfile(dp.dataset.deleteProfile);return;}
  const ea=e.target.closest('[data-edit-avatar]');if(ea){e.preventDefault();e.stopPropagation();renderAvatarEditor(ea.dataset.editAvatar);return;}
});

document.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-smart-play]');if(!b)return;e.preventDefault();smartPlayLong=false;clearTimeout(smartPlayTimer);smartPlayTimer=setTimeout(()=>{smartPlayLong=true;toast(t('playManually'),t('chooseSource'));smartPlay(b.dataset.smartPlay,true);},1000);});
document.addEventListener('pointerup',e=>{const b=e.target.closest('[data-smart-play]');if(!b)return;e.preventDefault();clearTimeout(smartPlayTimer);if(!smartPlayLong)smartPlay(b.dataset.smartPlay,false);smartPlayLong=false;});
document.addEventListener('pointercancel',()=>{clearTimeout(smartPlayTimer);smartPlayLong=false;});

document.addEventListener('pointerover',e=>{const card=e.target.closest('.media-card');if(!card)return;if(e.relatedTarget&&card.contains(e.relatedTarget))return;startCardInteraction(card);});
document.addEventListener('pointerout',e=>{const card=e.target.closest('.media-card');if(!card)return;if(e.relatedTarget&&card.contains(e.relatedTarget))return;if(card.contains(document.activeElement))return;endCardInteraction(card,true);});
document.addEventListener('focusin',e=>{const card=e.target.closest('.media-card');if(card)startCardInteraction(card);});
document.addEventListener('focusout',e=>{const card=e.target.closest('.media-card');if(!card)return;setTimeout(()=>{if(!card.contains(document.activeElement)&&!card.matches(':hover'))endCardInteraction(card,true);},0);});
function startFolderFocus(folder){const media=folder?.querySelector?.('.collection-focus-media');if(!media)return;if(!media.getAttribute('src'))media.setAttribute('src',media.dataset.focusSrc||'');folder.classList.add('focus-preview');if(media.tagName==='VIDEO'){const p=media.play();if(p?.catch)p.catch(()=>{});}}
function stopFolderFocus(folder){const media=folder?.querySelector?.('.collection-focus-media');if(!media)return;folder.classList.remove('focus-preview');if(media.tagName==='VIDEO'){try{media.pause();media.currentTime=0;}catch{}}}
document.addEventListener('pointerover',e=>{const f=e.target.closest('.collection-folder');if(!f)return;if(e.relatedTarget&&f.contains(e.relatedTarget))return;startFolderFocus(f);});
document.addEventListener('pointerout',e=>{const f=e.target.closest('.collection-folder');if(!f)return;if(e.relatedTarget&&f.contains(e.relatedTarget))return;if(f.contains(document.activeElement))return;stopFolderFocus(f);});
document.addEventListener('focusin',e=>{const f=e.target.closest('.collection-folder');if(f)startFolderFocus(f);});
document.addEventListener('focusout',e=>{const f=e.target.closest('.collection-folder');if(!f)return;setTimeout(()=>{if(!f.contains(document.activeElement)&&!f.matches(':hover'))stopFolderFocus(f);},0);});

function tvFocusableElements(){
  const selector='button:not([disabled]),[tabindex]:not([tabindex="-1"]),input:not([disabled]),select:not([disabled]),a[href]';
  return [...document.querySelectorAll(selector)].filter(el=>{
    const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>1&&r.height>1&&cs.visibility!=='hidden'&&cs.display!=='none'&&!el.closest('[hidden]');
  });
}
function tvMoveFocus(direction){
  const current=document.activeElement;const nodes=tvFocusableElements();if(!nodes.length)return false;
  if(!current||current===document.body||!nodes.includes(current)){nodes[0].focus();nodes[0].scrollIntoView({block:'center',inline:'nearest'});return true;}
  const a=current.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;let best=null,bestScore=Infinity;
  for(const el of nodes){if(el===current)continue;const b=el.getBoundingClientRect(),bx=b.left+b.width/2,by=b.top+b.height/2,dx=bx-ax,dy=by-ay;
    if(direction==='down'&&dy<=8)continue;if(direction==='up'&&dy>=-8)continue;if(direction==='right'&&dx<=8)continue;if(direction==='left'&&dx>=-8)continue;
    const primary=(direction==='down'||direction==='up')?Math.abs(dy):Math.abs(dx),cross=(direction==='down'||direction==='up')?Math.abs(dx):Math.abs(dy);const score=primary+cross*2.2;
    if(score<bestScore){bestScore=score;best=el;}
  }
  if(!best)return false;best.focus({preventScroll:true});best.scrollIntoView({behavior:settings.motion?'smooth':'auto',block:'center',inline:'nearest'});return true;
}
function handleTvNavigationKey(e){
  if(!IS_ANDROID_TV||e.defaultPrevented)return;
  const active=document.activeElement,key=e.key;
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key))return;
  const range=active?.matches?.('input[type="range"]');
  const typing=active?.matches?.('input[type="text"],input[type="email"],input[type="password"],input[type="search"],textarea');
  const rail=active?.closest?.('.media-rail,.ranked-row,.card-row,.category-row,.platform-row,.collection-folder-row,.year-row,.episode-row');
  if(range&&(key==='ArrowLeft'||key==='ArrowRight'))return;
  if(typing&&(key==='ArrowLeft'||key==='ArrowRight'))return;
  if(rail&&(key==='ArrowLeft'||key==='ArrowRight'))return;
  if(tvMoveFocus(key.replace('Arrow','').toLowerCase())){e.preventDefault();e.stopImmediatePropagation();}
}
if(IS_ANDROID_TV){document.body.classList.add('tv-mode');document.addEventListener('keydown',handleTvNavigationKey,true);}
window.handleMiFlixTvBack=()=>{if($('#modalRoot').innerHTML){if(activePlayerContext?.nativeAndroid)return true;if($('#videoPlayer'))closePlayerModal();else{$('#modalRoot').innerHTML='';restoreAmbient();}return true;}if(backAction){goBack();return true;}setView('home');return true;};

document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchInput.focus();searchInput.select();}
  if(e.key==='Escape'&&$('#modalRoot').innerHTML){if($('#videoPlayer'))closePlayerModal();else{$('#modalRoot').innerHTML='';restoreAmbient();}}else if(e.key==='Escape'&&backAction){goBack();}
  if((e.key==='Enter'||e.key===' ')&&document.activeElement?.matches('[data-smart-play]')){e.preventDefault();if(!e.repeat&&!document.activeElement.dataset.keypressActive){const b=document.activeElement;b.dataset.keypressActive='1';smartPlayLong=false;clearTimeout(smartPlayTimer);smartPlayTimer=setTimeout(()=>{smartPlayLong=true;toast(t('playManually'),t('chooseSource'));smartPlay(b.dataset.smartPlay,true);},1000);}return;}
  if((e.key==='Enter'||e.key===' ')&&document.activeElement?.matches('.media-card')){e.preventDefault();openDetail(document.activeElement.dataset.open);}
  if(['ArrowLeft','ArrowRight'].includes(e.key)){const active=document.activeElement;const scope=active?.closest?.('.media-rail,.ranked-row,.card-row,.category-row,.platform-row,.collection-folder-row,.year-row,.episode-row');if(scope){const nodes=[...scope.querySelectorAll('.media-card,.category-tile,.platform-tile,.collection-folder,.year-tile,.episode-card')];const i=nodes.indexOf(active);if(i>=0){const next=e.key==='ArrowRight'?nodes[Math.min(nodes.length-1,i+1)]:nodes[Math.max(0,i-1)];if(next&&next!==active){e.preventDefault();next.focus({preventScroll:true});next.scrollIntoView({behavior:settings.motion?'smooth':'auto',block:'nearest',inline:'center'});}}}}
});
document.addEventListener('keyup',e=>{if(!['Enter',' '].includes(e.key))return;const b=document.activeElement?.matches?.('[data-smart-play]')?document.activeElement:null;if(!b||!b.dataset.keypressActive)return;e.preventDefault();delete b.dataset.keypressActive;clearTimeout(smartPlayTimer);if(!smartPlayLong)smartPlay(b.dataset.smartPlay,false);smartPlayLong=false;});
searchInput.addEventListener('input',e=>{searchTerm=e.target.value.trim();if(searchTerm){pageTitle.textContent=settings.language==='es'?'Buscar':'Search';pageEyebrow.textContent=t('results');queueRemoteSearch();}else{clearTimeout(searchTimer);remoteSearchResults=[];setView(currentView);}});
if(backButton)backButton.onclick=goBack;
$('#quickSettings').onclick=()=>setView('settings');
$('#profileButton').onclick=renderProfilesModal;
$('#languageToggle').onclick=()=>changeLanguage(settings.language==='es'?'en':'es',true);


function cloudHeaders(auth=true){const h={'apikey':cloudConfig.key||'','Content-Type':'application/json'};if(auth&&cloudSession?.access_token)h.Authorization=`Bearer ${cloudSession.access_token}`;return h;}
function cloudBase(){return String(cloudConfig.url||'').replace(/\/$/,'');}
async function cloudRequest(path,{method='GET',body=null,auth=true,prefer='',_retry=false}={}){if(!cloudBase()||!cloudConfig.key)throw new Error(t('cloudNeedsSetup'));const res=await fetch(cloudBase()+path,{method,headers:{...cloudHeaders(auth),...(prefer?{'Prefer':prefer}:{})},body:body===null?undefined:JSON.stringify(body)});if(res.status===401&&auth&&!_retry&&cloudSession?.refresh_token){const refreshed=await cloudRefreshSession();if(refreshed)return cloudRequest(path,{method,body,auth,prefer,_retry:true});}let data=null;const text=await res.text();try{data=text?JSON.parse(text):null;}catch{data=text;}if(!res.ok)throw new Error(data?.msg||data?.message||data?.error_description||data?.error||`HTTP ${res.status}`);return data;}
async function cloudRefreshSession(){if(!cloudSession?.refresh_token)return false;try{const data=await cloudRequest('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:{refresh_token:cloudSession.refresh_token}});cloudSession=data;rawStore.set('cloudSession',cloudSession);return true;}catch{return false;}}
async function cloudAuth(email,password,signup=false){if(!cloudBase()||!cloudConfig.key)throw new Error(t('cloudNeedsSetup'));const path=signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password';const data=await cloudRequest(path,{method:'POST',auth:false,body:{email,password}});if(signup&&data&&!data.access_token){toast(t('cloudSync'),settings.language==='es'?'Revisa tu email para confirmar la cuenta.':'Check your email to confirm the account.');return data;}cloudSession=data;rawStore.set('cloudSession',cloudSession);await cloudPullAll(true);return data;}
function cloudUserId(){return cloudSession?.user?.id||'';}
function cloudProfilePayload(id=activeProfileId){const prev=activeProfileId;let fav=[],prog={};try{activeProfileId=id;fav=store.get('favorites',[]);prog=store.get('progress',{});}finally{activeProfileId=prev;}return {favorites:fav,progress:prog,updatedAt:Date.now()};}
async function cloudUpsert(profileId,state){const uid=cloudUserId();if(!uid)throw new Error(t('cloudNeedsLogin'));return cloudRequest('/rest/v1/miflix_user_state?on_conflict=user_id,profile_id',{method:'POST',body:{user_id:uid,profile_id:profileId,state,updated_at:new Date().toISOString()},prefer:'resolution=merge-duplicates,return=minimal'});}
async function cloudRead(profileId){const uid=cloudUserId();if(!uid)throw new Error(t('cloudNeedsLogin'));const rows=await cloudRequest(`/rest/v1/miflix_user_state?user_id=eq.${encodeURIComponent(uid)}&profile_id=eq.${encodeURIComponent(profileId)}&select=state,updated_at`,{});return Array.isArray(rows)&&rows[0]?rows[0]:null;}
function mergeProgress(local={},remote={}){const out={...local};for(const [k,v] of Object.entries(remote||{})){const lv=out[k];if(!lv||Number(v?.updatedAt||0)>=Number(lv?.updatedAt||0))out[k]=v;}return out;}
async function cloudPullAll(show=false){if(!cloudUserId())return false;if(cloudSyncBusy)return false;cloudSyncBusy=true;try{const account=await cloudRead(CLOUD_PROFILE_ACCOUNT).catch(()=>null);if(account?.state?.profiles?.length){const remoteProfiles=account.state.profiles;const map=new Map(profiles.map(p=>[p.id,p]));remoteProfiles.forEach(p=>{if(!map.has(p.id))map.set(p.id,p);else Object.assign(map.get(p.id),p);});profiles=[...map.values()];if(!profiles.some(p=>p.primary))profiles[0].primary=true;rawStore.set('profiles',profiles);}for(const p of profiles){const row=await cloudRead(p.id).catch(()=>null);if(!row?.state)continue;const prev=activeProfileId;activeProfileId=p.id;const localFav=new Set(store.get('favorites',[]));(row.state.favorites||[]).forEach(x=>localFav.add(x));store.set('favorites',[...localFav]);store.set('progress',mergeProgress(store.get('progress',{}),row.state.progress||{}));activeProfileId=prev;}cloudLastSync=Date.now();rawStore.set('cloudLastSync',cloudLastSync);reloadProfileState();if(show)toast(t('cloudSyncDone'),new Date(cloudLastSync).toLocaleString());return true;}finally{cloudSyncBusy=false;}}
async function cloudPushAll(show=false){if(!cloudUserId())return false;if(cloudSyncBusy)return false;cloudSyncBusy=true;try{await cloudUpsert(CLOUD_PROFILE_ACCOUNT,{profiles:profiles.map(({id,name,avatar,avatarKind,avatarValue,primary,shareSetup,createdAt})=>({id,name,avatar,avatarKind,avatarValue,primary,shareSetup,createdAt})),updatedAt:Date.now()});for(const p of profiles)await cloudUpsert(p.id,cloudProfilePayload(p.id));cloudLastSync=Date.now();rawStore.set('cloudLastSync',cloudLastSync);if(show)toast(t('cloudSyncDone'),new Date(cloudLastSync).toLocaleString());return true;}finally{cloudSyncBusy=false;}}
function scheduleCloudSync(includeProfiles=false){if(!cloudUserId())return;clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>cloudPushAll(false).catch(()=>{}),includeProfiles?900:1800);}
async function cloudSyncNow(){try{if(!cloudUserId())throw new Error(t('cloudNeedsLogin'));await cloudPullAll(false);await cloudPushAll(true);renderSettings();}catch(err){toast(t('cloudSyncError'),err.message);}}
function cloudSignOut(){cloudSession=null;rawStore.remove('cloudSession');toast(t('cloudSignedOut'),'');renderSettings();}
function cloudSettingsPanel(){const connected=!!cloudUserId(),when=cloudLastSync?new Date(cloudLastSync).toLocaleString(settings.language==='es'?'es-DO':'en-US'):t('cloudNever');return `<div class="settings-panel cloud-panel"><div class="tmdb-head"><div><h3>${t('cloudSync')}</h3><p>${t('cloudIntro')}</p></div><span class="connection-pill ${connected?'ok':''}">${connected?t('cloudConnected'):t('cloudDisconnected')}</span></div><div class="setting"><label>${t('cloudUrl')}</label><input id="cloudUrl" class="addon-input" value="${esc(cloudConfig.url||'')}" placeholder="https://xxxx.supabase.co"></div><div class="setting"><label>${t('cloudKey')}</label><input id="cloudKey" class="addon-input" type="password" value="${esc(cloudConfig.key||'')}" placeholder="sb_publishable_... / anon key"><small>${t('cloudSetupHelp')}</small></div>${connected?`<div class="cloud-account-row"><b>${esc(cloudSession?.user?.email||'')}</b><small>${t('cloudLastSync')}: ${esc(when)}</small></div><div class="tmdb-actions"><button class="btn primary" id="cloudSyncNow">${t('cloudSyncNow')}</button><button class="btn danger" id="cloudSignOut">${t('cloudSignOut')}</button></div>`:`<div class="settings-grid cloud-login-grid"><div class="setting"><label>${t('cloudEmail')}</label><input id="cloudEmail" class="addon-input" type="email" autocomplete="username"></div><div class="setting"><label>${t('cloudPassword')}</label><input id="cloudPassword" class="addon-input" type="password" autocomplete="current-password"></div></div><div class="tmdb-actions"><button class="btn primary" id="cloudSignIn">${t('cloudSignIn')}</button><button class="btn ghost" id="cloudSignUp">${t('cloudSignUp')}</button></div>`}</div>`;}
function bindCloudSettings(){const url=$('#cloudUrl'),key=$('#cloudKey');const save=()=>{cloudConfig={url:(url?.value||'').trim().replace(/\/$/,''),key:(key?.value||'').trim()};rawStore.set('cloudConfig',cloudConfig);};if(url)url.onchange=save;if(key)key.onchange=save;const signIn=$('#cloudSignIn');if(signIn)signIn.onclick=async()=>{save();try{await cloudAuth($('#cloudEmail').value.trim(),$('#cloudPassword').value,false);toast(t('cloudSignedIn'),cloudSession?.user?.email||'');renderSettings();}catch(err){toast(t('cloudSyncError'),err.message);}};const signUp=$('#cloudSignUp');if(signUp)signUp.onclick=async()=>{save();try{await cloudAuth($('#cloudEmail').value.trim(),$('#cloudPassword').value,true);renderSettings();}catch(err){toast(t('cloudSyncError'),err.message);}};const sync=$('#cloudSyncNow');if(sync)sync.onclick=cloudSyncNow;const out=$('#cloudSignOut');if(out)out.onclick=cloudSignOut;}
function onNativeState(raw){let st=raw;try{if(typeof raw==='string')st=JSON.parse(raw);}catch{return;}if(!st)return;nativePlaybackState={position:Number(st.position||0),duration:Number(st.duration||0),playing:!!st.playing};const ctx=activePlayerContext;if(!ctx?.nativeAndroid)return;const key=playerProgressKey(ctx.item,ctx.season,ctx.episode),showKey=ctx.item.id;if(st.event==='closed'){activePlayerContext=null;return;}if(st.event==='error'){toast('MiFlix Player',st.message||t('playerMayFail'));return;}if(nativePlaybackState.duration>0){const row={percent:+Math.min(100,(nativePlaybackState.position/nativePlaybackState.duration)*100).toFixed(1),position:nativePlaybackState.position,duration:nativePlaybackState.duration,updatedAt:Date.now(),season:ctx.season,episode:ctx.episode};progress[key]=row;progress[showKey]=row;if(Math.floor(nativePlaybackState.position)%5===0)saveProgress();}partySendPlaybackState(st.event||'tick',st.event&&st.event!=='tick');if(st.event==='ended'){progress[key]={percent:100,updatedAt:Date.now(),season:ctx.season,episode:ctx.episode};progress[showKey]=progress[key];saveProgress();if(ctx.item.type==='series'&&settings.autoplayNext&&(!partySession||partySession.role==='host'))playNextEpisode(ctx.item,ctx.stream,ctx.season,ctx.episode);}}
window.onMiFlixNativePlayerState=onNativeState;

applySettings();setView('home');probeNativePlayer();updateProfileChip();ensurePersonalDefaultAddon().then(ok=>{if(ok&&currentView==='addons')renderAddons();}).catch(()=>{});if(partySession)startPartyPolling();
// Refresh stale TMDB data quietly (12h) when credentials already exist.
if(tmdbAuth.credential && (!tmdbLastSync || Date.now()-tmdbLastSync>12*60*60*1000)) setTimeout(()=>refreshTmdbCatalog(false),500);
if(tmdbAuth.credential) setTimeout(()=>loadHomeSections(),900);
if(cloudSession?.refresh_token||cloudSession?.access_token) setTimeout(()=>cloudPullAll(false).catch(()=>{}),1300);
