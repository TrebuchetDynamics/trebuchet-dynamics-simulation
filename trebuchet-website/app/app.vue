<script setup lang="ts">
const focusAreas = [
  {
    title: 'Mobile Applications',
    emoji: '🟦',
    copy:
      'High-performance Android and iOS experiences engineered for real-world usage, scalability and maintainability.'
  },
  {
    title: 'Web & Platform Development',
    emoji: '🟩',
    copy:
      'Modern portals, APIs, dashboards and full-stack products deployed on resilient cloud-native architectures.'
  },
  {
    title: 'Artificial Intelligence & ML',
    emoji: '🧠',
    copy:
      'Model development, inference pipelines, LLM integrations and automation workflows tailored to your data.'
  },
  {
    title: 'Blockchain & Smart Contracts',
    emoji: '🔗',
    copy:
      'Secure on-chain integrations, wallet flows, prediction market interfaces and decentralized application design.'
  },
  {
    title: 'Cybersecurity & System Hardening',
    emoji: '🛡',
    copy:
      'Authentication, authorization, encryption and infrastructure best practices built into every engagement.'
  },
  {
    title: 'Architecture & Engineering Consulting',
    emoji: '⚙',
    copy:
      'Pragmatic guidance that improves codebases, DevOps, performance and organizational resilience.'
  }
]

const projects = [
  {
    name: 'Arenaton',
    blurb:
      'Next-generation prediction market interface powered by secure wallets, gasless flows and real-time analytics.'
  },
  {
    name: 'Trebuchet Launch (Upcoming)',
    blurb:
      'A precision trebuchet simulation for Android that blends physics, experimentation and delightful gameplay.'
  },
  {
    name: 'Internal AI Tools',
    blurb:
      'LLM-driven assistants and pipelines that accelerate testing, validation and automation across teams.'
  }
]

const differentiators = [
  { title: 'Precision Engineering', copy: 'Systems built for clarity, performance and long-term stability.' },
  {
    title: 'Multi-disciplinary Expertise',
    copy: 'Mobile, web, AI, blockchain, cloud and security expertise under one roof.'
  },
  { title: 'End-to-End Execution', copy: 'From concept to deployment, delivered production-ready.' },
  { title: 'Security First', copy: 'Rigorous attention to correctness and evolving threat models.' },
  { title: 'Global Perspective', copy: 'UK roots with international collaboration between the UK and Mexico.' }
]

const techStack = [
  { label: 'Frontend', items: ['Vue / Nuxt', 'React', 'Next.js', 'Flutter', 'React Native', 'Tailwind CSS'] },
  { label: 'Backend', items: ['Node.js', 'Kotlin', 'Go', 'Python', 'Rust', 'PostgreSQL', 'Redis', 'Firebase', 'Supabase'] },
  { label: 'Mobile', items: ['Android', 'iOS', 'Kotlin', 'Swift', 'Jetpack Compose'] },
  { label: 'AI / ML', items: ['TensorFlow', 'PyTorch', 'Transformers', 'LLMs', 'Vision models', 'Vector databases'] },
  { label: 'Blockchain', items: ['EVM', 'Solidity', 'Stylus', 'Wallet integrations', 'Cross-chain services'] },
  { label: 'Cloud & DevOps', items: ['AWS', 'Cloudflare', 'Docker', 'CI/CD', 'Serverless architectures'] }
]
</script>

