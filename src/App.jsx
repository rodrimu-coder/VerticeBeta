import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Radar,
  AlertTriangle,
} from "lucide-react";

/**
 * VÉRTICE 360 – BETA FUNCIONAL (FASE 1: DIAGNOSTICAR) – v2
 * - Bloques: Identidad, Historia, Contexto, FODA explícito, Futuro + Madurez (scoring)
 * - Assessment adaptativo (algunos saltos)
 * - Scoring 1..5 por dimensión + global (solo preguntas "scored")
 * - Diagnóstico 360: narrativa, barras, dolores, FODA, brechas
 * - Export PDF: window.print()
 *
 * Nota: Sin LLM real; usa plantillas determinísticas + datos del usuario.
 */

// ------------------------------
// 1) MODELO DE MADUREZ (config)
// ------------------------------
const DIMENSIONS = [
  { key: "strategy", name: "Estrategia", weight: 0.17 },
  { key: "process", name: "Procesos", weight: 0.17 },
  { key: "finance", name: "Finanzas", weight: 0.18 },
  { key: "people", name: "Personas y Roles", weight: 0.16 },
  { key: "tech", name: "Tecnología y Datos", weight: 0.16 },
  { key: "risk", name: "Gobierno y Riesgos", weight: 0.16 },
];

// Reglas simples de bloqueo (puedes ajustar):
const ADVANCE_RULE = {
  minDimensionLevelToAdvance: 2,
};

