/*
 * BETA RULE MODULE.
 * This is deliberately NOT advertised as a tournament-complete rule engine.
 * The published descriptions confirm 11x12 intersections, 19 pieces/side,
 * terrain, stay-capture, stacking and special anti-air interactions.
 * Those advanced rules need verification against the creator's official rulebook.
 */
(() => {
  const W = 11, H = 12;
  const TYPES = {
    cmd: "Tư lệnh", hq: "Sở chỉ huy", inf: "Bộ binh", militia: "Dân quân",
    eng: "Công binh", tank: "Xe tăng", art: "Pháo binh", aa: "Pháo cao xạ",
    missile: "Tên lửa", plane: "Máy bay", ship: "Tàu chiến"
  };
  const terrain = (x,y) => {
    // Map template from public community rules overview; confirm exact map before tournament use.
    if (x <= 1) return "sea";
    if (x === 2) return "coast";
    if ((x===5 || x===7) && (y===5 || y===6)) return "bridge";
    return "land";
  };
  const initialState = () => {
    const pieces = [];
    // 19 units per side: this is a labelled formation template, not a certified official setup.
    const back = ["ship","art","aa","missile","plane","tank","eng","militia","inf","cmd","hq"];
    for (let x=0;x<W;x++) {
      if (x<back.length) {
        pieces.push({id:"R"+x,side:"red",type:back[x],x,y:11});
        pieces.push({id:"B"+x,side:"blue",type:back[x],x,y:0});
      }
    }
    [[1,"inf"],[3,"tank"],[5,"art"],[7,"eng"],[9,"militia"],[10,"inf"],[2,"aa"],[8,"plane"]]
      .forEach(([x,type],i)=> {
        pieces.push({id:"R"+(11+i),side:"red",type,x,y:10});
        pieces.push({id:"B"+(11+i),side:"blue",type,x,y:1});
      });
    return pieces;
  };
  const inside = (x,y) => x>=0 && x<W && y>=0 && y<H;
  const lineClear = (pieces, a, b) => {
    const dx=Math.sign(b.x-a.x), dy=Math.sign(b.y-a.y);
    let x=a.x+dx,y=a.y+dy;
    while(x!==b.x || y!==b.y) {
      if(pieces.some(p=>p.x===x&&p.y===y)) return false;
      x+=dx; y+=dy;
    }
    return true;
  };
  function validateMove(pieces, move, side) {
    if (!move || !Number.isInteger(move.fromX) || !Number.isInteger(move.fromY) ||
        !Number.isInteger(move.toX) || !Number.isInteger(move.toY)) return {ok:false,error:"Nước đi không hợp lệ."};
    const {fromX:x,fromY:y,toX:tx,toY:ty}=move;
    if (!inside(tx,ty) || !inside(x,y) || (x===tx&&y===ty)) return {ok:false,error:"Ô đi không hợp lệ."};
    const p=pieces.find(q=>q.x===x&&q.y===y);
    if (!p || p.side!==side) return {ok:false,error:"Không có quân của bạn ở ô đã chọn."};
    const target=pieces.find(q=>q.x===tx&&q.y===ty);
    if (target?.side===side) return {ok:false,error:"Không thể đi vào ô có quân cùng phe."};
    const dx=Math.abs(tx-x), dy=Math.abs(ty-y), orth=(dx===0||dy===0), diag=dx===dy;
    const dist=dx+dy;
    let allowed=false, max=1, canSlide=false;
    switch(p.type) {
      case "cmd": allowed=orth; max=11; canSlide=true; break;
      case "hq": allowed=false; break;
      case "inf": case "eng": case "aa": allowed=orth; max=1; break;
      case "militia": allowed=orth||diag; max=1; break;
      case "tank": allowed=orth; max=2; break;
      case "art": allowed=orth||diag; max=3; canSlide=true; break;
      case "missile": allowed=(orth&&dist<=2)||(diag&&dx===1); max=2; break;
      case "plane": allowed=(orth||diag)&&Math.max(dx,dy)<=4; max=4; canSlide=true; break;
      case "ship": allowed=(orth||diag)&&Math.max(dx,dy)<=4; max=4; canSlide=true; break;
    }
    if (!allowed || dist===0 || (p.type==="tank" && dist>2) ||
        (["inf","eng","aa","militia"].includes(p.type)&&dist>1) ||
        (p.type==="art" && Math.max(dx,dy)>3)) return {ok:false,error:"Quân này không đi được theo nước đó."};
    if (canSlide && !lineClear(pieces,p,{x:tx,y:ty})) return {ok:false,error:"Có quân chắn đường."};
    const dest=terrain(tx,ty);
    if (["inf","eng","tank","art","aa","missile","cmd","hq","militia"].includes(p.type) && dest==="sea")
      return {ok:false,error:"Quân trên bộ không được đứng ở vùng biển."};
    if (p.type==="ship" && dest==="land") return {ok:false,error:"Tàu chiến không đi vào đất liền."};
    const next=pieces.filter(q=>q.id!==p.id && !(target && q.id===target.id))
      .map(q=>({...q}));
    next.push({...p,x:tx,y:ty});
    return {ok:true,state:next};
  }
  globalThis.CoTuLenhRules = {W,H,TYPES,terrain,initialState,validateMove};
  if (typeof module!=="undefined") module.exports={initialState,validateMove};
})();