import React, { useMemo, useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Radar,
  AlertTriangle,
  Sparkles,
  Building2,
  Target,
  Users,
  ClipboardList,
  LineChart,
  ShieldAlert,
} from "lucide-react";

/**
 * VÉRTICE 360 – Fase 1 · Diagnosticar (Demo Comercial) — v3.1
 * ✅ FIX PRINCIPAL: el reporte SIEMPRE se genera (no depende de allAnswered)
 * ✅ Freeze robusto: al terminar, se congela el set de preguntas respondidas/visibles
 * ✅ showIf seguro: no “rompe” el reporte
 * ✅ Debug panel: para verificar estado rápidamente en demo
 */

// ------------------------------
// 1) MODELO DE MADUREZ
// ------------------------------
const DIMENSIONS = [
  { key: "strategy", name: "Estrategia", weight: 0.17 },
  { key: "process", name: "Procesos", weight: 0.17 },
  { key: "finance", name: "Finanzas", weight: 0.18 },
  { key: "people", name: "Personas y Roles", weight: 0.16 },
  { key: "tech", name: "Tecnología y Datos", weight: 0.16 },
  { key: "risk", name: "Gobierno y Riesgos", weight: 0.16 },
];

const ADVANCE_RULE = { minDimensionLevelToAdvance: 2 };