// ------------------------------
// 2) BANCO DE PREGUNTAS (mixto)
// types: text | single | multi | scored
// - scored: tiene opciones con score 1..5 y dimension
// - single: selección única sin score
// - multi: selección múltiple sin score
// - text: campo abierto
// ------------------------------
const QUESTIONS = [
  // ---------------------------------------------------
  // SECCIÓN 0 – IDENTIDAD BÁSICA (doc)
  // ---------------------------------------------------
  {
    id: "S0_1",
    section: "Identidad",
    type: "text",
    title: "Identidad",
    prompt: "Nombre de la empresa",
    required: true,
    placeholder: "Ej: Vértice SpA",
  },
  {
    id: "S0_2",
    section: "Identidad",
    type: "text",
    title: "Identidad",
    prompt: "Nombre de quien responde",
    required: true,
    placeholder: "Ej: Rodrigo Muñoz",
  },
  {
    id: "S0_3",
    section: "Identidad",
    type: "single",
    title: "Identidad",
    prompt: "Cargo o rol dentro de la empresa",
    required: true,
    options: [
      { label: "Dueño / Socio fundador" },
      { label: "Gerente general" },
      { label: "Administrador" },
      { label: "Jefe de área" },
      { label: "Otro" },
    ],
  },
  {
    id: "S0_3C",
    section: "Identidad",
    type: "text",
    title: "Identidad",
    prompt: "Comentario / Observaciones (opcional)",
    required: false,
    placeholder: "Algo relevante sobre tu rol o contexto…",
  },

  // ---------------------------------------------------
  // SECCIÓN 1 – HISTORIA DEL NEGOCIO (doc)
  // ---------------------------------------------------
  {
    id: "S1_4",
    section: "Historia",
    type: "text",
    title: "Historia",
    prompt: "¿Cómo nació la idea de este negocio?",
    required: true,
    placeholder: "Cuéntanos con tus palabras cómo surgió la idea y qué te motivó…",
  },
  {
    id: "S1_5",
    section: "Historia",
    type: "single",
    title: "Historia",
    prompt: "¿Hace cuántos años existe la empresa?",
    required: true,
    options: [
      { label: "Menos de 1 año" },
      { label: "1 a 3 años" },
      { label: "3 a 5 años" },
      { label: "5 a 10 años" },
      { label: "Más de 10 años" },
    ],
  },
  {
    id: "S1_5C",
    section: "Historia",
    type: "text",
    title: "Historia",
    prompt: "Comentario (opcional)",
    required: false,
    placeholder: "Algún dato o hito importante…",
  },
  {
    id: "S1_6",
    section: "Historia",
    type: "multi",
    title: "Historia",
    prompt: "En los primeros años, ¿cuál fue el principal desafío? (elige hasta 2)",
    required: true,
    maxSelect: 2,
    options: [
      { label: "Conseguir clientes" },
      { label: "Financiamiento / flujo de caja" },
      { label: "Falta de experiencia" },
      { label: "Organización interna" },
      { label: "Problemas operativos" },
      { label: "Mercado / competencia" },
      { label: "Otro" },
    ],
  },
  {
    id: "S1_6C",
    section: "Historia",
    type: "text",
    title: "Historia",
    prompt: "Anécdota / Aprendizaje (opcional)",
    required: false,
    placeholder: "¿Cómo enfrentaron ese desafío? ¿Qué aprendieron?",
  },
  {
    id: "S1_7",
    section: "Historia",
    type: "text",
    title: "Historia",
    prompt: "Pensando en la historia de la empresa, ¿cuál ha sido su mayor logro hasta hoy?",
    required: true,
    placeholder: "Ej: llegar a X clientes, abrir una sucursal, mejorar márgenes, etc.",
  },
  {
    id: "S1_8",
    section: "Historia",
    type: "text",
    title: "Historia",
    prompt: "Con honestidad, ¿cuál ha sido el momento más difícil del negocio?",
    required: true,
    placeholder: "Ej: crisis de caja, pérdida de cliente, tema operativo…",
  },

  // ---------------------------------------------------
  // SECCIÓN 2 – A QUÉ SE DEDICA (doc)
  // ---------------------------------------------------
  {
    id: "S2_9",
    section: "Modelo de Negocio",
    type: "single",
    title: "Modelo de Negocio",
    prompt: "¿A qué se dedica principalmente la empresa?",
    required: true,
    options: [
      { label: "Servicios" },
      { label: "Comercialización / ventas" },
      { label: "Producción / manufactura" },
      { label: "Construcción" },
      { label: "Tecnología / digital" },
      { label: "Otro" },
    ],
  },
  {
    id: "S2_9C",
    section: "Modelo de Negocio",
    type: "text",
    title: "Modelo de Negocio",
    prompt: "Describe con tus palabras qué hace la empresa y qué vende realmente",
    required: true,
    placeholder: "Ej: vendemos X, resolvemos Y, para Z tipo de cliente…",
  },
  {
    id: "S2_10",
    section: "Modelo de Negocio",
    type: "multi",
    title: "Modelo de Negocio",
    prompt: "¿Qué tipo de clientes atiende principalmente?",
    required: true,
    options: [
      { label: "Personas naturales" },
      { label: "PYMES" },
      { label: "Empresas medianas" },
      { label: "Grandes empresas" },
      { label: "Sector público" },
    ],
  },
  {
    id: "S2_11",
    section: "Modelo de Negocio",
    type: "single",
    title: "Modelo de Negocio",
    prompt: "¿Dónde opera principalmente la empresa?",
    required: true,
    options: [
      { label: "Local / comuna" },
      { label: "Región" },
      { label: "Nacional" },
      { label: "Internacional" },
    ],
  },

  // ---------------------------------------------------
  // SECCIÓN 3 – REALIDAD ACTUAL (doc)
  // ---------------------------------------------------
  {
    id: "S3_12",
    section: "Realidad Actual",
    type: "single",
    title: "Realidad Actual",
    prompt: "Hoy, ¿cómo describirías la situación general de la empresa?",
    required: true,
    options: [
      { label: "Muy compleja" },
      { label: "Compleja" },
      { label: "Estable" },
      { label: "Buena" },
      { label: "Muy buena" },
    ],
  },
  {
    id: "S3_13",
    section: "Realidad Actual",
    type: "single",
    title: "Realidad Actual",
    prompt: "¿La empresa ha crecido en los últimos 2 años?",
    required: true,
    options: [
      { label: "Sí, mucho" },
      { label: "Sí, pero de forma desordenada" },
      { label: "Se ha mantenido" },
      { label: "Ha disminuido" },
      { label: "No lo tengo claro" },
    ],
  },
  {
    id: "S3_14",
    section: "Realidad Actual",
    type: "multi",
    title: "Realidad Actual",
    prompt: "¿Qué sientes que hoy te quita más tiempo como dueño / gerente?",
    required: true,
    options: [
      { label: "Operación diaria" },
      { label: "Problemas financieros" },
      { label: "Personas / equipo" },
      { label: "Ventas" },
      { label: "Falta de orden / control" },
      { label: "Todo un poco" },
    ],
  },

  // ---------------------------------------------------
  // SECCIÓN 4,5,6 – FODA EXPLÍCITO (doc)
  // ---------------------------------------------------
  {
    id: "FODA_S",
    section: "FODA",
    type: "multi",
    title: "FODA",
    prompt: "¿Qué crees que hace bien tu empresa hoy? (Fortalezas)",
    required: true,
    options: [
      { label: "Calidad del producto / servicio" },
      { label: "Relación con clientes" },
      { label: "Precio" },
      { label: "Experiencia / know-how" },
      { label: "Rapidez / flexibilidad" },
      { label: "Equipo humano" },
      { label: "Reputación" },
    ],
  },
  {
    id: "FODA_S_C",
    section: "FODA",
    type: "text",
    title: "FODA",
    prompt: "¿Por qué consideras eso una fortaleza? (opcional)",
    required: false,
    placeholder: "Ej: clientes recomiendan, entregas rápidas, excelencia técnica…",
  },
  {
    id: "FODA_DIFF",
    section: "FODA",
    type: "text",
    title: "FODA",
    prompt: "¿Qué dirías que te diferencia de tus competidores?",
    required: true,
    placeholder: "Ej: atención, precio, especialización, rapidez, postventa…",
  },
  {
    id: "FODA_W",
    section: "FODA",
    type: "multi",
    title: "FODA",
    prompt: "¿En qué áreas sientes que la empresa está más débil hoy? (Debilidades)",
    required: true,
    options: [
      { label: "Finanzas / costos" },
      { label: "Organización interna" },
      { label: "Procesos" },
      { label: "Ventas" },
      { label: "Marketing" },
      { label: "Dependencia del dueño" },
      { label: "Tecnología / sistemas" },
    ],
  },
  {
    id: "FODA_W_C",
    section: "FODA",
    type: "text",
    title: "FODA",
    prompt: "¿Qué cosas sabes que deberías mejorar, pero no has podido abordar?",
    required: true,
    placeholder: "Ej: orden financiero, procesos, delegación, marketing, sistemas…",
  },
  {
    id: "FODA_O",
    section: "FODA",
    type: "multi",
    title: "FODA",
    prompt: "Mirando hacia afuera, ¿qué oportunidades ves hoy para tu negocio?",
    required: true,
    options: [
      { label: "Crecimiento del mercado" },
      { label: "Nuevos clientes" },
      { label: "Nuevos productos / servicios" },
      { label: "Digitalización" },
      { label: "Alianzas" },
      { label: "Expansión geográfica" },
    ],
  },
  {
    id: "FODA_T",
    section: "FODA",
    type: "multi",
    title: "FODA",
    prompt: "¿Qué amenazas te preocupan hoy?",
    required: true,
    options: [
      { label: "Competencia" },
      { label: "Costos" },
      { label: "Situación económica" },
      { label: "Dependencia de pocos clientes" },
      { label: "Falta de capital" },
      { label: "Cambios regulatorios" },
    ],
  },

  // ---------------------------------------------------
  // SECCIÓN 7 – FUTURO (doc)
  // ---------------------------------------------------
  {
    id: "S7_21",
    section: "Futuro",
    type: "text",
    title: "Futuro",
    prompt: "Si todo saliera bien, ¿cómo te gustaría ver tu empresa en 3 años?",
    required: true,
    placeholder: "Ej: crecer 2x, abrir sucursal, profesionalizar, nuevos servicios…",
  },
  {
    id: "S7_22",
    section: "Futuro",
    type: "multi",
    title: "Futuro",
    prompt: "¿Qué crees que necesitas hoy para lograr ese crecimiento?",
    required: true,
    options: [
      { label: "Orden y control" },
      { label: "Estrategia clara" },
      { label: "Más ventas" },
      { label: "Mejor rentabilidad" },
      { label: "Equipo" },
      { label: "Tecnología" },
      { label: "Acompañamiento" },
    ],
  },

  // ---------------------------------------------------
  // BLOQUE MADUREZ (tu banco scored original)
  // ---------------------------------------------------
  // ESTRATEGIA
  {
    id: "E1",
    section: "Madurez",
    type: "scored",
    dimension: "strategy",
    title: "Estrategia",
    prompt: "Cuando tomas decisiones importantes en tu empresa, normalmente…",
    options: [
      { label: "Reacciono a lo urgente del día a día", score: 1 },
      { label: "Me guío por mi experiencia e intuición", score: 2 },
      { label: "Tengo objetivos claros como referencia", score: 3 },
      { label: "Evalúo según metas y resultados medibles", score: 4 },
      { label: "Tengo criterios alineados a una visión de largo plazo", score: 5 },
    ],
  },
  {
    id: "E2",
    section: "Madurez",
    type: "scored",
    dimension: "strategy",
    title: "Estrategia",
    prompt: "¿Qué tan claro tienes el rumbo de la empresa para los próximos 2–3 años?",
    showIf: (a) => (a["E1"]?.score ?? 0) >= 3,
    options: [
      { label: "No lo hemos definido", score: 1 },
      { label: "Está en mi cabeza, no formalizado", score: 2 },
      { label: "Está conversado, pero no documentado", score: 3 },
      { label: "Está definido y lo usamos para priorizar", score: 4 },
      { label: "Está definido, comunicado y guía decisiones", score: 5 },
    ],
  },

  // PROCESOS
  {
    id: "P1",
    section: "Madurez",
    type: "scored",
    dimension: "process",
    title: "Procesos",
    prompt: "Si una persona clave falta una semana, ¿qué pasa con la operación?",
    options: [
      { label: "Todo se desordena", score: 1 },
      { label: "Se resuelve, pero con mucho esfuerzo", score: 2 },
      { label: "Hay problemas, pero no críticos", score: 3 },
      { label: "La mayoría sigue funcionando", score: 4 },
      { label: "No afecta, los procesos están claros", score: 5 },
    ],
  },
  {
    id: "P2",
    section: "Madurez",
    type: "scored",
    dimension: "process",
    title: "Procesos",
    prompt: "Las tareas importantes de la empresa…",
    showIf: (a) => (a["P1"]?.score ?? 0) >= 3,
    options: [
      { label: "Se hacen según quien esté disponible", score: 1 },
      { label: "Se reparten, pero sin claridad", score: 2 },
      { label: "Tienen responsables definidos", score: 3 },
      { label: "Siguen procesos conocidos", score: 4 },
      { label: "Están documentadas y estandarizadas", score: 5 },
    ],
  },

  // FINANZAS
  {
    id: "F1",
    section: "Madurez",
    type: "scored",
    dimension: "finance",
    title: "Finanzas",
    prompt: "¿Cómo sabes si este mes fue bueno o malo para la empresa?",
    options: [
      { label: "Por la sensación general", score: 1 },
      { label: "Mirando la cuenta bancaria", score: 2 },
      { label: "Revisando ingresos y gastos", score: 3 },
      { label: "Analizando resultados y márgenes", score: 4 },
      { label: "Comparando contra presupuesto e indicadores", score: 5 },
    ],
  },
  {
    id: "F2",
    section: "Madurez",
    type: "scored",
    dimension: "finance",
    title: "Finanzas",
    prompt: "¿Con qué frecuencia revisas información financiera para decidir?",
    showIf: (a) => (a["F1"]?.score ?? 0) >= 3,
    options: [
      { label: "Casi nunca", score: 1 },
      { label: "Solo cuando hay problemas", score: 2 },
      { label: "Mensualmente", score: 3 },
      { label: "Periódicamente con indicadores", score: 4 },
      { label: "Con control y seguimiento formal", score: 5 },
    ],
  },

  // PERSONAS
  {
    id: "R1",
    section: "Madurez",
    type: "scored",
    dimension: "people",
    title: "Personas y Roles",
    prompt: "En tu empresa, las responsabilidades…",
    options: [
      { label: "No están claras", score: 1 },
      { label: "Se entienden, pero no están definidas", score: 2 },
      { label: "Están más o menos claras", score: 3 },
      { label: "Están definidas por rol", score: 4 },
      { label: "Están claras y no dependen del dueño", score: 5 },
    ],
  },
  {
    id: "R2",
    section: "Madurez",
    type: "scored",
    dimension: "people",
    title: "Personas y Roles",
    prompt: "Cuando surge un problema importante…",
    showIf: (a) => (a["R1"]?.score ?? 0) >= 3,
    options: [
      { label: "Siempre lo resuelve el dueño", score: 1 },
      { label: "Normalmente pasa por el dueño", score: 2 },
      { label: "Algunas personas lo resuelven solas", score: 3 },
      { label: "Los responsables actúan con autonomía", score: 4 },
      { label: "El sistema absorbe el problema", score: 5 },
    ],
  },

  // TECNOLOGÍA
  {
    id: "T1",
    section: "Madurez",
    type: "scored",
    dimension: "tech",
    title: "Tecnología y Datos",
    prompt: "¿Qué rol juega hoy la tecnología en tu empresa?",
    options: [
      { label: "Solo lo básico (correo, WhatsApp)", score: 1 },
      { label: "Herramientas sueltas", score: 2 },
      { label: "Apoya ciertas tareas clave", score: 3 },
      { label: "Es parte del control del negocio", score: 4 },
      { label: "Permite escalar y decidir mejor", score: 5 },
    ],
  },
  {
    id: "T2",
    section: "Madurez",
    type: "scored",
    dimension: "tech",
    title: "Tecnología y Datos",
    prompt: "La información que usas para decidir…",
    showIf: (a) => (a["T1"]?.score ?? 0) >= 3,
    options: [
      { label: "Está dispersa", score: 1 },
      { label: "Se arma manualmente", score: 2 },
      { label: "Está centralizada", score: 3 },
      { label: "Se actualiza periódicamente", score: 4 },
      { label: "Es confiable y accesible", score: 5 },
    ],
  },

  // RIESGOS
  {
    id: "G1",
    section: "Madurez",
    type: "scored",
    dimension: "risk",
    title: "Gobierno y Riesgos",
    prompt:
      "Si hoy ocurre un problema grave (persona clave, cliente grande, caja), la empresa…",
    options: [
      { label: "Queda muy expuesta", score: 1 },
      { label: "Tendría serios problemas", score: 2 },
      { label: "Podría resistir un tiempo", score: 3 },
      { label: "Tiene controles mínimos", score: 4 },
      { label: "Tiene planes y controles claros", score: 5 },
    ],
  },
  {
    id: "G2",
    section: "Madurez",
    type: "scored",
    dimension: "risk",
    title: "Gobierno y Riesgos",
    prompt: "¿Qué tan consciente eres de los principales riesgos del negocio?",
    showIf: (a) => (a["G1"]?.score ?? 0) >= 3,
    options: [
      { label: "No los tengo identificados", score: 1 },
      { label: "Los intuyo", score: 2 },
      { label: "Los conozco, pero no gestiono", score: 3 },
      { label: "Los monitoreo", score: 4 },
      { label: "Los gestiono activamente", score: 5 },
    ],
  },
];

