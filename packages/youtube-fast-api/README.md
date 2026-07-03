<br>

# YouTube Fast Api
<br>

## Introducción 

Este paquete, consiste en un wrapper de la **API de YouTube** para **Node**. 

Permite traer comentarios, listar los videos/playlists de un canal, obtener la
metadata de videos (título, tags, estadísticas) y buscar videos por término.

Estoy abierto a agregarle mas funcionalidad, si tienes alguna petición o sugerencia, puedes contactarme a mi [Twitter](https://twitter.com/damiansire), [Instagram](https://www.instagram.com/damiansire/) o a damiansirecontacto@gmail.com.

<br>

# Empezando
<br>

## Obtener Api Key de Google YouTube Data V3

Para hacer request a la **Api de YouTube**, necesitamos la **Api Key de Google YouTube Data V3**. 

Para ello, debes de seguir los pasos de este tutorial. 

https://developers.google.com/youtube/v3/getting-started?hl=es

En caso de que lo prefiera en video: https://youtu.be/zVJKcbjE52w

<br>

## Instalación

Para instalar este paquete, debes hacerlo mediante el comando

```
npm i youtube-fast-api
```
<br>

## Inicialización 


Una vez instalado el paquete, puedes usarlo en tu aplicación, instanciando el cliente de la **API**. 

Esto puedes hacerlo de la siguiente manera:

```
const youtubeClient = require("youtube-fast-api")

const ytClient = new youtubeClient(apiKeyObtenidaEnElTutorialDeGoogleDeArriba);
```

Hecho esto, ya tienes acceso al cliente de la **API**.

<br>

# Funcionalidades

<br>

## Función getAllComments 

```
getAllComments( videoId )
```

Dado el ID de un video, esta función te devuelve todos los comentarios que hay en el.

<br>

## Paginar comentarios: `comments` / `commentsPages`

Cuando un video tiene muchos comentarios, en vez de traerlos todos de golpe podés
recorrerlos de a páginas con un **async-iterator sin estado** (podés paginar dos
videos a la vez con el mismo cliente, y termina solo cuando no hay más).

```js
// comentario por comentario:
for await (const comment of ytClient.comments(videoId, { pageSize: 100 })) {
    console.log(comment.textDisplay);
}

// o página por página (cada valor es un array de comentarios):
for await (const page of ytClient.commentsPages(videoId)) {
    console.log(`${page.length} comentarios en esta página`);
}
```

Lo mismo para los videos de un canal: `channelVideos(channelId)` /
`channelVideoPages(channelId)`.

> **Deprecado:** `getPaginatedComments(videoId, pageSize)` +
> `getNextCommentsPage(pageSize)` (y su par para videos de canal) guardan el cursor
> en la instancia del cliente, así que no podés paginar dos recursos a la vez. Siguen
> funcionando por compatibilidad pero se removerán en la próxima major: usá los
> paginadores de arriba.


<br>


## Función getAllVideos


```
getAllVideos(channelId) 
```
Cuando aplicas la función **getAllVideos**, devuelve todos los id de todos los videos de ese canal. 

<br>

## Función getPlaylist


```
getPlaylist(channelId) 
```
Cuando aplicas la función **getPlaylist**, devuelve todos los id, de las listas de reproducción de ese canal.

<br>

## Función getVideosMetadata


```
getVideosMetadata(videoIds) 
```
Dado un array de ids de video, devuelve la metadata de cada uno: `id`, `channelId`,
`title`, `description`, `tags`, `viewCount`, `likeCount`, `commentCount` y
`publishedAt`. Parte internamente los pedidos en bloques de 50 (el límite de
`videos.list`), así que podés pasarle muchos ids de una.

Las estadísticas que el video tenga ocultas vienen en `null` (se distinguen de un
0 real). Cada bloque de hasta 50 ids cuesta 1 unidad de cuota.

<br>

## Función getVideoMetadata


```
getVideoMetadata(videoId) 
```
Igual que **getVideosMetadata** pero para un solo video; devuelve el objeto de
metadata o `null` si la API no lo encontró.

<br>

## Función searchVideos


```
searchVideos(query, options) 
```
Busca videos por término (`query`) y devuelve una lista de resultados con
`videoId`, `channelId`, `title` y `publishedAt`. `options` admite:

- `maxPages` (default `1`): páginas a traer. **Cada página cuesta 100 unidades**
  de cuota, por eso este es el tope de costo.
- `order` (default `'relevance'`): usá `'viewCount'` para descubrir lo más visto
  (trending).
- `pageSize` (default `50`): resultados por página. `search.list` topea
  `maxResults` en **50**, así que valores mayores se recortan a 50. Un `pageSize`
  menor a 1 o no numérico lanza `TypeError` (falla temprano en vez de mandar un
  `maxResults=0` que la API rechaza con 400).
- `order` debe ser uno de `date`, `rating`, `relevance`, `title`, `videoCount`
  o `viewCount`; cualquier otro valor lanza `TypeError`.

<br>

# Ejemplos de código

<br>

## Obtener todos los comentarios de un video

```
const youtubeClient = require("youtube-fast-api")

const ytClient = new youtubeClient(tuApiKey);

const videoId = "PaRam-aY9p0"; //Aca el id del video

const videoComments = ytClient.getAllComments(videoId);

videoComments.then(videoData => {
    console.log(videoData.map(comment => comment.authorDisplayName))
})
```

## Ejemplo de paginado

```js
const youtubeClient = require("youtube-fast-api")

const ytClient = new youtubeClient(tuApiKey);

const videoId = "PaRam-aY9p0"; // Acá el id del video

(async () => {
    // Recorre TODAS las páginas de a 20, sin cargar todo en memoria de golpe.
    for await (const page of ytClient.commentsPages(videoId, { pageSize: 20 })) {
        console.log(page); // array de comentarios de esta página
    }
})();
```
## Compatibilidad

- **Runtime:** Node.js **≥ 14** (código ES2016 + CommonJS; `require()` devuelve el cliente directo).
- **TypeScript:** el paquete envía `index.d.ts`. Los tipos resuelven tanto en la resolución
  de módulos vieja (`node10`) como en la nueva (`node16`, CJS y ESM) y en bundlers —
  verificado en CI con `arethetypeswrong` sobre el tarball real.
- **Dev/CI** requiere Node ≥ 18 (usa el test runner nativo `node --test`); eso no afecta al consumidor.
