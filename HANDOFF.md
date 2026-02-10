# L.E.G.E.N.D.S. Dynasty League Hub — Handoff Document

**Date**: February 10, 2026
**Project**: Fantasy football dynasty league hub for the L.E.G.E.N.D.S. (League of Extraordinary Gentlemen Excelling in NFL Dynasty Success) 10-team Superflex TE-Premium dynasty league on Sleeper.

---

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 (CSS-based config with `@theme inline` in `globals.css`, NOT `tailwind.config.ts`)
- **Deployment**: Vercel (auto-deploys from GitHub `main` branch)
- **Data Source**: Sleeper Public API (read-only, no auth, base: `https://api.sleeper.app/v1`)
- **Caching**: ISR with `revalidate = 300` on server components; in-memory player cache with 24hr TTL

**Live site**: https://legends-league-hub.vercel.app
**Repo**: https://github.com/sherwinvassigh/legends-league-hub
**Project root**: `/Users/sherwinvassigh/Documents/Claude Code/League Page/legends-league-hub`

---

## League Info

- **League IDs** (chained via `previous_league_id`):
  - 2023: `917492438267305984` (startup, 25 rounds)
  - 2024: `1048246044892524544` (complete)
  - 2025: `1180278386412273664` (complete)
  - 2026: `1313306806897881088` (current, status: `pre_draft`)
- **Config**: `src/lib/config.ts` → `LEAGUE_CONFIG.leagueId = "1313306806897881088"`
- **Format**: 10-team Superflex, TE-Premium, 4-round rookie drafts, 6-team playoffs

---

## Git State (as of handoff)

- **Branch**: `main`, up to date with `origin/main`
- **Last commit on remote**: `6a23d44` — "Polish UI across all pages: banner hero, advanced stats, Sleeper avatars"
- **Uncommitted changes** (IMPORTANT — these are staged Phase 2 work, NOT pushed):
  - **Modified**:
    - `src/app/page.tsx` — Homepage rewrite with dynamic season phase content, banner fix, milestones
    - `src/app/transactions/page.tsx` — Added search functionality (search by player/manager name)
  - **New files (untracked)**:
    - `src/lib/config/milestones.ts` — Static key dates from constitution
    - `src/lib/utils/power-rankings.ts` — Full analytics engine (xWin%, Luck Index, SOS, Efficiency, Consistency, Power Score, composite rankings)
    - `src/lib/utils/acquisition.ts` — Player acquisition tracker (drafted/traded/waiver/FA)
    - `src/lib/utils/draft-picks.ts` — Draft pick ownership resolver for future picks
    - `src/lib/utils/position-age.ts` — Position age averages (team vs league)
    - `src/lib/utils/records.ts` — Historical records calculator (all-time standings, league records, H2H, season awards, champion history)
- **TypeScript**: `npx tsc --noEmit` passes clean with all uncommitted changes
- **Build**: Has NOT been run with the uncommitted changes yet

---

## What's DONE (Phase 1 + Phase 2 partial)

### Phase 1 (fully deployed on Vercel):
All core pages built and polished:
- Homepage, Standings, Rosters (list + detail), Matchups, Activity/Transactions, Dues, Rules
- Season selector (switches between 2023-2026)
- Responsive design (mobile bottom tab bar, hamburger menu)
- Sleeper avatars throughout
- Premium design with navy/steel color scheme

### Phase 2 (in progress, uncommitted locally):

**COMPLETED — utility files (all TypeScript-clean):**
1. `src/lib/utils/power-rankings.ts` — Central analytics engine with:
   - `computeAllPlayRecord`, `computeXWinPct`, `computeLuckIndex`
   - `computeStrengthOfSchedule`, `computeAllSOS`
   - `computeEfficiency`, `computeConsistency`, `computeRecentForm`
   - `computeMedianRecord`, `computePowerScore`
   - `computeLeaguePowerRankings` (main orchestrator — takes rosters/users/matchups → full ranked output)
   - Composite: 30% avg PF + 20% xWin% + 15% recent form + 15% efficiency + 10% consistency + 10% SOS
   - Tiers: contender (top 3), bubble (4-7), rebuilding (8-10)

