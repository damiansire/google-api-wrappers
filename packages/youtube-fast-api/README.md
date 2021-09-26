# Youtube Fast Api

## Introduccion 

Este paquete, consiste en un wrapper de la **API de Yotutube** para **Node**. 

Esta primera version, unicamente contiene informacion con respecto a los comentarios.

Estoy abierto a agregarle mas funcionalidad, si tienes alguna peticion o sugerencia, puedes contactarme a mi [Twitter](https://twitter.com/damiansire), [Instagram](https://www.instagram.com/damiansire/) o a damiansirecontacto@gmail.com.

# Getting started

## Obtener Api Key de Google Youtube Data V3

Para hacer request a la **Api de Youtube**, necesitamos la **Api Key de Google Youtube Data V3**. 

Para ello, debes de seguir los pasos de este tutorial. 
https://developers.google.com/youtube/v3/getting-started?hl=es

## Instalacion

Para instalar este paquete, debes hacerlo mediante el comando

```
npm i youtube-fast-api
```

## Inicializacion 

Una vez instalado el paquete, puedes usarlo en tu aplicacion, instanaciando el cliente de la **API**. 

Esto puedes hacerlo de la siguiente manera:

```
const youtubeClient = require("youtube-fast-api")

ytClient = new youtubeClient(apiKeyObtenidaEnElTutorialDeGoogleDeArriba);
```

Hecho esto, ya tienes acceso al cliente de la **API**.

# Funcionalidades

### Funcion getAllComments 

Esta funcion es de la forma:

```
getAllComments( videoId )
```

Dado el ID de un video, esta funcion te devuelve todos los comentarios que hay en el.

### Función getPaginatedComments 
Esta funcion es de la forma:

```
getPaginatedComments( videoId, paginatedSize )
```

Dado el Id de un video y el tamaño del paginado, te devuelve los comentarios de a pedazos. 

Cuando el video tiene muchos comentarios se hace dificil y pesado manejar tantos datos. 

Este metodo es ideal para esos casos, te permite obtener los comentarios de a poco. 

Por ejemplo, si paginatedSize es 10 y el video tiene 50 comentarios. Te devolvera los primeros 10 y un token para obtener los comentarios siguientes, con la funcion **getNextCommentsPage**.

### Función getNextCommentsPage

Esta funcion es de la forma:

```
getNextCommentsPage(videoId, token, paginatedSize) 
```
Cuando aplicas la funcion **getPaginatedComments**, devuelve los comentarios de a pedazos. 

Entonces, necesitas ir a buscar los siguientes, estos se hace con la funcion **getNextCommentsPage**.

La misma recibe como parametro el id de un video, el token que devolvio la funcion anterior y el tamaño de la pagina.
