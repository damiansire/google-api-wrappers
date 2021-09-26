Primero, debes de usar el cliente de la API, para eso haces:

const youtubeClient = require("youtube-fast-api")

ytClient = new youtubeClient();


### Funcion getAllComments 
Dado el ID de un video, esta funcion te devuelve todos los comentarios que hay en el.

### Función getPaginatedComments 

Esta funcion es de la forma getPaginatedComments(videoId, paginatedSize)

Cuando el video tiene muchos comentarios se hace dificil y pesado manejar tantos datos. Este metodo es ideal para esos casos, te permite obtener los comentarios de a poco. Dado el Id de un video y el tamaño del paginado, te devuelve los comentarios de a pedazos. 

Por ejemplo, si paginatedSize es 10 y el video tiene 50 comentarios. Te devolvera los primeros 10 y un token para obtener los comentarios siguientes, con la funcion getNextCommentsPage.

### Función getNextCommentsPage

Cuando aplicas la funcion getPaginatedComments, devuelve los comentarios de a pedazos. Entonces, necesitas ir a buscar los siguientes, estos se hace con la funcion getNextCommentsPage. 
La misma recibe como parametro el id de un video, el token que devolvio la anterior y el tamaño de la pagina.