2. `src/lib/utils/acquisition.ts` — `buildAcquisitionMap(leagueId, rosterId, playerIds, rosterIdToName?)` → `Map<string, AcquisitionInfo>`
   - Sources: drafted, traded, waiver, free_agent, commissioner, unknown
   - Details: "Rd 1.03 (2023 Startup)", "from sherstar", "$15 FAAB"

3. `src/lib/utils/draft-picks.ts` — `resolveDraftPickOwnership(leagueId, rosters, seasons[], maxRounds)` + `computePickCapital(picks, rosterIds)`
   - Status: owns_own | acquired | traded_away
   - ownsOwnFirst flag per team

4. `src/lib/utils/records.ts` — Full historical records:
   - `computeAllTimeStandings`, `computeLeagueRecords`, `computeHeadToHead`
   - `computeSeasonAwards`, `computeChampionHistory`, `pairMatchups`

5. `src/lib/utils/position-age.ts` — `computePositionAgeAverages(rosterPlayerIds, allRosters, players)`

**COMPLETED — page changes (uncommitted):**
6. `src/app/page.tsx` — Homepage rewrite:
   - Banner is now a short visual hero with NO overlay text
   - League info + stat pills moved below banner
   - Dynamic season phase: offseason (champion + milestones + standings), in-season (matchups + league pulse), drafting (draft status)
   - Key milestones card from `src/lib/config/milestones.ts`

7. `src/app/transactions/page.tsx` — Added search:
   - Search input above filter tabs
   - Filters by player name or manager name (case-insensitive)
   - Match count display + clear button

---

## What NEEDS to Be Built — 10 Remaining Tasks

### Task 1: Enhanced Roster Detail Page
**Modify**: `src/app/rosters/[rosterId]/page.tsx`
- Add SVG sparkline (replace CSS bar chart)
- Add acquisition badges (green=Drafted, blue=Traded, orange=Waiver, gray=FA) next to each player
- Add Position Age Averages card (team vs league avg per position)
- Expand advanced stats grid from 8 → 12 cells: add xWin%, Luck Index, Efficiency, SOS w/ rank
- Import from the new utility files (power-rankings, acquisition, position-age)
- **NOTE**: A full rewrite was prepared but NOT written due to a file-read prerequisite error. The plan file has the complete spec.

### Task 2: Draft Recap Page
**New file**: `src/app/draft/page.tsx`
- Client component with season/draft selector
- Color-coded grid: columns = draft slots (teams), rows = rounds
- Cell: player name + position badge, background tinted by position color (QB=red, RB=green, WR=blue, TE=purple)
- Uses `getLeagueDrafts()`, `getDraftPicks()` from `src/lib/sleeper/drafts.ts`
- Detect startup (25 rounds) vs rookie (4 rounds) drafts
- Summary: picks-by-position breakdown

### Task 3: Future Draft Pick Tracker
**New file**: `src/app/draft-picks/page.tsx`
- Server component with ISR
- Table: rows = 10 teams, columns = Rd 1-4 × next 3 seasons
- Color coding: green=owns own, blue=acquired, red=traded away
- "Owns Own 1st" badge per team
- Uses `resolveDraftPickOwnership()` and `computePickCapital()` from `src/lib/utils/draft-picks.ts`

### Task 4: Dedicated Playoffs Page
**New file**: `src/app/playoffs/page.tsx`
- Client component with season selector
- Visual tournament bracket with CSS connecting lines
- Winners bracket: QF → SF → Championship + 3rd place
- Consolation bracket below
- Championship: gold border + trophy icon. 3rd place: bronze styling
- Champion callout at top
- Uses `buildBracketDisplay()` from `src/lib/utils/brackets.ts`

