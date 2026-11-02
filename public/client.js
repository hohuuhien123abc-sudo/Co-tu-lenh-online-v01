const socket=io();
const {W,H,TYPES,terrain,initialState,validateMove}=window.CoTuLenhRules;
const board=document.getElementById("board"), notice=document.getElementById("notice");
const roomInput=document.getElementById("room"), roomLabel=document.getElementById("roomLabel");
const turnLabel=document.getElementById("turn"), sideLabel=document.getElementById("side");
let state=initialState(), selected=null, possible=[], mySide=null, roomCode=null, turn="red", history=[];
const symbols={cmd:"★",hq:"▣",inf:"♟",militia:"✿",eng:"⚒",tank:"▰",art:"◉",aa:"⌃",missile:"➤",plane:"✈",ship:"⚓"};
document.getElementById("legend").innerHTML=Object.entries(TYPES).map(([k,v])=>`<div>${symbols[k]} ${v}</div>`).join("");
function draw(){
 board.className="board";board.style.gridTemplateColumns=`repeat(${W},1fr)`;board.innerHTML="";
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const cell=document.createElement("button");cell.className="cell "+terrain(x,y);
  if(selected&&selected.x===x&&selected.y===y)cell.classList.add("selected");
  if(possible.some(m=>m.toX===x&&m.toY===y))cell.classList.add("possible");
  const p=state.find(q=>q.x===x&&q.y===y);
  if(p){const span=document.createElement("span");span.className="piece "+p.side;span.textContent=symbols[p.type];span.title=TYPES[p.type];cell.append(span);}
  const c=document.createElement("span");c.className="coord";c.textContent=String.fromCharCode(97+x)+(H-y);cell.append(c);
  cell.onclick=()=>clickCell(x,y);board.append(cell);
 }
 document.getElementById("history").innerHTML=history.slice(-20).map(s=>`<li>${s}</li>`).join("");
 turnLabel.textContent="Lượt: "+(turn==="red"?"Đỏ":"Xanh");
 sideLabel.textContent=mySide?"Bạn: "+(mySide==="red"?"Đỏ":"Xanh"):"";
}
function clickCell(x,y){
 if(!roomCode){notice.textContent="Hãy tạo phòng hoặc vào phòng trước.";return;}
 if(turn!==mySide){notice.textContent="Đang chờ đối thủ đi.";return;}
 const p=state.find(q=>q.x===x&&q.y===y);
 if(selected){
  const move=possible.find(m=>m.toX===x&&m.toY===y);
  if(move){socket.emit("move",{code:roomCode,move:{...move,fromX:selected.x,fromY:selected.y}},r=>{if(!r?.ok)notice.textContent=r?.error||"Không gửi được nước đi.";});selected=null;possible=[];draw();return;}
 }
 if(p&&p.side===mySide){
  selected={x,y};possible=[];
  for(let ty=0;ty<H;ty++)for(let tx=0;tx<W;tx++){
   const r=validateMove(state,{fromX:x,fromY:y,toX:tx,toY:ty},mySide);
   if(r.ok)possible.push({toX:tx,toY:ty});
  }
 }else{selected=null;possible=[];}
 draw();
}
document.getElementById("create").onclick=()=>socket.emit("createRoom",{},r=>{
 if(!r?.ok)return;roomCode=r.code;mySide=r.side;state=r.state;turn=r.turn;history=[];roomLabel.textContent="Phòng "+roomCode;notice.textContent="Gửi mã này cho bạn bè để họ tham gia.";draw();
});
document.getElementById("join").onclick=()=>socket.emit("joinRoom",roomInput.value,r=>{
 if(!r?.ok){notice.textContent=r?.error||"Không vào được phòng.";return;}
 roomCode=r.code;mySide=r.side;state=r.state;turn=r.turn;history=[];roomLabel.textContent="Phòng "+roomCode;notice.textContent="Đã vào phòng. Bạn cầm quân Xanh.";draw();
});
socket.on("state",d=>{state=d.state;turn=d.turn;selected=null;possible=[];history.push(`${d.lastMove.fromX},${d.lastMove.fromY} → ${d.lastMove.toX},${d.lastMove.toY}`);notice.textContent="Đã cập nhật nước đi.";draw();});
socket.on("roomUpdate",d=>notice.textContent=d.players===2?"Đã có đủ hai người chơi.":"Đang chờ người chơi thứ hai.");
socket.on("opponentLeft",()=>notice.textContent="Đối thủ đã rời phòng.");
draw();