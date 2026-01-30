mport React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Radar,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

/**
 * VÉRTICE 360 – SaaS-Ready (FASE 1: DIAGNOSTICAR) – v2
 * Mejoras clave para producto comercial autoatendido:
 * - Banco de preguntas más robusto (4 por dimensión aprox + FODA)
 * - Señales (signals) por respuesta para generar profundidad (riesgo, dependencia, control, etc.)
 * - Evidencias automáticas: el reporte explica el "por qué" usando respuestas del usuario
 * - Scorecard ejecutivo (Nivel / Riesgo / Impacto)
 * - FODA con evidencia + campos opcionales para profundizar
 * - Plan de acción 30 días + quick wins (templates, sin IA real)
 *
 * Nota: Sigue siendo determinístico (sin LLM). Listo para vender como SaaS.
 */

// ------------------------------
// 1) MODELO DE MADUREZ
// ------------------------------
const DIMENSIONS = [
  { key: "strategy", name: "Estrategia", weight: 0.17, impact: "Dirección" },
  { key: "process", name: "Procesos", weight: 0.17, impact: "Operación" },
  { key: "finance", name: "Finanzas", weight: 0.18, impact: "Caja y Rentabilidad" },
  { key: "people", name: "Personas y Roles", weight: 0.16, impact: "Ejecución" },
  { key: "tech", name: "Tecnología y Datos", weight: 0.16, impact: "Eficiencia y Decisión" },
  { key: "risk", name: "Gobierno y Riesgos", weight: 0.16, impact: "Continuidad" },
];

const ADVANCE_RULE = {
  minDimensionLevelToAdvance: 2,
};

