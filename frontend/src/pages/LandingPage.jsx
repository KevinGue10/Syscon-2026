import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const topics = [
  ['01', 'Ingeniería de sistemas', 'Diseño, integración y gestión de sistemas complejos desde una perspectiva interdisciplinaria.'],
  ['02', 'Tecnologías inteligentes', 'Intercambio de ideas sobre ingeniería, infraestructura y tecnologías que conectan disciplinas.'],
  ['03', 'Sostenibilidad y sociedad', 'Pensamiento sistémico aplicado a la sostenibilidad y a los desafíos de los sistemas sociotécnicos.'],
];
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const destination = isAuthenticated ? '/dashboard' : '/register';
  return <div className="syscon-home">
    <section className="syscon-hero" aria-labelledby="conference-title"><div className="container-shell syscon-hero-layout">
      <div><p className="syscon-eyebrow">IEEE Systems Council · Primera edición latinoamericana</p>
        <h1 id="conference-title" className="syscon-wordmark">SYSCON <span>LATAM <strong>2026</strong></span></h1>
        <p className="syscon-subtitle">The 1st IEEE Latin American Systems Conference</p>
        <div className="syscon-rule" />
        <h2 className="syscon-heading">Conectando disciplinas.<br />Construyendo sistemas.</h2>
        <p className="syscon-description">Investigación, industria y colaboración para avanzar en el diseño, la integración y la gestión de sistemas complejos en América Latina.</p>
        <div className="syscon-actions"><Link className="syscon-button syscon-primary" to={destination}>{isAuthenticated ? 'Ir a mi panel' : 'Registrarme'} <span aria-hidden="true">↗</span></Link><a className="syscon-button syscon-outline" href="#conferencia">Conocer la conferencia <span aria-hidden="true">↓</span></a></div>
      </div>
      <aside className="syscon-event" aria-label="Información del evento"><div className="syscon-event-top"><span>Nos vemos en</span><span>01 / LATAM</span></div><p className="syscon-city">Cartagena<span>Colombia</span></p><div className="syscon-date"><span>03—04</span><p>DICIEMBRE<br /><strong>2026</strong></p></div><p className="syscon-event-copy">Dos días de intercambio científico y conexión entre academia, industria y líderes institucionales.</p><div className="syscon-event-top"><span>IEEE SYSCON LATAM 2026</span><span aria-hidden="true">↗</span></div></aside>
    </div></section>
    <div className="syscon-organizers"><div className="container-shell"><span>Una comunidad conectada</span><p>IEEE Systems Council</p><p>IEEE Región 9</p><p>IEEE Colombian Caribbean Section</p><p>Universidad Tecnológica de Bolívar</p></div></div>
    <section id="conferencia" className="container-shell syscon-about" aria-labelledby="about-title"><div><p className="syscon-eyebrow">Cartagena, Colombia · 3 y 4 de diciembre</p><h2 id="about-title">Una nueva plataforma para el <span>pensamiento sistémico.</span></h2></div><div className="syscon-about-copy"><p><strong>IEEE SYSCON LATAM 2026</strong> reúne a investigadores, profesionales, expertos de la industria y líderes institucionales para discutir el diseño, la integración y la gestión de sistemas complejos en diversos dominios.</p><p>La primera IEEE Latin American Systems Conference ofrece un foro regional de colaboración interdisciplinaria, alineado con la visión del IEEE Systems Council, que conecta academia, industria y gobierno en un entorno internacional.</p><p>Desde Cartagena, intercambiamos ideas y fortalecemos la colaboración en ingeniería, infraestructura, tecnologías inteligentes, sostenibilidad y sistemas sociotécnicos.</p></div></section>
    <section className="syscon-topics" aria-labelledby="topics-title"><div className="container-shell"><p className="syscon-eyebrow">Ideas que nos conectan</p><h2 id="topics-title">Sistemas complejos. Perspectivas compartidas.</h2><div className="syscon-topic-grid">{topics.map(([number,title,description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
    <section className="container-shell syscon-registration"><div><p className="syscon-eyebrow">Sé parte de la primera edición</p><h2>El próximo encuentro es en Cartagena.</h2><p>Registra tu participación y gestiona tu asistencia desde la plataforma.</p></div><Link className="syscon-button syscon-primary" to={destination}>{isAuthenticated ? 'Ir a mi panel' : 'Iniciar registro'} <span aria-hidden="true">↗</span></Link></section>
  </div>;
}
