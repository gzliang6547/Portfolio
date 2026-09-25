'use strict';
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let choice = null;
  try { choice = localStorage.getItem('motion'); } catch (e) {}
  let paused = choice ? choice === 'off' : reduce.matches;
  const motionButton = document.querySelector('.motion-control');
  const applyPause = () => {
    document.body.classList.toggle('motion-paused', paused);
    document.documentElement.classList.toggle('motion-on', !paused);
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = paused ? '\u25B6\uFE0E' : '\u275A\u275A';
    motionButton.replaceChildren(document.createTextNode(paused ? 'Play motion' : 'Pause motion'), icon);
  };
  applyPause();
  motionButton.hidden = false;
  motionButton.addEventListener('click', () => {
    paused = !paused;
    choice = paused ? 'off' : 'on';
    try { localStorage.setItem('motion', choice); } catch (e) {}
    applyPause(); requestFrame();
  });
  reduce.addEventListener('change', () => { if (choice) return; paused=reduce.matches; applyPause(); requestFrame(); });

  if (!paused && 'IntersectionObserver' in window) {
    document.body.classList.add('js-motion');
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
    }), {threshold:.08});
    document.querySelectorAll('.section-heading,.project-overview,.project-system,.principles article,.about-title,.about-content,.capabilities,.contact-section h2').forEach(el => {el.classList.add('reveal');revealObserver.observe(el);});
    const countObserver = new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      countObserver.unobserve(entry.target);
      const target=Number(entry.target.dataset.count), start=performance.now();
      const tick=now=>{const progress=Math.min(1,(now-start)/1400);entry.target.textContent=String(Math.round(target*(1-Math.pow(1-progress,3))));if(progress<1&&!paused)requestAnimationFrame(tick);else entry.target.textContent=String(target);};
      requestAnimationFrame(tick);
    }),{threshold:.8});
    document.querySelectorAll('[data-count]').forEach(el=>countObserver.observe(el));
  }
  const progress=document.querySelector('.reading-progress');
  let scrollPending=false;
  const onScroll=()=>{if(scrollPending)return;scrollPending=true;requestAnimationFrame(()=>{const range=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${range>0?scrollY/range:0})`;scrollPending=false;});};
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  const aura=document.querySelector('.cursor-aura');
  if(matchMedia('(pointer:fine)').matches){
    addEventListener('pointermove',e=>{if(paused)return;aura.style.opacity='1';aura.style.transform=`translate(${e.clientX-aura.offsetWidth/2}px,${e.clientY-aura.offsetHeight/2}px)`;aura.classList.toggle('over',!!e.target.closest('a,button,summary'));},{passive:true});
    document.addEventListener('pointerleave',()=>aura.style.opacity='0');
    document.querySelectorAll('.explore-circle,.contact-section .button').forEach(el=>{
      el.addEventListener('pointermove',e=>{if(paused)return;const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.14}px,${(e.clientY-r.top-r.height/2)*.14}px)`;});
      el.addEventListener('pointerleave',()=>el.style.transform='');
    });
  }
  document.querySelectorAll('[data-diagram] button').forEach(button=>button.addEventListener('click',()=>{const panel=button.closest('.project-system').querySelector('.system-insight');panel.classList.remove('changed');void panel.offsetWidth;panel.classList.add('changed');}));

  const canvas=document.getElementById('sculpture');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});
  let frame=0, mode=0, currentMode=0, angleX=.0, angleY=.0, aimX=0, aimY=0, dragging=false, previousX=0, previousY=0, visible=true, clock=0, lastTime=0;
  const hero=document.querySelector('.experience-hero');
  const perspectives=[
    {word:'BUILD',label:'FROM IDEA TO DEPLOYMENT',copy:'A healthcare platform for three roles. Built end to end, from encrypted records to Azure deployment.',link:'#healthcare',linkText:'Explore Healthcare Portal'},
    {word:'AI',label:'BETTER REPLIES. LESS WASTE.',copy:'At Paloom, I raised the internal reply-quality score from 93 to 98/100 and cut AI cost per draft by about 55%.',link:'#paloom',linkText:'Explore the AI work'},
    {word:'SECURE',label:'LOOK BEYOND THE DIFF',copy:'A whole-system review uncovered cross-tenant authorization and webhook-routing gaps. I investigated and fixed both.',link:'#security-story',linkText:'Read the security case study'}
  ];
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
    mode=Number(button.dataset.mode);
    document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
    const perspective=perspectives[mode];
    hero.dataset.perspective=String(mode);
    document.querySelector('.mode-caption').textContent=perspective.copy;
    document.querySelector('.focus-label').textContent=perspective.label;
    document.querySelector('.scene-word').textContent=perspective.word;
    document.querySelector('.scene-index').textContent=`0${mode+1} / 03`;
    const focusLink=document.querySelector('.focus-link');
    focusLink.setAttribute('href',perspective.link);
    focusLink.replaceChildren(document.createTextNode(perspective.linkText+' '));
    const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';focusLink.append(arrow);
    requestFrame();
  }));
  if(matchMedia('(pointer:fine)').matches){
    let lightFrame=0,lightX=70,lightY=42;
    hero.addEventListener('pointermove',e=>{
      if(paused)return;
      const bounds=hero.getBoundingClientRect();
      lightX=(e.clientX-bounds.left)/bounds.width*100;lightY=(e.clientY-bounds.top)/bounds.height*100;
      if(!lightFrame)lightFrame=requestAnimationFrame(()=>{hero.style.setProperty('--pointer-x',lightX+'%');hero.style.setProperty('--pointer-y',lightY+'%');lightFrame=0;});
    },{passive:true});
  }
  function requestFrame(){if(gl&&!frame&&visible&&!document.hidden)frame=requestAnimationFrame(render);}
  if(!gl){document.body.classList.add('no-webgl');return;}
  const vertex=`attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragment=`precision highp float;
    uniform vec2 resolution; uniform float time; uniform vec2 rotation; uniform float mode;
    mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
    float torus(vec3 p,float a,float b){return length(vec2(length(p.xy)-a,p.z))-b;}
    float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
    vec3 orient(vec3 p){p.xz=rot(time*.15+rotation.x+.4)*p.xz;p.yz=rot(rotation.y+.45)*p.yz;p.xy=rot(-.4)*p.xy;return p;}
    float field(vec3 p){
      vec3 q=orient(p);
      vec3 folded=q;folded.xz=rot(.72*sin(q.y*1.7+time*.18))*folded.xz;
      float ripple=.10*sin(3.*atan(folded.y,folded.x)+time*.25);
      float a=torus(folded,.96+ripple,.25+.045*cos(3.*atan(folded.y,folded.x)));
      vec3 bq=q;bq.xy=rot(.5)*bq.xy;
      float b=length(bq)-1.04 + .11*sin(bq.x*6.+time*.45)*sin(bq.y*6.)*sin(bq.z*6.);
      vec3 c=q;c.yz=rot(1.5708)*c.yz;
      float security=smin(torus(q,.91,.19),torus(c,.91,.19),.12);
      float d=mix(a,b,smoothstep(0.,1.,min(mode,1.)));
      return mix(d,security,smoothstep(1.,2.,mode));
    }
    vec3 normal(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(field(p+e.xyy)-field(p-e.xyy),field(p+e.yxy)-field(p-e.yxy),field(p+e.yyx)-field(p-e.yyx)));}
    vec3 environment(vec3 r){
      vec3 accent=mix(vec3(.53,.27,.95),vec3(.08,.7,.78),clamp(mode,0.,1.));
      accent=mix(accent,vec3(1.,.45,.19),clamp(mode-1.,0.,1.));
      vec3 col=mix(vec3(.018,.018,.028),accent*.48,smoothstep(-.6,.9,r.y));
      col+=vec3(.95,.9,1.)*pow(max(0.,dot(r,normalize(vec3(-1.,1.3,1.)))),10.);
      col+=mix(vec3(.43,.8,1.),accent,.55)*pow(max(0.,dot(r,normalize(vec3(1.,.0,1.)))),16.);
      col+=accent*.9*pow(max(0.,dot(r,normalize(vec3(-1.,-.5,.5)))),18.);
      col+=vec3(1.,.97,1.)*pow(max(0.,1.-abs(r.y-.5)*3.),28.);
      return col;
    }
    void main(){
      vec2 uv=(gl_FragCoord.xy*2.-resolution)/resolution.y;
      vec3 ro=vec3(0.,0.,4.8),rd=normalize(vec3(uv,-3.15));
      float travel=0.;vec3 p;bool hit=false;
      for(int i=0;i<72;i++){p=ro+rd*travel;float d=field(p);if(d<.0018){hit=true;break;}travel+=d*.82;if(travel>8.)break;}
      if(!hit){gl_FragColor=vec4(0.);return;}
      vec3 n=normal(p),r=reflect(rd,n);
      float facing=max(dot(n,-rd),0.);float fresnel=pow(1.-facing,3.);
      vec3 iridescent=.5+.5*cos(6.283*(vec3(.04,.18,.35)+dot(n,normalize(vec3(.2,1.,.8)))*.32+mode*.08));
      vec3 col=environment(r)*1.05+iridescent*.065;
      float diffuse=max(dot(n,normalize(vec3(-.6,1.,2.))),0.);
      col+=vec3(.07,.055,.1)*diffuse;
      vec3 rim=mix(vec3(.65,.42,1.),vec3(.18,.85,.95),clamp(mode,0.,1.));
      rim=mix(rim,vec3(1.,.55,.29),clamp(mode-1.,0.,1.));
      col+=rim*fresnel*.7;
      float spec=pow(max(dot(reflect(normalize(vec3(.5,-1.,-2.)),n),-rd),0.),65.);
      col+=vec3(1.,.95,1.)*spec;
      col*=.78+.22*smoothstep(-1.1,1.2,p.y);
      col=pow(col,vec3(.8));
      gl_FragColor=vec4(col,1.);
    }`;
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Sculpture shader did not compile');return shader;};
  let program;
  try{program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Sculpture could not start');}catch(error){document.body.classList.add('no-webgl');return;}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniforms={resolution:gl.getUniformLocation(program,'resolution'),time:gl.getUniformLocation(program,'time'),rotation:gl.getUniformLocation(program,'rotation'),mode:gl.getUniformLocation(program,'mode')};
  function resize(){const r=canvas.getBoundingClientRect();const scale=Math.min(devicePixelRatio,1.35,Math.sqrt(850000/(r.width*r.height)));canvas.width=Math.max(1,Math.floor(r.width*scale));canvas.height=Math.max(1,Math.floor(r.height*scale));gl.viewport(0,0,canvas.width,canvas.height);requestFrame();}
  function render(now){frame=0;const dt=Math.min((now-(lastTime||now))/1000,.05);lastTime=now;if(!paused)clock+=dt;angleX+=(aimX-angleX)*.09;angleY+=(aimY-angleY)*.09;currentMode+=(mode-currentMode)*(paused?1:.045);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform1f(uniforms.time,clock);gl.uniform2f(uniforms.rotation,angleX,angleY);gl.uniform1f(uniforms.mode,currentMode);gl.drawArrays(gl.TRIANGLES,0,6);if(!paused||Math.abs(aimX-angleX)+Math.abs(aimY-angleY)+Math.abs(mode-currentMode)>.002)requestFrame();}
  canvas.addEventListener('pointerdown',e=>{dragging=true;previousX=e.clientX;previousY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(dragging){aimX+=(e.clientX-previousX)*.012;aimY+=(e.clientY-previousY)*.012;previousX=e.clientX;previousY=e.clientY;requestFrame();}else if(e.pointerType==='mouse'&&!paused){const rect=canvas.getBoundingClientRect();aimX=(e.clientX-rect.left-rect.width/2)/rect.width*.8;aimY=(e.clientY-rect.top-rect.height/2)/rect.height*.5;}});
  canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();aimX+=e.key==='ArrowLeft'?-.25:e.key==='ArrowRight'?.25:0;aimY+=e.key==='ArrowUp'?-.25:e.key==='ArrowDown'?.25:0;requestFrame();}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.body.classList.add('no-webgl');cancelAnimationFrame(frame);frame=0;visible=false;});
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){lastTime=0;requestFrame();}else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'100px'}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{lastTime=0;requestFrame();}});
  resize();
})();