// ------------------------------
// 3) UTILIDADES
// ------------------------------
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toArray(v) {
  return Array.isArray(v) ? v : v ? [v] : [];
}

function cleanText(s) {
  if (!s) return "";
  return String(s).trim();
}

function levelLabel(level) {
  if (level <= 1.5) return { name: "Nivel 1 – Caótico", color: "red" };
  if (level <= 2.5) return { name: "Nivel 2 – Intuitivo", color: "orange" };
  if (level <= 3.5) return { name: "Nivel 3 – Ordenado", color: "yellow" };
  if (level <= 4.5) return { name: "Nivel 4 – Controlado", color: "green" };
  return { name: "Nivel 5 – Escalable", color: "blue" };
}

function coverHeadline(level) {
  const l = Math.round(level);
  if (l <= 2)
    return "Tu empresa funciona gracias al esfuerzo constante, pero hoy está expuesta.";
  if (l === 3)
    return "Tu empresa dejó atrás el caos; ahora el desafío es profesionalizar.";
  return "Tu empresa tiene una base sólida para crecer con control.";
}

function coverIntro(level) {
  const l = Math.round(level);
  if (l <= 2)
    return "El crecimiento logrado se sostiene principalmente en la experiencia y en resolver lo urgente. Esto permite avanzar, pero genera desgaste y aumenta el riesgo cuando el negocio crece.";
  if (l === 3)
    return "Existen avances en orden y control que reducen la improvisación. El siguiente paso es convertir ese orden en un sistema de gestión para crecer con mayor seguridad.";
  return "La gestión se apoya en procesos y datos. El desafío ahora es optimizar, reducir riesgos y preparar el siguiente nivel de crecimiento.";
}

function dimensionText(dimKey, lvl) {
  const t = {
    strategy: [
      "Las decisiones se toman desde la urgencia y la reacción diaria. Esto permite moverse, pero dificulta priorizar y sostener crecimiento.",
      "La empresa se guía por experiencia e intuición. Funciona, pero cuesta alinear a todos y decir “no” a lo que distrae.",
      "Hay objetivos claros que orientan parte de las decisiones, aunque todavía no guían toda la operación.",
      "Las decisiones se evalúan con metas y resultados medibles, reduciendo improvisación.",
      "Existe visión y criterios claros; el foco guía decisiones de largo plazo.",
    ],
    process: [
      "La operación depende de personas específicas; ante ausencias o crecimiento, el sistema se desordena.",
      "Los procesos existen “en la práctica”, pero dependen mucho de quién lo hace y cuándo.",
      "Los procesos clave están más claros, aunque todavía no son consistentes en toda la operación.",
      "Procesos conocidos y relativamente estables permiten continuidad y mejor coordinación.",
      "Procesos documentados y estandarizados: el negocio es repetible y más robusto.",
    ],
    finance: [
      "Hay poca visibilidad financiera; decidir a tiempo se vuelve difícil y se corre el riesgo de sorpresas.",
      "Se mira principalmente la caja o el banco; sirve para sobrevivir, pero no para gestionar con precisión.",
      "Existe control periódico de ingresos y gastos, y comienza a apoyar decisiones.",
      "Se analizan resultados y márgenes, permitiendo decisiones más rentables.",
      "Se gestiona con presupuesto e indicadores; hay control y anticipación.",
    ],
    people: [
      "Las responsabilidades no están claras y gran parte recae en el dueño.",
      "Se entiende quién hace qué, pero no está definido; se generan fricciones y re-trabajo.",
      "Roles más claros permiten delegar parte del trabajo, aunque hay temas que siguen concentrados.",
      "Roles definidos y autonomía razonable reducen dependencia del dueño.",
      "Autonomía alta: responsabilidades claras y decisiones distribuidas.",
    ],
    tech: [
      "La tecnología es básica y no apoya la gestión; la información se dispersa.",
      "Hay herramientas sueltas, pero no un sistema que ordene datos y decisiones.",
      "La tecnología apoya tareas clave, aunque la información no siempre está integrada.",
      "La tecnología es parte del control del negocio; hay mejor acceso a datos.",
      "Tecnología alineada para escalar: datos confiables y decisiones rápidas.",
    ],
    risk: [
      "La empresa está expuesta ante eventos inesperados; faltan controles mínimos.",
      "Se depende de personas/clientes/caja sin gestión formal; el riesgo es alto en crecimiento.",
      "Hay consciencia de riesgos y capacidad de resistir un tiempo, pero sin monitoreo sistemático.",
      "Existen controles mínimos y cierta disciplina para anticipar problemas.",
      "Riesgos identificados y gestionados activamente; continuidad sólida.",
    ],
  };
  const idx = clamp(Math.round(lvl) - 1, 0, 4);
  return t[dimKey][idx];
}

