export type LiabilityMethod = 'measured' | 'calculated' | 'estimated';
export type GhgScope = 'scope1' | 'scope2' | 'scope3';

export interface ELiabilityNode {
  id: string;
  kgCO2e: number;
  sourceEventId: string;
  method: LiabilityMethod;
  scope: GhgScope;
  label: string;
  csrdCode: string;
}

export interface CarbonSpineView {
  totalTCO2e: number;
  scope1: number;
  scope2: number;
  scope3: number;
  posts: ELiabilityNode[];
}

export interface CsrdSpineView {
  totalTCO2e: number;
  datapoint: string;
  sourceEventIds: string[];
}

export interface AuditSpineRow {
  id: string;
  sourceEventId: string;
  label: string;
  tCO2e: number;
  method: LiabilityMethod;
  scope: GhgScope;
}

export interface AuditSpineView {
  totalTCO2e: number;
  rows: AuditSpineRow[];
}

function tonnes(kg: number): number {
  return Math.round(kg / 1000);
}

export class ELiabilityGraph {
  private readonly nodes: ELiabilityNode[] = [];

  post(input: Omit<ELiabilityNode, 'id'> & { id?: string }): ELiabilityNode {
    const node: ELiabilityNode = {
      id: input.id ?? `el-${this.nodes.length.toString().padStart(4, '0')}`,
      kgCO2e: input.kgCO2e,
      sourceEventId: input.sourceEventId,
      method: input.method,
      scope: input.scope,
      label: input.label,
      csrdCode: input.csrdCode,
    };
    this.nodes.push(node);
    return node;
  }

  totalKgCO2e(): number {
    return this.nodes.reduce((sum, node) => sum + node.kgCO2e, 0);
  }

  totalTCO2e(): number {
    return tonnes(this.totalKgCO2e());
  }

  asCarbonView(): CarbonSpineView {
    const posts = [...this.nodes];
    const scope1 = tonnes(sumScope(posts, 'scope1'));
    const scope2 = tonnes(sumScope(posts, 'scope2'));
    const scope3 = tonnes(sumScope(posts, 'scope3'));
    return {
      totalTCO2e: scope1 + scope2 + scope3,
      scope1,
      scope2,
      scope3,
      posts,
    };
  }

  asCsrdView(): CsrdSpineView {
    const carbon = this.asCarbonView();
    return {
      totalTCO2e: carbon.totalTCO2e,
      datapoint: 'E1-6',
      sourceEventIds: carbon.posts.map((post) => post.sourceEventId),
    };
  }

  asAuditView(): AuditSpineView {
    const carbon = this.asCarbonView();
    return {
      totalTCO2e: carbon.totalTCO2e,
      rows: carbon.posts.map((post) => ({
        id: post.id,
        sourceEventId: post.sourceEventId,
        label: post.label,
        tCO2e: tonnes(post.kgCO2e),
        method: post.method,
        scope: post.scope,
      })),
    };
  }
}

function sumScope(posts: ELiabilityNode[], scope: GhgScope): number {
  return posts.filter((post) => post.scope === scope).reduce((sum, post) => sum + post.kgCO2e, 0);
}
