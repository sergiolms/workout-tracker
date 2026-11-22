import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { Window } from 'happy-dom';

test('holding the session button keeps quick controls open after release without navigating', async () => {
  const browser = new Window({url:'http://localhost:5173'});
  const globals = {window:browser,document:browser.document,navigator:browser.navigator,HTMLElement:browser.HTMLElement,Element:browser.Element,Node:browser.Node,Event:browser.Event,PointerEvent:browser.PointerEvent,ResizeObserver:browser.ResizeObserver,MutationObserver:browser.MutationObserver,getComputedStyle:browser.getComputedStyle.bind(browser),requestAnimationFrame:browser.requestAnimationFrame.bind(browser),cancelAnimationFrame:browser.cancelAnimationFrame.bind(browser),IS_REACT_ACT_ENVIRONMENT:true};
  const previous = new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(globals))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  const server = await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom',resolve:{alias:{'@':new URL('../',import.meta.url).pathname}},plugins:[react()]});
  let root;
  try {
    const {createElement,act} = await import('react');
    const {createRoot} = await import('react-dom/client');
    const {WorkoutNavigationButton} = await server.ssrLoadModule('/components/workout-navigation-button.tsx');
    const container=document.createElement('div');document.body.append(container);root=createRoot(container);
    let navigation=0, pauses=0, stops=0;
    await act(async()=>root.render(createElement(WorkoutNavigationButton,{workout:{id:'a',week:1,routine:'r',date:'2026-11-22',startedAt:new Date().toISOString()},name:'Test session',active:false,editable:true,onSelect:()=>navigation++,onPause:()=>pauses++,onStop:()=>stops++})));
    const trigger=container.querySelector('button');
    await act(async()=>trigger.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:10,clientY:10})));
    await act(async()=>new Promise(resolve=>setTimeout(resolve,550)));
    await act(async()=>{trigger.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0}));trigger.click();});
    assert.equal(navigation,0);
    const pause=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Pausar');
    assert.ok(pause,'quick controls remain after pointer release');
    await act(async()=>pause.click());assert.equal(pauses,1);assert.equal(stops,0);
    await act(async()=>trigger.click());assert.equal(navigation,1,'a short click opens the session');
  } finally {
    if(root){const {act}=await import('react');await act(async()=>root.unmount());}
    await server.close();await browser.happyDOM.abort();
    for(const [key,value] of previous){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
  }
});