function inferDecisionStyle(answers) {
  const s = answers["E1"]?.score ?? 2;
  if (s <= 2) return "principalmente desde la intuición y la urgencia";
  if (s === 3) return "con objetivos como referencia";
  return "apoyándose en metas y datos";
}

function inferDependency(answers) {
  const p = answers["P1"]?.score ?? 2;
  if (p <= 2) return "altamente de personas clave";
  if (p === 3) return "moderadamente de algunas personas";
  return "bajo nivel de dependencia individual";
}

function topPainPoints(levelsByDim) {
  const sorted = Object.entries(levelsByDim)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  return sorted.map(([dimKey, lvl], i) => {
    const risk =
      lvl < 2.5
        ? "esto aumenta la fragilidad del negocio y puede generar quiebres al crecer."
        : "esto puede limitar el crecimiento o reducir rentabilidad si no se refuerza.";

    const titleMap = {
      strategy: "Falta de foco y prioridades claras",
      process: "Dependencia operativa y baja repetibilidad",
      finance: "Baja visibilidad financiera para decidir",
      people: "Roles difusos y concentración en el dueño",
      tech: "Datos dispersos y herramientas no integradas",
      risk: "Exposición ante riesgos operacionales",
    };

    const causeMap = {
      strategy:
        "las decisiones se toman más por urgencia que por un rumbo compartido",
      process:
        "la operación depende de hábitos y personas más que de procesos estables",
      finance: "los números no se usan todavía como sistema de control",
      people:
        "no existe una definición clara y constante de responsables y límites",
      tech: "la información no está organizada para apoyar decisiones",
      risk: "no hay controles mínimos sistemáticos para prevenir impactos",
    };

    return {
      rank: i + 1,
      dimension: dimKey,
      name: titleMap[dimKey] ?? `Brecha en ${dimKey}`,
      why: `Esto ocurre porque ${causeMap[dimKey] ?? "hay brechas estructurales"}.`,
      risk,
    };
  });
}

function buildFODAFromExplicit(answers) {
  const strengths = toArray(answers["FODA_S"]?.value).map((x) => `• ${x}`);
  const strengthsWhy = cleanText(answers["FODA_S_C"]?.value);
  const diff = cleanText(answers["FODA_DIFF"]?.value);

  const weaknesses = toArray(answers["FODA_W"]?.value).map((x) => `• ${x}`);
  const improve = cleanText(answers["FODA_W_C"]?.value);

  const opportunities = toArray(answers["FODA_O"]?.value).map((x) => `• ${x}`);
  const threats = toArray(answers["FODA_T"]?.value).map((x) => `• ${x}`);

  const hasAny =
    strengths.length ||
    weaknesses.length ||
    opportunities.length ||
    threats.length ||
    diff ||
    improve;

  if (!hasAny) return null;

  const strengthsFinal = [...strengths];
  if (diff) strengthsFinal.push(`• Diferenciación: ${diff}`);
  if (strengthsWhy) strengthsFinal.push(`• Por qué es fortaleza: ${strengthsWhy}`);

  const weaknessesFinal = [...weaknesses];
  if (improve) weaknessesFinal.push(`• Pendiente crítico: ${improve}`);

  return {
    strengths: strengthsFinal.length
      ? strengthsFinal
      : ["• Fortalezas detectadas, pero falta detalle explícito."],
    weaknesses: weaknessesFinal.length
      ? weaknessesFinal
      : ["• Debilidades detectadas, pero falta detalle explícito."],
    opportunities: opportunities.length
      ? opportunities
      : ["• Oportunidades detectadas, pero falta detalle explícito."],
    threats: threats.length
      ? threats
      : ["• Amenazas detectadas, pero falta detalle explícito."],
  };
}