// ------------------------------
// 2) BANCO DE PREGUNTAS (SaaS-ready)
// - "signals" le da sustancia al diagnóstico
// - type: "choice" (scored) | "text" (no-scored)
// - required: true/false (para validar flujo)
// ------------------------------
const QUESTIONS = [
  // ============ ESTRATEGIA ============
  {
    id: "S1",
    dimension: "strategy",
    title: "Estrategia",
    type: "choice",
    required: true,
    prompt: "Cuando tomas decisiones importantes en tu empresa, normalmente…",
    options: [
      { label: "Reacciono a lo urgente del día a día", score: 1, signals: ["sin_foco", "reactivo"] },
      { label: "Me guío por mi experiencia e intuición", score: 2, signals: ["intuicion", "priorizacion_debil"] },
      { label: "Tengo objetivos claros como referencia", score: 3, signals: ["objetivos_basicos"] },
      { label: "Evalúo según metas y resultados medibles", score: 4, signals: ["metas", "seguimiento"] },
      { label: "Tengo criterios alineados a una visión de largo plazo", score: 5, signals: ["vision", "alineacion"] },
    ],
  },
  {
    id: "S2",
    dimension: "strategy",
    title: "Estrategia",
    type: "choice",
    required: true,
    showIf: (a) => (a["S1"]?.score ?? 0) >= 2,
    prompt: "¿Qué tan claro está el rumbo (2–3 años) y cómo se traduce en prioridades?",
    options: [
      { label: "No está definido", score: 1, signals: ["sin_estrategia", "sin_prioridades"] },
      { label: "Está en la cabeza del dueño", score: 2, signals: ["dependencia_dueno", "sin_documento"] },
      { label: "Conversado, pero no documentado", score: 3, signals: ["semi_formal"] },
      { label: "Definido y se usa para priorizar", score: 4, signals: ["priorizacion_clara"] },
      { label: "Definido, comunicado y guía la operación", score: 5, signals: ["alineacion_equipo"] },
    ],
  },
  {
    id: "S3",
    dimension: "strategy",
    title: "Estrategia",
    type: "choice",
    required: true,
    prompt: "Cuando aparecen nuevas oportunidades, tu empresa…",
    options: [
      { label: "Dice sí a casi todo", score: 1, signals: ["sin_filtro", "dispersion"] },
      { label: "Evalúa rápido pero sin criterios claros", score: 2, signals: ["criterios_debiles"] },
      { label: "Evalúa con criterios básicos (margen/tiempo)", score: 3, signals: ["filtro_basico"] },
      { label: "Prioriza según objetivos y capacidad", score: 4, signals: ["priorizacion"] },
      { label: "Tiene un sistema de portafolio y decide con datos", score: 5, signals: ["gobierno_estrategico"] },
    ],
  },
  {
    id: "S4",
    dimension: "strategy",
    title: "Estrategia",
    type: "choice",
    required: true,
    prompt: "¿Cómo está tu propuesta de valor (por qué te eligen)?",
    options: [
      { label: "No está clara / competimos por precio", score: 1, signals: ["comoditizado", "margen_riesgo"] },
      { label: "Es intuitiva, pero no consistente", score: 2, signals: ["posicionamiento_debil"] },
      { label: "Está clara para algunos clientes", score: 3, signals: ["valor_parcial"] },
      { label: "Está clara y se refleja en ventas", score: 4, signals: ["valor_definido"] },
      { label: "Está clara, medida y se mejora continuamente", score: 5, signals: ["propuesta_valor_sistematizada"] },
    ],
  },

  // ============ PROCESOS ============
  {
    id: "P1",
    dimension: "process",
    title: "Procesos",
    type: "choice",
    required: true,
    prompt: "Si una persona clave falta una semana, ¿qué pasa con la operación?",
    options: [
      { label: "Todo se desordena", score: 1, signals: ["alta_dependencia_persona", "riesgo_operacional"] },
      { label: "Se resuelve, pero con mucho esfuerzo", score: 2, signals: ["dependencia_alta", "retrabajo"] },
      { label: "Hay problemas, pero no críticos", score: 3, signals: ["dependencia_media"] },
      { label: "La mayoría sigue funcionando", score: 4, signals: ["continuidad"] },
      { label: "No afecta, los procesos están claros", score: 5, signals: ["proceso_estandar"] },
    ],
  },
  {
    id: "P2",
    dimension: "process",
    title: "Procesos",
    type: "choice",
    required: true,
    prompt: "Los procesos clave (ventas, compra, entrega, postventa)…",
    options: [
      { label: "No están definidos", score: 1, signals: ["sin_procesos", "variabilidad"] },
      { label: "Existen pero dependen de quien los haga", score: 2, signals: ["proceso_tacito", "errores"] },
      { label: "Están claros, pero poco documentados", score: 3, signals: ["proceso_parcial"] },
      { label: "Están documentados y se siguen", score: 4, signals: ["estandarizacion"] },
      { label: "Se miden y mejoran continuamente", score: 5, signals: ["mejora_continua"] },
    ],
  },
  {
    id: "P3",
    dimension: "process",
    title: "Procesos",
    type: "choice",
    required: true,
    prompt: "Cuando hay errores o reclamos, normalmente…",
    options: [
      { label: "Se apaga el incendio y se sigue", score: 1, signals: ["apaga_incendios", "causa_raiz_ausente"] },
      { label: "Se corrige, pero vuelve a pasar", score: 2, signals: ["reincidencia", "sin_estandar"] },
      { label: "Se conversa y se ajusta algo", score: 3, signals: ["mejora_informal"] },
      { label: "Se define acción correctiva y responsable", score: 4, signals: ["accion_correctiva"] },
      { label: "Se analiza causa raíz y se controla con indicadores", score: 5, signals: ["calidad_sistematica"] },
    ],
  },
  {
    id: "P4",
    dimension: "process",
    title: "Procesos",
    type: "choice",
    required: true,
    prompt: "¿Cómo controlas la ejecución diaria/semanal?",
    options: [
      { label: "No hay rutina de control", score: 1, signals: ["sin_control_operacional"] },
      { label: "Control reactivo cuando hay problemas", score: 2, signals: ["control_reactivo"] },
      { label: "Reuniones básicas, sin métricas claras", score: 3, signals: ["control_basico"] },
      { label: "Revisión periódica con responsables", score: 4, signals: ["control_formal"] },
      { label: "Tablero + cadencia + mejora (ritual de gestión)", score: 5, signals: ["ritual_gestion"] },
    ],
  },

  // ============ FINANZAS ============
  {
    id: "F1",
    dimension: "finance",
    title: "Finanzas",
    type: "choice",
    required: true,
    prompt: "¿Cómo sabes si este mes fue bueno o malo para la empresa?",
    options: [
      { label: "Por la sensación general", score: 1, signals: ["sin_visibilidad_fin", "decision_sin_datos"] },
      { label: "Mirando la cuenta bancaria", score: 2, signals: ["solo_caja", "riesgo_sorpresas"] },
      { label: "Revisando ingresos y gastos", score: 3, signals: ["control_basico"] },
      { label: "Analizando resultados y márgenes", score: 4, signals: ["margen_control"] },
      { label: "Comparando contra presupuesto e indicadores", score: 5, signals: ["control_presupuestario"] },
    ],
  },
  {
    id: "F2",
    dimension: "finance",
    title: "Finanzas",
    type: "choice",
    required: true,
    prompt: "¿Tienes presupuesto (o plan financiero) y lo usas para decidir?",
    options: [
      { label: "No existe", score: 1, signals: ["sin_presupuesto"] },
      { label: "Existe pero no se usa", score: 2, signals: ["presupuesto_muerto"] },
      { label: "Se usa a veces", score: 3, signals: ["presupuesto_parcial"] },
      { label: "Se usa con control mensual", score: 4, signals: ["control_mensual"] },
      { label: "Se usa con forecast y correcciones", score: 5, signals: ["forecast", "control_avanzado"] },
    ],
  },
  {
    id: "F3",
    dimension: "finance",
    title: "Finanzas",
    type: "choice",
    required: true,
    prompt: "Tu visibilidad de costos/márgenes por producto/servicio es…",
    options: [
      { label: "No la tengo", score: 1, signals: ["sin_costeo", "margen_desconocido"] },
      { label: "La estimo", score: 2, signals: ["costeo_intuitivo"] },
      { label: "La tengo en algunos servicios", score: 3, signals: ["costeo_parcial"] },
      { label: "La tengo y la reviso periódicamente", score: 4, signals: ["margen_visibilidad"] },
      { label: "La uso para fijar precios y priorizar cartera", score: 5, signals: ["pricing_datos"] },
    ],
  },
  {
    id: "F4",
    dimension: "finance",
    title: "Finanzas",
    type: "choice",
    required: true,
    prompt: "Respecto a caja, tu empresa…",
    options: [
      { label: "Vive al día", score: 1, signals: ["riesgo_caja_alto", "estres_caja"] },
      { label: "Se aprieta cuando hay problemas", score: 2, signals: ["riesgo_caja", "sin_plan_caja"] },
      { label: "Tiene control básico y previsión corta", score: 3, signals: ["caja_basica"] },
      { label: "Proyecta y administra cobranza/pagos", score: 4, signals: ["gestion_caja"] },
      { label: "Tiene proyección y políticas claras (capital trabajo)", score: 5, signals: ["capital_trabajo"] },
    ],
  },

  // ============ PERSONAS ============
  {
    id: "R1",
    dimension: "people",
    title: "Personas y Roles",
    type: "choice",
    required: true,
    prompt: "En tu empresa, las responsabilidades…",
    options: [
      { label: "No están claras", score: 1, signals: ["roles_difusos", "friccion"] },
      { label: "Se entienden, pero no están definidas", score: 2, signals: ["roles_informales"] },
      { label: "Están más o menos claras", score: 3, signals: ["roles_parcial"] },
      { label: "Están definidas por rol", score: 4, signals: ["roles_definidos"] },
      { label: "Están claras y no dependen del dueño", score: 5, signals: ["delegacion_real"] },
    ],
  },
  {
    id: "R2",
    dimension: "people",
    title: "Personas y Roles",
    type: "choice",
    required: true,
    prompt: "Cuando surge un problema importante…",
    options: [
      { label: "Siempre lo resuelve el dueño", score: 1, signals: ["dueno_cuello_botella", "dependencia_dueno"] },
      { label: "Normalmente pasa por el dueño", score: 2, signals: ["dependencia_dueno"] },
      { label: "Algunas personas lo resuelven solas", score: 3, signals: ["autonomia_media"] },
      { label: "Los responsables actúan con autonomía", score: 4, signals: ["autonomia"] },
      { label: "El sistema absorbe el problema", score: 5, signals: ["sistema_resiliente"] },
    ],
  },
  {
    id: "R3",
    dimension: "people",
    title: "Personas y Roles",
    type: "choice",
    required: true,
    prompt: "¿Cómo gestionas desempeño y prioridades del equipo?",
    options: [
      { label: "No hay seguimiento claro", score: 1, signals: ["sin_gestion_desempeno"] },
      { label: "Seguimiento informal", score: 2, signals: ["gestion_informal"] },
      { label: "Metas básicas y revisión ocasional", score: 3, signals: ["metas_basicas"] },
      { label: "Metas por rol y revisiones periódicas", score: 4, signals: ["gestion_formal"] },
      { label: "Metas + indicadores + feedback + mejora", score: 5, signals: ["gestion_alta"] },
    ],
  },
  {
    id: "R4",
    dimension: "people",
    title: "Personas y Roles",
    type: "choice",
    required: true,
    prompt: "Respecto a cultura/orden interno, la empresa…",
    options: [
      { label: "Funciona por presión/urgencia", score: 1, signals: ["estres_operativo"] },
      { label: "Funciona por esfuerzo personal", score: 2, signals: ["desgaste"] },
      { label: "Tiene orden parcial", score: 3, signals: ["orden_parcial"] },
      { label: "Tiene disciplina de trabajo estable", score: 4, signals: ["disciplina"] },
      { label: "Tiene hábitos y sistema (rituales de gestión)", score: 5, signals: ["cultura_sistema"] },
    ],
  },

  // ============ TECNOLOGÍA ============
  {
    id: "T1",
    dimension: "tech",
    title: "Tecnología y Datos",
    type: "choice",
    required: true,
    prompt: "¿Qué rol juega hoy la tecnología en tu empresa?",
    options: [
      { label: "Solo lo básico (correo, WhatsApp)", score: 1, signals: ["baja_digitalizacion", "datos_dispersos"] },
      { label: "Herramientas sueltas", score: 2, signals: ["islas_tecnologicas"] },
      { label: "Apoya ciertas tareas clave", score: 3, signals: ["soporte_parcial"] },
      { label: "Es parte del control del negocio", score: 4, signals: ["control_con_tecnologia"] },
      { label: "Permite escalar y decidir mejor", score: 5, signals: ["tecnologia_escalable"] },
    ],
  },
  {
    id: "T2",
    dimension: "tech",
    title: "Tecnología y Datos",
    type: "choice",
    required: true,
    prompt: "La información que usas para decidir…",
    options: [
      { label: "Está dispersa", score: 1, signals: ["datos_dispersos"] },
      { label: "Se arma manualmente", score: 2, signals: ["manualidad", "errores_datos"] },
      { label: "Está centralizada", score: 3, signals: ["centralizacion"] },
      { label: "Se actualiza periódicamente", score: 4, signals: ["actualizacion_regular"] },
      { label: "Es confiable y accesible", score: 5, signals: ["datos_confiables"] },
    ],
  },
  {
    id: "T3",
    dimension: "tech",
    title: "Tecnología y Datos",
    type: "choice",
    required: true,
    prompt: "Respecto a reportes/indicadores, tu empresa…",
    options: [
      { label: "No usa indicadores", score: 1, signals: ["sin_kpi"] },
      { label: "Usa indicadores aislados", score: 2, signals: ["kpi_islas"] },
      { label: "Tiene algunos KPIs clave", score: 3, signals: ["kpi_basicos"] },
      { label: "Tiene tablero con revisión periódica", score: 4, signals: ["tablero"] },
      { label: "Tiene tablero + alertas + decisiones por datos", score: 5, signals: ["decision_por_datos"] },
    ],
  },
  {
    id: "T4",
    dimension: "tech",
    title: "Tecnología y Datos",
    type: "choice",
    required: true,
    prompt: "Automatización: tareas repetitivas (cotizar, facturar, seguimiento) …",
    options: [
      { label: "Son manuales", score: 1, signals: ["baja_automatizacion", "tiempo_perdido"] },
      { label: "Semi-manuales", score: 2, signals: ["automatizacion_parcial"] },
      { label: "Algunas automatizadas", score: 3, signals: ["automatizacion_media"] },
      { label: "Varias automatizadas", score: 4, signals: ["automatizacion_alta"] },
      { label: "Automatización integrada y controlada", score: 5, signals: ["automatizacion_integrada"] },
    ],
  },

  // ============ GOBIERNO Y RIESGOS ============
  {
    id: "G1",
    dimension: "risk",
    title: "Gobierno y Riesgos",
    type: "choice",
    required: true,
    prompt: "Si ocurre un problema grave (persona clave, cliente grande, caja), la empresa…",
    options: [
      { label: "Queda muy expuesta", score: 1, signals: ["riesgo_alto", "sin_controles"] },
      { label: "Tendría serios problemas", score: 2, signals: ["riesgo", "controles_debiles"] },
      { label: "Podría resistir un tiempo", score: 3, signals: ["resiliencia_media"] },
      { label: "Tiene controles mínimos", score: 4, signals: ["controles_minimos"] },
      { label: "Tiene planes y controles claros", score: 5, signals: ["continuidad_operacional"] },
    ],
  },
  {
    id: "G2",
    dimension: "risk",
    title: "Gobierno y Riesgos",
    type: "choice",
    required: true,
    prompt: "¿Qué tan identificados y monitoreados están los riesgos del negocio?",
    options: [
      { label: "No los tengo identificados", score: 1, signals: ["sin_mapa_riesgos"] },
      { label: "Los intuyo", score: 2, signals: ["riesgos_intuitivos"] },
      { label: "Los conozco, pero no gestiono", score: 3, signals: ["gestion_riesgo_baja"] },
      { label: "Los monitoreo", score: 4, signals: ["monitoreo_riesgos"] },
      { label: "Los gestiono activamente", score: 5, signals: ["gestion_riesgo_alta"] },
    ],
  },
  {
    id: "G3",
    dimension: "risk",
    title: "Gobierno y Riesgos",
    type: "choice",
    required: true,
    prompt: "Documentación y orden (contratos, políticas, respaldos) …",
    options: [
      { label: "No existe orden", score: 1, signals: ["desorden_documental", "riesgo_legal"] },
      { label: "Existe a medias", score: 2, signals: ["orden_parcial"] },
      { label: "Existe lo mínimo", score: 3, signals: ["cumplimiento_basico"] },
      { label: "Está ordenado y accesible", score: 4, signals: ["orden_documental"] },
      { label: "Está gobernado y auditado", score: 5, signals: ["gobierno_documental"] },
    ],
  },
  {
    id: "G4",
    dimension: "risk",
    title: "Gobierno y Riesgos",
    type: "choice",
    required: true,
    prompt: "Cumplimiento y controles internos…",
    options: [
      { label: "No hay controles", score: 1, signals: ["sin_controles", "fraude_riesgo"] },
      { label: "Controles informales", score: 2, signals: ["control_informal"] },
      { label: "Controles básicos", score: 3, signals: ["control_basico"] },
      { label: "Controles definidos y aplicados", score: 4, signals: ["control_definido"] },
      { label: "Controles + revisiones periódicas", score: 5, signals: ["control_avanzado"] },
    ],
  },

  // ============ FODA (CAPTURA) ============
  {
    id: "FODA_S",
    dimension: "strategy",
    title: "FODA",
    type: "choice",
    required: true,
    prompt: "¿Cuál dirías que es HOY tu principal fortaleza?",
    options: [
      { label: "Servicio al cliente / experiencia", score: 4, signals: ["foda_fortaleza_servicio"] },
      { label: "Equipo comprometido", score: 4, signals: ["foda_fortaleza_equipo"] },
      { label: "Rapidez / cumplimiento operacional", score: 4, signals: ["foda_fortaleza_operacion"] },
      { label: "Producto/servicio diferenciado", score: 4, signals: ["foda_fortaleza_diferenciacion"] },
      { label: "Relación con clientes / reputación", score: 4, signals: ["foda_fortaleza_reputacion"] },
      { label: "Otro (lo explicaré)", score: 4, signals: ["foda_fortaleza_otro"] },
    ],
  },
  {
    id: "FODA_S_WHY",
    dimension: "strategy",
    title: "FODA",
    type: "text",
    required: false,
    prompt: (a) => {
      const s = a["FODA_S"]?.label;
      return s
        ? `Mencionaste como fortaleza: “${s}”. ¿Qué impacto positivo tiene en el negocio? (opcional)`
        : "¿Qué impacto positivo tiene esa fortaleza? (opcional)";
    },
    placeholder: "Ej: genera recomendaciones, permite cobrar mejor, reduce reclamos, mejora tiempos, fideliza…",
    maxLen: 240,
  },
  {
    id: "FODA_W",
    dimension: "process",
    title: "FODA",
    type: "choice",
    required: true,
    prompt: "¿Cuál es HOY tu debilidad más evidente?",
    options: [
      { label: "Procesos poco claros / retrabajo", score: 2, signals: ["foda_debilidad_procesos"] },
      { label: "Dependencia del dueño / pocas delegaciones", score: 2, signals: ["foda_debilidad_dueno"] },
      { label: "Control financiero débil (caja / márgenes)", score: 2, signals: ["foda_debilidad_finanzas"] },
      { label: "Ventas irregulares / sin pipeline", score: 2, signals: ["foda_debilidad_ventas"] },
      { label: "Datos dispersos / baja tecnología", score: 2, signals: ["foda_debilidad_tecnologia"] },
      { label: "Otro (lo explicaré)", score: 2, signals: ["foda_debilidad_otro"] },
    ],
  },
  {
    id: "FODA_W_WHY",
    dimension: "process",
    title: "FODA",
    type: "text",
    required: false,
    prompt: (a) => {
      const w = a["FODA_W"]?.label;
      return w
        ? `Marcaste como debilidad: “${w}”. ¿Cuál es el costo/impacto hoy? (opcional)`
        : "¿Cuál es el costo/impacto de esa debilidad hoy? (opcional)";
    },
    placeholder: "Ej: atrasos, errores, sobrecarga, pérdidas, clientes molestos, baja rentabilidad…",
    maxLen: 240,
  },
  {
    id: "FODA_O",
    dimension: "strategy",
    title: "FODA",
    type: "choice",
    required: true,
    prompt: "Mirando los próximos 6–12 meses, ¿qué oportunidad ves más clara?",
    options: [
      { label: "Aumentar ventas con mejor foco comercial", score: 4, signals: ["foda_oportunidad_ventas"] },
      { label: "Mejorar rentabilidad (precios/costos)", score: 4, signals: ["foda_oportunidad_rentabilidad"] },
      { label: "Ordenar operación para escalar", score: 4, signals: ["foda_oportunidad_escalar"] },
      { label: "Digitalizar/automatizar para ser más eficiente", score: 4, signals: ["foda_oportunidad_digital"] },
      { label: "Entrar a nuevos segmentos/mercados", score: 4, signals: ["foda_oportunidad_mercado"] },
      { label: "Otro (lo explicaré)", score: 4, signals: ["foda_oportunidad_otro"] },
    ],
  },
  {
    id: "FODA_O_WHY",
    dimension: "strategy",
    title: "FODA",
    type: "text",
    required: false,
    prompt: (a) => {
      const o = a["FODA_O"]?.label;
      return o
        ? `Oportunidad elegida: “${o}”. ¿Qué haría posible capturarla? (opcional)`
        : "¿Qué haría posible capturar esa oportunidad? (opcional)";
    },
    placeholder: "Ej: procesos, marketing, capacidades, tecnología, equipo, oferta…",
    maxLen: 240,
  },
  {
    id: "FODA_T",
    dimension: "risk",
    title: "FODA",
    type: "choice",
    required: true,
    prompt: "¿Cuál amenaza te preocupa más hoy?",
    options: [
      { label: "Competencia / presión de precios", score: 2, signals: ["foda_amenaza_competencia"] },
      { label: "Dependencia de clientes/personas clave", score: 2, signals: ["foda_amenaza_dependencia"] },
      { label: "Riesgo de caja / pagos / cobranza", score: 2, signals: ["foda_amenaza_caja"] },
      { label: "Errores operacionales al crecer", score: 2, signals: ["foda_amenaza_quiebre"] },
      { label: "Cambios regulatorios / legales", score: 2, signals: ["foda_amenaza_legal"] },
      { label: "Otro (lo explicaré)", score: 2, signals: ["foda_amenaza_otro"] },
    ],
  },
  {
    id: "FODA_T_WHY",
    dimension: "risk",
    title: "FODA",
    type: "text",
    required: false,
    prompt: (a) => {
      const t = a["FODA_T"]?.label;
      return t
        ? `Amenaza elegida: “${t}”. ¿Qué podría pasar si no se gestiona? (opcional)`
        : "¿Qué podría pasar si no se gestiona esa amenaza? (opcional)";
    },
    placeholder: "Ej: pérdida de clientes, atrasos, estrés de caja, desgaste del equipo…",
    maxLen: 240,
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
  if (l <= 2) return "Tu empresa avanza por esfuerzo, pero hoy está expuesta a quiebres al crecer.";
  if (l === 3) return "Tu empresa ya tiene orden; el desafío ahora es convertirlo en sistema.";
  return "Tu empresa tiene base sólida: el siguiente paso es escalar con control y foco.";
}

function coverIntro(level) {
  const l = Math.round(level);
  if (l <= 2)
    return "Se sostiene por experiencia y resolución de urgencias. Esto permite avanzar, pero aumenta desgaste y riesgo cuando crece la demanda.";
  if (l === 3)
    return "Existen prácticas de orden y control. El siguiente paso es profesionalizar con rutinas, indicadores y roles más claros.";
  return "La gestión se apoya en procesos y datos. El foco ahora es optimizar, reducir riesgos y acelerar crecimiento sostenible.";
}

function riskBadgeFromLevel(v) {
  if (v < 2.5) return { label: "Alto", color: "red" };
  if (v < 3.5) return { label: "Medio", color: "orange" };
  return { label: "Bajo", color: "green" };
}

function getAllSignals(answers) {
  const signals = {};
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    if (!a) continue;
    const list = a.signals || [];
    for (const s of list) signals[s] = (signals[s] || 0) + 1;
  }
  return signals;
}