// ------------------------------
// 2) BANCO DE PREGUNTAS
// ------------------------------
const QUESTIONS = [
  // ESTRATEGIA
  {
    id: "E1",
    type: "choice",
    dimension: "strategy",
    title: "Estrategia",
    prompt: "Cuando tomas decisiones importantes en tu empresa, normalmente…",
    options: [
      { label: "Reacciono a lo urgente del día a día", score: 1, signals: ["reactive"] },
      { label: "Me guío por mi experiencia e intuición", score: 2, signals: ["intuition"] },
      { label: "Tengo objetivos claros como referencia", score: 3, signals: ["objectives"] },
      { label: "Evalúo según metas y resultados medibles", score: 4, signals: ["metrics"] },
      { label: "Tengo criterios alineados a una visión de largo plazo", score: 5, signals: ["vision"] },
    ],
  },
  {
    id: "E2",
    type: "choice",
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
  {
    id: "E3",
    type: "choice",
    dimension: "strategy",
    title: "Estrategia",
    prompt: "Cuando aparece una oportunidad nueva, ¿cómo decides si decir que sí o que no?",
    options: [
      { label: "Casi siempre digo que sí para no perderla", score: 1, signals: ["noFocus"] },
      { label: "Depende del momento y la urgencia", score: 2, signals: ["noFocus"] },
      { label: "La comparo con objetivos generales", score: 3, signals: ["someFocus"] },
      { label: "La evalúo con criterios (rentabilidad/recursos/prioridad)", score: 4, signals: ["focus"] },
      { label: "Tenemos criterios claros y un proceso de priorización", score: 5, signals: ["focus", "system"] },
    ],
  },

  // PROCESOS
  {
    id: "P1",
    type: "choice",
    dimension: "process",
    title: "Procesos",
    prompt: "Si una persona clave falta una semana, ¿qué pasa con la operación?",
    options: [
      { label: "Todo se desordena", score: 1, signals: ["keyPersonRisk"] },
      { label: "Se resuelve, pero con mucho esfuerzo", score: 2, signals: ["keyPersonRisk"] },
      { label: "Hay problemas, pero no críticos", score: 3, signals: ["someDependency"] },
      { label: "La mayoría sigue funcionando", score: 4, signals: ["resilientOps"] },
      { label: "No afecta, los procesos están claros", score: 5, signals: ["repeatable"] },
    ],
  },
  {
    id: "P2",
    type: "choice",
    dimension: "process",
    title: "Procesos",
    prompt: "Las tareas importantes de la empresa…",
    showIf: (a) => (a["P1"]?.score ?? 0) >= 3,
    options: [
      { label: "Se hacen según quien esté disponible", score: 1 },
      { label: "Se reparten, pero sin claridad", score: 2 },
      { label: "Tienen responsables definidos", score: 3 },
      { label: "Siguen procesos conocidos", score: 4 },
      { label: "Están documentadas y estandarizadas", score: 5, signals: ["repeatable"] },
    ],
  },
  {
    id: "P3",
    type: "choice",
    dimension: "process",
    title: "Procesos",
    prompt: "Cuando algo sale mal (error, reclamo, atraso), normalmente…",
    options: [
      { label: "Se apaga el incendio y seguimos", score: 1, signals: ["firefighting"] },
      { label: "Se conversa, pero no se deja registro", score: 2, signals: ["firefighting"] },
      { label: "Se corrige y a veces se ajusta el proceso", score: 3, signals: ["improveSometimes"] },
      { label: "Se analiza la causa y se define un ajuste", score: 4, signals: ["continuousImprovement"] },
      { label: "Tenemos gestión de incidentes y mejora continua", score: 5, signals: ["continuousImprovement", "system"] },
    ],
  },

  // FINANZAS
  {
    id: "F1",
    type: "choice",
    dimension: "finance",
    title: "Finanzas",
    prompt: "¿Cómo sabes si este mes fue bueno o malo para la empresa?",
    options: [
      { label: "Por la sensación general", score: 1, signals: ["lowVisibility"] },
      { label: "Mirando la cuenta bancaria", score: 2, signals: ["cashOnly"] },
      { label: "Revisando ingresos y gastos", score: 3, signals: ["basicControl"] },
      { label: "Analizando resultados y márgenes", score: 4, signals: ["marginFocus"] },
      { label: "Comparando contra presupuesto e indicadores", score: 5, signals: ["budget"] },
    ],
  },
  {
    id: "F2",
    type: "choice",
    dimension: "finance",
    title: "Finanzas",
    prompt: "¿Con qué frecuencia revisas información financiera para decidir?",
    showIf: (a) => (a["F1"]?.score ?? 0) >= 3,
    options: [
      { label: "Casi nunca", score: 1 },
      { label: "Solo cuando hay problemas", score: 2 },
      { label: "Mensualmente", score: 3 },
      { label: "Periódicamente con indicadores", score: 4 },
      { label: "Con control y seguimiento formal", score: 5, signals: ["budget"] },
    ],
  },
  {
    id: "F3",
    type: "choice",
    dimension: "finance",
    title: "Finanzas",
    prompt: "Sobre precios y márgenes, tu empresa…",
    options: [
      { label: "No conoce márgenes por producto/servicio", score: 1, signals: ["marginBlind"] },
      { label: "Los estima, pero no los sigue", score: 2, signals: ["marginBlind"] },
      { label: "Conoce márgenes generales", score: 3, signals: ["marginFocus"] },
      { label: "Conoce márgenes por línea/cliente", score: 4, signals: ["marginFocus"] },
      { label: "Gestiona márgenes con metas y acciones", score: 5, signals: ["marginFocus", "system"] },
    ],
  },

  // PERSONAS
  {
    id: "R1",
    type: "choice",
    dimension: "people",
    title: "Personas y Roles",
    prompt: "En tu empresa, las responsabilidades…",
    options: [
      { label: "No están claras", score: 1, signals: ["roleConfusion"] },
      { label: "Se entienden, pero no están definidas", score: 2, signals: ["roleConfusion"] },
      { label: "Están más o menos claras", score: 3, signals: ["someClarity"] },
      { label: "Están definidas por rol", score: 4, signals: ["roleClarity"] },
      { label: "Están claras y no dependen del dueño", score: 5, signals: ["roleClarity", "autonomy"] },
    ],
  },
  {
    id: "R2",
    type: "choice",
    dimension: "people",
    title: "Personas y Roles",
    prompt: "Cuando surge un problema importante…",
    showIf: (a) => (a["R1"]?.score ?? 0) >= 3,
    options: [
      { label: "Siempre lo resuelve el dueño", score: 1, signals: ["ownerDependency"] },
      { label: "Normalmente pasa por el dueño", score: 2, signals: ["ownerDependency"] },
      { label: "Algunas personas lo resuelven solas", score: 3, signals: ["someAutonomy"] },
      { label: "Los responsables actúan con autonomía", score: 4, signals: ["autonomy"] },
      { label: "El sistema absorbe el problema", score: 5, signals: ["autonomy", "system"] },
    ],
  },
  {
    id: "R3",
    type: "choice",
    dimension: "people",
    title: "Personas y Roles",
    prompt: "Sobre desempeño y seguimiento, hoy…",
    options: [
      { label: "No hay seguimiento formal", score: 1, signals: ["noPeopleMgmt"] },
      { label: "Se conversa cuando hay problemas", score: 2, signals: ["noPeopleMgmt"] },
      { label: "Hay seguimiento informal y metas generales", score: 3, signals: ["basicPeopleMgmt"] },
      { label: "Hay reuniones y acuerdos de desempeño", score: 4, signals: ["peopleMgmt"] },
      { label: "Hay KPIs, roles y rutinas de gestión", score: 5, signals: ["peopleMgmt", "system"] },
    ],
  },

  // TECNOLOGÍA
  {
    id: "T1",
    type: "choice",
    dimension: "tech",
    title: "Tecnología y Datos",
    prompt: "¿Qué rol juega hoy la tecnología en tu empresa?",
    options: [
      { label: "Solo lo básico (correo, WhatsApp)", score: 1, signals: ["lowTech"] },
      { label: "Herramientas sueltas", score: 2, signals: ["fragmentedTech"] },
      { label: "Apoya ciertas tareas clave", score: 3, signals: ["someTech"] },
      { label: "Es parte del control del negocio", score: 4, signals: ["dataDriven"] },
      { label: "Permite escalar y decidir mejor", score: 5, signals: ["dataDriven", "system"] },
    ],
  },
  {
    id: "T2",
    type: "choice",
    dimension: "tech",
    title: "Tecnología y Datos",
    prompt: "La información que usas para decidir…",
    showIf: (a) => (a["T1"]?.score ?? 0) >= 3,
    options: [
      { label: "Está dispersa", score: 1, signals: ["dataChaos"] },
      { label: "Se arma manualmente", score: 2, signals: ["manualReporting"] },
      { label: "Está centralizada", score: 3, signals: ["centralized"] },
      { label: "Se actualiza periódicamente", score: 4, signals: ["regularData"] },
      { label: "Es confiable y accesible", score: 5, signals: ["trustedData"] },
    ],
  },
  {
    id: "T3",
    type: "choice",
    dimension: "tech",
    title: "Tecnología y Datos",
    prompt: "Para ventas/operación, la empresa…",
    options: [
      { label: "Trabaja con planillas y mensajes", score: 1, signals: ["manualOps"] },
      { label: "Tiene herramientas, pero no integradas", score: 2, signals: ["fragmentedTech"] },
      { label: "Tiene un sistema base (ERP/CRM simple)", score: 3, signals: ["someTech"] },
      { label: "Integra datos para seguimiento", score: 4, signals: ["dataDriven"] },
      { label: "Automatiza y monitorea con dashboards", score: 5, signals: ["dataDriven", "automation"] },
    ],
  },

  // RIESGOS
  {
    id: "G1",
    type: "choice",
    dimension: "risk",
    title: "Gobierno y Riesgos",
    prompt: "Si hoy ocurre un problema grave (persona clave, cliente grande, caja), la empresa…",
    options: [
      { label: "Queda muy expuesta", score: 1, signals: ["fragile"] },
      { label: "Tendría serios problemas", score: 2, signals: ["fragile"] },
      { label: "Podría resistir un tiempo", score: 3, signals: ["someResilience"] },
      { label: "Tiene controles mínimos", score: 4, signals: ["controls"] },
      { label: "Tiene planes y controles claros", score: 5, signals: ["controls", "system"] },
    ],
  },
  {
    id: "G2",
    type: "choice",
    dimension: "risk",
    title: "Gobierno y Riesgos",
    prompt: "¿Qué tan consciente eres de los principales riesgos del negocio?",
    showIf: (a) => (a["G1"]?.score ?? 0) >= 3,
    options: [
      { label: "No los tengo identificados", score: 1 },
      { label: "Los intuyo", score: 2 },
      { label: "Los conozco, pero no gestiono", score: 3 },
      { label: "Los monitoreo", score: 4 },
      { label: "Los gestiono activamente", score: 5, signals: ["controls"] },
    ],
  },
  {
    id: "G3",
    type: "choice",
    dimension: "risk",
    title: "Gobierno y Riesgos",
    prompt: "Sobre contratos / cumplimiento / documentación clave…",
    options: [
      { label: "Está todo muy informal", score: 1, signals: ["complianceRisk"] },
      { label: "Algunas cosas están, pero incompletas", score: 2, signals: ["complianceRisk"] },
      { label: "Lo esencial está razonablemente cubierto", score: 3, signals: ["basicCompliance"] },
      { label: "Está ordenado y con responsables", score: 4, signals: ["controls"] },
      { label: "Se gestiona como sistema (revisión y control)", score: 5, signals: ["controls", "system"] },
    ],
  },

  // CONTEXTO (FODA enriquecido)
  {
    id: "S0",
    type: "choice",
    dimension: "strategy",
    title: "Contexto",
    prompt: "Elige una fortaleza real de tu empresa (la más representativa hoy):",
    options: [
      { label: "Producto/servicio valorado por clientes", score: 3, signals: ["strengthValue"] },
      { label: "Velocidad para resolver y ejecutar", score: 3, signals: ["strengthSpeed"] },
      { label: "Relación comercial fuerte con clientes", score: 3, signals: ["strengthRel"] },
      { label: "Equipo comprometido y estable", score: 3, signals: ["strengthTeam"] },
      { label: "Diferenciación clara frente a competidores", score: 3, signals: ["strengthDifferentiation"] },
    ],
  },
  {
    id: "S1",
    type: "text",
    dimension: "strategy",
    title: "Contexto",
    prompt: (answers) =>
      `¿Por qué consideras "${answers["S0"]?.label || "la opción seleccionada"}" una fortaleza? (opcional)`,
    showIf: (a) => Boolean(a["S0"]?.label),
  },
  {
    id: "W0",
    type: "choice",
    dimension: "risk",
    title: "Contexto",
    prompt: "¿Cuál es tu debilidad más peligrosa hoy?",
    options: [
      { label: "Dependencia del dueño/persona clave", score: 2, signals: ["weakOwner"] },
      { label: "Falta de control financiero (caja/margen)", score: 2, signals: ["weakFinance"] },
      { label: "Procesos poco repetibles (todo depende de personas)", score: 2, signals: ["weakProcess"] },
      { label: "Ventas inestables / baja generación comercial", score: 2, signals: ["weakSales"] },
      { label: "Tecnología y datos dispersos", score: 2, signals: ["weakTech"] },
    ],
  },
  {
    id: "W1",
    type: "text",
    dimension: "risk",
    title: "Contexto",
    prompt: (answers) =>
      `¿Qué impacto te genera "${answers["W0"]?.label || "la debilidad seleccionada"}" hoy? (opcional)`,
    showIf: (a) => Boolean(a["W0"]?.label),
  },
];

// ------------------------------
// 3) UTILIDADES
// ------------------------------
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
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
  if (l <= 2) return "Tu empresa funciona gracias al esfuerzo constante, pero hoy está expuesta.";
  if (l === 3) return "Tu empresa dejó atrás el caos; ahora el desafío es profesionalizar.";
  return "Tu empresa tiene una base sólida para crecer con control.";
}

