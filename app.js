'use strict';
// Orthographic projection of the A3/D3 roots. Rotation changes the viewing angle;
// it is not a simulation of the proposed physical or metaphysical dynamics.
(() => {
  const svg = document.getElementById('geometry');
  const drawing = document.getElementById('geometry-drawing');
  const rotateButton = document.getElementById('rotate-view');
  const resetButton = document.getElementById('reset-view');
  const vectorToggle = document.getElementById('show-vectors');
  const vectorsOnlyButton = document.getElementById('vectors-only');
  let vectorsOnly = false;
  let previousVectorVisibility = true;
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const zoomLevel = document.getElementById('zoom-level');
  const expandButton = document.getElementById('expand-view');
  const dialog = document.getElementById('geometry-dialog');
  const stage = svg.closest('.geometry-stage');
  const figure = stage.parentElement;
  const caption = document.getElementById('geometry-caption');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const points = [];
  for (let zero = 0; zero < 3; zero++) {
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      const nonzero = [a, b];
      points.push([0, 1, 2].map(axis => axis === zero ? 0 : nonzero.shift()));
    }
  }
  const edges = [];
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    if (points[i].reduce((sum, v, axis) => sum + (v - points[j][axis]) ** 2, 0) === 2) edges.push([i, j]);
  }
  const faces = [];
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) faces.push(points.flatMap((p, i) => p[axis] === sign ? [i] : []));
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) faces.push(points.flatMap((p, i) => a * p[0] + b * p[1] + c * p[2] === 2 ? [i] : []));
  // Unit quaternions allow uninterrupted rotation through the poles and full rolls.
  const multiply = (a,b) => [
    a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],
    a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],
    a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],
    a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]
  ];
  const axisAngle = (axis,angle) => {
    const length = Math.hypot(...axis);
    if (!length) return [1,0,0,0];
    const s = Math.sin(angle/2)/length;
    return [Math.cos(angle/2),...axis.map(value=>value*s)];
  };
  const initialOrientation = multiply(axisAngle([1,0,0],-.29),axisAngle([0,1,0],.52));
  let orientation = [...initialOrientation];
  let zoom = 1;
  let pointer = null;
  let previousOverflow = '';
  const rotate = (axis,angle) => {
    const q = multiply(axisAngle(axis,angle),orientation);
    const norm = Math.hypot(...q);
    orientation = q.map(value=>value/norm);
  };
  const transform = point => {
    const [w,x,y,z] = orientation;
    const result = multiply(multiply(orientation,[0,...point]),[w,-x,-y,-z]);
    return result.slice(1);
  };
  let running = false;
  let frame = null;
  let lastTime = 0;
  const ns = 'http://www.w3.org/2000/svg';
  const element = (tag, attrs) => {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  function render() {
    const bounds = svg.getBoundingClientRect();
    const width = Math.max(bounds.width,1);
    const height = Math.max(bounds.height,1);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const cx = width * (width>700 && !dialog.open ? .46 : .5);
    const cy = height/2;
    const scale = Math.min(width*.37,height*.43)/Math.SQRT2*zoom;
    const projected = points.map(point => {
      const [x,y,z] = transform(point);
      return {x:cx+x*scale,y:cy+y*scale,z};
    });
    const fragment = document.createDocumentFragment();
    const sortedFaces = faces.map(ids => {
      const center = ids.reduce((s,id)=>({x:s.x+projected[id].x/ids.length,y:s.y+projected[id].y/ids.length,z:s.z+projected[id].z/ids.length}),{x:0,y:0,z:0});
      return {ids:[...ids].sort((a,b)=>Math.atan2(projected[a].y-center.y,projected[a].x-center.x)-Math.atan2(projected[b].y-center.y,projected[b].x-center.x)),center};
    }).sort((a,b)=>a.center.z-b.center.z);
    if (!vectorsOnly) for (const face of sortedFaces) fragment.appendChild(element('polygon', {
      points:face.ids.map(id=>`${projected[id].x},${projected[id].y}`).join(' '),
      fill:face.ids.length===3?'#b6a0c5':'#f8f4fb','fill-opacity':face.center.z>0?'.30':'.12'
    }));
    if (vectorToggle.checked) {
      for (const p of projected) fragment.appendChild(element('line',{x1:cx,y1:cy,x2:p.x,y2:p.y,stroke:vectorsOnly?'#705583':'#846b97','stroke-width':vectorsOnly?'1.8':'.9','stroke-opacity':vectorsOnly?(p.z>0?'.95':'.6'):'.35','stroke-dasharray':vectorsOnly?'none':'3 4'}));
      fragment.appendChild(element('circle',{cx,cy,r:3,fill:'#6d547e'}));
    }
    if (!vectorsOnly) for (const [a,b] of [...edges].sort((u,v)=>projected[u[0]].z+projected[u[1]].z-projected[v[0]].z-projected[v[1]].z)) {
      const front=(projected[a].z+projected[b].z)/2>0;
      fragment.appendChild(element('line',{x1:projected[a].x,y1:projected[a].y,x2:projected[b].x,y2:projected[b].y,stroke:front?'#665170':'#9d8aa9','stroke-width':front?'1.55':'1','stroke-opacity':front?'.95':'.5'}));
    }
    for (const p of [...projected].sort((a,b)=>a.z-b.z)) fragment.appendChild(element('circle',{cx:p.x,cy:p.y,r:p.z>0?4:3,fill:p.z>0?'#5d456e':'#aa99b5'}));
    drawing.replaceChildren(fragment);
    zoomLevel.textContent = `${Math.round(zoom*100)}%`;
    zoomIn.disabled = zoom>=1.8;
    zoomOut.disabled = zoom<=.6;
  }
  function animate(time) {
    if (!running) return;
    if (lastTime) rotate([0,1,0],Math.min(time-lastTime,40)*0.00019);
    lastTime=time;
    render();
    frame=requestAnimationFrame(animate);
  }
  function stop() {
    running=false;
    if(frame!==null)cancelAnimationFrame(frame);
    frame=null;lastTime=0;
    rotateButton.setAttribute('aria-pressed','false');
    rotateButton.innerHTML='<span aria-hidden="true">↻</span> Auto-rotate';
  }
  function endDrag(event) {
    if (!pointer || (event && event.pointerId!==pointer.id)) return;
    const id = pointer.id;
    pointer = null;
    svg.classList.remove('dragging');
    if (svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
  }
  function reset() {
    stop();endDrag();orientation=[...initialOrientation];zoom=1;render();
  }
  function changeZoom(amount) {
    zoom=Math.max(.6,Math.min(1.8,Math.round((zoom+amount)*1000)/1000));render();
  }
  svg.addEventListener('pointerdown',event=>{
    if (event.button!==0 || pointer) return;
    stop();
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
    svg.setPointerCapture(event.pointerId);
    svg.focus({preventScroll:true});
    svg.classList.add('dragging');
    event.preventDefault();
  });
  svg.addEventListener('pointermove',event=>{
    if (!pointer || event.pointerId!==pointer.id) return;
    const dx=event.clientX-pointer.x;
    const dy=event.clientY-pointer.y;
    pointer.x=event.clientX;pointer.y=event.clientY;
    const size=Math.max(180,Math.min(svg.clientWidth,svg.clientHeight));
    rotate([-dy,dx,0],Math.hypot(dx,dy)/size*Math.PI);
    render();event.preventDefault();
  });
  svg.addEventListener('pointerup',endDrag);
  svg.addEventListener('pointercancel',endDrag);
  svg.addEventListener('lostpointercapture',endDrag);
  svg.addEventListener('keydown',event=>{
    const directions={ArrowLeft:[0,-1,0],ArrowRight:[0,1,0],ArrowUp:[1,0,0],ArrowDown:[-1,0,0]};
    if (directions[event.key]) {stop();rotate(directions[event.key],Math.PI/18);render();}
    else if (event.key==='Home') reset();
    else if (event.key==='+' || event.key==='=') changeZoom(.1);
    else if (event.key==='-') changeZoom(-.1);
    else return;
    event.preventDefault();
  });
  svg.addEventListener('wheel',event=>{
    if (document.activeElement!==svg || event.ctrlKey) return;
    event.preventDefault();changeZoom(-Math.sign(event.deltaY)*.05);
  },{passive:false});
  zoomIn.addEventListener('click',()=>changeZoom(.1));
  zoomOut.addEventListener('click',()=>changeZoom(-.1));
  expandButton.addEventListener('click',()=>{
    stop();endDrag();
    if (dialog.open) {dialog.close();return;}
    previousOverflow=document.body.style.overflow;
    dialog.appendChild(stage);
    dialog.showModal();
    document.body.style.overflow='hidden';
    expandButton.innerHTML='<span aria-hidden="true">×</span> Close view';
    expandButton.setAttribute('aria-expanded','true');
    expandButton.focus({preventScroll:true});
    render();
  });
  dialog.addEventListener('close',()=>{
    stop();endDrag();figure.insertBefore(stage,caption);
    document.body.style.overflow=previousOverflow;
    expandButton.innerHTML='<span aria-hidden="true">⛶</span> Expand view';
    expandButton.setAttribute('aria-expanded','false');
    expandButton.focus({preventScroll:true});render();
  });
  rotateButton.addEventListener('click',()=>{
    endDrag();
    if(reducedMotion.matches){rotate([0,1,0],Math.PI/6);render();return;}
    if(running){stop();return;}
    running=true;
    rotateButton.setAttribute('aria-pressed','true');
    rotateButton.innerHTML='<span aria-hidden="true">Ⅱ</span> Pause';
    frame=requestAnimationFrame(animate);
  });
  resetButton.addEventListener('click',reset);
  vectorsOnlyButton.addEventListener('click',()=>{
    vectorsOnly=!vectorsOnly;
    if (vectorsOnly) {
      previousVectorVisibility=vectorToggle.checked;
      vectorToggle.checked=true;
    } else vectorToggle.checked=previousVectorVisibility;
    vectorToggle.disabled=vectorsOnly;
    vectorsOnlyButton.setAttribute('aria-pressed',String(vectorsOnly));
    render();
  });
  vectorToggle.addEventListener('change',render);
  window.addEventListener('resize',render,{passive:true});
  reducedMotion.addEventListener('change',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();endDrag();}});
  window.addEventListener('blur',()=>{stop();endDrag();});
  if ('ResizeObserver' in window) new ResizeObserver(render).observe(svg);
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();}).observe(svg);
    const navLinks=[...document.querySelectorAll('.contents>a')];
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        navLinks.forEach(link=>{
          const active=link.hash===`#${entry.target.id}`;
          link.classList.toggle('active',active);
          if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
        });
      }
    },{rootMargin:'-15% 0px -65% 0px',threshold:0});
    document.querySelectorAll('#proposal,#findings,#next,#papers,#earlier-solution').forEach(section=>observer.observe(section));
  }
  render();
  document.documentElement.classList.add('js-ready');
})();