function questionLabel(qid) {
  const q = QUESTIONS.find((x) => x.id === qid);
  return q?.prompt ?? qid;
}

function buildEvidenceByDimension(answers) {
  // Devuelve evidencias (positivas y negativas) por dimensión,
  // usando respuestas scored (choice) con extremos.
  const byDim = {};
  for (const q of QUESTIONS) {
    if (q.type !== "choice") continue;
    const a = answers[q.id];
    if (!a) continue;
    if (!byDim[q.dimension]) byDim[q.dimension] = { positive: [], negative: [], neutral: [] };

    const entry = {
      qid: q.id,
      prompt: typeof q.prompt === "function" ? "(pregunta dinámica)" : q.prompt,
      answer: a.label,
      score: a.score,
    };

    if (a.score >= 4) byDim[q.dimension].positive.push(entry);
    else if (a.score <= 2) byDim[q.dimension].negative.push(entry);
    else byDim[q.dimension].neutral.push(entry);
  }
  return byDim;
}

function topPainPointsFromLevels(levelsByDim) {
  const sorted = Object.entries(levelsByDim)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  const titleMap = {
    strategy: "Falta de foco y prioridades claras",
    process: "Dependencia operativa y baja repetibilidad",
    finance: "Baja visibilidad financiera para decidir",
    people: "Roles difusos y dependencia del dueño",
    tech: "Datos dispersos y poca automatización",
    risk: "Exposición ante riesgos operacionales/legales",
  };

  const whyMap = {
    strategy: "las decisiones no están completamente ancladas a un rumbo compartido y criterios consistentes.",
    process: "la operación depende de personas y hábitos más que de procesos estables.",
    finance: "la gestión financiera no opera como un sistema de control y anticipación.",
    people: "existe concentración de decisiones y responsabilidades en pocas personas.",
    tech: "la información no está organizada para decidir rápido y ejecutar con eficiencia.",
    risk: "faltan controles y disciplina para prevenir impactos y asegurar continuidad.",
  };

  return sorted.map(([dimKey, lvl], i) => {
    const dimName = DIMENSIONS.find((d) => d.key === dimKey)?.name ?? dimKey;
    return {
      rank: i + 1,
      dimension: dimKey,
      name: titleMap[dimKey] ?? `Brecha en ${dimName}`,
      why: `Esto ocurre porque ${whyMap[dimKey] ?? "hay brechas estructurales"}`,
      risk:
        lvl < 2.5
          ? "Aumenta la fragilidad del negocio y la probabilidad de quiebres al crecer."
          : "Limita crecimiento o reduce rentabilidad si no se refuerza.",
    };
  });
}