function coverIntro(level) {
  const l = Math.round(level);
  if (l <= 2)
    return "El crecimiento se sostiene en resolver lo urgente. Esto avanza, pero genera desgaste y riesgo cuando el negocio crece.";
  if (l === 3)
    return "Hay avances en orden y control. El siguiente paso es convertir ese orden en sistema de gestión para crecer con seguridad.";
  return "La gestión se apoya en procesos y datos. El desafío ahora es optimizar, reducir riesgos y preparar el siguiente salto.";
}

function dimensionText(dimKey, lvl) {
  const t = {
    strategy: [
      "Decisiones desde urgencia y reacción. Falta foco y priorización.",
      "Guía por intuición: funciona, pero cuesta alinear y decir “no”.",
      "Objetivos ordenan parcialmente, pero no gobiernan todo el negocio.",
      "Metas y medición reducen improvisación y mejoran prioridades.",
      "Visión y criterios claros: foco sostenido y decisiones de largo plazo.",
    ],
    process: [
      "Dependencia fuerte de personas. Riesgo alto al crecer.",
      "Procesos “de memoria”. Inconsistencia y retrabajo.",
      "Orden parcial, pero falta consistencia y estandarización.",
      "Procesos estables: mejor continuidad y coordinación.",
      "Procesos documentados y repetibles: base sólida para escalar.",
    ],
    finance: [
      "Baja visibilidad. Sorpresas de caja/margen.",
      "Control por banco/caja: sobrevives, pero no gestionas rentabilidad.",
      "Control de ingresos/gastos: base para decisiones.",
      "Gestión por margen/resultados: mejores decisiones de rentabilidad.",
      "Presupuesto + indicadores: anticipación y control.",
    ],
    people: [
      "Roles difusos: todo cae en el dueño.",
      "Fricción y confusión. Mucho depende de personas específicas.",
      "Delegación parcial: avances, pero aún hay concentración.",
      "Roles definidos y autonomía: menos dependencia del dueño.",
      "Autonomía alta: responsabilidades claras y decisiones distribuidas.",
    ],
    tech: [
      "Tecnología básica. Datos dispersos.",
      "Herramientas sueltas sin sistema integrado.",
      "Apoya tareas clave, falta integración.",
      "Datos apoyan control del negocio.",
      "Tecnología + datos confiables permiten escalar con velocidad.",
    ],
    risk: [
      "Muy expuesta. Sin controles mínimos.",
      "Riesgo alto por dependencia y poca disciplina.",
      "Resiste un tiempo, sin monitoreo sistemático.",
      "Controles mínimos y disciplina básica.",
      "Riesgos gestionados como sistema: continuidad y robustez.",
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

function getSignals(answers) {
  const s = [];
  Object.values(answers).forEach((a) => {
    if (a?.signals?.length) s.push(...a.signals);
  });
  return s;
}

function companySizeBucket(profile) {
  const n = Number(profile.employees || 0);
  if (!n) return { key: "unknown", name: "No informado", hint: "Define tamaño para afinar benchmark." };
  if (n <= 9) return { key: "micro", name: "Micro (1–9)", hint: "Alta dependencia del dueño es común." };
  if (n <= 49) return { key: "small", name: "Pequeña (10–49)", hint: "Escalar requiere procesos y control financiero." };
  if (n <= 199) return { key: "mid", name: "Mediana (50–199)", hint: "Riesgo típico: falta de gobernanza y datos integrados." };
  return { key: "large", name: "Grande (200+)", hint: "Foco: gobernanza, control y eficiencia." };
}

function competitiveContext(profile) {
  const industry = (profile.industry || "").toLowerCase();

  if (industry.includes("retail") || industry.includes("comerc") || industry.includes("ecommerce")) {
    return {
      headline: "Competencia por precio + experiencia + disponibilidad.",
      dynamics: [
        "Presión por margen alta: descuentos compiten fuerte.",
        "Experiencia (tiempos, atención, postventa) diferencia más que producto.",
        "Stock/operación: fallas generan pérdida directa (venta y reputación).",
      ],
    };
  }

  if (industry.includes("servic") || industry.includes("consult") || industry.includes("agencia")) {
    return {
      headline: "Competencia por confianza + cumplimiento + valor percibido.",
      dynamics: [
        "Venta depende de reputación y resultados medibles.",
        "Rentabilidad se define por utilización y control de alcance.",
        "Riesgo típico: prometer más de lo que la operación sostiene.",
      ],
    };
  }

  if (industry.includes("constr") || industry.includes("obra") || industry.includes("inmobili")) {
    return {
      headline: "Competencia por ejecución + cumplimiento + control de costos.",
      dynamics: [
        "Desviaciones pequeñas en costo/plazo se vuelven pérdidas grandes.",
        "Compras y coordinación definen el margen.",
        "Riesgo contractual y de seguridad impacta continuidad.",
      ],
    };
  }

  return {
    headline: "Competencia por diferenciación + eficiencia + control.",
    dynamics: [
      "Ejecutar consistente gana a improvisar.",
      "Control financiero define quién crece y quién se quiebra.",
      "Datos ordenados permiten decidir más rápido que el mercado.",
    ],
  };
}

function topPainPoints(levelsByDim) {
  const sorted = Object.entries(levelsByDim)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  const titleMap = {
    strategy: "Falta de foco y prioridades claras",
    process: "Dependencia operativa y baja repetibilidad",
    finance: "Baja visibilidad financiera para decidir",
    people: "Roles difusos y concentración en el dueño",
    tech: "Datos dispersos y herramientas no integradas",
    risk: "Exposición ante riesgos operacionales",
  };

  const causeMap = {
    strategy: "las decisiones se toman por urgencia más que por un rumbo compartido",
    process: "la operación depende de hábitos y personas más que de procesos estables",
    finance: "los números no se usan como sistema de control",
    people: "no hay definición consistente de responsables y límites",
    tech: "la información no está organizada para apoyar decisiones",
    risk: "no hay controles mínimos sistemáticos para prevenir impactos",
  };

  return sorted.map(([dimKey, lvl], i) => {
    const risk =
      lvl < 2.5
        ? "esto aumenta la fragilidad del negocio y puede generar quiebres al crecer."
        : "esto puede limitar el crecimiento o reducir rentabilidad si no se refuerza.";

    return {
      rank: i + 1,
      dimension: dimKey,
      name: titleMap[dimKey],
      why: `Esto ocurre porque ${causeMap[dimKey]}.`,
      risk,
      lvl,
    };
  });
}

function buildRootCauseHypotheses(pains, signals) {
  const map = {
    finance: [
      "No existe rutina semanal de control (caja, margen, compromisos).",
      "Precios/discounts se deciden sin medir impacto real en margen.",
    ],
    process: [
      "No hay procesos críticos documentados (2–3 bastan para estabilizar).",
      "Se confunde “urgencia” con “prioridad”, generando retrabajo.",
    ],
    people: [
      "Falta claridad de roles (quién decide, quién ejecuta, quién aprueba).",
      "El dueño absorbe decisiones repetitivas que deberían delegarse.",
    ],
    strategy: [
      "No hay criterio de priorización visible para todos.",
      "Se aceptan oportunidades sin filtrar por capacidad y rentabilidad.",
    ],
    tech: [
      "Datos en planillas/mensajes → decisiones tardías y discusiones sin base.",
      "Herramientas no integradas impiden control semanal simple.",
    ],
    risk: [
      "No hay top 5 riesgos con controles mínimos definidos.",
      "Documentación/contratos/cumplimiento se resuelve “cuando pasa algo”.",
    ],
  };

  const top2 = pains.slice(0, 2).map((p) => p.dimension);
  const out = [];
  top2.forEach((d) => out.push(...(map[d] || [])));

  if (signals.includes("ownerDependency")) out.unshift("Dependencia del dueño como cuello de botella de decisiones.");
  if (signals.includes("cashOnly")) out.unshift("Gestión por caja/banco: falta lectura de margen y compromisos.");

  return Array.from(new Set(out)).slice(0, 6);
}

function buildKPIs() {
  return [
    { dim: "Finanzas", items: ["Margen bruto %", "Caja proyectada 4 semanas", "Gastos fijos vs ventas", "Ventas vs presupuesto"] },
    { dim: "Procesos", items: ["% retrabajo", "Tiempo de ciclo (pedido→entrega)", "Incidentes/semana", "Cumplimiento de checklist"] },
    { dim: "Estrategia", items: ["% iniciativas alineadas a foco", "Pipeline comercial por segmento", "Tasa de conversión", "1–2 OKRs trimestrales"] },
    { dim: "Personas", items: ["Roles críticos cubiertos", "Reunión semanal de gestión", "Acuerdos cumplidos", "Carga por rol"] },
    { dim: "Tecnología y Datos", items: ["Fuente única de ventas", "Dashboard semanal", "Calidad de datos (errores)", "Automatizaciones clave"] },
    { dim: "Riesgos", items: ["Top 5 riesgos con control", "Backups/continuidad", "Cumplimiento documental", "Dependencia clientes/personas"] },
  ];
}

function buildPlan3090(pains) {
  const top = pains.slice(0, 2).map((p) => p.dimension);

  const plan = {
    d30: [
      "Definir 5 KPIs y una rutina semanal (30 min) de seguimiento.",
      "Documentar 2 procesos críticos con checklist y responsable.",
      "Identificar top 5 riesgos y controles mínimos (1 hoja).",
    ],
    d60: [
      "Tablero de control (ventas, margen, caja 4 semanas) + revisión semanal.",
      "Roles mínimos (RACI) para decisiones repetitivas.",
      "Ajustes de pricing/mix y control de descuentos si aplica.",
    ],
    d90: [
      "Ciclo de mejora continua (incidentes → causa raíz → acción).",
      "Dashboard consolidado y “fuente única” de datos clave.",
      "Preparar Fase 2: foco, propuesta de valor, objetivos y plan trimestral.",
    ],
  };

  if (top.includes("finance")) plan.d30.unshift("Instalar control de caja y margen (semanal) para evitar sorpresas.");
  if (top.includes("process")) plan.d30.unshift("Estandarizar operación para reducir retrabajo y dependencia.");
  if (top.includes("people")) plan.d30.unshift("Claridad de roles para delegar y reducir dependencia del dueño.");

  return plan;
}

function buildFODA({ levelsByDim, profile, answers }) {
  const entries = Object.entries(levelsByDim);

  const strengths = entries
    .filter(([, v]) => v >= 3.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => `Base sólida en ${DIMENSIONS.find((d) => d.key === k)?.name ?? k}.`);

  const weaknesses = entries
    .filter(([, v]) => v <= 2.5)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([k]) => `Brecha relevante en ${DIMENSIONS.find((d) => d.key === k)?.name ?? k}.`);

  const sPick = answers["S0"]?.label;
  const sWhy = answers["S1"]?.text?.trim();
  const wPick = answers["W0"]?.label;
  const wImpact = answers["W1"]?.text?.trim();

  const ctx = competitiveContext(profile);

  const opportunities = [
    "Instalar un sistema mínimo de gestión (KPIs + rutinas + responsables).",
    "Estandarizar procesos críticos para bajar retrabajo y aumentar capacidad.",
    ...ctx.dynamics.slice(0, 1),
  ];

  const threats = [
    "Crecer en ventas sin fortalecer control y procesos puede generar quiebres operacionales o de caja.",
    "Dependencia de personas/cliente/caja aumenta fragilidad del negocio.",
  ];

  const extraStrengths = [];
  if (sPick) extraStrengths.push(sWhy ? `${sPick} (porque: ${sWhy})` : sPick);

  const extraWeaknesses = [];
  if (wPick) extraWeaknesses.push(wImpact ? `${wPick} (impacto: ${wImpact})` : wPick);

  return {
    strengths: strengths.length
      ? [...extraStrengths, ...strengths].slice(0, 5)
      : extraStrengths.length
      ? extraStrengths
      : ["Fortalezas presentes, pero aún no consistentes en todas las áreas."],
    weaknesses: weaknesses.length
      ? [...extraWeaknesses, ...weaknesses].slice(0, 5)
      : extraWeaknesses.length
      ? extraWeaknesses
      : ["Debilidades no críticas, pero hay oportunidades de profesionalización."],
    opportunities,
    threats,
    competitiveHeadline: ctx.headline,
    competitiveDynamics: ctx.dynamics,
  };
}

function buildBreaches(levelsByDim) {
  const sorted = Object.entries(levelsByDim).sort((a, b) => a[1] - b[1]);
  const [b1, b2, b3] = sorted;
  const name = (k) => DIMENSIONS.find((d) => d.key === k)?.name ?? k;
  return [
    { label: "Prioridad crítica", item: name(b1[0]), why: "Reducir riesgos inmediatos y dar estabilidad a la operación." },
    { label: "Prioridad importante", item: name(b2[0]), why: "Permite avanzar con mayor control y coherencia en decisiones." },
    { label: "Puede esperar", item: name(b3[0]), why: "Rinde mejor después de fortalecer lo crítico." },
  ];
}

// ------------------------------
// 4) SCORING (solo choice)
// ------------------------------
function computeScores(answers, questionIdsForScoring) {
  const byDim = {};
  const counts = {};

  const allowed = new Set(questionIdsForScoring || QUESTIONS.map((q) => q.id));

  for (const q of QUESTIONS) {
    if (!allowed.has(q.id)) continue;
    if (q.type !== "choice") continue;
    const a = answers[q.id];
    if (!a || typeof a.score !== "number") continue;
    byDim[q.dimension] = (byDim[q.dimension] ?? 0) + a.score;
    counts[q.dimension] = (counts[q.dimension] ?? 0) + 1;
  }

  const levelsByDim = {};
  for (const d of DIMENSIONS) {
    const sum = byDim[d.key] ?? 0;
    const n = counts[d.key] ?? 0;
    const avg = n ? sum / n : 0;
    levelsByDim[d.key] = avg || 1; // fallback a 1
  }

  let global = 0;
  let wsum = 0;
  for (const d of DIMENSIONS) {
    global += (levelsByDim[d.key] ?? 1) * d.weight;
    wsum += d.weight;
  }
  global = wsum ? global / wsum : 1;

  const canAdvance = Object.values(levelsByDim).every((v) => v >= ADVANCE_RULE.minDimensionLevelToAdvance);

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

// ------------------------------
// 6) APP
// ------------------------------
export default function App() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [mode, setMode] = useState("assessment"); // assessment | report

  // Freeze
  const [frozenQuestionIds, setFrozenQuestionIds] = useState(null);

  const [profile, setProfile] = useState({
    companyName: "Mi Empresa",
    industry: "",
    subIndustry: "",
    country: "Chile",
    city: "",
    yearsOperating: "",
    employees: "",
    annualRevenue: "",
    businessModel: "",
    mainCustomers: "",
    competitors: "",
  });

  const visibleQuestions = useMemo(() => {
    return QUESTIONS.filter((q) => (q.showIf ? q.showIf(answers) : true));
  }, [answers]);

  const current = visibleQuestions[step];

  const progress = useMemo(() => {
    const total = visibleQuestions.length || 1;
    return clamp(Math.round(((step + 1) / total) * 100), 0, 100);
  }, [step, visibleQuestions.length]);

  // ✅ scoring SIEMPRE disponible (usa frozen si existe, si no, usa visibles actuales)
  const scoring = useMemo(() => {
    const ids = frozenQuestionIds || visibleQuestions.map((q) => q.id);
    return computeScores(answers, ids);
  }, [answers, frozenQuestionIds, visibleQuestions]);

  // ✅ report SIEMPRE se construye (si estamos en report)
  const report = useMemo(() => {
    if (mode !== "report") return null;

    const { levelsByDim, global, canAdvance } = scoring;
    const lvl = levelLabel(global);

    const bestDim = DIMENSIONS.slice().sort((a, b) => levelsByDim[b.key] - levelsByDim[a.key])[0];
    const worstDim = DIMENSIONS.slice().sort((a, b) => levelsByDim[a.key] - levelsByDim[b.key])[0];

    const narrative = `Hoy tu empresa se encuentra en un nivel de madurez ${lvl.name}. Las decisiones se toman ${inferDecisionStyle(
      answers
    )}, y la operación depende ${inferDependency(answers)}. Hay fortalezas en ${bestDim.name}, mientras que ${worstDim.name} limita el crecimiento sostenible.`;

    const bucket = companySizeBucket(profile);
    const foda = buildFODA({ levelsByDim, profile, answers });
    const pains = topPainPoints(levelsByDim);
    const breaches = buildBreaches(levelsByDim);

    const signals = getSignals(answers);
    const rootCauses = buildRootCauseHypotheses(pains, signals);
    const plan = buildPlan3090(pains);
    const kpis = buildKPIs();

    const criticalRisks = pains
      .filter((p) => p.lvl < 2.6)
      .slice(0, 3)
      .map((p) => ({
        title: `Riesgo en ${DIMENSIONS.find((d) => d.key === p.dimension)?.name}`,
        desc:
          p.dimension === "finance"
            ? "Alta probabilidad de sorpresas (caja/margen) que frenan crecimiento."
            : p.dimension === "process"
            ? "Retrabajo y dependencia pueden romper la operación al subir demanda."
            : p.dimension === "people"
            ? "Cuello de botella en el dueño y roles difusos frenan escalamiento."
            : p.dimension === "risk"
            ? "Falta de controles mínimos aumenta impactos (contratos, continuidad, cumplimiento)."
            : "Brecha estructural que reduce consistencia y rentabilidad.",
      }));

    const phase2 = canAdvance
      ? {
          headline: "Listo para Fase 2 (Definir foco y dirección)",
          bullets: [
            "Definir foco (clientes/servicios/productos prioritarios).",
            "Objetivos trimestrales + plan de ejecución (OKRs o similar).",
            "Tablero mínimo para seguimiento del plan.",
          ],
        }
      : {
          headline: "Primero estabilizar base (antes de Fase 2)",
          bullets: [
            "Control de caja/margen + rutina semanal.",
            "Estandarizar 2 procesos críticos con checklist.",
            "Claridad de roles para delegar decisiones repetitivas.",
          ],
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
      bucket,
      rootCauses,
      plan,
      kpis,
      criticalRisks,
      phase2,
    };
  }, [mode, scoring, answers, profile]);

  // scroll top al entrar a report (mejora demo)
  useEffect(() => {
    if (mode === "report") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [mode]);

  function selectOption(q, opt) {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { score: opt.score, label: opt.label, dimension: q.dimension, signals: opt.signals || [] },
    }));
  }

  function setText(q, text) {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { text, dimension: q.dimension },
    }));
  }

  function goNext() {
    if (!current) return;
    if (current.type === "choice" && !answers[current.id]) return;
    const max = visibleQuestions.length - 1;
    setStep((s) => clamp(s + 1, 0, max));
  }

  function goBack() {
    setStep((s) => clamp(s - 1, 0, visibleQuestions.length - 1));
  }

  // ✅ FINISH ultra robusto
  function finish() {
    // Congela el set de preguntas visibles en este momento (para scoring/report)
    const ids = visibleQuestions.map((q) => q.id);
    setFrozenQuestionIds(ids);
    setMode("report");
    setStep(0);
  }

  function reset() {
    setMode("assessment");
    setStep(0);
    setAnswers({});
    setFrozenQuestionIds(null);
  }

  // DEMO auto-relleno (3 perfiles)
  function applyDemoProfile(kind) {
    const presets = {
      good: {
        profile: {
          companyName: "Empresa Demo PRO",
          industry: "Servicios",
          subIndustry: "Consultoría",
          country: "Chile",
          city: "Santiago",
          yearsOperating: "6",
          employees: "28",
          annualRevenue: "650MM CLP",
          businessModel: "B2B",
          mainCustomers: "Empresas medianas",
          competitors: "Competidor A, Competidor B, Competidor C",
        },
        bias: { min: 4, max: 5 },
        s0: "Diferenciación clara frente a competidores",
        w0: "Ventas inestables / baja generación comercial",
      },
      mid: {
        profile: {
          companyName: "Empresa Demo Ordenándose",
          industry: "Retail",
          subIndustry: "Ecommerce",
          country: "Chile",
          city: "Viña del Mar",
          yearsOperating: "4",
          employees: "12",
          annualRevenue: "280MM CLP",
          businessModel: "B2C",
          mainCustomers: "Personas (consumidor final)",
          competitors: "Competidor 1, Competidor 2",
        },
        bias: { min: 2, max: 4 },
        s0: "Relación comercial fuerte con clientes",
        w0: "Falta de control financiero (caja/margen)",
      },
      bad: {
        profile: {
          companyName: "Empresa Demo Bajo Presión",
          industry: "Construcción",
          subIndustry: "Obras menores",
          country: "Chile",
          city: "Concepción",
          yearsOperating: "2",
          employees: "7",
          annualRevenue: "140MM CLP",
          businessModel: "B2B",
          mainCustomers: "Pymes",
          competitors: "Competidor X, Competidor Y",
        },
        bias: { min: 1, max: 3 },
        s0: "Velocidad para resolver y ejecutar",
        w0: "Dependencia del dueño/persona clave",
      },
    };

    const p = presets[kind] || presets.mid;
    setProfile((prev) => ({ ...prev, ...p.profile }));

    const pickScore = (min, max) => clamp(min + Math.floor(Math.random() * (max - min + 1)), 1, 5);
    const makeChoice = (q, min, max) => {
      const target = pickScore(min, max);
      const sorted = q.options.slice().sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target));
      const opt = sorted[0];
      return { score: opt.score, label: opt.label, dimension: q.dimension, signals: opt.signals || [] };
    };
    const makeText = (q) => {
      const samples = {
        S1: ["Los clientes nos recomiendan y repiten.", "Se percibe calidad y cumplimiento.", "Tenemos reputación fuerte en el nicho."],
        W1: ["Nos genera estrés de caja y decisiones tarde.", "Provoca retrabajo y desgaste del equipo.", "Perdemos oportunidades por desorden."],
      };
      const arr = samples[q.id] || [""];
      return { text: Math.random() > 0.25 ? arr[Math.floor(Math.random() * arr.length)] : "", dimension: q.dimension };
    };

    // respuestas coherentes con showIf (iteramos)
    let tmp = {};
    const qS0 = QUESTIONS.find((x) => x.id === "S0");
    const qW0 = QUESTIONS.find((x) => x.id === "W0");

    if (qS0) {
      const opt = qS0.options.find((o) => o.label === p.s0) || qS0.options[0];
      tmp["S0"] = { score: opt.score, label: opt.label, dimension: qS0.dimension, signals: opt.signals || [] };
    }
    if (qW0) {
      const opt = qW0.options.find((o) => o.label === p.w0) || qW0.options[0];
      tmp["W0"] = { score: opt.score, label: opt.label, dimension: qW0.dimension, signals: opt.signals || [] };
    }

    for (let pass = 0; pass < 4; pass++) {
      const qs = QUESTIONS.filter((q) => (q.showIf ? q.showIf(tmp) : true));
      for (const q of qs) {
        if (tmp[q.id]) continue;
        if (q.type === "choice") tmp[q.id] = makeChoice(q, p.bias.min, p.bias.max);
        if (q.type === "text") tmp[q.id] = makeText(q);
      }
    }

    setAnswers(tmp);

    // congelamos set visible final con tmp y vamos al reporte
    const v = QUESTIONS.filter((q) => (q.showIf ? q.showIf(tmp) : true)).map((q) => q.id);
    setFrozenQuestionIds(v);
    setMode("report");
    setStep(0);
  }

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <div className="logo">V</div>
          <div className="brandText">
            <div className="brandName">VÉRTICE 360</div>
            <div className="brandTag">Fase 1 · Diagnosticar (v3.1)</div>
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
                <p className="muted">Incluye riesgos, causa raíz, plan 30/60/90 y KPIs.</p>

                <div className="demoActions">
                  <button className="btn ghost" onClick={() => applyDemoProfile("good")}>
                    <Sparkles size={16} /> Demo Bueno
                  </button>
                  <button className="btn ghost" onClick={() => applyDemoProfile("mid")}>
                    <Sparkles size={16} /> Demo Medio
                  </button>
                  <button className="btn ghost" onClick={() => applyDemoProfile("bad")}>
                    <Sparkles size={16} /> Demo Malo
                  </button>
                </div>

                {/* Debug panel */}
                <div className="debug">
                  <div><span className="muted">Debug:</span> visibles={visibleQuestions.length} · step={step + 1} · frozen={(frozenQuestionIds?.length ?? 0) || "—"} · mode={mode}</div>
                </div>
              </div>

              <div className="company">
                <label className="muted">Empresa</label>
                <input
                  value={profile.companyName}
                  onChange={(e) => setProfile((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="Nombre de la empresa"
                />
              </div>
            </div>

            {/* Perfil */}
            <div className="profileGrid">
              <div className="field">
                <label className="muted">Rubro</label>
                <input value={profile.industry} onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))} placeholder="Ej: Retail, Servicios, Construcción…" />
              </div>
              <div className="field">
                <label className="muted">Sub-rubro</label>
                <input value={profile.subIndustry} onChange={(e) => setProfile((p) => ({ ...p, subIndustry: e.target.value }))} placeholder="Ej: Ecommerce, Consultoría…" />
              </div>
              <div className="field">
                <label className="muted">Ciudad</label>
                <input value={profile.city} onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))} placeholder="Ej: Santiago" />
              </div>
              <div className="field">
                <label className="muted">Años operando</label>
                <input value={profile.yearsOperating} onChange={(e) => setProfile((p) => ({ ...p, yearsOperating: e.target.value }))} placeholder="Ej: 3" />
              </div>
              <div className="field">
                <label className="muted">N° empleados</label>
                <input value={profile.employees} onChange={(e) => setProfile((p) => ({ ...p, employees: e.target.value }))} placeholder="Ej: 12" />
              </div>
              <div className="field">
                <label className="muted">Ventas/año (aprox)</label>
                <input value={profile.annualRevenue} onChange={(e) => setProfile((p) => ({ ...p, annualRevenue: e.target.value }))} placeholder="Ej: 300MM CLP" />
              </div>
              <div className="field">
                <label className="muted">Modelo de negocio</label>
                <input value={profile.businessModel} onChange={(e) => setProfile((p) => ({ ...p, businessModel: e.target.value }))} placeholder="B2B, B2C, Mixto…" />
              </div>
              <div className="field">
                <label className="muted">Clientes principales</label>
                <input value={profile.mainCustomers} onChange={(e) => setProfile((p) => ({ ...p, mainCustomers: e.target.value }))} placeholder="Ej: Pymes, empresas, personas…" />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label className="muted">Principales competidores</label>
                <input value={profile.competitors} onChange={(e) => setProfile((p) => ({ ...p, competitors: e.target.value }))} placeholder="Ej: Competidor A, B, C…" />
              </div>
            </div>

            <div style={{ height: 12 }} />
            <Progress value={progress} />

            {current ? (
              <div className="qWrap">
                <div className="qMeta">
                  <Badge color="blue">{current.title}</Badge>
                  <span className="muted">
                    Pregunta {step + 1} de {visibleQuestions.length}
                  </span>
                </div>

                <h2 className="qPrompt">{typeof current.prompt === "function" ? current.prompt(answers) : current.prompt}</h2>

                {current.type === "choice" ? (
                  <div className="options">
                    {current.options.map((opt) => {
                      const selected = answers[current.id]?.label === opt.label;
                      return (
                        <button key={opt.label} className={`opt ${selected ? "selected" : ""}`} onClick={() => selectOption(current, opt)}>
                          <span>{opt.label}</span>
                          <span className="optScore">{opt.score}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="textBox">
                    <textarea value={answers[current.id]?.text ?? ""} onChange={(e) => setText(current, e.target.value)} placeholder="Escribe aquí (opcional)…" />
                    <div className="muted tiny">Puedes dejarlo vacío y continuar.</div>
                  </div>
                )}

                <div className="nav">
                  <button className="btn ghost" onClick={goBack} disabled={step === 0}>
                    <ArrowLeft size={16} /> Atrás
                  </button>

                  {step < visibleQuestions.length - 1 ? (
                    <button className="btn" onClick={goNext} disabled={current.type === "choice" && !answers[current.id]}>
                      Siguiente <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button className="btn" onClick={finish}>
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
            <div className="reportHero">
              <div>
                <div className="heroTop">
                  <Badge color={report.lvl.color}>{report.lvl.name}</Badge>
                  <span className="muted">· {new Date().toLocaleDateString()}</span>
                </div>
                <h1 className="heroTitle">{profile.companyName}</h1>
                <p className="heroHeadline">{coverHeadline(report.global)}</p>
                <p className="heroIntro">{coverIntro(report.global)}</p>
              </div>
              <div className="heroBox">
                <div className="heroBoxTitle">Nivel global</div>
                <div className="heroBoxValue">{report.global.toFixed(1)} / 5.0</div>
                <div className="heroBoxHint muted">Promedio ponderado por dimensiones</div>
              </div>
            </div>

            <section className="section">
              <div className="sectionHead">
                <h2>Ficha de empresa</h2>
                <span className="muted">
                  <Building2 size={16} style={{ verticalAlign: "-3px" }} /> Contexto
                </span>
              </div>

              <div className="profileSummary">
                <div><span className="muted">Rubro:</span> {profile.industry || "—"}</div>
                <div><span className="muted">Sub-rubro:</span> {profile.subIndustry || "—"}</div>
                <div><span className="muted">Ubicación:</span> {profile.city ? `${profile.city}, ${profile.country}` : (profile.country || "—")}</div>
                <div><span className="muted">Años operando:</span> {profile.yearsOperating || "—"}</div>
                <div><span className="muted">Empleados:</span> {profile.employees || "—"}</div>
                <div><span className="muted">Ventas/año:</span> {profile.annualRevenue || "—"}</div>
                <div><span className="muted">Modelo:</span> {profile.businessModel || "—"}</div>
                <div><span className="muted">Clientes:</span> {profile.mainCustomers || "—"}</div>
                <div style={{ gridColumn: "1 / -1" }}><span className="muted">Competidores:</span> {profile.competitors || "—"}</div>
              </div>

              <div className="sizePill">
                <Users size={16} /> <strong>Tamaño:</strong> {report.bucket.name} <span className="muted">· {report.bucket.hint}</span>
              </div>
            </section>

            <section className="section">
              <h2>Tu empresa hoy</h2>
              <p className="lead">{report.narrative}</p>
            </section>

            <section className="section">
              <div className="sectionHead">
                <h2>Contexto competitivo</h2>
                <span className="muted">
                  <Target size={16} style={{ verticalAlign: "-3px" }} /> Según rubro
                </span>
              </div>
              <div className="panel">
                <div className="compHeadline">{report.foda.competitiveHeadline}</div>
                <ul className="compList">
                  {report.foda.competitiveDynamics.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            </section>

            <section className="section">
              <div className="sectionHead">
                <h2>Nivel de madurez por dimensión</h2>
                <span className="muted">
                  <Radar size={16} style={{ verticalAlign: "-3px" }} /> Vista (1–5)
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
                          <div className="dimName">{d.name} · {v.toFixed(1)}</div>
                          <div className="muted">{dimensionText(d.key, v)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="section">
              <h2>Principales desafíos que hoy te están frenando</h2>
              <div className="cards3">
                {report.pains.map((p) => (
                  <div key={p.rank} className="painCard">
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

            <section className="section">
              <div className="sectionHead">
                <h2>Riesgos críticos</h2>
                <span className="muted">
                  <ShieldAlert size={16} style={{ verticalAlign: "-3px" }} /> Probabilidad/impacto
                </span>
              </div>
              <div className="quickGrid">
                {report.criticalRisks.length ? report.criticalRisks.map((r, i) => (
                  <div key={i} className="quickCard">
                    <div className="quickTitle">{r.title}</div>
                    <div className="muted">{r.desc}</div>
                  </div>
                )) : (
                  <div className="panel muted">No se detectan riesgos críticos (niveles relativamente estables).</div>
                )}
              </div>
            </section>

            <section className="section">
              <div className="sectionHead">
                <h2>Hipótesis de causa raíz</h2>
                <span className="muted">
                  <ClipboardList size={16} style={{ verticalAlign: "-3px" }} /> Para atacar el problema real
                </span>
              </div>
              <div className="panel">
                <ul className="compList">
                  {report.rootCauses.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            </section>

            <section className="section">
              <div className="sectionHead">
                <h2>Plan recomendado 30 / 60 / 90 días</h2>
                <span className="muted">
                  <LineChart size={16} style={{ verticalAlign: "-3px" }} /> Camino a control real
                </span>
              </div>
              <div className="grid3">
                <div className="panel">
                  <h3>0–30 días</h3>
                  <ul className="compList">{report.plan.d30.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div className="panel">
                  <h3>31–60 días</h3>
                  <ul className="compList">{report.plan.d60.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div className="panel">
                  <h3>61–90 días</h3>
                  <ul className="compList">{report.plan.d90.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
              </div>
            </section>

            <section className="section">
              <h2>KPIs sugeridos</h2>
              <div className="kpiGrid">
                {report.kpis.map((k, i) => (
                  <div key={i} className="panel">
                    <h3>{k.dim}</h3>
                    <ul className="compList">{k.items.map((x, j) => <li key={j}>{x}</li>)}</ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="section">
              <h2>Análisis FODA</h2>
              <div className="foda">
                <div className="fodaBox">
                  <h3>Fortalezas</h3>
                  <ul>{report.foda.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div className="fodaBox">
                  <h3>Oportunidades</h3>
                  <ul>{report.foda.opportunities.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div className="fodaBox">
                  <h3>Debilidades</h3>
                  <ul>{report.foda.weaknesses.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div className="fodaBox">
                  <h3>Amenazas</h3>
                  <ul>{report.foda.threats.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
              </div>
            </section>

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

            <section className="section">
              <h2>{report.phase2.headline}</h2>
              <div className="panel">
                <ul className="compList">
                  {report.phase2.bullets.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            </section>

            <section className={`section decision ${report.canAdvance ? "ok" : "no"}`}>
              <div className="decisionIcon">
                {report.canAdvance ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
              </div>
              <div>
                <h2>{report.canAdvance ? "Tu empresa está lista para el siguiente paso" : "Antes de avanzar…"}</h2>
                <p className="lead">
                  {report.canAdvance
                    ? "Base mínima para pasar a Fase 2 (Definir foco y dirección)."
                    : "Antes de definir estrategia, fortalece dimensiones críticas para no aumentar el riesgo."}
                </p>

                <div className="decisionCtas no-print">
                  <button className="btn ghost" onClick={reset}>Volver al assessment</button>
                  <button className="btn" onClick={() => window.print()}>
                    Exportar PDF <Download size={16} />
                  </button>
                </div>
              </div>
            </section>

            <footer className="footer">
              <div className="muted">Diagnóstico generado por Método Vértice 360 · Fase 1 (Demo v3.1)</div>
            </footer>
          </div>
        )}
      </main>

      <style>{css}</style>
    </div>
  );
}

// ------------------------------
// 7) CSS
// ------------------------------
const css = `
:root{
  --bg:#0b1220;
  --text:#e7eefc;
  --muted:#a9b6d3;
  --line:rgba(255,255,255,.08);
  --shadow: 0 10px 30px rgba(0,0,0,.35);
  --green:#42d392;
  --red:#ff5a6a;
  --orange:#ffb020;
  --yellow:#ffd65a;
  --blue:#6ea8ff;
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  background: radial-gradient(1200px 600px at 20% -10%, rgba(110,168,255,.25), transparent 60%),
              radial-gradient(900px 500px at 100% 0%, rgba(66,211,146,.12), transparent 60%),
              var(--bg);
  color:var(--text);
}
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

.card,.reportHero,.section{
  background: rgba(15,26,46,.92);
  border:1px solid var(--line);
  border-radius:20px;
  box-shadow: var(--shadow);
  padding:18px;
}
.cardHead{display:flex; gap:16px; align-items:flex-start; justify-content:space-between; margin-bottom:12px;}
.company{display:flex; flex-direction:column; gap:6px; min-width:280px}
.company input,.field input{
  background: rgba(255,255,255,.04);
  border:1px solid var(--line);
  border-radius:12px;
  padding:10px 12px;
  color:var(--text);
  outline:none;
}
.company input:focus,.field input:focus{border-color: rgba(110,168,255,.55)}
.demoActions{margin-top:10px; display:flex; gap:10px; flex-wrap:wrap}
.profileGrid{margin-top: 12px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;}
.field{display:flex; flex-direction:column; gap:6px}
.debug{margin-top:10px; padding:10px 12px; border-radius:14px; border:1px dashed rgba(255,255,255,.18); background: rgba(0,0,0,.12);}

.muted{color:var(--muted)}
.tiny{font-size:12px}
.lead{opacity:.95; line-height:1.5}

.progressWrap{
  height:10px; background: rgba(255,255,255,.05);
  border-radius:999px; overflow:hidden;
  border:1px solid var(--line);
}
.progressBar{
  height:100%;
  background: linear-gradient(90deg, rgba(110,168,255,.95), rgba(66,211,146,.85));
}

.qWrap{padding:14px 4px 6px}
.qMeta{display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:12px}
.qPrompt{margin:10px 0 14px; font-size:20px; line-height:1.25}

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
}
.opt:hover{border-color: rgba(110,168,255,.45); background: rgba(110,168,255,.08)}
.opt.selected{border-color: rgba(66,211,146,.55); background: rgba(66,211,146,.08)}
.optScore{
  width:34px; height:28px; border-radius:10px;
  display:flex; align-items:center; justify-content:center;
  border:1px solid var(--line);
  background: rgba(255,255,255,.04);
  color: var(--muted);
  font-weight:700;
}

.textBox{
  border:1px solid var(--line);
  border-radius:16px;
  background: rgba(255,255,255,.03);
  padding:12px;
}
.textBox textarea{
  width:100%;
  min-height:110px;
  resize: vertical;
  border-radius:12px;
  padding:10px 12px;
  border:1px solid var(--line);
  background: rgba(0,0,0,.12);
  color: var(--text);
  outline:none;
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
  font-weight:700;
}
.btn:hover{background: rgba(110,168,255,.24)}
.btn:disabled{opacity:.45; cursor:not-allowed}
.btn.ghost{border:1px solid var(--line); background: rgba(255,255,255,.03);}

.badge{
  padding:6px 10px;
  border-radius:999px;
  border:1px solid var(--line);
  font-size:12px;
  font-weight:800;
}
.badge.red{background: rgba(255,90,106,.14); border-color: rgba(255,90,106,.35)}
.badge.orange{background: rgba(255,176,32,.14); border-color: rgba(255,176,32,.35)}
.badge.yellow{background: rgba(255,214,90,.14); border-color: rgba(255,214,90,.35)}
.badge.green{background: rgba(66,211,146,.14); border-color: rgba(66,211,146,.35)}
.badge.blue{background: rgba(110,168,255,.14); border-color: rgba(110,168,255,.35)}

.report{display:flex; flex-direction:column; gap:18px}
.reportHero{display:grid; grid-template-columns: 1.4fr .6fr; gap:14px;}
.heroTop{display:flex; gap:10px; align-items:center; margin-bottom:10px}
.heroTitle{font-size:28px; margin:0 0 6px}
.heroHeadline{font-size:18px; font-weight:800; margin:0 0 8px}
.heroIntro{color:var(--muted); line-height:1.5}
.heroBox{border:1px solid var(--line); border-radius:18px; background: rgba(255,255,255,.03); padding:14px; display:flex; flex-direction:column; justify-content:center;}
.heroBoxTitle{color:var(--muted); font-weight:700}
.heroBoxValue{font-size:28px; font-weight:900; margin:6px 0}
.heroBoxHint{font-size:12px}

.sectionHead{display:flex; justify-content:space-between; align-items:center; gap:12px}
.panel{border:1px solid var(--line); border-radius:18px; background: rgba(255,255,255,.03); padding:14px;}
.grid2{display:grid; grid-template-columns: 1fr 1fr; gap:14px;}
.grid3{display:grid; grid-template-columns: 1fr 1fr 1fr; gap:14px;}

.profileSummary{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:10px;
  border:1px solid var(--line);
  border-radius:16px;
  background: rgba(255,255,255,.03);
  padding:12px;
}
.profileSummary div{padding:8px 10px; border-radius:12px; border:1px solid var(--line); background: rgba(0,0,0,.08)}
.sizePill{margin-top:12px; display:flex; align-items:center; gap:10px; border:1px solid var(--line); border-radius:14px; background: rgba(0,0,0,.08); padding:10px 12px;}

.compHeadline{font-weight:900; margin-bottom:8px;}
.compList{margin:0; padding-left:18px; opacity:.95}
.compList li{margin:6px 0}

.bars{display:flex; flex-direction:column; gap:12px}
.barRow{display:grid; grid-template-columns: 140px 1fr 50px; gap:10px; align-items:center}
.barLabel{color:var(--muted); font-weight:700; font-size:13px}
.barTrack{height:10px; border-radius:999px; background: rgba(255,255,255,.06); border:1px solid var(--line); overflow:hidden}
.barFill{height:100%; background: linear-gradient(90deg, rgba(110,168,255,.95), rgba(66,211,146,.85))}
.barValue{font-weight:900; text-align:right}

.dimNotes{display:flex; flex-direction:column; gap:12px}
.dimNote{padding:10px 10px; border-radius:14px; border:1px solid var(--line); background: rgba(0,0,0,.08)}
.dimName{font-weight:900; margin-bottom:6px}

.cards3{display:grid; grid-template-columns: 1fr 1fr 1fr; gap:14px;}
.painCard{border:1px solid var(--line); border-radius:18px; background: rgba(255,255,255,.03); padding:14px; display:flex; flex-direction:column; gap:10px;}
.painTop{display:flex; justify-content:space-between; align-items:center}
.painRisk{display:flex; gap:8px; align-items:flex-start; color: rgba(255,214,90,.95); font-weight:700;}

.quickGrid{display:grid; grid-template-columns: 1fr 1fr 1fr; gap:14px;}
.quickCard{border:1px solid var(--line); border-radius:18px; background: rgba(255,255,255,.03); padding:14px; display:flex; flex-direction:column; gap:10px;}
.quickTitle{font-weight:900}

.kpiGrid{display:grid; grid-template-columns: 1fr 1fr 1fr; gap:14px;}

.foda{display:grid; grid-template-columns: 1fr 1fr; gap:14px;}
.fodaBox{border:1px solid var(--line); border-radius:18px; background: rgba(255,255,255,.03); padding:14px;}
.fodaBox h3{margin:0 0 10px}
.fodaBox ul{margin:0; padding-left:18px; opacity:.95}
.fodaBox li{margin:6px 0}

.breaches{display:flex; flex-direction:column; gap:10px;}
.breachRow{border:1px solid var(--line); border-radius:16px; background: rgba(255,255,255,.03); padding:12px; display:grid; grid-template-columns: 150px 220px 1fr; gap:10px; align-items:center;}
.breachLabel{color: var(--muted); font-weight:900}
.breachItem{font-weight:900}

.decision{display:grid; grid-template-columns: 44px 1fr; gap:14px; align-items:flex-start;}
.decision.ok{border-color: rgba(66,211,146,.35); background: rgba(66,211,146,.06)}
.decision.no{border-color: rgba(255,90,106,.35); background: rgba(255,90,106,.06)}
.decisionIcon{width:44px; height:44px; border-radius:14px; border:1px solid var(--line); background: rgba(255,255,255,.03); display:flex; align-items:center; justify-content:center;}
.decisionCtas{display:flex; gap:10px; margin-top:10px; flex-wrap:wrap}

.footer{text-align:center; color: var(--muted); font-size:12px; padding: 6px 0 20px;}

@media (max-width: 920px){
  .reportHero{grid-template-columns: 1fr}
  .grid2{grid-template-columns: 1fr}
  .grid3{grid-template-columns: 1fr}
  .cards3{grid-template-columns: 1fr}
  .quickGrid{grid-template-columns: 1fr}
  .kpiGrid{grid-template-columns: 1fr}
  .foda{grid-template-columns: 1fr}
  .breachRow{grid-template-columns: 1fr; gap:6px}
  .profileGrid{grid-template-columns: 1fr}
  .profileSummary{grid-template-columns: 1fr}
  .company{min-width: 200px}
}

@media print{
  body{background:#fff; color:#111}
  .no-print{display:none !important}
  .card,.reportHero,.section,.panel,.painCard,.fodaBox,.breachRow{box-shadow:none; background:#fff; border:1px solid #ddd}
  .muted{color:#444}
  .badge{border-color:#ccc}
  .badge.blue,.badge.green,.badge.yellow,.badge.orange,.badge.red{background:#f5f5f5; color:#111}
  .progressWrap{display:none}
}
`;