### Task 5: Power Rankings Page
**New file**: `src/app/power-rankings/page.tsx`
- Server component with ISR
- Summary callouts: Luckiest, Unluckiest, Most Consistent, Most Volatile, Hardest/Easiest Schedule
- Ranked list 1-10: rank, avatar, team name, PowerScore, tier badge (Contender/Bubble/Rebuilding)
- Stacked horizontal breakdown bar (6 components)
- Expandable detail per team with full metrics
- Uses `computeLeaguePowerRankings()` from `src/lib/utils/power-rankings.ts`

### Task 6: Historical Records & Trophy Vault
**New file**: `src/app/records/page.tsx`
- Client component with 5 tabs: Trophy Vault, All-Time Standings, League Records, Season Awards, H2H Lookup
- Uses all functions from `src/lib/utils/records.ts`
- Uses `getLeagueHistory()` to walk league chain across all seasons
- Trophy Vault: gold cards with champion per season
- H2H Lookup: two dropdown selects → series record + matchup history

### Task 7: Design Consistency — Standings
**Modify**: `src/app/standings/page.tsx`
- Remove bracket display (brackets now live on `/playoffs`)
- Replace with link to `/playoffs`
- Ensure consistent card styles with rest of site

### Task 8: Design Consistency — Matchups
**Modify**: `src/app/matchups/page.tsx`
- Audit for full-width elements
- Ensure consistent card styles, spacing, and layout

### Task 9: Global Search Component
**New file**: `src/components/search/GlobalSearch.tsx`
- Cmd+K style modal
- Client component, preloads players + managers
- Real-time filtering, grouped results (Players / Managers)
- Click-through to `/rosters/{rosterId}`

### Task 10: Navigation Updates
**Modify**: `src/components/layout/Navigation.tsx`
- Add new pages: Draft, Draft Picks, Playoffs, Power Rankings, Records
- Group into dropdowns: "League" (Standings, Rosters, Matchups), "History" (Draft, Draft Picks, Playoffs, Records), "Tools" (Power Rankings, Activity, Rules, Dues)
- Add search trigger icon → opens GlobalSearch modal
- Mobile: update hamburger menu + bottom tab bar

### Final Steps:
- Run `npx tsc --noEmit` — must pass clean
- Run `npm run build` — expect benign 18MB player cache warning
- Git commit all changes + push to main → auto-deploys to Vercel

---

## File Architecture Reference

```
src/
├── app/
│   ├── page.tsx                    # Homepage (MODIFIED - uncommitted)
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Tailwind v4 theme
│   ├── standings/page.tsx          # Standings (needs bracket removal)
│   ├── rosters/
│   │   ├── page.tsx                # Roster list
│   │   └── [rosterId]/page.tsx     # Roster detail (needs enhancement)
│   ├── matchups/page.tsx           # Matchups (needs consistency pass)
│   ├── transactions/page.tsx       # Activity (MODIFIED - search added)
│   ├── dues/page.tsx               # Dues
│   ├── rules/page.tsx              # Rules
│   ├── draft/page.tsx              # ❌ DOES NOT EXIST YET
│   ├── draft-picks/page.tsx        # ❌ DOES NOT EXIST YET
│   ├── playoffs/page.tsx           # ❌ DOES NOT EXIST YET
│   ├── power-rankings/page.tsx     # ❌ DOES NOT EXIST YET
│   └── records/page.tsx            # ❌ DOES NOT EXIST YET
├── components/
│   ├── SeasonProvider.tsx           # Season context (league chain discovery)
│   ├── layout/
│   │   ├── Navigation.tsx           # Nav (needs update for new pages)
│   │   └── Footer.tsx
│   ├── search/
│   │   └── GlobalSearch.tsx         # ❌ DOES NOT EXIST YET
│   └── ui/
│       ├── Card.tsx, Badge.tsx, PositionBadge, PageHeader, Skeleton
│       └── index.ts
├── lib/
│   ├── config.ts                    # LEAGUE_CONFIG
│   ├── config/
│   │   ├── dues.ts                  # Manual dues data
│   │   └── milestones.ts            # NEW - key dates (uncommitted)
│   ├── seasons.ts
│   ├── sleeper/
│   │   ├── api.ts                   # sleeperFetch with caching
│   │   ├── league.ts                # getLeague, getUsers, getRosters, getTradedPicks, getWinnersBracket, getLosersBracket
│   │   ├── matchups.ts              # getMatchups
│   │   ├── transactions.ts          # getTransactions, getAllTransactions
│   │   ├── drafts.ts                # getLeagueDrafts, getDraftPicks
│   │   ├── players.ts               # getPlayers (18MB cache), getPlayerName, getPlayerInfo
│   │   ├── history.ts               # getLeagueHistory (walks league chain), getLeagueIdForSeason
│   │   ├── types.ts                 # All TypeScript interfaces
│   │   └── index.ts                 # Re-exports everything
│   └── utils/
│       ├── standings.ts             # buildStandings, getSleeperAvatarUrl
│       ├── brackets.ts              # resolveBracketPlacements, buildBracketDisplay, getChampionRosterId, getRunnerUpRosterId
│       ├── power-rankings.ts        # NEW - full analytics engine (uncommitted)
│       ├── acquisition.ts           # NEW - player acquisition tracker (uncommitted)
│       ├── draft-picks.ts           # NEW - pick ownership resolver (uncommitted)
│       ├── position-age.ts          # NEW - position age calculator (uncommitted)
│       └── records.ts               # NEW - historical records (uncommitted)
```