function buildFODAEnhanced(levelsByDim, answers, evidenceByDim) {
  // Mezcla: (a) selección explícita FODA + (b) dimensiones fuertes/débiles + (c) evidencia
  const fodaS = answers["FODA_S"]?.label;
  const fodaSWhy = answers["FODA_S_WHY"]?.text;
  const fodaW = answers["FODA_W"]?.label;
  const fodaWWhy = answers["FODA_W_WHY"]?.text;
  const fodaO = answers["FODA_O"]?.label;
  const fodaOWhy = answers["FODA_O_WHY"]?.text;
  const fodaT = answers["FODA_T"]?.label;
  const fodaTWhy = answers["FODA_T_WHY"]?.text;

  const dimsSortedHigh = Object.entries(levelsByDim).sort((a, b) => b[1] - a[1]);
  const dimsSortedLow = Object.entries(levelsByDim).sort((a, b) => a[1] - b[1]);

  const topStrengthDim = dimsSortedHigh[0]?.[0];
  const topWeakDim = dimsSortedLow[0]?.[0];

  const strengthDimName = DIMENSIONS.find((d) => d.key === topStrengthDim)?.name;
  const weakDimName = DIMENSIONS.find((d) => d.key === topWeakDim)?.name;

  const strengths = [];
  if (fodaS) strengths.push({ text: fodaSWhy ? `${fodaS} — ${fodaSWhy}` : fodaS, evidence: [] });
  if (strengthDimName) strengths.push({ text: `Base sólida en ${strengthDimName}.`, evidence: [] });

  const weaknesses = [];
  if (fodaW) weaknesses.push({ text: fodaWWhy ? `${fodaW} — ${fodaWWhy}` : fodaW, evidence: [] });
  if (weakDimName) weaknesses.push({ text: `Brecha relevante en ${weakDimName}.`, evidence: [] });

  // Evidencias: agarramos 1-2 evidencias por dimensión top/bottom
  const addEvidence = (arr, dimKey, kind) => {
    const list = evidenceByDim[dimKey]?.[kind] || [];
    const top2 = list.slice(0, 2).map((e) => `“${e.answer}” (score ${e.score})`);
    if (arr.length && top2.length) arr[arr.length - 1].evidence = top2;
  };
  if (topStrengthDim) addEvidence(strengths, topStrengthDim, "positive");
  if (topWeakDim) addEvidence(weaknesses, topWeakDim, "negative");

  const opportunities = [];
  if (fodaO) opportunities.push(fodaOWhy ? `${fodaO} — ${fodaOWhy}` : fodaO);
  // Oportunidades automáticas por brechas típicas
  if ((levelsByDim.process ?? 1) < 3) opportunities.push("Estandarizar procesos clave para escalar sin aumentar el caos.");
  if ((levelsByDim.finance ?? 1) < 3) opportunities.push("Instalar control de caja/márgenes para decidir con anticipación.");
  if ((levelsByDim.tech ?? 1) < 3) opportunities.push("Centralizar datos y automatizar tareas repetitivas para ganar eficiencia.");

  const threats = [];
  if (fodaT) threats.push(fodaTWhy ? `${fodaT} — ${fodaTWhy}` : fodaT);
  // Amenazas automáticas por combinación de niveles bajos
  if ((levelsByDim.process ?? 1) < 2.5 && (levelsByDim.finance ?? 1) < 3)
    threats.push("Crecer sin orden y control financiero puede generar quiebres operacionales y de caja.");
  if ((levelsByDim.people ?? 1) < 2.5)
    threats.push("Dependencia excesiva de pocas personas aumenta fragilidad y riesgo de continuidad.");

  return { strengths, weaknesses, opportunities: unique(opportunities).slice(0, 4), threats: unique(threats).slice(0, 4) };
}

