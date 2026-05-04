import { Link } from 'react-router-dom';
import { conferenceOverview } from '../constants/mockData';
import temsconBanner from '../assets/temscon-banner.jpg';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const heroStats = [
  { label: 'Fechas', value: '24 - 26 Jun 2026' },
  { label: 'Ciudad', value: 'Quito, Ecuador' },
  { label: 'Formato', value: 'Presencial + networking' },
];

const featureCards = [
  {
    title: 'Gestion e ingenieria',
    description:
      'Explore los ultimos avances en gestion de tecnologia e ingenieria, con enfasis en estrategia, operaciones y toma de decisiones.',
  },
  {
    title: 'Innovacion basada en datos',
    description:
      'Conecte investigacion aplicada, inteligencia artificial y modelos de negocio orientados a creacion de valor sostenible.',
  },
  {
    title: 'Comunidad LATAM IEEE',
    description:
      'Participe con investigadores, expertos de la industria y lideres de ecosistemas que construyen la agenda regional.',
  },
];

const conferenceBullets = [
  'Conferencia oficial de la Sociedad de Gestion de Tecnologia e Ingenieria del IEEE.',
  'Enfoque en innovacion, analitica, liderazgo tecnologico y transformacion empresarial.',
  'Espacio para autores, asistentes, miembros IEEE y alianzas academicas e industriales.',
];

function LandingPage() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-[#234c75] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,29,53,0.78)_0%,rgba(9,29,53,0.46)_42%,rgba(64,118,162,0.38)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.10),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(255,74,74,0.18),transparent_16%),linear-gradient(180deg,rgba(15,43,74,0.16),rgba(15,43,74,0.34))]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1518632614184-8dbb3f3f7b2d?auto=format&fit=crop&w=1600&q=80")',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />

        <div className="container-shell relative grid min-h-[78vh] gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:py-24">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/90">
              IEEE TEMS LATAM
            </p>
            <h1 className="max-w-xl text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[3.15rem]">
              Innovando para un mundo conectado
            </h1>
            <p className="mt-5 max-w-lg text-lg font-semibold leading-8 text-white/92 sm:text-xl">
              Gestion de tecnologia e ingenieria en la era de la IA
            </p>
            <p className="mt-7 text-xl font-bold text-white sm:text-2xl">
              Del 24 al 26 de junio de 2026
            </p>
            <p className="mt-8 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
              {conferenceOverview.description}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register">
                <Button variant="ghost" className="min-w-48 rounded-md bg-white px-7 text-[#13253d] hover:bg-slate-100">
                  REGISTRATE AHORA
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  variant="ghost"
                  className="min-w-44 border border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  Ingresar
                </Button>
              </Link>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {heroStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="flex w-full max-w-[34rem] flex-col items-center justify-center gap-8 lg:mr-4 lg:gap-10">
              <div className="w-full overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm">
                <img
                  src={temsconBanner}
                  alt="Banner de TEMSCON LATAM 2026"
                  className="mx-auto block h-auto w-full max-w-[28rem] rounded-[1.25rem] object-contain"
                />
              </div>

              <div className="w-full text-center">
                <p className="text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl">
                  24 - 26 JUN
                </p>
                <p className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                  Quito, Ecuador
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 sm:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Bienvenidos a <span className="text-[#2d3eb3]">{conferenceOverview.name}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-4xl text-lg leading-9 text-slate-700">
            Unase a nosotros en la Conferencia de la Sociedad de Gestion de Tecnologia e
            Ingenieria del IEEE en Quito, Ecuador, del 24 al 26 de junio de 2026.
            <span className="font-bold text-slate-900">
              {' '}
              Explore los ultimos avances en gestion de tecnologia e ingenieria, centrandose en la
              innovacion basada en datos y la creacion de valor en los negocios globales en la era
              de la IA.
            </span>
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {featureCards.map((item) => (
            <Card key={item.title} className="rounded-[2rem] p-8">
              <h3 className="text-xl font-bold text-slate-950">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[2rem] p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2d3eb3]">
              Sobre la conferencia
            </p>
            <h3 className="mt-4 text-3xl font-bold text-slate-950">
              Un punto de encuentro para academia, industria y liderazgo tecnologico.
            </h3>
            <p className="mt-5 text-base leading-8 text-slate-600">
              TFMSCON LATAM 2026 reunira a investigadores, expertos de la industria y tomadores de
              decision para discutir gestion tecnologica, estrategia, transformacion digital,
              analitica avanzada e innovacion empresarial en el contexto latinoamericano.
            </p>
          </Card>

          <Card className="rounded-[2rem] border-none bg-[#13253d] p-8 text-white sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ffb3b3]">
              Lo que encontrara
            </p>
            <div className="mt-6 space-y-4">
              {conferenceBullets.map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#ff4a4a]" />
                  <p className="text-sm leading-7 text-white/85">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-[2rem] bg-slate-100 px-8 py-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Convocatoria abierta
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              Reserve su lugar y prepare su participacion en Quito.
            </p>
          </div>
          <Link to="/register">
            <Button variant="primary" className="bg-[#2d3eb3] hover:bg-[#243398]">
              Iniciar registro
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