<template>
  <div class="page">
    <NuxtRouteAnnouncer />

    <header class="hero">
      <p class="eyebrow">Trebuchet Dynamics Limited</p>
      <h1>Engineering precision. Launching ideas with force.</h1>
      <p class="lede">
        We design, engineer, and deploy high-performance software across mobile, web, AI, blockchain, and
        security-focused systems. Build faster. Ship smarter. Scale with confidence.
      </p>
      <div class="hero-cta">
        <NuxtLink to="#work" class="btn primary">Explore our Work</NuxtLink>
        <NuxtLink to="#contact" class="btn ghost">Contact Us</NuxtLink>
      </div>
    </header>

    <main>
      <section class="panel intro" aria-labelledby="intro-heading">
        <div>
          <h2 id="intro-heading">Built in the UK · Operating globally</h2>
          <p>
            Trebuchet Dynamics Ltd combines precision engineering with modern development practices to deliver robust,
            elegant and scalable technology. From mobile products to ML pipelines, we help teams build, launch and grow
            products that matter.
          </p>
        </div>
        <div class="intro-highlight">
          <p class="tag">Disciplines</p>
          <p class="intro-pill">Mobile</p>
          <p class="intro-pill">Web</p>
          <p class="intro-pill">AI</p>
          <p class="intro-pill">Blockchain</p>
          <p class="intro-pill">Cybersecurity</p>
        </div>
      </section>

      <section id="focus" class="panel" aria-labelledby="focus-heading">
        <div class="section-heading">
          <p class="tag">What we do</p>
          <h2 id="focus-heading">Core focus areas</h2>
        </div>
        <div class="grid">
          <article v-for="item in focusAreas" :key="item.title" class="card">
            <p class="emoji" aria-hidden="true">{{ item.emoji }}</p>
            <h3>{{ item.title }}</h3>
            <p>{{ item.copy }}</p>
          </article>
        </div>
      </section>

      <section id="work" class="panel" aria-labelledby="projects-heading">
        <div class="section-heading">
          <p class="tag">Selected projects</p>
          <h2 id="projects-heading">Launches we are proud of</h2>
        </div>
        <div class="stacked">
          <article v-for="project in projects" :key="project.name" class="card project-card">
            <h3>{{ project.name }}</h3>
            <p>{{ project.blurb }}</p>
          </article>
        </div>
      </section>

      <section class="panel" aria-labelledby="why-heading">
        <div class="section-heading">
          <p class="tag">Why Trebuchet Dynamics</p>
          <h2 id="why-heading">Partners choose us for</h2>
        </div>
        <ul class="list">
          <li v-for="value in differentiators" :key="value.title">
            <h3>{{ value.title }}</h3>
            <p>{{ value.copy }}</p>
          </li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="stack-heading">
        <div class="section-heading">
          <p class="tag">Technologies</p>
          <h2 id="stack-heading">Our preferred stack</h2>
        </div>
        <div class="grid stack-grid">
          <article v-for="group in techStack" :key="group.label" class="card stack-card">
            <h3>{{ group.label }}</h3>
            <ul>
              <li v-for="item in group.items" :key="item">{{ item }}</li>
            </ul>
          </article>
        </div>
      </section>

      <section class="panel mission" aria-labelledby="mission-heading">
        <div class="section-heading">
          <p class="tag">Mission</p>
          <h2 id="mission-heading">Our commitment</h2>
        </div>
        <p>
          We empower teams and founders with world-class software — crafted with precision, engineered for scale and
          delivered with integrity.
        </p>
      </section>

      <section id="contact" class="panel contact" aria-labelledby="contact-heading">
        <div>
          <p class="tag">Get in touch</p>
          <h2 id="contact-heading">Have a project in mind?</h2>
          <p>Let’s talk about mobile, AI, blockchain or cybersecurity initiatives.</p>
        </div>
        <div class="contact-actions">
          <a class="contact-link" href="mailto:contact@trebuchetdynamics.com">contact@trebuchetdynamics.com</a>
          <p>Trebuchet Dynamics Limited · United Kingdom · Operating internationally</p>
          <NuxtLink to="mailto:contact@trebuchetdynamics.com" class="btn primary">Send a Message</NuxtLink>
        </div>
      </section>

    </main>
  </div>
</template>

<style scoped>
:global(body) {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin: 0;
  background: #05060a;
  color: #f7f8fa;
}

.page {
  min-height: 100vh;
  padding-inline: clamp(1.5rem, 4vw, 5rem);
  padding-bottom: 4rem;
}

.hero {
  padding-block: clamp(3rem, 7vw, 6rem);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 920px;
  margin-inline: auto;
  text-align: center;
}

.eyebrow {
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 0.9rem;
  color: #9fb3c6;
  margin: 0;
}

h1 {
  font-size: clamp(2.5rem, 6vw, 4.8rem);
  line-height: 1.05;
  margin: 0;
}

.lede {
  font-size: 1.2rem;
  color: #d6dfe8;
  margin: 0 auto;
  max-width: 640px;
}

.hero-cta {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn {
  border-radius: 999px;
  padding: 0.85rem 1.6rem;
  text-decoration: none;
  font-weight: 600;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.btn.primary {
  background: linear-gradient(135deg, #48a6ff, #6d6bff);
  color: #05060a;
  box-shadow: 0 10px 25px rgba(75, 120, 255, 0.35);
}

.btn.ghost {
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #f7f8fa;
}

.btn:hover {
  transform: translateY(-2px);
}

main {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  margin-top: 2rem;
}

.panel {
  background: rgba(8, 10, 20, 0.85);
  border-radius: 24px;
  padding: clamp(1.5rem, 3vw, 2.5rem);
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.3);
}

.section-heading {
  margin-bottom: 1.5rem;
}

.tag {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #8da3c2;
  margin-bottom: 0.35rem;
}

.intro {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.intro-highlight {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-self: center;
}

.intro-pill {
  background: rgba(72, 166, 255, 0.15);
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(72, 166, 255, 0.3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.card {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 18px;
  padding: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  height: 100%;
}

.emoji {
  font-size: 1.5rem;
  margin: 0 0 0.25rem;
}

.stacked {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-card h3 {
  margin-top: 0;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.list h3 {
  margin-bottom: 0.35rem;
}

.stack-card ul {
  padding-left: 1rem;
  margin: 0.5rem 0 0;
}

.mission {
  text-align: center;
}

.contact {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.contact-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.contact-link {
  color: #7bc9ff;
  font-size: 1.1rem;
  text-decoration: none;
}

@media (min-width: 768px) {
  .contact {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .contact-actions {
    align-items: flex-end;
    text-align: right;
  }
}
</style>
