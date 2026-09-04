/**
 * Inventory of Tinker / Inkling / Roboflow as they exist in THIS Cursor setup
 * (2026-09-01 cloud-agent session). Not a live probe — the SPA does not speak MCP.
 *
 * Roboflow: MCP namespace `Roboflow` is ready. Read-only list showed PraxisOS
 * foot-scanner projects, 0 trained models, 0 devices. No write/destructive calls.
 *
 * Tinker: Thinking Machines Lab LoRA training API (`TINKER_API_KEY`, Python
 * ServiceClient). No MCP server and no plugin skill in this environment.
 *
 * Inkling: Thinking Machines Lab multimodal open model (Hugging Face weights,
 * Tinker same-day fine-tune). HuggingFace-skills MCP is registered but needsAuth.
 * No Inkling MCP/skill. Project Bonsai's teaching language is NOT what Drive
 * intel in this setup describes — do not treat Inkling as a hosted Bonsai runtime.
 */

export type SetupPresence = 'mcp_ready' | 'mcp_needs_auth' | 'absent';

export interface ProductInventory {
  id: 'roboflow' | 'inkling' | 'tinker';
  product: string;
  vendor: string;
  presence: SetupPresence;
  role: string;
  note: string;
}

export const SETUP_INVENTORY: readonly ProductInventory[] = [
  {
    id: 'roboflow',
    product: 'Roboflow',
    vendor: 'Roboflow',
    presence: 'mcp_ready',
    role: 'Vision observations for S-Agent vision.infer',
    note: 'MCP live. Workspace snapshot: praxisos, praxisos-foot-candidates, praxisos-foot-seg; 0 trained models; 0 devices.',
  },
  {
    id: 'inkling',
    product: 'Inkling',
    vendor: 'Thinking Machines Lab',
    presence: 'mcp_needs_auth',
    role: 'Prime Agent policy brain (untrained until Tinker weights exist)',
    note: 'No Inkling MCP/skill. HuggingFace-skills namespace needsAuth. Weights URI attaches the live client.',
  },
  {
    id: 'tinker',
    product: 'Tinker',
    vendor: 'Thinking Machines Lab',
    presence: 'absent',
    role: 'Fine-tune backend; Prime trajectories are the dataset',
    note: 'No Tinker MCP/skill. Python ServiceClient / TINKER_API_KEY. Kernel records job intent until a worker is attached.',
  },
] as const;
