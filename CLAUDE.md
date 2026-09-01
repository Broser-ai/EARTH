# EARTH — Sovereign Autonomous Systems

> EARTH er en **standalone** app. Den er IKKE Cirkel, deler IKKE kode med cirkel-system,
> og skal have sin EGEN visuelle identitet.

## Visuelt DNA — EARTH ≠ Cirkel

| Dimension | Cirkel (BRUG IKKE) | EARTH |
|-----------|-------------------|-------|
| Sidebar bg | `#0B3D2E` (skov-grøn) | **Ingen sidebar** — top command bar |
| Accent | `#C8F24A` (lime) | `#60A5FA` (electric blue) |
| Secondary | `#2DD4A0` (teal) | `#F59E0B` (amber/warning) |
| Ground | hvid/mørk split | `#060B18` (deep space) — dark-first |
| Cards | `rounded-xl border-gray-200 bg-white` | `rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur` |
| Type display | system sans-serif | `JetBrains Mono` (monospace, mission control) |
| Type body | system sans-serif | `Inter` (clean sans) |
| Layout | 264px sidebar + scroll content | Full-width command grid, top nav rail |
| Feel | ESG compliance portal | **NASA mission control / war room** |

## Tech Stack
- React 19 + Vite 6 + TypeScript
- Tailwind CSS v4
- `motion/react` for animation (IKKE framer-motion)
- `lucide-react` for ikoner
- `clsx` for conditional classes
- **INGEN Recharts** (brug custom SVG/Canvas)

## Regler
1. ALDRIG importer fra cirkel-system
2. Alle sovereign moduler genskrives med EARTH-identitet
3. Dark-first design — light mode er sekundær
4. Monospace for data, sans for navigation
5. Amber = warning/critical, Blue = active/healthy, Green = success kun som status-farve
6. Port: 5180

## Governance
- Intet udføres uden Michaels accept
- Commit aldrig hemmeligheder
- `tsc --noEmit` SKAL passe før noget erklæres færdigt
