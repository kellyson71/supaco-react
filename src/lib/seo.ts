// Como cada página pública aparece em buscadores, prévias de link e assistentes: título, descrição, perguntas e dados estruturados.
// O build (plugin `prerender` do vite.config.ts) grava isso no HTML de cada página; no navegador, `applyHead` troca ao navegar.

export const SITE_URL = 'https://supaco.vercel.app';

export type Faq = { q: string; a: string };
export type PageMeta = {
  path: string;
  /** Nome curto, para a trilha de navegação e o sitemap. */
  name: string;
  title: string;
  description: string;
  faq: Faq[];
};

const HOME: PageMeta = {
  path: '/',
  name: 'Supaco',
  title: 'Supaco: notas, faltas e horários do SUAP IFRN',
  description: 'Veja suas notas, faltas e horários do SUAP IFRN num app rápido e gratuito. Descubra quanto precisa tirar para passar e se pode faltar hoje. Abre até sem internet.',
  faq: [
    { q: 'O Supaco é o aplicativo oficial do IFRN?', a: 'Não. É um projeto independente, feito por estudante, que usa a API do próprio SUAP para mostrar os seus dados de um jeito mais rápido.' },
    { q: 'É de graça?', a: 'É. Não tem plano pago, anúncio nem cadastro: você entra com a conta do SUAP que já tem.' },
    { q: 'Funciona no celular e sem internet?', a: 'Funciona em qualquer navegador e dá para instalar como app. Depois da primeira vez, abre até sem internet, com os últimos dados que baixou.' },
    { q: 'Funciona para outros Institutos Federais?', a: 'Por enquanto só para o IFRN: o login é feito no SUAP do IFRN e as regras de nota e de falta são as da instituição.' },
  ],
};

const CALCULADORA: PageMeta = {
  path: '/calculadora',
  name: 'Calculadora de notas',
  title: 'Calculadora de notas IFRN: quanto preciso tirar para passar',
  description: 'Calculadora de média do IFRN: informe as notas das etapas e veja quanto precisa tirar para passar, com os pesos 2 e 3 e a regra da prova final. Grátis e sem login.',
  // As perguntas são os títulos das seções da página (src/pages/Tools.tsx): mudou lá, muda aqui
  faq: [
    { q: 'Como a média do IFRN é calculada?', a: 'As notas vão de 0 a 100 e as últimas etapas pesam mais. Com 2 etapas, MD = (2 × N1 + 3 × N2) ÷ 5. Com 4 etapas, MD = (2 × N1 + 2 × N2 + 3 × N3 + 3 × N4) ÷ 10.' },
    { q: 'Qual é a média para passar?', a: '60 ou mais: aprovado, com pelo menos 75% de frequência. De 20 a 59: prova final. Abaixo de 20: reprovado, sem prova final.' },
    { q: 'Como funciona a prova final?', a: 'Vale o melhor resultado para você: a média simples com a prova final, (MD + NAF) ÷ 2, ou a média ponderada trocando a nota de uma etapa pela da final. Com 60 ou mais, você é aprovado.' },
  ],
};

const FALTAS: PageMeta = {
  path: '/faltas',
  name: 'Calculadora de faltas',
  title: 'Calculadora de faltas IFRN: quantas aulas posso faltar',
  description: 'Informe a carga horária da disciplina e veja o limite de 25% de faltas do IFRN, quantas ainda restam e quantos dias dá para faltar sem reprovar. Grátis e sem login.',
  faq: [
    { q: 'Quantas faltas posso ter no IFRN?', a: 'Até 25% da carga horária da disciplina: a frequência mínima é 75%. Quem passa do limite reprova por falta, mesmo com média boa. A conta é em aulas, não em dias: faltar num dia com duas aulas da matéria custa duas faltas.' },
    { q: 'Qual é o limite para cada carga horária?', a: '40 aulas: 10 faltas. 60 aulas: 15 faltas. 80 aulas: 20 faltas. 120 aulas: 30 faltas. 160 aulas: 40 faltas.' },
    { q: 'O limite vale por disciplina?', a: 'Aqui a conta é por disciplina, como no boletim do SUAP. Em alguns cursos a frequência também é cobrada sobre o total do período: confira a Organização Didática do seu curso.' },
  ],
};

export const PAGES: Record<string, PageMeta> = { '/': HOME, '/calculadora': CALCULADORA, '/faltas': FALTAS };

/** Página pública da rota (as calculadoras), ou undefined se a rota é do app. A inicial não entra: ela depende de estar logado. */
export const publicPage = (path: string) => {
  const clean = path.replace(/\/+$/, '') || '/';
  return clean === '/' ? undefined : PAGES[clean];
};

const absolute = (path: string) => SITE_URL + (path === '/' ? '/' : path);

/** Dados estruturados (schema.org) da página, para os buscadores entenderem o que ela é. */
export function jsonLd(page: PageMeta): object[] {
  const app = {
    '@type': 'WebApplication',
    '@id': `${SITE_URL}/#app`,
    name: 'Supaco',
    url: `${SITE_URL}/`,
    description: HOME.description,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Android, iOS, Windows, macOS, Linux',
    browserRequirements: 'Navegador atualizado com JavaScript',
    inLanguage: 'pt-BR',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    image: `${SITE_URL}/og.png`,
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    featureList: [
      'Notas e média por etapa do SUAP',
      'Quanto precisa tirar para passar e simulador de notas',
      'Faltas restantes por disciplina e "posso faltar hoje?"',
      'Horário da semana e aula de agora',
      'Provas do SUAP e tarefas do Google Classroom na mesma agenda',
      'Funciona offline e pode ser instalado como app',
    ],
  };
  const faq = page.faq.length ? [{
    '@type': 'FAQPage',
    '@id': `${absolute(page.path)}#faq`,
    mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }] : [];

  if (page.path === '/') {
    return [
      { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, name: 'Supaco', alternateName: ['Supaco IFRN', 'SUAP IFRN rápido'], url: `${SITE_URL}/`, inLanguage: 'pt-BR' },
      app,
      ...faq,
    ];
  }
  return [
    {
      '@type': 'WebApplication',
      '@id': `${absolute(page.path)}#tool`,
      name: page.name + ' do IFRN',
      url: absolute(page.path),
      description: page.description,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any',
      inLanguage: 'pt-BR',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      isPartOf: { '@id': `${SITE_URL}/#app` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Supaco', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: page.name, item: absolute(page.path) },
      ],
    },
    ...faq,
  ];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** As tags do <head> que mudam de uma página para outra, já em HTML (usado pelo build). */
export function headTags(page: PageMeta): string {
  const url = absolute(page.path);
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLd(page) }).replace(/</g, '\\u003c');
  return [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Supaco" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE_URL}/og.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Supaco: seu SUAP, rápido e sem enrolação" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${SITE_URL}/og.png" />`,
    `<script type="application/ld+json">${ld}</script>`,
  ].join('\n    ');
}

/** Ao navegar dentro do app, a aba e o link compartilhado passam a falar da página aberta. */
export function applyHead(path: string) {
  const page = publicPage(path) ?? HOME;
  document.title = page.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', absolute(page.path));
}
