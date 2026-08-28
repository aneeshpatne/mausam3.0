import React from "react";
import { createRoot } from "react-dom/client";
import { Activity, Bell, Bot, Check, ChevronRight, Clock3, CloudRain, Mail, MapPin, MessageSquare, Radar, RefreshCw, Satellite, Wind, X } from "lucide-react";
import "./styles.css";

type Alert = "green" | "yellow" | "orange" | "red";

const forecast = [
  { day: "Today", date: "28 Aug", rain: "Heavy spells", chance: 86, mm: "42–68 mm", level: "orange" as Alert },
  { day: "Sat", date: "29 Aug", rain: "Frequent rain", chance: 78, mm: "28–44 mm", level: "yellow" as Alert },
  { day: "Sun", date: "30 Aug", rain: "Scattered", chance: 54, mm: "12–22 mm", level: "yellow" as Alert },
  { day: "Mon", date: "31 Aug", rain: "Light spells", chance: 36, mm: "4–12 mm", level: "green" as Alert },
  { day: "Tue", date: "01 Sep", rain: "Isolated", chance: 24, mm: "1–6 mm", level: "green" as Alert },
];

const runs = [
  { agent: "Nowcast", time: "14:32", note: "Alert raised to orange", level: "orange" as Alert },
  { agent: "Outlook", time: "12:05", note: "D2 rain signal strengthened", level: "yellow" as Alert },
  { agent: "Nowcast", time: "09:18", note: "Morning report delivered", level: "yellow" as Alert },
];

function StatusDot({ level }: { level: Alert }) {
  return <span className={`status-dot ${level}`} aria-label={`${level} alert`} />;
}

function Delivery({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return <div className="delivery"><Icon size={15} /><span>{label}</span><Check size={14} className="check" /></div>;
}

function HeroShader() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: false });
    if (!canvas || !gl) return;
    const vertex = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
    const fragment = `precision mediump float;uniform vec2 r;uniform vec2 m;uniform float t;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);vec2 mouse=(m-.5*r)/min(r.x,r.y);
        float d=length(p-mouse);float pulse=.5+.5*sin(d*34.-t*2.2);float field=exp(-d*2.6)*(.32+.22*pulse);
        float cloud=sin(p.x*5.2+t*.08)*sin(p.y*4.1-t*.06)*.07+.07;
        float grain=hash(floor(gl_FragCoord.xy/3.));float mask=step(grain,field+cloud);
        vec3 paper=vec3(.933,.941,.953);vec3 alert=vec3(.898,.396,.196);vec3 c=mix(paper,alert,mask*.62);
        float edge=smoothstep(.92,.25,length(uv-.5));gl_FragColor=vec4(c,edge*.72);}`;
    const compile = (type: number, source: string) => { const s=gl.createShader(type)!; gl.shaderSource(s,source); gl.compileShader(s); return s; };
    const program=gl.createProgram()!; gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex)); gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment)); gl.linkProgram(program); gl.useProgram(program);
    const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,"p"); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    const res=gl.getUniformLocation(program,"r"), mouse=gl.getUniformLocation(program,"m"), time=gl.getUniformLocation(program,"t");
    let mx=.72,my=.48,frame=0; const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize=()=>{const d=Math.min(devicePixelRatio,2);canvas.width=canvas.clientWidth*d;canvas.height=canvas.clientHeight*d;gl.viewport(0,0,canvas.width,canvas.height);};
    const move=(e:PointerEvent)=>{const b=canvas.getBoundingClientRect();mx=(e.clientX-b.left)/b.width;my=1-(e.clientY-b.top)/b.height;};
    const draw=(now=0)=>{resize();gl.uniform2f(res,canvas.width,canvas.height);gl.uniform2f(mouse,mx*canvas.width,my*canvas.height);gl.uniform1f(time,now/1000);gl.drawArrays(gl.TRIANGLES,0,6);if(!reduced)frame=requestAnimationFrame(draw);};
    canvas.addEventListener("pointermove",move); draw(); return()=>{cancelAnimationFrame(frame);canvas.removeEventListener("pointermove",move);};
  },[]);
  return <canvas className="hero-shader" ref={canvasRef} aria-hidden="true" />;
}