function unique(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function buildBreaches(levelsByDim) {
  const sorted = Object.entries(levelsByDim).sort((a, b) => a[1] - b[1]);
  const [b1, b2, b3] = sorted;
  const name = (k) => DIMENSIONS.find((d) => d.key === k)?.name ?? k;

  return [
    { label: "Prioridad crítica", item: name(b1[0]), why: "Reduce riesgos inmediatos y estabiliza el negocio." },
    { label: "Prioridad importante", item: name(b2[0]), why: "Permite avanzar con control y coherencia." },
    { label: "Puede esperar", item: name(b3[0]), why: "Rinde más después de fortalecer lo crítico." },
  ];
}

function planTemplates() {
  return {
    process: {
      goal: "Hacer la operación repetible y menos dependiente de personas",
      actions: [
        "Mapear 5 procesos críticos (ventas, entrega, postventa, finanzas, compras).",
        "Definir responsable + output esperado por proceso (RACI mínimo).",
        "Documentar versión 1 (pasos + checklist) para los 2 procesos más críticos.",
        "Instalar cadencia semanal de control (15–20 min) con responsable y acuerdos.",
        "Medir 1 indicador operativo por proceso (ej: tiempos, errores, retrabajo).",
      ],
      quickWin: "Mapa de procesos + responsables (1 hoja) en 7 días.",
    },
    finance: {
      goal: "Instalar control de caja y rentabilidad para decidir con anticipación",
      actions: [
        "Crear tablero simple mensual: ventas, costos, margen, caja (1 hoja).",
        "Definir 3 KPIs: margen bruto, días de caja, cobranza (DSO).",
        "Implementar rutina semanal de caja (cobranza/pagos) con responsable.",
        "Armar presupuesto básico y comparar real vs plan mensualmente.",
        "Construir proyección de caja 8 semanas (rolling) para anticipar quiebres.",
      ],
      quickWin: "Proyección de caja 8 semanas en 7 días.",
    },
    people: {
      goal: "Delegar con claridad y reducir cuello de botella del dueño",
      actions: [
        "Definir roles clave y responsabilidades (1 hoja por rol).",
        "Instalar reunión semanal de prioridades por rol (30 min).",
        "Definir 3 indicadores por rol (output, calidad, tiempo).",
        "Crear esquema simple de decisiones: qué decide cada rol vs dueño.",
        "Hacer feedback mensual (15 min) por responsable para mantener foco.",
      ],
      quickWin: "Matriz de roles y decisiones en 7 días.",
    },
    tech: {
      goal: "Ordenar datos y automatizar para ganar eficiencia",
      actions: [
        "Centralizar información crítica (clientes, ventas, finanzas) en un lugar.",
        "Definir 8–12 indicadores base y una vista ejecutiva semanal.",
        "Eliminar tareas manuales repetitivas (1 automatización simple).",
        "Crear tablero operativo y financiero con actualización periódica.",
        "Definir dueño del dato (responsable de calidad/actualización).",
      ],
      quickWin: "Tablero mínimo de KPIs (v1) en 7 días.",
    },
    strategy: {
      goal: "Alinear foco y priorizar lo que realmente mueve el negocio",
      actions: [
        "Definir 3 objetivos 12 meses (claros y medibles).",
        "Identificar 5 iniciativas y priorizarlas por impacto/esfuerzo.",
        "Definir propuesta de valor en 1 frase + segmentos principales.",
        "Instalar revisión mensual de estrategia (60 min) con indicadores.",
        "Alinear al equipo: qué hacemos / qué NO hacemos (filtro).",
      ],
      quickWin: "Objetivos + 5 iniciativas priorizadas en 7 días.",
    },
    risk: {
      goal: "Reducir exposición y asegurar continuidad",
      actions: [
        "Identificar top 10 riesgos (personas, clientes, caja, legales, operación).",
        "Definir 3 controles mínimos por riesgo crítico (dueño + frecuencia).",
        "Ordenar documentación: contratos, respaldos, políticas básicas.",
        "Instalar revisión mensual de riesgos (30 min).",
        "Definir plan de continuidad mínimo (qué pasa si X falla).",
      ],
      quickWin: "Mapa de riesgos + controles mínimos en 7 días.",
    },
  };
}

function build30DayPlan(levelsByDim) {
  const sorted = Object.entries(levelsByDim).sort((a, b) => a[1] - b[1]);
  const primary = sorted[0]?.[0];
  const secondary = sorted[1]?.[0];

  const tpl = planTemplates();
  const primaryPlan = tpl[primary] || tpl.process;
  const secondaryPlan = tpl[secondary] || tpl.finance;

  return {
    primary,
    secondary,
    primaryPlan,
    secondaryPlan,
  };
}

// ------------------------------
// 4) SCORING
// - Por dimensión: promedio de preguntas scored (choice) respondidas de esa dimensión
// - Global: ponderado
// ------------------------------
function computeScores(answers) {
  const byDim = {};
  const counts = {};

  for (const q of QUESTIONS) {
    if (q.type !== "choice") continue;
    const a = answers[q.id];
    if (!a) continue;

    byDim[q.dimension] = (byDim[q.dimension] ?? 0) + a.score;
    counts[q.dimension] = (counts[q.dimension] ?? 0) + 1;
  }

  const levelsByDim = {};
  for (const d of DIMENSIONS) {
    const sum = byDim[d.key] ?? 0;
    const n = counts[d.key] ?? 0;
    const avg = n ? sum / n : 1;
    levelsByDim[d.key] = avg || 1;
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

function Scorecard({ levelsByDim }) {
  return (
    <div className="scorecard">
      <div className="scoreHead">
        <div className="scoreTitle">Scorecard Ejecutivo</div>
        <div className="muted">Nivel · Riesgo · Impacto</div>
      </div>

      <div className="scoreTable">
        <div className="scoreRow scoreRowHead">
          <div>Dimensión</div>
          <div>Nivel</div>
          <div>Riesgo</div>
          <div>Impacto</div>
        </div>
        {DIMENSIONS.map((d) => {
          const v = levelsByDim[d.key] ?? 1;
          const r = riskBadgeFromLevel(v);
          return (
            <div className="scoreRow" key={d.key}>
              <div className="scoreDim">{d.name}</div>
              <div className="scoreLvl">{v.toFixed(1)} / 5</div>
              <div className="scoreRisk">
                <Badge color={r.color}>{r.label}</Badge>
              </div>
              <div className="scoreImpact muted">{d.impact}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TextArea({ value, onChange, placeholder, maxLen }) {
  return (
    <div className="textWrap">
      <textarea
        className="textArea"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLen || 300}
        rows={4}
      />
      <div className="textHint muted">{(value || "").length}/{maxLen || 300}</div>
    </div>
  );
}

// ------------------------------
// 6) APP
// ------------------------------
export default function App() {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState("Mi Empresa");
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

  const isAnswered = (q) => {
    const a = answers[q.id];
    if (!q.required) return true; // opcional
    if (!a) return false;
    if (q.type === "choice") return Boolean(a.label);
    if (q.type === "text") return Boolean((a.text || "").trim()); // requerido (si lo usaras)
    return false;
  };

  const allAnswered = useMemo(() => {
    return visibleQuestions.every((q) => isAnswered(q));
  }, [visibleQuestions, answers]);

  const scoring = useMemo(() => {
    if (!allAnswered) return null;
    return computeScores(answers);
  }, [allAnswered, answers]);

  const report = useMemo(() => {
    if (!scoring) return null;

    const { levelsByDim, global, canAdvance } = scoring;
    const lvl = levelLabel(global);

    const signals = getAllSignals(answers);
    const evidenceByDim = buildEvidenceByDimension(answers);

    const bestDim = DIMENSIONS.slice().sort((a, b) => levelsByDim[b.key] - levelsByDim[a.key])[0];
    const worstDim = DIMENSIONS.slice().sort((a, b) => levelsByDim[a.key] - levelsByDim[b.key])[0];

    const narrative = `Hoy tu empresa se encuentra en un nivel de madurez ${lvl.name}. Se observan fortalezas relativas en ${bestDim.name}, mientras que ${worstDim.name} aparece como la principal limitante para crecer con estabilidad. Este diagnóstico se basa en tus respuestas (evidencias) y se traduce en un plan de acción inicial de 30 días para mejorar control, reducir riesgos y aumentar capacidad de ejecución.`;

    const pains = topPainPointsFromLevels(levelsByDim);
    const foda = buildFODAEnhanced(levelsByDim, answers, evidenceByDim);
    const breaches = buildBreaches(levelsByDim);
    const plan = build30DayPlan(levelsByDim);

    return {
      levelsByDim,
      global,
      lvl,
      canAdvance,
      narrative,
      pains,
      foda,
      breaches,
      signals,
      evidenceByDim,
      plan,
    };
  }, [scoring, answers]);

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
    if (!isAnswered(current)) return;
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

  const renderPrompt = (q) => (typeof q.prompt === "function" ? q.prompt(answers) : q.prompt);

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <div className="logo">V</div>
          <div className="brandText">
            <div className="brandName">VÉRTICE 360</div>
            <div className="brandTag">Fase 1 · Diagnosticar (SaaS-ready)</div>
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
                  Responde en lenguaje simple. El sistema construye evidencias, riesgos y un plan de 30 días.
                </p>
              </div>

              <div className="company">
                <label className="muted">Empresa</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nombre de la empresa" />
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

                <h2 className="qPrompt">{renderPrompt(current)}</h2>

                {current.type === "choice" ? (
                  <div className="options">
                    {current.options.map((opt) => {
                      const selected = answers[current.id]?.label === opt.label;
                      return (
                        <button
                          key={opt.label}
                          className={`opt ${selected ? "selected" : ""}`}
                          onClick={() => selectOption(current, opt)}
                        >
                          <span>{opt.label}</span>
                          <span className="optScore">{opt.score}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <TextArea
                    value={answers[current.id]?.text || ""}
                    onChange={(t) => setText(current, t)}
                    placeholder={current.placeholder || "Escribe aquí…"}
                    maxLen={current.maxLen || 240}
                  />
                )}

                <div className="nav">
                  <button className="btn ghost" onClick={goBack} disabled={step === 0}>
                    <ArrowLeft size={16} /> Atrás
                  </button>

                  {step < visibleQuestions.length - 1 ? (
                    <button className="btn" onClick={goNext} disabled={!isAnswered(current)}>
                      Siguiente <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button className="btn" onClick={finish} disabled={!allAnswered}>
                      Generar Diagnóstico 360 <ArrowRight size={16} />
                    </button>
                  )}
                </div>

                {!current.required ? (
                  <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                    * Esta pregunta es opcional. Puedes continuar sin responder.
                  </div>
                ) : null}
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
                <h1 className="heroTitle">{company}</h1>
                <p className="heroHeadline">{coverHeadline(report.global)}</p>
                <p className="heroIntro">{coverIntro(report.global)}</p>
              </div>

              <div className="heroBox">
                <div className="heroBoxTitle">Nivel global</div>
                <div className="heroBoxValue">{report.global.toFixed(1)} / 5.0</div>
                <div className="heroBoxHint muted">Promedio ponderado por dimensiones</div>
              </div>
            </div>

            {/* FOTO GENERAL */}
            <section className="section">
              <h2>Tu empresa hoy</h2>
              <p className="lead">{report.narrative}</p>
            </section>

            {/* SCORECARD */}
            <section className="section">
              <Scorecard levelsByDim={report.levelsByDim} />
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
                  <h3>Evidencias principales</h3>
                  <div className="evidence">
                    {DIMENSIONS.map((d) => {
                      const ev = report.evidenceByDim[d.key];
                      const pos = (ev?.positive || []).slice(0, 1);
                      const neg = (ev?.negative || []).slice(0, 1);
                      return (
                        <div key={d.key} className="evidenceRow">
                          <div className="evidenceDim">
                            <div className="dimName">{d.name}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              Nivel {(report.levelsByDim[d.key] ?? 1).toFixed(1)} · Impacto {d.impact}
                            </div>
                          </div>

                          <div className="evidenceItems">
                            {pos.length ? (
                              <div className="evidenceItem ok">
                                <CheckCircle2 size={16} /> <span>{pos[0].answer}</span>
                              </div>
                            ) : null}
                            {neg.length ? (
                              <div className="evidenceItem no">
                                <AlertTriangle size={16} /> <span>{neg[0].answer}</span>
                              </div>
                            ) : null}

                            {!pos.length && !neg.length ? <div className="muted">Sin evidencia destacada.</div> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* DOLORES */}
            <section className="section">
              <h2>Principales desafíos que hoy te frenan</h2>
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
              <h2>Análisis FODA con evidencia</h2>

              <div className="foda">
                <div className="fodaBox">
                  <h3>Fortalezas</h3>
                  <ul>
                    {report.foda.strengths.map((x, i) => (
                      <li key={i}>
                        {x.text}
                        {x.evidence?.length ? (
                          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                            Evidencia: {x.evidence.join(" · ")}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="fodaBox">
                  <h3>Oportunidades</h3>
                  <ul>{report.foda.opportunities.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>

                <div className="fodaBox">
                  <h3>Debilidades</h3>
                  <ul>
                    {report.foda.weaknesses.map((x, i) => (
                      <li key={i}>
                        {x.text}
                        {x.evidence?.length ? (
                          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                            Evidencia: {x.evidence.join(" · ")}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="fodaBox">
                  <h3>Amenazas</h3>
                  <ul>{report.foda.threats.map((x, i) => <li key={i}>{x}</li>)}</ul>
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

            {/* PLAN 30 DÍAS */}
            <section className="section">
              <div className="sectionHead">
                <h2>Plan Vértice – Primeros 30 días</h2>
                <span className="muted">
                  <ClipboardList size={16} style={{ verticalAlign: "-3px" }} /> Acciones recomendadas
                </span>
              </div>

              <div className="grid2">
                <div className="panel">
                  <h3>Objetivo prioritario</h3>
                  <p className="lead">{report.plan.primaryPlan.goal}</p>
                  <div className="muted" style={{ marginTop: 8 }}>
                    Enfocado en: <b>{DIMENSIONS.find((d) => d.key === report.plan.primary)?.name}</b>
                  </div>

                  <h4 style={{ marginTop: 14, marginBottom: 8 }}>Acciones (30 días)</h4>
                  <ul className="bullets">
                    {report.plan.primaryPlan.actions.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>

                  <div className="quickwin">
                    <Badge color="green">Quick win</Badge>
                    <span>{report.plan.primaryPlan.quickWin}</span>
                  </div>
                </div>

                <div className="panel">
                  <h3>Segundo foco recomendado</h3>
                  <p className="lead">{report.plan.secondaryPlan.goal}</p>
                  <div className="muted" style={{ marginTop: 8 }}>
                    Enfocado en: <b>{DIMENSIONS.find((d) => d.key === report.plan.secondary)?.name}</b>
                  </div>

                  <h4 style={{ marginTop: 14, marginBottom: 8 }}>Acciones (30 días)</h4>
                  <ul className="bullets">
                    {report.plan.secondaryPlan.actions.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>

                  <div className="quickwin">
                    <Badge color="green">Quick win</Badge>
                    <span>{report.plan.secondaryPlan.quickWin}</span>
                  </div>
                </div>
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
                    ? "Tienes base mínima para pasar a Fase 2 (Definir foco y dirección) con mayor claridad."
                    : "Antes de definir estrategia avanzada, es clave fortalecer dimensiones críticas para reducir riesgos."}
                </p>

                <div className="decisionCtas no-print">
                  <button className="btn ghost" onClick={reset}>
                    Volver al assessment
                  </button>
                  {report.canAdvance ? (
                    <button className="btn" onClick={() => alert("Beta: aquí conectas Fase 2 cuando la construyamos.")}>
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
              <div className="muted">Diagnóstico generado por el Método Vértice 360 · Fase 1 (SaaS-ready)</div>
            </footer>
          </div>
        )}
      </main>

      <style>{css}</style>
    </div>
  );
}

// ------------------------------
// 7) CSS (demo-ready + print)
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
.company{display:flex; flex-direction:column; gap:6px; min-width:280px}
.company input{
  background: rgba(255,255,255,.04);
  border:1px solid var(--line);
  border-radius:12px;
  padding:10px 12px;
  color:var(--text);
  outline:none;
}
.company input:focus{border-color: rgba(110,168,255,.55)}

h1{margin:0 0 4px 0; font-size:22px}
h2{margin:0}
h3{margin:0 0 10px}
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
  width:34px; height:28px;
  border-radius:10px;
  display:flex; align-items:center; justify-content:center;
  border:1px solid var(--line);
  background: rgba(255,255,255,.04);
  color: var(--muted);
  font-weight:700;
}

.textWrap{display:flex; flex-direction:column; gap:6px}
.textArea{
  width:100%;
  resize:vertical;
  background: rgba(255,255,255,.04);
  border:1px solid var(--line);
  border-radius:14px;
  padding:12px;
  color: var(--text);
  outline:none;
}
.textArea:focus{border-color: rgba(110,168,255,.55)}
.textHint{font-size:12px; text-align:right}

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
  font-weight:800;
  display:inline-flex;
  align-items:center;
  gap:6px;
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
.heroHeadline{font-size:18px; font-weight:800; margin:0 0 8px}
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
.heroBoxTitle{color:var(--muted); font-weight:700}
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
.barRow{display:grid; grid-template-columns: 160px 1fr 56px; gap:10px; align-items:center}
.barLabel{color:var(--muted); font-weight:700; font-size:13px}
.barTrack{height:10px; border-radius:999px; background: rgba(255,255,255,.06); border:1px solid var(--line); overflow:hidden}
.barFill{height:100%; background: linear-gradient(90deg, rgba(110,168,255,.95), rgba(66,211,146,.85))}
.barValue{font-weight:900; text-align:right}

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
  font-weight:700;
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
.fodaBox ul{margin:0; padding-left:18px; color: var(--text); opacity:.95}
.fodaBox li{margin:10px 0}

.breaches{
  display:flex; flex-direction:column; gap:10px;
}
.breachRow{
  border:1px solid var(--line);
  border-radius:16px;
  background: rgba(255,255,255,.03);
  padding:12px;
  display:grid;
  grid-template-columns: 150px 260px 1fr;
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

/* scorecard */
.scorecard{display:flex; flex-direction:column; gap:10px}
.scoreHead{display:flex; justify-content:space-between; align-items:center}
.scoreTitle{font-weight:900}
.scoreTable{display:flex; flex-direction:column; gap:8px}
.scoreRow{
  display:grid;
  grid-template-columns: 1.2fr .6fr .6fr 1fr;
  gap:10px;
  align-items:center;
  padding:10px;
  border:1px solid var(--line);
  border-radius:14px;
  background: rgba(0,0,0,.08);
}
.scoreRowHead{
  background: rgba(255,255,255,.02);
  font-size:12px;
  color: var(--muted);
  font-weight:800;
}
.scoreDim{font-weight:900}
.scoreLvl{font-weight:900}
.scoreRisk{display:flex; justify-content:flex-start}
.scoreImpact{font-size:13px}

/* evidence */
.evidence{display:flex; flex-direction:column; gap:10px}
.evidenceRow{
  display:grid;
  grid-template-columns: 220px 1fr;
  gap:10px;
  padding:10px;
  border:1px solid var(--line);
  border-radius:14px;
  background: rgba(0,0,0,.08);
}
.evidenceItems{display:flex; flex-direction:column; gap:8px}
.evidenceItem{
  display:flex; gap:8px; align-items:flex-start;
  padding:8px 10px;
  border-radius:12px;
  border:1px solid var(--line);
  background: rgba(255,255,255,.02);
}
.evidenceItem.ok{border-color: rgba(66,211,146,.25)}
.evidenceItem.no{border-color: rgba(255,90,106,.25)}

/* plan */
.bullets{margin:0; padding-left:18px}
.bullets li{margin:6px 0}
.quickwin{
  margin-top:12px;
  display:flex; gap:10px; align-items:center;
  padding:10px;
  border:1px dashed rgba(66,211,146,.45);
  border-radius:14px;
  background: rgba(66,211,146,.06);
}

/* Responsive */
@media (max-width: 980px){
  .reportHero{grid-template-columns: 1fr}
  .grid2{grid-template-columns: 1fr}
  .cards3{grid-template-columns: 1fr}
  .foda{grid-template-columns: 1fr}
  .breachRow{grid-template-columns: 1fr; gap:6px}
  .company{min-width: 200px}
  .scoreRow{grid-template-columns: 1fr; gap:6px}
  .evidenceRow{grid-template-columns: 1fr; gap:10px}
}

/* PRINT */
@media print{
  body{background: #fff; color:#111}
  .no-print{display:none !important}
  .reportHero,.section{box-shadow:none; background:#fff; border:1px solid #ddd}
  .panel,.painCard,.fodaBox,.breachRow,.heroBox,.scoreRow,.evidenceRow,.evidenceItem{background:#fff; border:1px solid #ddd}
  .muted{color:#444}
  .badge{border-color:#ccc}
  .badge.blue,.badge.green,.badge.yellow,.badge.orange,.badge.red{background:#f5f5f5; color:#111}
  .progressWrap,.progressBar{display:none}
}
`;