---

## Design System Quick Reference

- **Colors**: navy (`text-navy`/`bg-navy`), steel (`text-steel`), surface (`bg-surface` = light gray)
- **Text**: `text-text-primary`, `text-text-secondary`, `text-text-muted`
- **Borders**: `border-border`, `border-border-light`
- **Cards**: Use `<Card>` component — white, rounded-2xl, border, shadow-sm
- **Headers**: Use `<PageHeader title="..." subtitle="...">` component
- **Position badges**: Use `<PositionBadge position="QB" />` component
- **Animations**: `animate-in fade-in` with stagger using `style={{ animationDelay: '100ms' }}`
- **Layout**: `max-w-7xl mx-auto` container, `mb-6` spacing between cards
- **Fonts**: `font-extrabold` for key numbers, `font-semibold` for labels, `text-[10px]` for small labels

---

## Key Patterns

**getDataLeagueId() pattern** — Used on every page to handle pre_draft status:
```typescript
async function getDataLeagueId(): Promise<string> {
  const league = await getLeague(LEAGUE_CONFIG.leagueId);
  if (league.status === "pre_draft" && league.previous_league_id) {
    return league.previous_league_id;
  }
  return league.league_id;
}
```

**Sleeper avatar URL**: `getSleeperAvatarUrl(user.avatar)` from `src/lib/utils/standings.ts`

**Season context**: `useSeasonContext()` from `src/components/SeasonProvider.tsx` — provides `seasons`, `currentSeason`, `setCurrentSeason`

---

## Detailed Plan File

A comprehensive implementation plan with full specs for every remaining task is at:
`/Users/sherwinvassigh/.claude/plans/squishy-marinating-catmull.md`

---

## Important Notes

1. **Tailwind v4**: Config is CSS-based (`@theme inline` in `globals.css`), NOT `tailwind.config.ts`. Custom colors (navy, steel, surface, text-primary, etc.) are defined there.
2. **Sleeper player database**: ~18MB, cached in-memory with 24hr TTL. Build will show a benign warning about this.
3. **TypeScript circular inference**: If using `while` loops with `await`, explicitly type variables to avoid TS inference issues.
4. **The user wants**: "I really want to show everything shown on Sleeper Companion, across all pages, on our own site." The power-rankings utility was designed to replicate those analytics.
5. **All 6 new utility files pass TypeScript** — they've been tested with `npx tsc --noEmit`.
6. **None of the 5 new pages exist yet** — Draft, Draft Picks, Playoffs, Power Rankings, Records all need to be created from scratch.
7. **The roster detail page was NOT modified** — the enhancement was prepared but the write failed. It still has the original Phase 1 code.
