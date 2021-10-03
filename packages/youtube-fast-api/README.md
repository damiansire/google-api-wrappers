<br>

# YouTube Fast Api
<br>

## Introducción 

Este paquete, consiste en un wrapper de la **API de YouTube** para **Node**. 

Esta primera version, únicamente contiene información con respecto a los comentarios.

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

## Función getPaginatedComments 

```
getPaginatedComments( videoId, paginatedSize )
```

Dado el Id de un video y el tamaño del paginado, te devuelve los comentarios de a pedazos. 

Cuando el video tiene muchos comentarios se hace difícil y pesado manejar tantos datos. 

Este método es ideal para esos casos, te permite obtener los comentarios de a poco. 

Por ejemplo, si paginatedSize es 10 y el video tiene 50 comentarios. Te retornara los primeros 10 y un token para obtener los comentarios siguientes, con la función **getNextCommentsPage**.

<br>

## Función getNextCommentsPage


```
getNextCommentsPage(paginatedSize) 
```
Cuando aplicas la función **getPaginatedComments**, devuelve los comentarios de a pedazos. 

Entonces, necesitas ir a buscar los siguientes, estos se hace con la función **getNextCommentsPage**.

La misma recibe como parámetro la cantidad de comentarios que quieres traer.


<br>


## Función getNextCommentsPage


```
getAllVideosByChannelId(channelId) 
```
Cuando aplicas la función **getAllVideosByChannelId**, devuelve todos los id de todos los videos de ese canal. 

<br>

## Función getPlaylistByChannelId


```
getPlaylistByChannelId(channelId) 
```
Cuando aplicas la función **getPlaylistByChannelId**, devuelve todos los id, de las listas de reproducción de ese canal.

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

```
const youtubeClient = require("youtube-fast-api")

const ytClient = new youtubeClient(tuApiKey);

const videoId = "PaRam-aY9p0"; //Aca el id del video

(async () => {

    const firstPage = await ytClient.
    //Trae los primeros 20 comentarios
    getPaginatedComments(videoId, 20);

    console.log(firstPage)

    //Trae los siguientes 20 comentarios
    const nextPageResult = await ytClient.getNextCommentsPage(20)

    console.log(nextPageResult)

})();

```