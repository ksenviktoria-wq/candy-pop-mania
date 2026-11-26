
(()=>{
'use strict';

const SIZE=8,TOTAL=90,TARGET=1500;
const TYPES=['Blue_gem','Green_gem','Red_gem','Purple_gem','Orange_gem','Cyan_gem','Magenta_gem','Bruise_gem'];

const boardEl=document.querySelector('#board');
const scoreEl=document.querySelector('#score');
const timeEl=document.querySelector('#time');
const statusEl=document.querySelector('#status');
const progressEl=document.querySelector('#progress');
const modal=document.querySelector('#modal');

const sounds={
  Gem_sound:'assets/sounds/Gem_sound.mp3',
  Gem_sound2:'assets/sounds/Gem_sound2.mp3',
  Gem_sound3:'assets/sounds/Gem_sound3.mp3',
  Gem_sound4:'assets/sounds/Gem_sound4.mp3',
  Bomb_sound:'assets/sounds/Bomb_sound.mp3',
  Firework_sound:'assets/sounds/Firework_sound.mp3',
  Lightning_sound:'assets/sounds/Lightning_sound.mp3'
};

let soundOn=true,board=[],selected=null,score=0;
let timeLeft=TOTAL,timer=null,playing=false,busy=false;
let audio={},audioUnlocked=false;

const img=name=>`assets/images/${name}.png`;

function getAudio(name){
  if(!audio[name]){
    audio[name]=new Audio(sounds[name]);
    audio[name].preload='auto';
  }
  return audio[name];
}

// Unlock audio directly from the player's Start tap
function unlockAudio(){
  if(audioUnlocked)return;
  audioUnlocked=true;

  Object.keys(sounds).forEach(name=>{
    const a=getAudio(name);
    a.muted=true;

    const promise=a.play();

    if(promise){
      promise.then(()=>{
        a.pause();
        a.currentTime=0;
        a.muted=false;
      }).catch(()=>{
        a.muted=false;
      });
    }else{
      a.pause();
      a.currentTime=0;
      a.muted=false;
    }
  });
}

function sound(name){
  if(!soundOn||!audioUnlocked||!sounds[name])return;

  try{
    const a=getAudio(name);
    a.muted=false;
    a.currentTime=0;

    const promise=a.play();
    if(promise)promise.catch(err=>console.warn('Audio playback:',name,err));
  }catch(e){
    console.warn('Audio error:',e);
  }
}

function rand(){
  return Math.floor(Math.random()*TYPES.length);
}

function fmt(t){
  return `0${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
}

function update(){
  scoreEl.textContent=score;
  timeEl.textContent=fmt(timeLeft);
  progressEl.style.width=Math.min(100,score/TARGET*100)+'%';
}

function initialBoard(){
  board=Array.from({length:SIZE},()=>Array(SIZE).fill(0));
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      let v;
      do{
        v=rand();
      }while(
        (c>1&&board[r][c-1]===v&&board[r][c-2]===v)||
        (r>1&&board[r-1][c]===v&&board[r-2][c]===v)
      );
      board[r][c]=v;
    }
  }
}

function render(){
  boardEl.innerHTML='';
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      let b=document.createElement('button');
      b.className='tile'+(selected&&selected.r===r&&selected.c===c?' selected':'');
      b.dataset.r=r;
      b.dataset.c=c;
      b.setAttribute('aria-label',TYPES[board[r][c]].replace('_',' '));

      let im=document.createElement('img');
      im.src=img(TYPES[board[r][c]]);
      im.alt='';
      im.draggable=false;

      b.append(im);
      b.addEventListener('click',()=>tap(r,c));
      boardEl.append(b);
    }
  }
}

function matches(){
  let found=new Set();

  for(let r=0;r<SIZE;r++){
    let start=0;
    for(let c=1;c<=SIZE;c++){
      if(c<SIZE&&board[r][c]===board[r][start])continue;
      if(c-start>=3){
        for(let x=start;x<c;x++)found.add(r*SIZE+x);
      }
      start=c;
    }
  }

  for(let c=0;c<SIZE;c++){
    let start=0;
    for(let r=1;r<=SIZE;r++){
      if(r<SIZE&&board[r][c]===board[start][c])continue;
      if(r-start>=3){
        for(let y=start;y<r;y++)found.add(y*SIZE+c);
      }
      start=r;
    }
  }

  return [...found];
}

function swap(a,b){
  let t=board[a.r][a.c];
  board[a.r][a.c]=board[b.r][b.c];
  board[b.r][b.c]=t;
}

const adjacent=(a,b)=>
  Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1;

async function tap(r,c){
  if(!playing||busy)return;

  let here={r,c};

  if(!selected){
    selected=here;
    render();
    return;
  }

  if(selected.r===r&&selected.c===c){
    selected=null;
    render();
    return;
  }

  if(!adjacent(selected,here)){
    selected=here;
    render();
    return;
  }

  let old=selected;
  selected=null;
  busy=true;

  swap(old,here);
  render();
  await wait(120);

  let m=matches();

  if(!m.length){
    swap(old,here);
    render();
    statusEl.textContent='No match — try another swap!';
    busy=false;
    return;
  }

  await resolve();
  busy=false;
}

const wait=ms=>new Promise(res=>setTimeout(res,ms));

async function resolve(){
  let chain=0;

  while(true){
    let m=matches();
    if(!m.length)break;

    chain++;

    if(chain===1)sound('Gem_sound');
    else sound('Gem_sound'+Math.min(chain,4));

    score+=m.length*10*chain;
    update();

    statusEl.textContent=chain>1
      ?`Sweet cascade ×${chain}!`
      :'Candy pop!';

    m.forEach(k=>{
      let el=boardEl.children[k];
      if(el)el.classList.add('pop');
    });

    await wait(210);

    m.forEach(k=>{
      let r=Math.floor(k/SIZE),c=k%SIZE;
      board[r][c]=-1;
    });

    for(let c=0;c<SIZE;c++){
      let vals=[];
      for(let r=SIZE-1;r>=0;r--){
        if(board[r][c]!==-1)vals.push(board[r][c]);
      }
      while(vals.length<SIZE)vals.push(rand());
      for(let r=SIZE-1,i=0;r>=0;r--,i++){
        board[r][c]=vals[i];
      }
    }

    render();
    await wait(150);

    if(score>=TARGET){
      finish(true);
      return;
    }
  }
}

function start(){
  if(playing)return;

  unlockAudio();

  playing=true;
  modal.classList.remove('show');
  statusEl.textContent='Match 3 or more candies!';

  timer=setInterval(()=>{
    timeLeft--;
    update();
    if(timeLeft<=0)finish(false);
  },1000);
}

function finish(win){
  playing=false;
  clearInterval(timer);

  document.querySelector('#modalTitle').textContent=
    win?'YOU DID IT! 🎉':'TIME’S UP! ⏰';

  document.querySelector('#modalText').textContent=
    `You scored ${score.toLocaleString()} points. ${win?'Sweet victory!':'Try again and beat your score!'}`;

  document.querySelector('#modalBtn').textContent='PLAY AGAIN';
  modal.classList.add('show');
}

function reset(){
  clearInterval(timer);
  playing=false;
  busy=false;
  selected=null;
  score=0;
  timeLeft=TOTAL;

  initialBoard();
  update();
  render();

  document.querySelector('#modalTitle').textContent='Ready to pop?';
  document.querySelector('#modalText').textContent=
    'Match 3 or more candies. Reach 1,500 points before time runs out!';
  document.querySelector('#modalBtn').textContent="LET'S PLAY!";
  modal.classList.add('show');
}

document.querySelector('#startBtn').addEventListener('click',start);

document.querySelector('#modalBtn').addEventListener('click',()=>{
  if(timeLeft!==TOTAL||score>0)reset();
  start();
});

document.querySelector('#restartBtn').addEventListener('click',reset);

document.querySelector('#soundBtn').addEventListener('click',e=>{
  soundOn=!soundOn;
  e.currentTarget.textContent=soundOn?'🔊':'🔇';
});

reset();
})();