function buildFODAFromDimensions(levelsByDim) {
  const entries = Object.entries(levelsByDim);

  const strengths = entries
    .filter(([, v]) => v >= 3.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(
      ([k]) => `• Base sólida en ${DIMENSIONS.find((d) => d.key === k)?.name ?? k}.`
    );

  const weaknesses = entries
    .filter(([, v]) => v <= 2.5)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(
      ([k]) => `• Brecha relevante en ${DIMENSIONS.find((d) => d.key === k)?.name ?? k}.`
    );

  const opportunities = [
    "• Ordenar la base para crecer con menos desgaste y mayor rentabilidad.",
    "• Estandarizar decisiones y operación para reducir improvisación.",
  ];

  const threats = [
    "• Crecer en ventas sin fortalecer control y procesos puede generar quiebres operacionales o de caja.",
    "• Alta dependencia de personas/cliente/caja puede aumentar la fragilidad del negocio.",
  ];

  return {
    strengths: strengths.length
      ? strengths
      : ["• Fortalezas presentes, pero aún no consistentes en todas las áreas."],
    weaknesses: weaknesses.length
      ? weaknesses
      : ["• Las debilidades no son críticas, pero existen oportunidades de profesionalización."],
    opportunities,
    threats,
  };
}

function buildBreaches(levelsByDim) {
  const sorted = Object.entries(levelsByDim).sort((a, b) => a[1] - b[1]);
  const [b1, b2, b3] = sorted;

  const name = (k) => DIMENSIONS.find((d) => d.key === k)?.name ?? k;

  return [
    {
      label: "Prioridad crítica",
      item: name(b1[0]),
      why: "Reducir riesgos inmediatos y dar estabilidad a la operación.",
    },
    {
      label: "Prioridad importante",
      item: name(b2[0]),
      why: "Permite avanzar con mayor control y coherencia en decisiones.",
    },
    {
      label: "Puede esperar",
      item: name(b3[0]),
      why: "Es relevante, pero rinde mejor después de fortalecer lo crítico.",
    },
  ];
}

function buildContextNarrative(answers) {
  const empresa = cleanText(answers["S0_1"]?.value) || "La empresa";
  const rol = cleanText(answers["S0_3"]?.value);
  const giro = cleanText(answers["S2_9"]?.value);
  const queVende = cleanText(answers["S2_9C"]?.value);
  const clientes = toArray(answers["S2_10"]?.value).join(", ");
  const donde = cleanText(answers["S2_11"]?.value);
  const situacion = cleanText(answers["S3_12"]?.value);
  const crecimiento = cleanText(answers["S3_13"]?.value);
  const quitaTiempo = toArray(answers["S3_14"]?.value).join(", ");
  const futuro = cleanText(answers["S7_21"]?.value);
  const necesita = toArray(answers["S7_22"]?.value).join(", ");

  const bullets = [
    `• Giro principal: ${giro || "—"}`,
    `• Qué vende / hace realmente: ${queVende || "—"}`,
    `• Clientes: ${clientes || "—"}`,
    `• Operación: ${donde || "—"}`,
    `• Situación actual: ${situacion || "—"}`,
    `• Crecimiento últimos 2 años: ${crecimiento || "—"}`,
    `• Lo que más consume tiempo: ${quitaTiempo || "—"}`,
    `• Visión a 3 años: ${futuro || "—"}`,
    `• Lo que necesita para lograrlo: ${necesita || "—"}`,
  ];

  const headline = `${empresa}${rol ? ` (${rol})` : ""}: contexto y foco`;
  return { headline, bullets };
}

// ------------------------------
// 4) SCORING (solo preguntas "scored")
// ------------------------------
function computeScores(answers) {
  const byDim = {};
  const counts = {};

  for (const q of QUESTIONS) {
    if (q.type !== "scored") continue;
    const a = answers[q.id];
    if (!a) continue;
    byDim[q.dimension] = (byDim[q.dimension] ?? 0) + a.score;
    counts[q.dimension] = (counts[q.dimension] ?? 0) + 1;
  }

  const levelsByDim = {};
  for (const d of DIMENSIONS) {
    const sum = byDim[d.key] ?? 0;
    const n = counts[d.key] ?? 0;
    const avg = n ? sum / n : 0;
    levelsByDim[d.key] = avg || 1; // fallback
  }

  let global = 0;
  let wsum = 0;
  for (const d of DIMENSIONS) {
    global += (levelsByDim[d.key] ?? 1) * d.weight;
    wsum += d.weight;
  }
  global = wsum ? global / wsum : 1;

  const canAdvance = Object.values(levelsByDim).every(
    (v) => v >= ADVANCE_RULE.minDimensionLevelToAdvance
  );

  return { levelsByDim, global, canAdvance };
}

// ------------------------------
// 5) UI COMPONENTS
// ------------------------------
function Badge({ color, children }) {
  const cls =
    color === "red"
      ? "badge red"
      : color === "orange"
      ? "badge orange"
      : color === "yellow"
      ? "badge yellow"
      : color === "green"
      ? "badge green"
      : "badge blue";
  return <span className={cls}>{children}</span>;
}

function Progress({ value }) {
  return (
    <div className="progressWrap" aria-label="Progreso">
      <div className="progressBar" style={{ width: `${value}%` }} />
    </div>
  );
}

function Bars({ levelsByDim }) {
  return (
    <div className="bars">
      {DIMENSIONS.map((d) => {
        const v = clamp(levelsByDim[d.key] ?? 1, 1, 5);
        const pct = ((v - 1) / 4) * 100;
        return (
          <div className="barRow" key={d.key}>
            <div className="barLabel">{d.name}</div>
            <div className="barTrack">
              <div className="barFill" style={{ width: `${pct}%` }} />
            </div>
            <div className="barValue">{v.toFixed(1)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

// ------------------------------
// 6) APP
// ------------------------------
export default function App() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState("assessment"); // assessment | report

  const visibleQuestions = useMemo(() => {
    return QUESTIONS.filter((q) => (q.showIf ? q.showIf(answers) : true));
  }, [answers]);

  const current = visibleQuestions[step];

  const progress = useMemo(() => {
    const total = visibleQuestions.length || 1;
    return clamp(Math.round(((step + 1) / total) * 100), 0, 100);
  }, [step, visibleQuestions.length]);

  const allAnswered = useMemo(() => {
    return visibleQuestions.every((q) => {
      if (!q.required) return true;
      const a = answers[q.id];
      if (!a) return false;
      if (q.type === "text") return cleanText(a.value).length > 0;
      if (q.type === "single") return Boolean(a.value);
      if (q.type === "multi") return toArray(a.value).length > 0;
      if (q.type === "scored") return Boolean(a.score);
      return true;
    });
  }, [visibleQuestions, answers]);

  const currentAnswered = useMemo(() => {
    if (!current) return false;
    if (!current.required) return true;
    const a = answers[current.id];
    if (!a) return false;
    if (current.type === "text") return cleanText(a.value).length > 0;
    if (current.type === "single") return Boolean(a.value);
    if (current.type === "multi") return toArray(a.value).length > 0;
    if (current.type === "scored") return Boolean(a.score);
    return false;
  }, [current, answers]);

  const scoring = useMemo(() => {
    // scoring solo requiere que estén respondidas las preguntas "scored" visibles
    const scoredQs = visibleQuestions.filter((q) => q.type === "scored");
    const scoredOk = scoredQs.every((q) => Boolean(answers[q.id]?.score));
    if (!scoredOk) return null;
    return computeScores(answers);
  }, [visibleQuestions, answers]);

  const report = useMemo(() => {
    if (!scoring) return null;

    const { levelsByDim, global, canAdvance } = scoring;
    const lvl = levelLabel(global);

    const bestDim =
      DIMENSIONS.slice().sort((a, b) => levelsByDim[b.key] - levelsByDim[a.key])[0];
    const worstDim =
      DIMENSIONS.slice().sort((a, b) => levelsByDim[a.key] - levelsByDim[b.key])[0];

    const narrative = `Hoy tu empresa se encuentra en un nivel de madurez ${lvl.name}. Las principales decisiones se toman ${inferDecisionStyle(
      answers
    )}, y la operación depende ${inferDependency(answers)}. Existen avances en ${
      bestDim?.name
    }, mientras que ${worstDim?.name} limita la capacidad de crecer de forma sostenible.`;

    const pains = topPainPoints(levelsByDim);

    // FODA: primero explícito; si falta, fallback dimensiones
    const fodaExplicit = buildFODAFromExplicit(answers);
    const foda = fodaExplicit ?? buildFODAFromDimensions(levelsByDim);

    const breaches = buildBreaches(levelsByDim);

    const ctx = buildContextNarrative(answers);

    // historia
    const historia = {
      idea: cleanText(answers["S1_4"]?.value),
      antiguedad: cleanText(answers["S1_5"]?.value),
      desafios: toArray(answers["S1_6"]?.value),
      logro: cleanText(answers["S1_7"]?.value),
      dificil: cleanText(answers["S1_8"]?.value),
    };

    return {
      levelsByDim,
      global,
      lvl,
      canAdvance,
      narrative,
      pains,
      foda,
      breaches,
      ctx,
      historia,
    };
  }, [scoring, answers]);

  function setText(q, value) {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { type: q.type, value },
    }));
  }

  function setSingle(q, label) {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { type: q.type, value: label },
    }));
  }

  function toggleMulti(q, label) {
    setAnswers((prev) => {
      const current = toArray(prev[q.id]?.value);
      const exists = current.includes(label);
      let next = exists ? current.filter((x) => x !== label) : [...current, label];

      const max = q.maxSelect ? Number(q.maxSelect) : null;
      if (max && next.length > max) {
        // si supera, no deja agregar más
        next = current;
      }

      return {
        ...prev,
        [q.id]: { type: q.type, value: next },
      };
    });
  }

  function selectScored(q, opt) {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { type: q.type, score: opt.score, label: opt.label, dimension: q.dimension },
    }));
  }

  function goNext() {
    const max = visibleQuestions.length - 1;
    setStep((s) => clamp(s + 1, 0, max));
  }

  function goBack() {
    setStep((s) => clamp(s - 1, 0, visibleQuestions.length - 1));
  }

  function finish() {
    if (!allAnswered) return;
    setMode("report");
  }

  function reset() {
    setMode("assessment");
    setStep(0);
    setAnswers({});
  }

  // helper UI
  const currentSection = current?.section ?? "";
  const answeredCount = useMemo(() => {
    return visibleQuestions.reduce((acc, q) => {
      const a = answers[q.id];
      if (!a) return acc;
      if (q.type === "text") return cleanText(a.value).length ? acc + 1 : acc;
      if (q.type === "single") return a.value ? acc + 1 : acc;
      if (q.type === "multi") return toArray(a.value).length ? acc + 1 : acc;
      if (q.type === "scored") return a.score ? acc + 1 : acc;
      return acc;
    }, 0);
  }, [visibleQuestions, answers]);

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <div className="logo">V</div>
          <div className="brandText">
            <div className="brandName">VÉRTICE 360</div>
            <div className="brandTag">Fase 1 · Diagnosticar (Beta v2)</div>
          </div>
        </div>
        <div className="topActions">
          {mode === "report" ? (
            <>
              <button className="btn ghost" onClick={reset}>
                Reiniciar
              </button>
              <button className="btn" onClick={() => window.print()}>
                <Download size={16} /> Exportar PDF
              </button>
            </>
          ) : null}
        </div>
      </header>

      <main className="container">
        {mode === "assessment" && (
          <div className="card">
            <div className="cardHead">
              <div>
                <h1>Assessment Inteligente</h1>
                <p className="muted">
                  No mostramos todo de una: vamos por bloques (historia → realidad → FODA → futuro → madurez).
                </p>
              </div>

              <div className="miniKpis">
                <div className="miniKpi">
                  <div className="miniKpiLabel muted">Bloque</div>
                  <div className="miniKpiValue">{currentSection || "—"}</div>
                </div>
                <div className="miniKpi">
                  <div className="miniKpiLabel muted">Avance</div>
                  <div className="miniKpiValue">
                    {answeredCount}/{visibleQuestions.length}
                  </div>
                </div>
              </div>
            </div>

            <Progress value={progress} />

            {current ? (
              <div className="qWrap">
                <div className="qMeta">
                  <Badge color="blue">{current.title}</Badge>
                  <span className="muted">
                    Pregunta {step + 1} de {visibleQuestions.length}
                  </span>
                </div>

                <h2 className="qPrompt">{current.prompt}</h2>

                {/* Render por tipo */}
                {current.type === "text" && (
                  <div className="textAreaWrap">
                    <textarea
                      className="textArea"
                      rows={6}
                      value={answers[current.id]?.value ?? ""}
                      placeholder={current.placeholder ?? "Escribe aquí…"}
                      onChange={(e) => setText(current, e.target.value)}
                    />
                    {!currentAnswered && current.required ? (
                      <div className="hint warn">Esta respuesta es obligatoria.</div>
                    ) : (
                      <div className="hint muted">Tip: mientras más concreto, mejor el diagnóstico.</div>
                    )}
                  </div>
                )}

                {current.type === "single" && (
                  <div className="options">
                    {current.options.map((opt) => {
                      const selected = answers[current.id]?.value === opt.label;
                      return (
                        <button
                          key={opt.label}
                          className={`opt ${selected ? "selected" : ""}`}
                          onClick={() => setSingle(current, opt.label)}
                        >
                          <span>{opt.label}</span>
                          <span className="optScore">1</span>
                        </button>
                      );
                    })}
                    {!currentAnswered && current.required ? (
                      <div className="hint warn">Selecciona una opción para continuar.</div>
                    ) : null}
                  </div>
                )}

                {current.type === "multi" && (
                  <div className="options">
                    {current.maxSelect ? (
                      <div className="multiHint">
                        <Pill>Máx. {current.maxSelect} selecciones</Pill>
                      </div>
                    ) : null}

                    {current.options.map((opt) => {
                      const selected = toArray(answers[current.id]?.value).includes(opt.label);
                      return (
                        <button
                          key={opt.label}
                          className={`opt ${selected ? "selected" : ""}`}
                          onClick={() => toggleMulti(current, opt.label)}
                        >
                          <span>{opt.label}</span>
                          <span className="optScore">{selected ? "✓" : "+"}</span>
                        </button>
                      );
                    })}
                    {!currentAnswered && current.required ? (
                      <div className="hint warn">Selecciona al menos una opción.</div>
                    ) : null}
                  </div>
                )}

                {current.type === "scored" && (
                  <div className="options">
                    {current.options.map((opt) => {
                      const selected = answers[current.id]?.label === opt.label;
                      return (
                        <button
                          key={opt.label}
                          className={`opt ${selected ? "selected" : ""}`}
                          onClick={() => selectScored(current, opt)}
                        >
                          <span>{opt.label}</span>
                          <span className="optScore">{opt.score}</span>
                        </button>
                      );
                    })}
                    {!currentAnswered && current.required ? (
                      <div className="hint warn">Elige una opción para continuar.</div>
                    ) : null}
                  </div>
                )}

                <div className="nav">
                  <button className="btn ghost" onClick={goBack} disabled={step === 0}>
                    <ArrowLeft size={16} /> Atrás
                  </button>

                  {step < visibleQuestions.length - 1 ? (
                    <button className="btn" onClick={goNext} disabled={!currentAnswered}>
                      Siguiente <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button className="btn" onClick={finish} disabled={!allAnswered}>
                      Generar Diagnóstico 360 <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="muted">No hay preguntas para mostrar.</p>
            )}
          </div>
        )}

        {mode === "report" && report && (
          <div className="report">
            {/* HERO */}
            <div className="reportHero">
              <div>
                <div className="heroTop">
                  <Badge color={report.lvl.color}>{report.lvl.name}</Badge>
                  <span className="muted">· {new Date().toLocaleDateString()}</span>
                </div>
                <h1 className="heroTitle">{cleanText(answers["S0_1"]?.value) || "Mi Empresa"}</h1>
                <p className="heroHeadline">{coverHeadline(report.global)}</p>
                <p className="heroIntro">{coverIntro(report.global)}</p>
              </div>

              <div className="heroBox">
                <div className="heroBoxTitle">Nivel global</div>
                <div className="heroBoxValue">{report.global.toFixed(1)} / 5.0</div>
                <div className="heroBoxHint muted">Promedio ponderado por dimensiones</div>
              </div>
            </div>

            {/* CONTEXTO */}
            <section className="section">
              <div className="sectionHead">
                <h2>{report.ctx.headline}</h2>
                <span className="muted">
                  <Radar size={16} style={{ verticalAlign: "-3px" }} /> Foto ejecutiva
                </span>
              </div>
              <div className="ctxGrid">
                <div className="panel">
                  <h3>Resumen</h3>
                  <ul className="ulTight">
                    {report.ctx.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="panel">
                  <h3>Historia (lo que define el ADN)</h3>
                  <div className="hist">
                    <div className="histRow">
                      <div className="histLabel">Origen</div>
                      <div className="muted">{report.historia.idea || "—"}</div>
                    </div>
                    <div className="histRow">
                      <div className="histLabel">Antigüedad</div>
                      <div className="muted">{report.historia.antiguedad || "—"}</div>
                    </div>
                    <div className="histRow">
                      <div className="histLabel">Mayor logro</div>
                      <div className="muted">{report.historia.logro || "—"}</div>
                    </div>
                    <div className="histRow">
                      <div className="histLabel">Momento más difícil</div>
                      <div className="muted">{report.historia.dificil || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* FOTO GENERAL */}
            <section className="section">
              <h2>Tu empresa hoy</h2>
              <p className="lead">{report.narrative}</p>
            </section>

            {/* MADUREZ POR DIMENSIÓN */}
            <section className="section">
              <div className="sectionHead">
                <h2>Nivel de madurez por dimensión</h2>
                <span className="muted">
                  <Radar size={16} style={{ verticalAlign: "-3px" }} /> Vista simple (1–5)
                </span>
              </div>
              <div className="grid2">
                <div className="panel">
                  <Bars levelsByDim={report.levelsByDim} />
                </div>
                <div className="panel">
                  <h3>Interpretación breve</h3>
                  <div className="dimNotes">
                    {DIMENSIONS.map((d) => {
                      const v = report.levelsByDim[d.key];
                      return (
                        <div key={d.key} className="dimNote">
                          <div className="dimName">
                            {d.name} · {v.toFixed(1)}
                          </div>
                          <div className="muted">{dimensionText(d.key, v)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* DOLORES */}
            <section className="section">
              <h2>Principales desafíos que hoy te están frenando</h2>
              <div className="cards3">
                {report.pains.map((p) => (
                  <div key={p.rank} className={`painCard ${p.rank === 1 ? "big" : ""}`}>
                    <div className="painTop">
                      <Badge color="orange">Dolor #{p.rank}</Badge>
                    </div>
                    <h3>{p.name}</h3>
                    <p className="muted">{p.why}</p>
                    <div className="painRisk">
                      <AlertTriangle size={16} /> <span>{p.risk}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FODA */}
            <section className="section">
              <h2>Análisis FODA (con tus respuestas)</h2>
              <div className="foda">
                <div className="fodaBox">
                  <h3>Fortalezas</h3>
                  <ul className="ulTight">
                    {report.foda.strengths.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="fodaBox">
                  <h3>Oportunidades</h3>
                  <ul className="ulTight">
                    {report.foda.opportunities.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="fodaBox">
                  <h3>Debilidades</h3>
                  <ul className="ulTight">
                    {report.foda.weaknesses.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="fodaBox">
                  <h3>Amenazas</h3>
                  <ul className="ulTight">
                    {report.foda.threats.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* BRECHAS */}
            <section className="section">
              <h2>Por dónde empezar (prioridades reales)</h2>
              <div className="breaches">
                {report.breaches.map((b) => (
                  <div key={b.label} className="breachRow">
                    <div className="breachLabel">{b.label}</div>
                    <div className="breachItem">{b.item}</div>
                    <div className="muted">{b.why}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* DECISIÓN */}
            <section className={`section decision ${report.canAdvance ? "ok" : "no"}`}>
              <div className="decisionIcon">
                {report.canAdvance ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
              </div>
              <div>
                <h2>{report.canAdvance ? "Tu empresa está lista para el siguiente paso" : "Antes de avanzar…"}</h2>
                <p className="lead">
                  {report.canAdvance
                    ? "Tu empresa cuenta con una base mínima para pasar a la Fase 2 (Definir foco y dirección)."
                    : "Antes de definir estrategia, es necesario fortalecer las dimensiones críticas. Avanzar ahora aumentaría el riesgo del negocio."}
                </p>

                <div className="decisionCtas no-print">
                  <button className="btn ghost" onClick={reset}>
                    Volver al assessment
                  </button>
                  {report.canAdvance ? (
                    <button
                      className="btn"
                      onClick={() => alert("Beta: aquí conectas con la Fase 2 (Canvas) cuando la construyamos.")}
                    >
                      Continuar a Fase 2 <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button className="btn" onClick={() => window.print()}>
                      Exportar PDF y trabajar base <Download size={16} />
                    </button>
                  )}
                </div>
              </div>
            </section>

            <footer className="footer">
              <div className="muted">Diagnóstico generado por el Método Vértice 360 · Fase 1 (Beta v2)</div>
            </footer>
          </div>
        )}
      </main>

      <style>{css}</style>
    </div>
  );
}

// ------------------------------
// 7) CSS (simple, limpio, demo-ready + print)
// ------------------------------
const css = `
:root{
  --bg:#0b1220;
  --card:#0f1a2e;
  --panel:#0d1730;
  --text:#e7eefc;
  --muted:#a9b6d3;
  --line:rgba(255,255,255,.08);
  --accent:#6ea8ff;
  --green:#42d392;
  --red:#ff5a6a;
  --orange:#ffb020;
  --yellow:#ffd65a;
  --blue:#6ea8ff;
  --shadow: 0 10px 30px rgba(0,0,0,.35);
}

*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  background: radial-gradient(1200px 600px at 20% -10%, rgba(110,168,255,.25), transparent 60%),
              radial-gradient(900px 500px at 100% 0%, rgba(66,211,146,.12), transparent 60%),
              var(--bg);
  color:var(--text);
}

.app{min-height:100%}
.container{max-width:1100px; margin:28px auto; padding:0 18px}

.topbar{
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 18px;
  border-bottom:1px solid var(--line);
  position:sticky; top:0;
  backdrop-filter: blur(10px);
  background: rgba(11,18,32,.6);
  z-index:10;
}

.brand{display:flex; align-items:center; gap:12px}
.logo{
  width:40px; height:40px; border-radius:12px;
  background: linear-gradient(135deg, rgba(110,168,255,.9), rgba(66,211,146,.7));
  display:flex; align-items:center; justify-content:center;
  font-weight:800;
  box-shadow: var(--shadow);
}
.brandName{font-weight:800; letter-spacing:.6px}
.brandTag{font-size:12px; color:var(--muted); margin-top:2px}

.topActions{display:flex; gap:10px; align-items:center}

.card{
  background: rgba(15,26,46,.92);
  border:1px solid var(--line);
  border-radius:20px;
  box-shadow: var(--shadow);
  padding:18px;
}

.cardHead{
  display:flex; gap:16px; align-items:flex-start; justify-content:space-between;
  margin-bottom:12px;
}
.miniKpis{display:flex; gap:10px; flex-wrap:wrap}
.miniKpi{
  border:1px solid var(--line);
  background: rgba(255,255,255,.03);
  border-radius:14px;
  padding:10px 12px;
  min-width: 160px;
}
.miniKpiLabel{font-size:12px}
.miniKpiValue{font-weight:900; margin-top:4px}

h1{margin:0 0 4px 0; font-size:22px}
h2{margin:0}
h3{margin:0}
p{margin:0}

.muted{color:var(--muted)}
.lead{color: var(--text); opacity:.95; line-height:1.5}

.progressWrap{
  height:10px; background: rgba(255,255,255,.05);
  border-radius:999px; overflow:hidden;
  border:1px solid var(--line);
}
.progressBar{
  height:100%;
  background: linear-gradient(90deg, rgba(110,168,255,.95), rgba(66,211,146,.85));
  width: 0%;
}

.qWrap{padding:14px 4px 6px}
.qMeta{display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:12px}
.qPrompt{margin:10px 0 14px; font-size:20px; line-height:1.25}

.textAreaWrap{display:flex; flex-direction:column; gap:10px}
.textArea{
  width:100%;
  background: rgba(255,255,255,.03);
  border:1px solid var(--line);
  border-radius:14px;
  padding:12px 12px;
  color: var(--text);
  outline:none;
  resize: vertical;
  line-height:1.45;
}
.textArea:focus{border-color: rgba(110,168,255,.55)}
.hint{font-size:12px}
.hint.warn{color: rgba(255,214,90,.95); font-weight:700}

.options{display:flex; flex-direction:column; gap:10px}
.opt{
  text-align:left;
  display:flex; justify-content:space-between; gap:14px; align-items:center;
  padding:12px 14px;
  border-radius:14px;
  border:1px solid var(--line);
  background: rgba(255,255,255,.03);
  color: var(--text);
  cursor:pointer;
  transition: transform .05s ease, border-color .15s ease, background .15s ease;
}
.opt:hover{border-color: rgba(110,168,255,.45); background: rgba(110,168,255,.08)}
.opt:active{transform: scale(.99)}
.opt.selected{border-color: rgba(66,211,146,.55); background: rgba(66,211,146,.08)}
.optScore{
  min-width:34px; height:28px;
  border-radius:10px;
  display:flex; align-items:center; justify-content:center;
  border:1px solid var(--line);
  background: rgba(255,255,255,.04);
  color: var(--muted);
  font-weight:900;
  padding:0 10px;
}
.multiHint{display:flex; justify-content:flex-start; margin-bottom:4px}
.pill{
  display:inline-flex; align-items:center;
  padding:6px 10px;
  border-radius:999px;
  border:1px solid var(--line);
  background: rgba(255,255,255,.03);
  font-size:12px;
  color: var(--muted);
  font-weight:800;
}

.nav{display:flex; justify-content:space-between; align-items:center; margin-top:14px}

.btn{
  display:inline-flex; align-items:center; gap:8px;
  padding:10px 12px;
  border-radius:12px;
  border:1px solid rgba(110,168,255,.45);
  background: rgba(110,168,255,.18);
  color: var(--text);
  cursor:pointer;
  font-weight:800;
}
.btn:hover{background: rgba(110,168,255,.24)}
.btn:disabled{opacity:.45; cursor:not-allowed}
.btn.ghost{
  border:1px solid var(--line);
  background: rgba(255,255,255,.03);
}
.btn.ghost:hover{background: rgba(255,255,255,.06)}

.badge{
  padding:6px 10px;
  border-radius:999px;
  border:1px solid var(--line);
  font-size:12px;
  font-weight:900;
}
.badge.red{background: rgba(255,90,106,.14); border-color: rgba(255,90,106,.35)}
.badge.orange{background: rgba(255,176,32,.14); border-color: rgba(255,176,32,.35)}
.badge.yellow{background: rgba(255,214,90,.14); border-color: rgba(255,214,90,.35)}
.badge.green{background: rgba(66,211,146,.14); border-color: rgba(66,211,146,.35)}
.badge.blue{background: rgba(110,168,255,.14); border-color: rgba(110,168,255,.35)}

.report{display:flex; flex-direction:column; gap:18px}
.reportHero{
  display:grid;
  grid-template-columns: 1.4fr .6fr;
  gap:14px;
  padding:18px;
  border-radius:20px;
  border:1px solid var(--line);
  background: rgba(15,26,46,.92);
  box-shadow: var(--shadow);
}
.heroTop{display:flex; gap:10px; align-items:center; margin-bottom:10px}
.heroTitle{font-size:28px; margin:0 0 6px}
.heroHeadline{font-size:18px; font-weight:900; margin:0 0 8px}
.heroIntro{color:var(--muted); line-height:1.5}

.heroBox{
  border:1px solid var(--line);
  border-radius:18px;
  background: rgba(255,255,255,.03);
  padding:14px;
  display:flex;
  flex-direction:column;
  justify-content:center;
}
.heroBoxTitle{color:var(--muted); font-weight:800}
.heroBoxValue{font-size:28px; font-weight:900; margin:6px 0}
.heroBoxHint{font-size:12px}

.section{
  background: rgba(15,26,46,.92);
  border:1px solid var(--line);
  border-radius:20px;
  box-shadow: var(--shadow);
  padding:18px;
}
.sectionHead{display:flex; justify-content:space-between; align-items:center; gap:12px}
.section h2{margin:0 0 10px 0}

.ctxGrid{display:grid; grid-template-columns: 1fr 1fr; gap:14px}
.ulTight{margin:0; padding-left:18px}
.ulTight li{margin:6px 0; color: var(--text); opacity:.95}

.hist{display:flex; flex-direction:column; gap:10px}
.histRow{
  padding:10px 10px;
  border-radius:14px;
  border:1px solid var(--line);
  background: rgba(0,0,0,.08);
}
.histLabel{font-weight:900; margin-bottom:6px}

.grid2{
  display:grid; grid-template-columns: 1fr 1fr; gap:14px;
}
.panel{
  border:1px solid var(--line);
  border-radius:18px;
  background: rgba(255,255,255,.03);
  padding:14px;
}

.bars{display:flex; flex-direction:column; gap:12px}
.barRow{display:grid; grid-template-columns: 140px 1fr 50px; gap:10px; align-items:center}
.barLabel{color:var(--muted); font-weight:800; font-size:13px}
.barTrack{height:10px; border-radius:999px; background: rgba(255,255,255,.06); border:1px solid var(--line); overflow:hidden}
.barFill{height:100%; background: linear-gradient(90deg, rgba(110,168,255,.95), rgba(66,211,146,.85))}
.barValue{font-weight:900; text-align:right}

.dimNotes{display:flex; flex-direction:column; gap:12px}
.dimNote{padding:10px 10px; border-radius:14px; border:1px solid var(--line); background: rgba(0,0,0,.08)}
.dimName{font-weight:900; margin-bottom:6px}

.cards3{
  display:grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap:14px;
}
.painCard{
  border:1px solid var(--line);
  border-radius:18px;
  background: rgba(255,255,255,.03);
  padding:14px;
  display:flex;
  flex-direction:column;
  gap:10px;
}
.painTop{display:flex; justify-content:space-between; align-items:center}
.painRisk{
  display:flex; gap:8px; align-items:flex-start;
  color: rgba(255,214,90,.95);
  font-weight:800;
}

.foda{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:14px;
}
.fodaBox{
  border:1px solid var(--line);
  border-radius:18px;
  background: rgba(255,255,255,.03);
  padding:14px;
}
.fodaBox h3{margin:0 0 10px}

.breaches{
  display:flex; flex-direction:column; gap:10px;
}
.breachRow{
  border:1px solid var(--line);
  border-radius:16px;
  background: rgba(255,255,255,.03);
  padding:12px;
  display:grid;
  grid-template-columns: 150px 220px 1fr;
  gap:10px;
  align-items:center;
}
.breachLabel{color: var(--muted); font-weight:900}
.breachItem{font-weight:900}

.decision{
  display:grid;
  grid-template-columns: 44px 1fr;
  gap:14px;
  align-items:flex-start;
}
.decision.ok{border-color: rgba(66,211,146,.35); background: rgba(66,211,146,.06)}
.decision.no{border-color: rgba(255,90,106,.35); background: rgba(255,90,106,.06)}
.decisionIcon{
  width:44px; height:44px;
  border-radius:14px;
  border:1px solid var(--line);
  background: rgba(255,255,255,.03);
  display:flex; align-items:center; justify-content:center;
}
.decisionCtas{display:flex; gap:10px; margin-top:10px; flex-wrap:wrap}

.footer{
  text-align:center;
  color: var(--muted);
  font-size:12px;
  padding: 6px 0 20px;
}

/* Responsive */
@media (max-width: 920px){
  .reportHero{grid-template-columns: 1fr}
  .grid2{grid-template-columns: 1fr}
  .cards3{grid-template-columns: 1fr}
  .foda{grid-template-columns: 1fr}
  .breachRow{grid-template-columns: 1fr; gap:6px}
  .ctxGrid{grid-template-columns: 1fr}
}

/* PRINT */
@media print{
  body{background: #fff; color:#111}
  .no-print{display:none !important}
  .reportHero,.section{box-shadow:none; background:#fff; border:1px solid #ddd}
  .panel,.painCard,.fodaBox,.breachRow,.dimNote,.heroBox{background:#fff; border:1px solid #ddd}
  .muted{color:#444}
  .badge{border-color:#ccc}
  .badge.blue,.badge.green,.badge.yellow,.badge.orange,.badge.red{background:#f5f5f5; color:#111}
  .progressWrap,.progressBar{display:none}
}
`;
