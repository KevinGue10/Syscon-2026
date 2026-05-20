import { Link } from 'react-router-dom';
import { conferenceOverview } from '../constants/mockData';
import temsconBanner from '../assets/temscon-banner.jpg';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';

const heroStats = [
  { label: 'Fechas', value: '24 - 26 Jun 2026' },
  { label: 'Ciudad', value: 'Quito, Ecuador' },
  { label: 'Formato', value: 'Presencial + networking' },
];

const featureCards = [
  {
    title: 'Gestión e ingeniería',
    description:
      'Explore los últimos avances en gestión de tecnología e ingeniería, con énfasis en estrategia, operaciones y toma de decisiones.',
  },
  {
    title: 'Innovación basada en datos',
    description:
      'Conecte investigación aplicada, inteligencia artificial y modelos de negocio orientados a creación de valor sostenible.',
  },
  {
    title: 'Comunidad LATAM IEEE',
    description:
      'Participe con investigadores, expertos de la industria y líderes de ecosistemas que construyen la agenda regional.',
  },
];

const thematicTracks = [
  'Transformación digital y estrategia tecnológica',
  'Analítica, IA y toma de decisiones',
  'Innovación empresarial y desarrollo sostenible',
];

const audienceHighlights = [
  'Autores y ponentes',
  'Investigadores',
  'Lideres de industria',
  'Miembros IEEE',
];

const conferenceBullets = [
  'Conferencia oficial de la Sociedad de Gestión de Tecnología e Ingeniería del IEEE.',
  'Enfoque en innovación, analítica, liderazgo tecnológico y transformación empresarial.',
  'Espacio para autores, asistentes, miembros IEEE y alianzas academicas e industriales.',
];

function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-[#f4f7fb]">
      <section className="relative overflow-hidden bg-[#0f2742] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(111,188,255,0.22),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(255,104,104,0.22),transparent_18%),linear-gradient(135deg,rgba(9,25,43,0.94)_8%,rgba(18,46,77,0.88)_52%,rgba(29,87,136,0.86)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="absolute left-[-8rem] top-24 h-64 w-64 rounded-full bg-[#52b6ff]/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] right-[-5rem] h-72 w-72 rounded-full bg-[#ff6767]/10 blur-3xl" />

        <div className="container-shell relative grid min-h-[82vh] gap-14 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-12 lg:py-24">
          <div className="max-w-2xl">
            <p className="mb-9 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/90">
              IEEE TEMS LATAM
            </p>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-[-0.01em] sm:text-5xl lg:text-[4.15rem]">
              Innovando la gestión tecnológica para una región conectada
            </h1>
            <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-white/92 sm:text-xl">
              Gestión de tecnología e ingeniería en la era de la IA
            </p>
            <p className="mt-7 text-xl font-bold text-white sm:text-2xl">
              Del 24 al 26 de junio de 2026
            </p>
            <p className="mt-8 max-w-2xl text-base leading-8 text-white/82 sm:text-lg">
              {conferenceOverview.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {audienceHighlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white/88"
                >
                  {item}
                </span>
              ))}
            </div>

            {!isAuthenticated ? (
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/register">
                  <Button
                    variant="ghost"
                    className="min-w-52 rounded-xl bg-white px-7 text-[#13253d] hover:bg-slate-100"
                  >
                    Regístrate ahora
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="min-w-44 rounded-xl border border-white/35 !bg-transparent !text-white hover:!bg-white/10"
                  >
                    Ingresar
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="mt-10">
                <Link to="/dashboard">
                  <Button
                    variant="ghost"
                    className="min-w-48 rounded-xl bg-white px-7 text-[#13253d] hover:bg-slate-100"
                  >
                    Ir al panel
                  </Button>
                </Link>
              </div>
            )}

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {heroStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute right-8 top-0 hidden h-32 w-32 rounded-full border border-white/10 bg-white/5 lg:block" />
            <div className="flex w-full max-w-[35rem] flex-col items-center justify-center gap-8 lg:mr-2 lg:gap-8">
              <div className="w-full overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-sm">
                <img
                  src={temsconBanner}
                  alt="Banner de TEMSCON LATAM 2026"
                  className="mx-auto block h-auto w-full max-w-[28rem] rounded-[1.25rem] object-contain"
                />
              </div>

              <Card className="w-full rounded-[2rem] border-white/10 bg-slate-950/35 p-6 text-white shadow-[0_30px_80px_rgba(3,12,24,0.28)]">
                <div className="grid gap-5 sm:grid-cols-[1.1fr_0.9fr] sm:items-end">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8fd1ff]">
                      Call for participation
                    </p>
                    <p className="mt-3 text-3xl font-extrabold leading-tight text-white">
                      Quito será el punto de encuentro para ideas aplicadas, investigación y decisiones.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/55">Sede</p>
                    <p className="mt-2 text-lg font-semibold text-white">{conferenceOverview.location}</p>
                    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/55">Modalidad</p>
                    <p className="mt-2 text-sm font-semibold text-white/88">Conferencias, networking y comunidad</p>
                  </div>
                </div>
              </Card>
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
            Únase a nosotros en la Conferencia de la Sociedad de Gestión de Tecnología e
            Ingeniería del IEEE en Quito, Ecuador, del 24 al 26 de junio de 2026.
            <span className="font-bold text-slate-900">
              {' '}
              Explore los últimos avances en gestión de tecnología e ingeniería, centrándose en la
              innovación basada en datos y la creación de valor en los negocios globales en la era
              de la IA.
            </span>
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {featureCards.map((item) => (
            <Card
              key={item.title}
              className="rounded-[2rem] border-slate-200/80 bg-white p-8 transition duration-200 hover:-translate-y-1 hover:shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-950">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[2rem] border-slate-200/80 bg-white p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2d3eb3]">
              Sobre la conferencia
            </p>
            <h3 className="mt-4 text-3xl font-bold text-slate-950">
              Un punto de encuentro para academia, industria y liderazgo tecnológico.
            </h3>
            <p className="mt-5 text-base leading-8 text-slate-600">
              TEMSCON LATAM 2026 reunirá a investigadores, expertos de la industria y tomadores de
              decisión para discutir gestión tecnológica, estrategia, transformación digital,
              analítica avanzada e innovación empresarial en el contexto latinoamericano.
            </p>

            <div className="mt-8 grid gap-3">
              {thematicTracks.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-800"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[2rem] border-none bg-[#13253d] p-8 text-white sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ffb3b3]">
              Lo que encontrará
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

        <Card className="mt-12 overflow-hidden rounded-[2rem] border-none bg-[linear-gradient(135deg,#163257_0%,#224a7c_55%,#2d63a7_100%)] px-8 py-8 text-white sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a8d8ff]">
                Convocatoria abierta
              </p>
              <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Reserve su lugar y prepare su participación en Quito.
              </p>
              <p className="mt-3 text-sm leading-7 text-white/78 sm:text-base">
                Registre su asistencia, gestione su participación y avance con su proceso desde la
                plataforma.
              </p>
            </div>
            <Link to={isAuthenticated ? '/dashboard' : '/register'}>
              <Button
                variant="ghost"
                className="rounded-xl bg-white px-6 text-[#163257] hover:bg-slate-100"
              >
                {isAuthenticated ? 'Ir al panel' : 'Iniciar registro'}
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}

export default LandingPage;
