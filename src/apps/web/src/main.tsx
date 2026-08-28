import React from "react";
import { Activity, Bell, Bot, Check, ChevronRight, Clock3, CloudRain, Mail, MapPin, MessageSquare, Radar, RefreshCw, Satellite, Wind, X } from "lucide-react";
import { mmrMapPaths } from "./mmr-map-data";
import type { Alert, SiteData } from "./site-data";
import { useWeatherWebMcp } from "./use-weather-webmcp";
import { quantitativeChance } from "./webmcp";
import "./styles.css";

const fallbackForecast = [
  { day: "Today", date: "28 Aug", rain: "Heavy spells", chance: 86, mm: "42–68 mm", level: "orange" as Alert },
  { day: "Sat", date: "29 Aug", rain: "Frequent rain", chance: 78, mm: "28–44 mm", level: "yellow" as Alert },
  { day: "Sun", date: "30 Aug", rain: "Scattered", chance: 54, mm: "12–22 mm", level: "yellow" as Alert },
  { day: "Mon", date: "31 Aug", rain: "Light spells", chance: 36, mm: "4–12 mm", level: "green" as Alert },
  { day: "Tue", date: "01 Sep", rain: "Isolated", chance: 24, mm: "1–6 mm", level: "green" as Alert },
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

function WaitingForData({ primaryReady, outlookReady }: { primaryReady: boolean; outlookReady: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let animationId = 0;
    const draw = () => {
      const scale = Math.min(devicePixelRatio, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * scale || canvas.height !== height * scale) {
        canvas.width = width * scale;
        canvas.height = height * scale;
      }
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.clearRect(0, 0, width, height);
      const time = reducedMotion ? 0 : frame * .008;
      const cx = width / 2;
      const cy = height / 2;
      for (let ring = 0; ring < 9; ring++) {
        context.beginPath();
        const base = 34 + ring * Math.min(width, height) * .052;
        for (let point = 0; point <= 160; point++) {
          const angle = point / 160 * Math.PI * 2;
          const drift = Math.sin(angle * (3 + ring % 3) + time * (ring % 2 ? -1 : 1) + ring) * (5 + ring * 1.4);
          const x = cx + Math.cos(angle) * (base + drift) * 1.35;
          const y = cy + Math.sin(angle) * (base + drift) * .7;
          point ? context.lineTo(x, y) : context.moveTo(x, y);
        }
        context.strokeStyle = `rgba(217,85,40,${.2 - ring * .014})`;
        context.lineWidth = ring === 0 ? 1.5 : 1;
        context.stroke();
      }
      for (let point = 0; point < 54; point++) {
        const angle = point * 2.39996 + time * (.15 + point % 4 * .035);
        const distance = 30 + (point * 47 % 280);
        const pulse = .45 + Math.sin(time * 2 + point) * .3;
        context.fillStyle = `rgba(217,85,40,${pulse})`;
        context.fillRect(cx + Math.cos(angle) * distance * 1.35, cy + Math.sin(angle) * distance * .7, 1.5, 1.5);
      }
      frame++;
      if (!reducedMotion) animationId = requestAnimationFrame(draw);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => { cancelAnimationFrame(animationId); observer.disconnect(); };
  }, []);

  const waitingFor = [!primaryReady && "nowcast", !outlookReady && "five-day outlook"].filter(Boolean).join(" and ");
  return <main className="waiting-screen" aria-live="polite">
    <canvas ref={canvasRef} className="waiting-field" aria-hidden="true" />
    <div className="waiting-brand"><span className="brand-mark"><CloudRain size={18}/></span><span>Mausam</span></div>
    <section className="waiting-copy">
      <div className="waiting-radar"><Radar size={22}/><i/><i/><i/></div>
      <div className="eyebrow">Mumbai weather intelligence</div>
      <h1>Reading the sky.</h1>
      <p>The agents are preparing the first {waitingFor} report. This page will fill in after the next build.</p>
      <div className="waiting-status"><span/><b>Waiting for agent data</b></div>
    </section>
    <small className="waiting-foot">Radar · forecast models · local observations</small>
  </main>;
}

const fallbackPrimary = {
  alert: "green" as Alert, headline: "Awaiting the first agent report.", summary: "The site data store is ready. A current nowcast will appear after the primary agent completes its next run.", analysedAt: new Date().toISOString(), rainChance: 0, expectedPeak: "Unavailable", confidence: "Low" as const, agentNote: "No persisted nowcast is available yet.", temperatureC: null, feelsLikeC: null, wind: null, rainRate: null, station: null, stationUpdatedAt: null, sourceSummary: "Waiting for the primary agent to persist its first report.",
};
const fallbackOutlook = { alert: "green" as Alert, headline: "Awaiting the first outlook report.", modelRead: "No persisted five-day outlook is available yet.", reasoning: "The forecast cards will be populated by the secondary agent after its next complete model run.", analysedAt: new Date().toISOString(), days: fallbackForecast.map(day => ({ date: day.date, label: day.day, rain: "Awaiting data", chance: null, rainfall: "Unavailable", alert: "green" as Alert })) };
const formatTime = (value: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
export default function App({ data }: { data: SiteData }) {
  useWeatherWebMcp(data);
  const primary = data.primary ?? fallbackPrimary;
  const outlook = data.outlook ?? fallbackOutlook;
  const forecast = outlook.days;
  const [refreshed, setRefreshed] = React.useState(false);
  const [reasoning, setReasoning] = React.useState(false);
  const [notifications, setNotifications] = React.useState(false);
  const refresh = () => { if(refreshed) return; setRefreshed(true); window.setTimeout(() => setRefreshed(false), 1800); };
  React.useEffect(() => {
    const nodes=[...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const observer=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){item.target.classList.add("revealed");observer.unobserve(item.target);}}),{threshold:.12});
    nodes.forEach(node=>observer.observe(node)); return()=>observer.disconnect();
  },[]);

  if (!data.primary || !data.outlook) {
    return <WaitingForData primaryReady={Boolean(data.primary)} outlookReady={Boolean(data.outlook)} />;
  }

  return (
    <div className={`app-shell ${refreshed ? "is-refreshing" : ""}`} data-alert-theme={primary.alert}>
      <RefreshLoader visible={refreshed} />
      <aside className="research-banner" aria-label="Research preview notice">
        <div className="research-notice"><span className="research-label"><Bot size={14}/> Research preview</span><p>Experimental AI-generated weather guidance. It may be incomplete or incorrect—always follow official IMD forecasts, warnings, and local emergency authorities.</p></div>
      </aside>
      <header>
        <a className="brand" href="#top" aria-label="Mausam home"><span className="brand-mark"><CloudRain size={18} /></span><span>Mausam</span></a>
        <nav aria-label="Main navigation"><a className="active" href="#top" aria-current="page">Overview</a></nav>
        <div className="header-actions"><div className="project-links"><a className="github-button" href="https://github.com/aneeshpatne/mausam3.0" target="_blank" rel="noreferrer"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.28-5.27-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.47.11-3.05 0 0 .96-.31 3.16 1.18a10.9 10.9 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"/></svg> GitHub</a><a className="license-link" href="https://github.com/aneeshpatne/mausam3.0/blob/main/LICENSE" target="_blank" rel="noreferrer">AGPL-3.0</a></div><span className="live"><i /> Live</span><div className="notification-wrap"><button className={`icon-button ${notifications ? "pressed" : ""}`} aria-label="Notifications" onClick={()=>setNotifications(v=>!v)}><Bell size={18} /><i className="unread" /></button>{notifications&&<div className="notification-pop"><div><b>Latest delivery</b><button aria-label="Close" onClick={()=>setNotifications(false)}><X size={14}/></button></div><p>Orange alert sent to email and Discord.</p><span>14:32 IST · All channels healthy</span></div>}</div><button className="refresh cta-dither" onClick={refresh}><RefreshCw size={15} className={refreshed ? "spin" : ""} />{refreshed ? "Analysing" : "Refresh"}</button></div>
      </header>

      <main id="top">
        <section className="intro" data-reveal>
          <WeatherField />
          <div className="intro-copy"><div className="eyebrow"><MapPin size={14} /> Mumbai Metropolitan Region</div><h1>{primary.headline}</h1><div className="signal-line"><span/><b>Latest signal</b><i>2 agents · one current view</i></div></div>
          <div className="updated"><Clock3 size={14} /> Last analysed {formatTime(primary.analysedAt)} IST</div>
        </section>

        <section className="hero-grid" data-reveal>
          <article className="primary-card interactive-card live-signal-box" data-alert={primary.alert}>
            <div className="scan-line" />
            <div className="card-top"><div className="agent-label"><span className="agent-icon"><Radar size={17} /></span><div><b>Nowcast agent</b><small>Current + near term</small></div></div><span className={`badge ${primary.alert}`}><StatusDot level={primary.alert} /> {primary.alert} alert</span></div>
            <div className="hero-copy"><span className="kicker">Next 3–6 hours</span><h2>{primary.headline}</h2><p>{primary.summary}</p></div>
            <div className="metrics"><div><small>Rain chance</small><strong>{primary.rainChance}%</strong></div><div><small>Expected peak</small><strong>{primary.expectedPeak}</strong></div><div><small>Confidence</small><strong>{primary.confidence}</strong></div></div>
            <div className="agent-note"><Bot size={16} /><p><b>Agent note</b> {primary.agentNote}</p></div>
          </article>

          <aside className="side-stack">
            <article className="condition-card interactive-card"><div className="section-label"><Activity size={15} /> Ground conditions</div><div className="condition-main"><div><strong><span className="number-roll">{primary.temperatureC ?? "—"}</span>{primary.temperatureC !== null && "°"}</strong><span>{primary.feelsLikeC === null ? "Latest reading unavailable" : `Feels like ${primary.feelsLikeC}°`}</span></div><div className="weather-glyph"><CloudRain size={48} strokeWidth={1.25} /><i/><i/><i/></div></div><div className="mini-grid"><div><Wind size={15} /><span>{primary.wind ?? "Wind unavailable"}</span></div><div><CloudRain size={15} /><span>{primary.rainRate ?? "Rain rate unavailable"}</span></div></div><div className="station"><span>Local station · {primary.station ?? "Unavailable"}</span><b>{primary.stationUpdatedAt ? `Updated ${primary.stationUpdatedAt}` : "Awaiting update"}</b></div></article>
            <article className="delivery-card"><div className="section-label"><Check size={15} /> Report delivered</div><Delivery icon={Mail} label="Email report" /><Delivery icon={MessageSquare} label="Discord update" /><Delivery icon={Bell} label="Alert banner" /></article>
          </aside>
        </section>

        <MmrMap />

        <section className="outlook-section" data-reveal>
          <WeatherField variant="isobars" />
          <div className="section-head"><div><div className="eyebrow"><Satellite size={14} /> Outlook agent</div><h2>{outlook.headline}</h2></div><span className={`badge ${outlook.alert}`}><StatusDot level={outlook.alert} /> 5-day peak · {outlook.alert}</span></div>
          <div className="forecast-grid">
            {forecast.map((item, i) => { const chance = quantitativeChance(item.chance, item.rainfall); return <article className={i === 0 ? "forecast today" : "forecast"} style={{"--delay":`${i*45}ms`} as React.CSSProperties} key={item.date}><div className="forecast-head"><div><b>{item.label}</b><small>{item.date}</small></div><StatusDot level={item.alert} /></div><div className="rain-icon"><CloudRain size={i < 2 ? 30 : 25} strokeWidth={1.5} /></div><strong>{item.rain}</strong>{chance !== null && <div className="chance"><span style={{ "--chance": `${chance}%` } as React.CSSProperties} /></div>}<div className="forecast-foot"><span>{chance === null ? "Chance unavailable" : `${chance}% chance`}</span><b>{item.rainfall}</b></div></article>})}
          </div>
          <div className={`model-note ${reasoning ? "expanded" : ""}`}><Bot size={17} /><div><p><b>Model read:</b> {outlook.modelRead}</p>{reasoning&&<p className="reasoning-detail">{outlook.reasoning}</p>}</div><button aria-expanded={reasoning} onClick={()=>setReasoning(v=>!v)}>{reasoning ? "Hide reasoning" : "View forecast reasoning"} <ChevronRight size={15} /></button></div>
        </section>

        <section className="lower-grid sources-only" data-reveal>
          <article className="sources-card"><div className="eyebrow">Input health</div><h3>Latest agent evidence.</h3><p>{primary.sourceSummary}</p><div className="source"><Radar size={17} /><div><b>Radar imagery</b><span>Primary agent input</span></div><Check size={15} /></div><div className="source"><Satellite size={17} /><div><b>GFS + ECMWF</b><span>10 outlook panels</span></div><Check size={15} /></div><div className="source"><Activity size={17} /><div><b>Local observations</b><span>{primary.station ?? "Station unavailable"}</span></div><Check size={15} /></div></article>
        </section>
      </main>
      <footer><span>Mausam / Mumbai weather intelligence</span><span>Times shown in IST · AI forecasts can be wrong</span></footer>
    </div>
  );
}
