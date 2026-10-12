import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const topics = [
  ['01', "Systems engineering", "Design, integration and management of complex systems from an interdisciplinary perspective."],
  ['02', "Intelligent technologies", "Exchange ideas on engineering, infrastructure and technologies that connect disciplines."],
  ['03', "Sustainability and society", "Systems thinking applied to sustainability and the challenges of sociotechnical systems."],
];
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const destination = isAuthenticated ? '/dashboard' : '/register';
  return <div className="syscon-home">
    <section className="syscon-hero" aria-labelledby="conference-title"><div className="container-shell syscon-hero-layout">
      <div><p className="syscon-eyebrow">IEEE Systems Council · First Latin American edition</p>
        <h1 id="conference-title" className="syscon-wordmark">SYSCON <span>LATAM <strong>2026</strong></span></h1>
        <p className="syscon-subtitle">The 1st IEEE Latin American Systems Conference</p>
        <div className="syscon-rule" />
        <h2 className="syscon-heading">Connecting disciplines.<br />Building systems.</h2>
        <p className="syscon-description">Research, industry and collaboration to advance the design, integration and management of complex systems in Latin America.</p>
        <div className="syscon-actions"><Link className="syscon-button syscon-primary" to={destination}>{isAuthenticated ? "Go to my dashboard" : "Register now"} <span aria-hidden="true">↗</span></Link><a className="syscon-button syscon-outline" href="#conferencia">About the conference <span aria-hidden="true">↓</span></a></div>
      </div>
      <aside className="syscon-event" aria-label="Event information"><div className="syscon-event-top"><span>See you in</span><span>01 / LATAM</span></div><p className="syscon-city">Cartagena<span>Colombia</span></p><div className="syscon-date"><span>03—04</span><p>DECEMBER<br /><strong>2026</strong></p></div><p className="syscon-event-copy">Two days of scientific exchange and connections between academia, industry and institutional leaders.</p><div className="syscon-event-top"><span>IEEE SYSCON LATAM 2026</span><span aria-hidden="true">↗</span></div></aside>
    </div></section>
    <div className="syscon-organizers"><div className="container-shell"><span>A connected community</span><p>IEEE Systems Council</p><p>IEEE Region 9</p><p>IEEE Colombian Caribbean Section</p><p>Universidad Tecnológica de Bolívar</p></div></div>
    <section id="conferencia" className="container-shell syscon-about" aria-labelledby="about-title"><div><p className="syscon-eyebrow">Cartagena, Colombia · December 3–4</p><h2 id="about-title">A new platform for <span>systems thinking.</span></h2></div><div className="syscon-about-copy"><p><strong>IEEE SYSCON LATAM 2026</strong> brings together researchers, practitioners, industry experts and institutional leaders to discuss the design, integration and management of complex systems across diverse domains.</p><p>The first IEEE Latin American Systems Conference offers a regional forum for interdisciplinary collaboration, aligned with the vision of the IEEE Systems Council, connecting academia, industry and government in an international setting.</p><p>From Cartagena, we exchange ideas and strengthen collaboration in engineering, infrastructure, intelligent technologies, sustainability and sociotechnical systems.</p></div></section>
    <section className="syscon-topics" aria-labelledby="topics-title"><div className="container-shell"><p className="syscon-eyebrow">Ideas that connect us</p><h2 id="topics-title">Complex systems. Shared perspectives.</h2><div className="syscon-topic-grid">{topics.map(([number,title,description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
    <section className="container-shell syscon-registration"><div><p className="syscon-eyebrow">Be part of the first edition</p><h2>Our next meeting is in Cartagena.</h2><p>Register and manage your conference participation on the platform.</p></div><Link className="syscon-button syscon-primary" to={destination}>{isAuthenticated ? "Go to my dashboard" : "Start registration"} <span aria-hidden="true">↗</span></Link></section>
  </div>;
}
