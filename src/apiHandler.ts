import http from "node:http";
import fs from "node:fs";
import path from "node:path";

//1.ruta absoluta al archivo songs.json
const songsPath = path.join(__dirname, "../songs.json");

//Definir el tipo para las canciones para GET api/song/:id
type Song = {
  id: number;
  title: string;
  artist: string;
  album: string;
  year: number;
  genre: string;
};

//2. funcion para leer lista completa de canciones
function readSongs() {
  const data = fs.readFileSync(songsPath, "utf-8");
  return JSON.parse(data).songs;
}

//3. funcion para escribir cancion nueva
function writeNewSong(
  songs: {
    id: string;
    title: string;
    artist: string;
    album: string;
    year: number;
    genre: string;
  }[]
) {
  fs.writeFileSync(songsPath, JSON.stringify({ songs }, null, 2), "utf-8");
}

function generateRandomId(): number {
  return Math.floor(Math.random() * 1000000) + 1;
}

//4. Crear el servidor HTTP
const server = http.createServer((req, res) => {
  if (req.url === "/" && req.method === "GET") {
    // Manejar la ruta raíz
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bienvenido al Multipurpose Web Server!");
  } else if (req.url === "/api" && req.method === "GET") {
    // Manejar la ruta /api
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bienvenido al Music API!");
    //Manejar /api/songs y el filtrado opcional
  } else if (req.url?.startsWith("/api/songs") && req.method === "GET") {
    const songs = readSongs();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = new URLSearchParams(url.search);

    const filteredSongs = songs.filter((song: Song) => {
      let matches = true;

      if (params.has("title")) {
        const titleFilter = params.get("title")!.toLowerCase();
        matches = matches && song.title.toLowerCase().includes(titleFilter);
      }
      if (params.has("artist")) {
        const artistFilter = params.get("artist")!.toLowerCase();
        matches = matches && song.artist.toLowerCase().includes(artistFilter);
      }
      if (params.has("album")) {
        const albumFilter = params.get("album")!.toLowerCase();
        matches = matches && song.album.toLowerCase().includes(albumFilter);
      }
      if (params.has("year")) {
        const yearFilter = parseInt(params.get("year")!, 10);
        matches = matches && song.year === yearFilter;
      }
      if (params.has("genre")) {
        const genreFilter = params.get("genre")!.toLowerCase();
        matches = matches && song.genre.toLowerCase().includes(genreFilter);
      }
      return matches;
    });

    if(filteredSongs.length === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: "Ninguna cancion cumple con los filtros indicados" }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: filteredSongs }));
    }
    //Manejar /api/song/:id
  } else if (req.url?.startsWith("/api/song/") && req.method === "GET") {
    const id = parseInt(req.url.split("/").pop() || "", 10);
    const songs = readSongs();
    const song = songs.find((song: Song) => song.id === id);

    if (song) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: song }));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: "Canción no encontrada" }));
    }

    //Manejar /api/songs con POST
  } else if (req.url === "/api/songs" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const newSong = JSON.parse(body);
        if (
          typeof newSong.title === "string" &&
          typeof newSong.artist === "string" &&
          typeof newSong.album === "string" &&
          typeof newSong.year === "number" &&
          typeof newSong.genre === "string"
        ) {
          const songs = readSongs();
          let newId: number;
          do {
            newId = generateRandomId();
          } while (songs.some((s: Song) => s.id === newId));
          const addingSong = {
            id: newId,
            title: newSong.title,
            artist: newSong.artist,
            album: newSong.album,
            year: newSong.year,
            genre: newSong.genre,
          };
          songs.push(addingSong);
          writeNewSong(songs);

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: true,
              message: "Canción creada con éxito",
              data: addingSong,
            })
          );
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ ok: false, message: "Datos de canción inválidos" })
          );
        }
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ ok: false, message: "Error al procesar los datos" })
        );
      }
    });
    //manejar DELETE
  } else if (req.url?.startsWith("/api/song/") && req.method === "DELETE") {
    const id = parseInt(req.url.split("/").pop() || "", 10);
    const songs = readSongs();
    const songIndex = songs.findIndex((song: Song) => song.id === id);

    if (songIndex !== -1) {
      songs.splice(songIndex, 1);
      writeNewSong(songs);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ ok: true, message: "Canción eliminada con éxito" })
      );
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: "Canción no encontrada" }));
    }
    //manejar el patch o put
  } else if (
    req.url?.startsWith("/api/song/") &&
    (req.method === "PATCH" || req.method === "PUT")
  ) {
    const id = parseInt(req.url.split("/").pop() || "", 10);
    const songs = readSongs();
    const songIndex = songs.findIndex((song: Song) => song.id === id);

    if (songIndex !== -1) {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        try {
          const updatedFields = JSON.parse(body);
          const songToUpdate = songs[songIndex];

          // Actualizar solo los campos que se pasan en el cuerpo de la solicitud
          const updatedSong = { ...songToUpdate, ...updatedFields };
          songs[songIndex] = updatedSong;
          writeNewSong(songs);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, data: updatedSong }));
        } catch (error) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: false,
              message: "Error al procesar los datos",
            })
          );
        }
      });
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: "Canción no encontrada" }));
    }
  } else {
    // Manejar todas las demás rutas o métodos
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: true, message: "Ruta no encontrada" }));
  }
});

server.listen(5501, () => {
  console.log("Servidor ejecutandose en http://localhost:5501/");
});
