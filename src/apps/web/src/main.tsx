import React from "react";
import { Activity, Bell, Bot, Check, ChevronRight, Clock3, CloudRain, Mail, MapPin, MessageSquare, Radar, RefreshCw, Satellite, Wind, X } from "lucide-react";
import { mmrMapPaths } from "./mmr-map-data";
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

function MmrMap() {
  return <section className="map-section" data-reveal aria-labelledby="map-title">
    <div className="map-head">
      <div><div className="eyebrow"><Radar size={14}/> Hyperlocal scan · 14:32 IST</div><h2 id="map-title">The storm has a shape.</h2></div>
    </div>
    <div className="mmr-map-wrap">
      <div className="map-coordinate top">19.278° N</div><div className="map-coordinate bottom">18.892° N</div>
      <svg className="mmr-map" viewBox="0 0 900 590" role="img" aria-label="Stylised weather map of Mumbai Metropolitan Region showing rain intensity over Andheri, Bandra, Thane, Vashi and Panvel">
        <defs>
          <pattern id="map-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="currentColor" strokeWidth=".7"/></pattern>
          <pattern id="map-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor"/></pattern>
          <filter id="map-blur"><feGaussianBlur stdDeviation="18"/></filter>
        </defs>
        <rect width="900" height="590" className="map-sea"/><rect width="900" height="590" className="map-grid-fill" fill="url(#map-grid)"/>
        <g className="rain-mass" filter="url(#map-blur)"><path d="M64 167C158 101 286 129 334 218s-19 166-113 175S48 312 64 167Z"/><path d="M257 201c82-41 190 4 200 83s-68 119-147 78-118-128-53-161Z"/></g>
        <g className="osm-geometry"><path className="waterways" d={mmrMapPaths.water}/><path className="minor-roads" d={mmrMapPaths.secondary}/><path className="major-roads" d={mmrMapPaths.primary}/><path className="arteries" d={mmrMapPaths.motorway}/><path className="railways" d={mmrMapPaths.rail}/><path className="coastline" d={mmrMapPaths.coast}/></g>
        <g className="map-labels district"><text x="96" y="84">ARABIAN SEA</text><text x="440" y="72">THANE</text><text x="674" y="362">NAVI MUMBAI</text><text x="270" y="502">MUMBAI</text></g>
        <g className="map-labels locality"><text x="243" y="192">BORIVALI</text><text x="369" y="247">MULUND</text><text x="571" y="175">DOMBIVLI</text><text x="594" y="101">KALYAN</text><text x="394" y="298">AIROLI</text><text x="488" y="365">NERUL</text><text x="215" y="435">WORLI</text><text x="249" y="536">COLABA</text></g>
        <g className="storm-rings"><circle cx="221" cy="264" r="88"/><circle cx="221" cy="264" r="61"/><circle cx="221" cy="264" r="34"/></g>
        <path className="storm-vector" d="M55 330C128 313 171 288 226 247s103-67 152-72"/><path className="storm-vector-head" d="M359 160l22 13-12 23"/>
        <g className="scale"><path d="M697 528h118"/><path d="M697 522v12M756 522v12M815 522v12"/><text x="697" y="553">0</text><text x="748" y="553">10</text><text x="804" y="553">20 KM</text></g>
      </svg>
      <div className="map-legend"><span><i className="moderate"/>Moderate</span><span><i className="heavy"/>Heavy</span><span><i className="intense"/>Intense</span></div>
      <div className="map-caption"><b>WEST → ENE</b><span>Cell motion · 21 km/h</span></div>
      <a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </div>
  </section>;
}

function StatusDot({ level }: { level: Alert }) {
  return <span className={`status-dot ${level}`} aria-label={`${level} alert`} />;
}

function Delivery({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return <div className="delivery"><Icon size={15} /><span>{label}</span><Check size={14} className="check" /></div>;
}

function WeatherField({ variant = "front" }: { variant?: "front" | "isobars" }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const draw = () => {
      const scale = Math.min(devicePixelRatio, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * scale;
      canvas.height = height * scale;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.clearRect(0, 0, width, height);
      const originX = variant === "front" ? width * .78 : width * .84;
      const originY = variant === "front" ? height * .48 : height * .3;
      context.strokeStyle = "rgba(217, 85, 40, .14)";
      context.lineWidth = 1;
      for (let ring = 0; ring < 7; ring++) {
        context.beginPath();
        for (let step = 0; step <= 96; step++) {
          const angle = step / 96 * Math.PI * 2;
          const radius = 38 + ring * 30 + Math.sin(angle * 3 + ring * .9) * (8 + ring * 1.5);
          const x = originX + Math.cos(angle) * radius * 1.8;
          const y = originY + Math.sin(angle) * radius * .72;
          step ? context.lineTo(x, y) : context.moveTo(x, y);
        }
        context.stroke();
      }
      context.fillStyle = "rgba(217, 85, 40, .15)";
      for (let i = 0; i < 120; i++) {
        const x = (i * 83 % 127) / 127 * width;
        const y = (i * 47 % 113) / 113 * height;
        const falloff = Math.max(0, 1 - Math.hypot((x-originX)/(width*.65), (y-originY)/(height*.8)));
        if (((i * 31) % 100) / 100 < falloff * .34) context.fillRect(x, y, 1, 1);
      }
    };
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    return () => observer.disconnect();
  },[variant]);
  return <canvas className={`weather-field weather-field-${variant}`} ref={canvasRef} aria-hidden="true" />;
}

function RefreshLoader({ visible }: { visible: boolean }) {
  return <div className={`refresh-loader ${visible ? "visible" : ""}`} aria-live="polite" aria-hidden={!visible}><div className="loader-radar"><Radar size={21}/><i/><i/><i/></div><div><b>Agents are reading the sky</b><span>Comparing radar · models · station data</span></div></div>;
}

export default function App() {
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
          <WeatherField />
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

        <MmrMap />

        <section className="outlook-section" data-reveal>
          <WeatherField variant="isobars" />
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
