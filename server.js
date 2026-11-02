const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const { initialState, validateMove } = require("./public/rules");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));

const rooms = new Map();
const makeCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

io.on("connection", socket => {
  socket.on("createRoom", (_, cb) => {
    let code; do { code = makeCode(); } while (rooms.has(code));
    const room = { code, players: [socket.id], state: initialState(), turn: "red" };
    rooms.set(code, room); socket.join(code);
    cb?.({ ok: true, code, side: "red", state: room.state, turn: room.turn });
  });

  socket.on("joinRoom", (raw, cb) => {
    const code = String(raw || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: "Không tìm thấy phòng." });
    if (room.players.length >= 2) return cb?.({ ok: false, error: "Phòng đã đủ 2 người." });
    room.players.push(socket.id); socket.join(code);
    cb?.({ ok: true, code, side: "blue", state: room.state, turn: room.turn });
    io.to(code).emit("roomUpdate", { players: room.players.length });
  });

  socket.on("move", ({ code, move }, cb) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room) return cb?.({ ok: false, error: "Phòng không tồn tại." });
    const side = room.players.indexOf(socket.id) === 0 ? "red" :
                 room.players.indexOf(socket.id) === 1 ? "blue" : null;
    if (!side || side !== room.turn) return cb?.({ ok: false, error: "Chưa đến lượt của bạn." });
    const result = validateMove(room.state, move, side);
    if (!result.ok) return cb?.({ ok: false, error: result.error });
    room.state = result.state;
    room.turn = side === "red" ? "blue" : "red";
    io.to(room.code).emit("state", { state: room.state, turn: room.turn, lastMove: move });
    cb?.({ ok: true });
  });

  socket.on("disconnect", () => {
    for (const [code, room] of rooms) {
      if (room.players.includes(socket.id)) {
        io.to(code).emit("opponentLeft");
        room.players = room.players.filter(id => id !== socket.id);
        if (!room.players.length) rooms.delete(code);
      }
    }
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => console.log(`Co Tu Lenh beta running on ${PORT}`));