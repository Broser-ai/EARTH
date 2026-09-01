import { canonicalJson, sha256Hex } from '../crypto/sha256.ts';
import type {
  AgentOpinion,
  CompassPillar,
  CompassVerdict,
  EarthCtx,
  ProposedAction,
} from '../types.ts';
import { assertNever } from '../types.ts';

export type CompassAgentId = CompassPillar;

export interface CompassAgent {
  id: CompassAgentId;
  evaluate(action: ProposedAction, ctx: EarthCtx): AgentOpinion;
}

function num(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function str(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' ? value : undefined;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export class SovereigntyAgent implements CompassAgent {
  readonly id = 'sovereignty' as const;

  evaluate(action: ProposedAction, ctx: EarthCtx): AgentOpinion {
    const floor = 0.5;
    const jurisdiction = str(action.payload, 'jurisdiction');
    const evidence: string[] = [];
    const constraints: string[] = [];
    let score = 0.9;

    if (jurisdiction) {
      evidence.push(`jurisdiction=${jurisdiction}`);
      if (!ctx.allowedJurisdictions.includes(jurisdiction)) {
        score = 0.2;
        constraints.push(`jurisdiction ${jurisdiction} is outside the sovereign allow-list`);
      }
    } else {
      score = 0.55;
      evidence.push('jurisdiction omitted — treated as in-region default');
    }

    const requiresHitl = action.risk === 'high' || action.risk === 'critical';
    if (requiresHitl) {
      constraints.push(`risk=${action.risk} requires human-in-the-loop`);
    }

    return { score, floor, evidence, constraints, requiresHitl };
  }
}

export class EcoAgent implements CompassAgent {
  readonly id = 'eco' as const;

  evaluate(action: ProposedAction): AgentOpinion {
    const floor = 0.4;
    const kg = num(action.payload, 'kgCO2e') ?? 0;
    const method = str(action.payload, 'method') ?? 'estimated';
    const energyKwh = num(action.payload, 'energyKwh') ?? 0;
    const pue = num(action.payload, 'pue') ?? 1.2;
    const cif = num(action.payload, 'cif') ?? 0.3;
    const wue = num(action.payload, 'wue') ?? 1;
    const inferenceKg = energyKwh * pue * cif * wue;
    const totalKg = kg + inferenceKg;

    let score = clamp01(1 - totalKg / 5000);
    if (method === 'estimated' && totalKg > 1000) {
      score = Math.min(score, 0.35);
    }

    return {
      score,
      floor,
      evidence: [
        `kgCO2e=${kg}`,
        `inference_kg=${inferenceKg.toFixed(4)} (E×PUE×CIF×WUE)`,
        `method=${method}`,
      ],
      constraints:
        method === 'estimated' && totalKg > 1000
          ? ['estimated high-impact posting requires a measured factor']
          : [],
      requiresHitl: false,
    };
  }
}

export class ComplianceAgent implements CompassAgent {
  readonly id = 'compliance' as const;

  evaluate(action: ProposedAction): AgentOpinion {
    const floor = 0.5;
    const eudr = num(action.payload, 'eudrDeforestationIndex');
    const missingFria = action.payload.missingFria === true;
    const evidence: string[] = [];
    const constraints: string[] = [];
    let score = 0.85;

    if (eudr !== undefined) {
      evidence.push(`eudrDeforestationIndex=${eudr}`);
      if (eudr > 0.05) {
        score = 0.2;
        constraints.push('EUDR deforestation index exceeds 0.05 zero-deforestation floor');
      }
    }

    if (missingFria && (action.risk === 'high' || action.risk === 'critical')) {
      score = Math.min(score, 0.3);
      constraints.push('FRIA missing for high-risk automated action');
    }

    return { score, floor, evidence, constraints, requiresHitl: false };
  }
}

export class EthicsAgent implements CompassAgent {
  readonly id = 'ethics' as const;

  evaluate(action: ProposedAction): AgentOpinion {
    const floor = 0.4;
    const labor = num(action.payload, 'laborFairness');
    const biasRisk = num(action.payload, 'biasRisk') ?? 0;
    const auditAge = num(action.payload, 'supplierAuditAgeDays') ?? 0;
    const evidence: string[] = [];
    const constraints: string[] = [];

    let score = 0.8;
    if (labor !== undefined) {
      score = labor;
      evidence.push(`laborFairness=${labor}`);
      if (labor < floor) {
        constraints.push(`labor fairness ${labor} < ${floor}`);
      }
    }

    if (biasRisk > 0.5) {
      score = Math.min(score, 1 - biasRisk);
      constraints.push(`bias risk ${biasRisk} exceeds 0.5`);
      evidence.push(`biasRisk=${biasRisk}`);
    }

    if (auditAge > 365) {
      score = Math.min(score, 0.45);
      constraints.push('supplier audit older than 365 days');
      evidence.push(`supplierAuditAgeDays=${auditAge}`);
    }

    return { score, floor, evidence, constraints, requiresHitl: score < 0.5 };
  }
}

const PILLARS: CompassAgentId[] = ['sovereignty', 'eco', 'compliance', 'ethics'];

export class CompassGate {
  constructor(
    private readonly agents: CompassAgent[] = [
      new SovereigntyAgent(),
      new EcoAgent(),
      new ComplianceAgent(),
      new EthicsAgent(),
    ],
  ) {}

  async evaluate(action: ProposedAction, ctx: EarthCtx): Promise<CompassVerdict> {
    const opinions = {
      sovereignty: this.opinion('sovereignty', action, ctx),
      eco: this.opinion('eco', action, ctx),
      compliance: this.opinion('compliance', action, ctx),
      ethics: this.opinion('ethics', action, ctx),
    };

    const conflicts: string[] = [];
    let allow = true;
    for (const pillar of PILLARS) {
      const opinion = opinions[pillar];
      if (opinion.score < opinion.floor) {
        allow = false;
        conflicts.push(`${pillar}: score ${opinion.score} < floor ${opinion.floor}`);
      }
    }

    const scores = PILLARS.map((pillar) => opinions[pillar].score);
    const spread = Math.max(...scores) - Math.min(...scores);
    if (spread > 0.4) {
      conflicts.push(`pillar spread ${spread.toFixed(2)} exceeds 0.40`);
    }

    const requiresHitl =
      action.risk === 'high' ||
      action.risk === 'critical' ||
      opinions.sovereignty.requiresHitl ||
      opinions.ethics.requiresHitl;

    const digest = await sha256Hex(
      canonicalJson({
        actionId: action.id,
        allow,
        requiresHitl,
        scores: {
          sovereignty: opinions.sovereignty.score,
          eco: opinions.eco.score,
          compliance: opinions.compliance.score,
          ethics: opinions.ethics.score,
        },
      }),
    );

    return { allow, opinions, conflicts, requiresHitl, digest };
  }

  private opinion(id: CompassAgentId, action: ProposedAction, ctx: EarthCtx): AgentOpinion {
    const agent = this.agents.find((item) => item.id === id);
    if (!agent) {
      throw new Error(`COMPASS pillar missing: ${id}`);
    }
    switch (id) {
      case 'sovereignty':
      case 'eco':
      case 'compliance':
      case 'ethics':
        return agent.evaluate(action, ctx);
      default:
        return assertNever(id, 'unhandled COMPASS pillar');
    }
  }
}