function RefreshLoader({ visible }: { visible: boolean }) {
  return <div className={`refresh-loader ${visible ? "visible" : ""}`} aria-live="polite" aria-hidden={!visible}><div className="loader-radar"><Radar size={21}/><i/><i/><i/></div><div><b>Agents are reading the sky</b><span>Comparing radar · models · station data</span></div></div>;
}

function App() {
  const [tab, setTab] = React.useState<"overview" | "runs">("overview");
  const [refreshed, setRefreshed] = React.useState(false);
  const [reasoning, setReasoning] = React.useState(false);
  const [notifications, setNotifications] = React.useState(false);
  const refresh = () => { if(refreshed) return; setRefreshed(true); window.setTimeout(() => setRefreshed(false), 1800); };
  React.useEffect(() => {
    const nodes=[...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const observer=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){item.target.classList.add("revealed");observer.unobserve(item.target);}}),{threshold:.12});
    nodes.forEach(node=>observer.observe(node)); return()=>observer.disconnect();
  },[]);

  return (
    <div className={`app-shell ${refreshed ? "is-refreshing" : ""}`} data-alert-theme="orange">
      <RefreshLoader visible={refreshed} />
      <header>
        <a className="brand" href="#top" aria-label="Mausam home"><span className="brand-mark"><CloudRain size={18} /></span><span>Mausam</span></a>
        <nav aria-label="Main navigation">
          <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
          <button className={tab === "runs" ? "active" : ""} onClick={() => setTab("runs")}>Agent runs</button>
        </nav>
        <div className="header-actions"><span className="live"><i /> Live</span><div className="notification-wrap"><button className={`icon-button ${notifications ? "pressed" : ""}`} aria-label="Notifications" onClick={()=>setNotifications(v=>!v)}><Bell size={18} /><i className="unread" /></button>{notifications&&<div className="notification-pop"><div><b>Latest delivery</b><button aria-label="Close" onClick={()=>setNotifications(false)}><X size={14}/></button></div><p>Orange alert sent to email and Discord.</p><span>14:32 IST · All channels healthy</span></div>}</div><button className="refresh cta-dither" onClick={refresh}><RefreshCw size={15} className={refreshed ? "spin" : ""} />{refreshed ? "Analysing" : "Refresh"}</button></div>
      </header>

      <main id="top">
        <section className="intro" data-reveal>
          <HeroShader />
          <div className="intro-copy"><div className="eyebrow"><MapPin size={14} /> Mumbai Metropolitan Region</div><h1>Rain is building<br /><span>towards the evening.</span></h1><div className="signal-line"><span/><b>Live signal</b><i>18 sources · 2 agents · one current view</i></div></div>
          <div className="updated"><Clock3 size={14} /> Last analysed 14:32 IST</div>
        </section>

        <section className="hero-grid" data-reveal>
          <article className="primary-card interactive-card live-signal-box" data-alert="orange">
            <div className="scan-line" />
            <div className="card-top"><div className="agent-label"><span className="agent-icon"><Radar size={17} /></span><div><b>Nowcast agent</b><small>Current + near term</small></div></div><span className="badge orange"><StatusDot level="orange" /> Orange alert</span></div>
            <div className="hero-copy"><span className="kicker">Next 3–6 hours</span><h2>Heavy rain likely across western and central suburbs.</h2><p>Strong echoes are consolidating west of Mumbai and moving east-northeast. Short, intense spells may reduce visibility and cause local waterlogging during the evening commute.</p></div>
            <div className="metrics"><div><small>Rain chance</small><strong>86%</strong></div><div><small>Expected peak</small><strong>5–7 PM</strong></div><div><small>Confidence</small><strong>High</strong></div></div>
            <div className="agent-note"><Bot size={16} /><p><b>Agent note</b> Escalated from yellow at 14:32 as offshore echoes strengthened. Next useful check in 3 hours.</p></div>
          </article>

          <aside className="side-stack">
            <article className="condition-card interactive-card"><div className="section-label"><Activity size={15} /> Ground conditions</div><div className="condition-main"><div><strong><span className="number-roll">29</span>°</strong><span>Feels like 34°</span></div><div className="weather-glyph"><CloudRain size={48} strokeWidth={1.25} /><i/><i/><i/></div></div><div className="mini-grid"><div><Wind size={15} /><span>WSW 19 km/h</span></div><div><CloudRain size={15} /><span>7.8 mm / hr</span></div></div><div className="station"><span>Local station · Andheri</span><b>Updated 14:25</b></div></article>
            <article className="delivery-card"><div className="section-label"><Check size={15} /> Report delivered</div><Delivery icon={Mail} label="Email report" /><Delivery icon={MessageSquare} label="Discord update" /><Delivery icon={Bell} label="Alert banner" /></article>
          </aside>
        </section>

        <section className="outlook-section" data-reveal>
          <div className="section-head"><div><div className="eyebrow"><Satellite size={14} /> Outlook agent</div><h2>The signal eases after Sunday.</h2></div><span className="badge yellow"><StatusDot level="yellow" /> 5-day peak · Yellow</span></div>
          <div className="forecast-grid">
            {forecast.map((item, i) => <article className={i === 0 ? "forecast today" : "forecast"} style={{"--delay":`${i*45}ms`} as React.CSSProperties} key={item.day}><div className="forecast-head"><div><b>{item.day}</b><small>{item.date}</small></div><StatusDot level={item.level} /></div><div className="rain-icon"><CloudRain size={i < 2 ? 30 : 25} strokeWidth={1.5} /></div><strong>{item.rain}</strong><div className="chance"><span style={{ "--chance": `${item.chance}%` } as React.CSSProperties} /></div><div className="forecast-foot"><span>{item.chance}% chance</span><b>{item.mm}</b></div></article>)}
          </div>
          <div className={`model-note ${reasoning ? "expanded" : ""}`}><Bot size={17} /><div><p><b>Model read:</b> GFS and ECMWF agree on the Friday peak, then diverge slightly on Sunday coverage. Confidence improves again from Monday.</p>{reasoning&&<p className="reasoning-detail">ECMWF keeps the offshore trough organised six hours longer. GFS disperses it earlier. Both retain lighter, scattered convection through Sunday afternoon.</p>}</div><button aria-expanded={reasoning} onClick={()=>setReasoning(v=>!v)}>{reasoning ? "Hide reasoning" : "View forecast reasoning"} <ChevronRight size={15} /></button></div>
        </section>

        <section className="lower-grid" data-reveal>
          <article className="timeline-card"><div className="section-head compact"><div><div className="eyebrow">Recent activity</div><h3>What the agents changed</h3></div><button onClick={() => setTab("runs")}>All runs <ChevronRight size={15} /></button></div><div className="timeline">{runs.map((run, i) => <div className="run" key={run.time}><div className="run-line"><StatusDot level={run.level} />{i < runs.length - 1 && <i />}</div><div><b>{run.note}</b><span>{run.agent} agent · {run.time} IST</span></div></div>)}</div></article>
          <article className="sources-card"><div className="eyebrow">Input health</div><h3>Sources are current.</h3><p>Both agents have the latest radar, forecast and station observations.</p><div className="source"><Radar size={17} /><div><b>Radar imagery</b><span>4 frames · 6 min ago</span></div><Check size={15} /></div><div className="source"><Satellite size={17} /><div><b>GFS + ECMWF</b><span>10 panels · 2 hr ago</span></div><Check size={15} /></div><div className="source"><Activity size={17} /><div><b>Local observations</b><span>Andheri · 7 min ago</span></div><Check size={15} /></div></article>
        </section>
      </main>
      <footer><span>Mausam / Mumbai weather intelligence</span><span>Times shown in IST · AI forecasts can be wrong</span></footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
