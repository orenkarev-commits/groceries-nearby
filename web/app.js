// The app screen ("Mix", chosen 14 Nov 2026): a receipt for building the list (no prices on the lines),
// the top 3 shops as race cards beside it, and the neighbourhood map below them.
(function () {
  const CSS = `
.v4 { --counter: #E4E8E5; --paper: #FFFFFF; --ink: #1B2420; --muted: #66726C; --rule: #CBD3CE; --leaf: #1D7449; --leaf-soft: #E4F2E9; --ring: #1D7449;
  --card: #FFFFFF; --line: #D7DED8; --gold: #F2B705;
  background: var(--counter); color: var(--ink); min-height: 100dvh; padding: calc(env(safe-area-inset-top) + 28px) 16px calc(env(safe-area-inset-bottom) + 48px);
  background-image: radial-gradient(rgba(0,0,0,.035) 1px, transparent 1px); background-size: 6px 6px; }
.v4 .layout { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 440px) minmax(0, 1fr); gap: 36px; align-items: start; }
@media (max-width: 920px) { .v4 .layout { grid-template-columns: minmax(0, 1fr); gap: 26px; } }

/* ---------- receipt: builds the list, no prices on the lines ---------- */
.v4 .slot { height: 14px; border-radius: 8px; background: #2A332F; box-shadow: inset 0 3px 6px rgba(0,0,0,.5); margin: 0 -10px; position: relative; z-index: 2; }
.v4 .receipt { position: relative; z-index: 1; margin: -7px 6px 12px; background: var(--paper); color: var(--ink); padding: 26px 24px 30px; font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 14px; box-shadow: 0 18px 30px -22px rgba(0,0,0,.5); }
.v4 .receipt::after { content: ""; position: absolute; left: 0; right: 0; bottom: -12px; height: 12px; background: conic-gradient(from 135deg at top, var(--paper) 90deg, #0000 0) top / 16px 12px repeat-x; }
.v4 .receipt[data-enter] { animation: v4print 520ms cubic-bezier(0.23, 1, 0.32, 1) both; }
@keyframes v4print { from { transform: translateY(-40px); clip-path: inset(0 0 100% 0); } to { transform: translateY(0); clip-path: inset(0 0 -20px 0); } }
.v4 .r-head { text-align: center; }
.v4 .r-title { font-family: Rubik, sans-serif; font-weight: 700; font-size: 22px; letter-spacing: -.01em; }
.v4 .r-meta { color: var(--muted); font-size: 12px; margin-top: 4px; }
.v4 .dash { border: 0; border-top: 1.5px dashed var(--rule); margin: 16px 0; }
.v4 .cmp-input { font-family: inherit; font-size: 16px; border: 0; border-bottom: 1.5px solid var(--ink); background: transparent; padding: 8px 2px 8px 22px; outline: none; border-radius: 0; }
.v4 .cmp-input::placeholder { color: #9AA59F; }
.v4 .cmp-box::before { content: "+"; position: absolute; left: 2px; top: 7px; font-weight: 600; color: var(--leaf); font-size: 18px; }
.v4 .cmp-pop { background: #fff; border: 1px solid var(--rule); border-radius: 12px; box-shadow: 0 24px 50px -24px rgba(0,0,0,.45); font-family: Rubik, sans-serif; color: var(--ink); }
.v4 .cmp-pop .sg-side { display: none; }              /* build the list first: no prices while choosing */
.v4 .sg[aria-selected="true"] { background: var(--leaf-soft); }
.v4 .sg-kind { color: var(--leaf); }
.v4 .ideas { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; font-family: Rubik, sans-serif; }
.v4 .idea { border: 1px dashed var(--rule); background: none; border-radius: 6px; padding: 3px 9px; font-size: 13px; color: var(--muted); transition: transform 160ms cubic-bezier(0.23,1,0.32,1), border-color 160ms ease, color 160ms ease; }
@media (hover: hover) and (pointer: fine) { .v4 .idea:hover { border-color: var(--leaf); color: var(--leaf); } }
.v4 .idea:active { transform: scale(0.97); }
.v4 .lines { list-style: none; padding: 0; margin: 4px 0 0; }
.v4 .ln { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 2px 10px; padding: 9px 0; align-items: center; position: relative; }
.v4 .ln[data-new] { animation: v4line 260ms cubic-bezier(0.23, 1, 0.32, 1) both; }
@keyframes v4line { from { clip-path: inset(0 0 100% 0); transform: translateY(-6px); } to { clip-path: inset(0 0 0 0); transform: none; } }
.v4 .ln .q { color: var(--muted); }
.v4 .ln .nm { font-weight: 600; font-family: Rubik, sans-serif; font-size: 15px; overflow-wrap: anywhere; }
.v4 .ln .he { font-family: Rubik, sans-serif; font-size: 13px; color: var(--muted); display: block; overflow-wrap: anywhere; }
.v4 .ln .exact { font-family: Rubik, sans-serif; font-size: 11px; color: var(--leaf); display: block; }
.v4 .pickbtn { display: block; margin-top: 3px; border: 0; background: none; padding: 0; font-family: Rubik, sans-serif; font-size: 12px; color: var(--leaf); text-decoration: underline dotted; text-underline-offset: 3px; }
.v4 .chooser { grid-column: 2 / -1; margin-top: 6px; border: 1px dashed var(--rule); border-radius: 10px; padding: 6px; display: grid; gap: 2px; font-family: Rubik, sans-serif;
  animation: v4chooser 200ms cubic-bezier(0.23,1,0.32,1) both; }
@keyframes v4chooser { from { opacity: 0; transform: translateY(-4px); } }
.v4 .ch-head, .v4 .ch-empty { margin: 2px 6px 4px; font-size: 12px; color: var(--muted); }
.v4 .ch-it { display: grid; gap: 1px; text-align: right; border: 0; background: none; padding: 7px 8px; border-radius: 8px; color: var(--ink); transition: background-color 160ms ease, transform 160ms cubic-bezier(0.23,1,0.32,1); }
.v4 .ch-it:active { transform: scale(0.98); }
@media (hover: hover) and (pointer: fine) { .v4 .ch-it:hover { background: var(--leaf-soft); } }
.v4 .ch-he { font-size: 14px; font-weight: 500; }
.v4 .ch-en { font-size: 12px; color: var(--muted); text-align: left; }
.v4 .tools { display: flex; gap: 3px; }
.v4 .tb { border: 1px solid var(--rule); background: var(--paper); width: 28px; height: 28px; border-radius: 6px; font-family: Rubik, sans-serif; color: var(--ink); transition: transform 160ms cubic-bezier(0.23,1,0.32,1), border-color 160ms ease; }
@media (hover: hover) and (pointer: fine) { .v4 .tb:hover { border-color: var(--ink); } }
.v4 .tb:active { transform: scale(0.94); }
.v4 .ln.strike::after { content: ""; position: absolute; left: 0; right: 90px; top: 50%; height: 1.5px; background: var(--ink); transform-origin: left; animation: v4strike 160ms cubic-bezier(0.23,1,0.32,1) both; }
@keyframes v4strike { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.v4 .ln.out { opacity: 0; transition: opacity 150ms ease; }
.v4 .empty { color: var(--muted); font-size: 13px; padding: 6px 0; }
.v4 .r-foot { display: grid; grid-template-columns: 1fr auto; gap: 4px; font-size: 13px; }
.v4 .r-foot .muted { color: var(--muted); }
.v4 .r-small { text-align: center; color: var(--muted); font-size: 11px; margin-top: 16px; }

/* ---------- right column ---------- */
.v4 .side { display: grid; gap: 18px; }
.v4 .side-head { display: flex; justify-content: space-between; align-items: end; gap: 12px; flex-wrap: wrap; }
.v4 h2 { font-family: "Bricolage Grotesque", Rubik, sans-serif; font-weight: 800; font-size: clamp(26px, 3.2vw, 34px); line-height: 1.02; letter-spacing: -.03em; margin: 0; }
.v4 .sub { color: var(--muted); font-size: 14px; margin: 6px 0 0; }
.v4 .seg { display: inline-flex; border: 1px solid var(--rule); border-radius: 999px; padding: 3px; background: var(--paper); }
.v4 .seg button { border: 0; background: none; padding: 6px 12px; border-radius: 999px; font-size: 13px; color: #5F6B65; transition: background-color 160ms ease, color 160ms ease; }
.v4 .seg button[aria-pressed="true"] { background: #1B2420; color: #fff; }
.v4 .chk { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; color: var(--muted); }
.v4 .chk input { accent-color: var(--leaf); width: 16px; height: 16px; }

/* race cards: top 3 */
.v4 .podium { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 640px) { .v4 .podium { grid-template-columns: minmax(0, 1fr); } }
.v4 .sc { position: relative; background: var(--card); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; cursor: pointer; color: var(--ink);
  transition: transform 200ms cubic-bezier(0.23,1,0.32,1), box-shadow 200ms ease; }
@media (hover: hover) and (pointer: fine) { .v4 .sc:hover { transform: translateY(-2px); box-shadow: 0 16px 30px -22px rgba(0,0,0,.5); } }
.v4 .sc:active { transform: scale(.985); }
.v4 .sc[data-deal] { animation: v4deal 340ms cubic-bezier(0.23,1,0.32,1) both; animation-delay: var(--d); }
@keyframes v4deal { from { opacity: 0; transform: translateY(14px) scale(.98); } }
.v4 .sc .band { background: var(--c); color: #fff; padding: 12px 14px 10px; display: flex; justify-content: space-between; align-items: start; gap: 6px; }
.v4 .sc.light .band { color: #1d1d1d; }
.v4 .sc .brand { font-family: "Bricolage Grotesque", Rubik, sans-serif; font-weight: 800; font-size: 21px; line-height: 1.05; letter-spacing: -.02em; }
.v4 .sc .loc { font-size: 12px; opacity: .85; margin-top: 3px; }
.v4 .sc .num { font-family: "Bricolage Grotesque", Rubik, sans-serif; font-size: 14px; font-weight: 700; background: rgba(255,255,255,.24); border-radius: 99px; min-width: 28px; height: 28px; display: grid; place-items: center; flex: none; }
.v4 .sc .crown { position: absolute; top: 11px; right: 48px; font-size: 21px; line-height: 1; filter: drop-shadow(0 3px 3px rgba(0,0,0,.25)); }
.v4 .sc .bd { padding: 10px 14px 12px; display: grid; gap: 7px; }
.v4 .sc .tot { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.v4 .sc .tot .v { font-family: "Bricolage Grotesque", Rubik, sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -.02em; }
.v4 .sc .tot .w { color: var(--muted); font-size: 12px; white-space: nowrap; }
.v4 .dots { display: flex; gap: 4px; flex-wrap: wrap; }
.v4 .dots i { width: 9px; height: 9px; border-radius: 3px; background: var(--line); }
.v4 .dots i.on { background: var(--c); }
.v4 .sc .note { font-size: 12px; color: var(--muted); }
.v4 .sc .miss { font-size: 12px; color: #B0442A; }
.v4 .sc.lead { border-color: var(--gold); box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 45%, transparent), 0 20px 40px -26px rgba(0,0,0,.5); }
.v4 .sc.sel { outline: 3px solid var(--c); outline-offset: 2px; }
.v4 .waiting { grid-column: 1 / -1; border: 1.5px dashed var(--rule); border-radius: 18px; padding: 26px 20px; color: var(--muted); text-align: center; font-size: 15px; }
/* split the shop: closed toggle + board panel */
.v4 .split:empty { display: none; }
.v4 .split { background: var(--board, #FFFFFF); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; color: var(--ink); }
.v4 .split-toggle { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 12px; text-align: left; border: 0; background: none; padding: 14px 18px; font-size: 15px; color: inherit;
  transition: background-color 160ms ease; }
@media (hover: hover) and (pointer: fine) { .v4 .split-toggle:hover { background: var(--leaf-soft); } }
.v4 .split-toggle:active .chev { transform: scale(.9); }
.v4 .split-toggle .save { display: inline-block; margin-left: 6px; background: var(--leaf); color: #fff; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
.v4 .split-toggle .chev { font-size: 16px; color: var(--muted); transition: transform 200ms cubic-bezier(0.23,1,0.32,1); }
.v4 .split-toggle[aria-expanded="true"] .chev { transform: rotate(180deg); }
.v4 .split-panel { padding: 4px 8px 12px; border-top: 1px solid var(--line); }
.v4 .split-panel[hidden] { display: none; }
.v4 .sp-row { display: grid; grid-template-columns: 26px minmax(0, 170px) minmax(0, 1fr) auto; gap: 4px 14px; align-items: center; padding: 12px 10px; border-radius: 12px; cursor: pointer; transition: background-color 160ms ease; }
@media (hover: hover) and (pointer: fine) { .v4 .sp-row:hover { background: var(--leaf-soft); } }
.v4 .sp-row .pos { text-align: center; font-weight: 600; color: var(--muted); font-size: 17px; }
.v4 .sp-row .who b { display: block; font-size: 16px; }
.v4 .sp-row .who span { display: block; font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v4 .sp-row .bar-track { display: block; height: 12px; border-radius: 99px; background: var(--track, #EEF1EF); overflow: hidden; }
.v4 .sp-row .bar { display: block; height: 100%; width: 100%; border-radius: 99px; background: var(--c); transform-origin: left; transition: transform 320ms cubic-bezier(0.77, 0, 0.175, 1); }
.v4 .sp-row .amt { text-align: right; font-weight: 700; font-size: 17px; min-width: 78px; }
.v4 .sp-row .amt small { display: block; font-weight: 400; font-size: 12px; color: var(--muted); }
.v4 .sp-row .buy { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: 6px; }
.v4 .sp-row .bi { font-size: 12px; background: var(--counter); border-radius: 999px; padding: 2px 9px; }
.v4 .sp-row .bi em { font-style: normal; color: var(--muted); }
.v4 .sp-foot { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; padding: 12px 10px 2px; margin-top: 4px; border-top: 1px dashed var(--line); font-size: 13px; color: var(--muted); }
.v4 .sp-foot b { font-size: 20px; color: var(--ink); }
.v4 .sp-none { padding: 6px 10px 0; font-size: 12px; color: #B0442A; }
@media (max-width: 560px) { .v4 .sp-row { grid-template-columns: 22px minmax(0, 1fr) auto; } .v4 .sp-row .bar-track { grid-column: 2 / -1; grid-row: 2; } .v4 .sp-row .buy { grid-row: 3; } }

/* neighbourhood map */
.v4 .mapcard { position: relative; height: 420px; border-radius: 18px; overflow: hidden; border: 1px solid var(--rule); }
@media (max-width: 640px) { .v4 .mapcard { height: 380px; } }
.v4 .mapcard .mapel { position: absolute; inset: 0; }
.v4 .pin { transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; width: max-content; position: relative; }
.v4 .pin .hd { background: var(--c); color: #fff; font-weight: 700; font-size: 13px; padding: 6px 10px; border-radius: 12px; border: 2px solid #fff; box-shadow: 0 8px 16px -8px rgba(0,0,0,.6); display: flex; gap: 6px; align-items: center; white-space: nowrap;
  transition: transform 200ms cubic-bezier(0.23,1,0.32,1); }
.v4 .pin.light .hd { color: #1d1d1d; }
.v4 .pin .tl { width: 2px; height: 10px; background: var(--c); }
.v4 .pin .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); border: 2px solid #fff; margin-top: -1px; }
.v4 .pin .px { background: rgba(255,255,255,.95); color: #15201B; border-radius: 7px; padding: 1px 6px; font-size: 12px; }
.v4 .pin .md { position: absolute; top: -14px; right: -12px; font-size: 18px; filter: drop-shadow(0 2px 2px rgba(0,0,0,.3)); }
.v4 .pin.small .hd { padding: 4px 7px; font-size: 11px; }
.v4 .pin.nop .hd { background: rgba(255,255,255,.92); color: #7f8a84; border: 2px dashed #9aa59f; box-shadow: none; }
.v4 .pin.nop .tl, .v4 .pin.nop .dot { background: #9aa59f; }
.v4 .pin.sel .hd { transform: scale(1.15); }
.v4 .pin[data-drop] { animation: v4drop 360ms cubic-bezier(0.23,1,0.32,1) both; animation-delay: var(--d); }
@keyframes v4drop { from { opacity: 0; transform: translate(-50%, -100%) translateY(-14px); } to { opacity: 1; transform: translate(-50%, -100%); } }
.v4 .md.pop { animation: v4pop 220ms cubic-bezier(0.23,1,0.32,1); }
@keyframes v4pop { from { transform: scale(.7); } to { transform: scale(1); } }
.v4 .shopcard { position: absolute; z-index: 950; left: 12px; right: 12px; bottom: 12px; background: rgba(255,255,255,.94); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
  border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; box-shadow: 0 18px 40px -18px rgba(0,0,0,.5); color: #15201B;
  transition: transform 240ms cubic-bezier(0.23,1,0.32,1), opacity 240ms cubic-bezier(0.23,1,0.32,1); }
.v4 .shopcard[data-state="closed"] { opacity: 0; transform: translateY(12px) scale(.98); pointer-events: none; transition-duration: 160ms; }
.v4 .shopcard .cb { font-weight: 800; font-size: 18px; display: flex; align-items: center; gap: 8px; } .v4 .shopcard .cb i { width: 12px; height: 12px; border-radius: 3px; background: var(--c); }
.v4 .shopcard .x { position: absolute; right: 6px; top: 6px; border: 0; background: none; width: 32px; height: 32px; font-size: 20px; color: #66726C; }
.v4 .shopcard .muted { color: #66726C; font-size: 13px; }
.v4 .shopcard .tt { margin-top: 6px; font-size: 14px; }
.v4 .shopcard a { display: inline-block; margin-top: 8px; background: #1D7449; color: #fff; text-decoration: none; padding: 7px 14px; border-radius: 999px; font-size: 14px; transition: transform 160ms cubic-bezier(0.23,1,0.32,1); }
.v4 .shopcard a:active { transform: scale(.97); }

/* actions, tools, toast */
.v4 .acts { display: flex; gap: 6px; }
.v4 .act { border: 1px solid var(--rule); background: var(--paper); color: var(--ink); border-radius: 999px; padding: 6px 12px; font-size: 13px; text-decoration: none; display: inline-flex; align-items: center;
  transition: transform 160ms cubic-bezier(0.23,1,0.32,1), border-color 160ms ease; }
.v4 .act.primary { background: var(--leaf); border-color: var(--leaf); color: #fff; }
.v4 .act:active { transform: scale(0.97); } .v4 .act:disabled { opacity: .55; }
@media (hover: hover) and (pointer: fine) { .v4 .act:hover { border-color: var(--ink); } }
.v4 .extras { display: grid; gap: 10px; }
.v4 details.tool { background: var(--card); border: 1px solid var(--line); border-radius: 14px; color: var(--ink); }
.v4 details.tool > summary { list-style: none; cursor: pointer; padding: 13px 16px; display: flex; justify-content: space-between; align-items: center; font-weight: 500; font-size: 15px; }
.v4 details.tool > summary::-webkit-details-marker { display: none; }
.v4 details.tool > summary::after { content: "+"; font-size: 20px; color: var(--muted); transition: transform 200ms cubic-bezier(0.23,1,0.32,1); }
.v4 details.tool[open] > summary::after { transform: rotate(45deg); }
.v4 .tool-body { padding: 0 16px 16px; font-size: 14px; }
.v4 .tool-body .muted { color: var(--muted); }
.v4 .tr-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
@media (max-width: 560px) { .v4 .tr-row { grid-template-columns: minmax(0, 1fr); } }
.v4 .trIn, .v4 .trOut { width: 100%; min-height: 80px; padding: 10px 12px; font: inherit; font-size: 16px; border-radius: 10px; border: 1px solid var(--line); background: transparent; color: inherit; resize: vertical; white-space: pre-wrap; }
.v4 .trOut .from { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.v4 .tr-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.v4 .steps { margin: 6px 0 10px; padding-inline-start: 20px; } .v4 .steps li { margin: 3px 0; }
.v4 .toast { position: fixed; left: 50%; bottom: calc(24px + env(safe-area-inset-bottom)); transform: translateX(-50%) translateY(16px); opacity: 0; background: #1B2420; color: #fff; padding: 10px 16px; border-radius: 999px; font-size: 14px; z-index: 3000; pointer-events: none;
  transition: opacity 200ms cubic-bezier(0.23,1,0.32,1), transform 200ms cubic-bezier(0.23,1,0.32,1); }
.v4 .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* dark: the counter goes dark, the receipt stays paper */
@media (prefers-color-scheme: dark) {
  .v4 { --counter: #121815; --card: #18211C; --line: #26312B; }
  .v4 .side { color: #E6ECE8; } .v4 .sub, .v4 .chk, .v4 .waiting { color: #9DAAA3; }
  .v4 .split { --board: #1A221E; --track: #26312B; --ink: #E6ECE8; --muted: #9DAAA3; --line: #2A3630; --counter: #26312B; --leaf-soft: rgba(71,196,134,.12); }
  .v4 .sc { color: #E6ECE8; } .v4 .sc .note, .v4 .sc .tot .w { color: #9DAAA3; }
  .v4 .act:not(.primary) { background: #1A221E; border-color: #2A3630; color: #E6ECE8; }
  .v4 details.tool { color: #E6ECE8; } .v4 .tool-body .muted, .v4 .trOut .from { color: #9DAAA3; }
  .v4 .seg { background: #1A221E; border-color: #2A3630; } .v4 .seg button { color: #9DAAA3; } .v4 .seg button[aria-pressed="true"] { background: #E6ECE8; color: #121815; }
  .v4 .mapcard, .v4 .waiting { border-color: #2A3630; }
}
@media (prefers-reduced-motion: reduce) { .v4 .receipt[data-enter], .v4 .ln[data-new], .v4 .ln.strike::after, .v4 .sc[data-deal], .v4 .pin[data-drop], .v4 .md.pop, .v4 .chooser { animation: none; } .v4 .sc, .v4 .pin .hd { transition: none; } }
`;
  let style, root, cmp, mapc, off, sel = null, dropped = false, lastPodium = "";

  // ---- receipt (list only)
  function renderLines(addedId) {
    const box = $(".lines", root);
    $(".count", root).textContent = S.list.reduce((a, l) => a + l.qty, 0);
    if (!S.list.length) { box.innerHTML = `<li class="empty">Your list is empty. Type what you need above, in English or Hebrew.</li>`; return; }
    box.innerHTML = S.list.map(l => {
      const t = lineTitle(l); const id = lineId(l);
      const en = t.en || (l.k ? "" : t.he); const he = t.he && t.he !== en ? t.he : "";
      return `<li class="ln" data-id="${esc(id)}" ${id === addedId ? "data-new" : ""}>
        <span class="q">${l.qty}×</span>
        <span><span class="nm">${esc(en || he)}</span>${en && he ? `<bdi class="he" dir="rtl" lang="he">${esc(he)}</bdi>` : ""}${l.k ? `<span class="exact">this exact product${sizeText(S.byKey.get(l.k) || {}) ? " · " + esc(sizeText(S.byKey.get(l.k))) : ""}</span>` : ""}
          ${l.alts ? `<button class="pickbtn" data-a="choose" aria-expanded="${chooserOpen === id}">${chooserOpen === id ? "Keep it general" : "Any brand or size · choose exact"}</button>` : ""}</span>
        <span class="tools"><button class="tb" data-a="dec" aria-label="One less">−</button><button class="tb" data-a="inc" aria-label="One more">+</button><button class="tb" data-a="del" aria-label="Remove">×</button></span>
        ${l.alts && chooserOpen === id ? chooserHTML(l) : ""}
      </li>`;
    }).join("");
  }

  // ---- choose the exact product for a general item (all its matches, most widely stocked first)
  let chooserOpen = null;
  function chooserHTML(l) {
    const c = termCandidates(l).slice(0, 15);
    if (!c.length) return `<div class="chooser"><p class="ch-empty">Nothing matching is sold within your walk.</p></div>`;
    return `<div class="chooser"><p class="ch-head">Pick the one you want</p>${c.map(m => { const g = glossHe(m.it.n); const sz = sizeText(m.it);
      return `<button class="ch-it" data-k="${esc(m.it.k)}"><bdi dir="rtl" lang="he" class="ch-he">${esc(m.it.n)}</bdi>
        <span class="ch-en">${g.known ? esc(g.text) : ""}${sz ? `${g.known ? " · " : ""}${esc(sz)}` : ""} · ${m.n} shop${m.n === 1 ? "" : "s"}</span></button>`; }).join("")}</div>`;
  }
  function pinExact(id, k) {
    const l = S.list.find(x => lineId(x) === id); const it = S.byKey.get(k); if (!l || !it) return;
    const dup = S.list.find(x => x.k === k);
    if (dup && dup !== l) { dup.qty += l.qty; S.list = S.list.filter(x => x !== l); }
    else { const qty = l.qty; Object.keys(l).forEach(key => delete l[key]); Object.assign(l, { k, n: it.n, qty }); }
    chooserOpen = null; saveList(); emit({ added: k });
  }

  // ---- race: top 3 shop cards
  function renderPodium() {
    const box = $(".podium", root); const lines = pricedLines();
    if (!lines.length) { box.innerHTML = `<div class="waiting">Build your list on the receipt, then the shops race for it here.</div>`; $(".split", root).innerHTML = ""; lastPodium = ""; return; }
    const top = baskets().slice(0, 3);
    const key = top.map(r => r.s.id).join(",");
    const before = flipCapture($$(".sc", box));
    const prev = new Map($$(".sc", box).map(el => [el.dataset.key, +(($(".v", el) || {}).dataset || {}).v || 0]));
    const deal = !REDUCED && lastPodium === "";
    box.innerHTML = top.map((r, i) => { const s = r.s; const known = prev.has(String(s.id));
      return `<article class="sc${bLight(s) ? " light" : ""}${i === 0 ? " lead" : ""}${sel === s.id ? " sel" : ""}" data-key="${s.id}" data-sid="${s.id}"
          ${(deal || !known) && !REDUCED ? ` data-deal style="--d:${i * 50}ms;--c:${bColor(s)}"` : ` style="--c:${bColor(s)}"`}>
        ${i === 0 ? '<span class="crown" aria-hidden="true">👑</span>' : ""}
        <div class="band"><div><div class="brand">${esc(brandOf(s))}</div><div class="loc">${locHTML(s)}</div></div><span class="num">${i + 1}</span></div>
        <div class="bd"><div class="tot"><span class="v" data-v="${prev.get(String(s.id)) || 0}">₪0</span><span class="w">${Math.round(s.walk)} min walk</span></div>
          <div class="dots" aria-label="${r.found} of ${lines.length} items">${lines.map(l => `<i class="${r.missing.includes(l) ? "" : "on"}"></i>`).join("")}</div>
          ${r.missing.length ? `<div class="miss">Missing ${r.missing.map(m => esc(lineTitle(m).en || lineTitle(m).he)).join(", ")}</div>` : r.saved > 0.005 ? `<div class="note">Has everything · deals save ${ils(r.saved)}</div>` : `<div class="note">Has everything</div>`}
          ${s.stale_from ? `<div class="note">Prices from ${new Date(s.stale_from).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>` : ""}
        </div></article>`; }).join("");
    top.forEach(r => { const el = $(`.sc[data-key="${r.s.id}"] .v`, box); el && tween(el, r.total); });
    flipPlay($$(".sc", box), before, { duration: 300 });
    renderSplit(top[0]);
    lastPodium = key;
  }

  // ---- split the shop: a closed toggle; opening it shows which shop to buy each item at (board style, like Receipt)
  let splitOpen = false;
  function splitGroups() {
    const groups = new Map(); const nowhere = []; let total = 0;
    for (const l of pricedLines()) {
      const b = bestFor(l); if (!b) { nowhere.push(l); continue; }
      total += b.r.o.total;
      const g = groups.get(b.s.id) || { s: b.s, sub: 0, items: [] }; g.sub += b.r.o.total; g.items.push({ l, r: b.r }); groups.set(b.s.id, g);
    }
    return { total, nowhere, groups: [...groups.values()].sort((a, b) => b.sub - a.sub || a.s.walk - b.s.walk) };
  }
  function renderSplit(w, animateOpen) {
    const box = $(".split", root);
    const sp = w ? splitGroups() : null;
    if (!w || !sp || !sp.groups.length) { box.innerHTML = ""; return; }
    // always there once the list has prices; closed until clicked
    const save = Math.max(0, w.total - sp.total), max = Math.max(...sp.groups.map(g => g.sub));
    const worth = sp.groups.length > 1 && save >= 0.5;
    box.innerHTML = `<button class="split-toggle" aria-expanded="${splitOpen}" aria-controls="splitPanel">
        <span>${worth ? `<b>Split the shop</b> across ${sp.groups.length} shops: <b>${ils(sp.total)}</b> <span class="save">save ${ils(save)}</span>`
          : `<b>Split the shop</b>: no saving, ${esc(brandOf(sp.groups[0].s))} is already cheapest${sp.groups.length > 1 ? " overall" : " for everything"}`}</span><span class="chev" aria-hidden="true">▾</span></button>
      <div class="split-panel" id="splitPanel" ${splitOpen ? "" : "hidden"}>
        ${sp.groups.map((g, i) => `<div class="sp-row" data-sid="${g.s.id}">
          <span class="pos">${i + 1}</span>
          <span class="who"><b>${esc(brandOf(g.s))}</b><span>${locHTML(g.s)} · ${Math.round(g.s.walk)} min</span></span>
          <span class="bar-track"><span class="bar" data-to="${(g.sub / max).toFixed(4)}" style="--c:${bColor(g.s)};transform:scaleX(${animateOpen ? 0 : (g.sub / max).toFixed(4)})"></span></span>
          <span class="amt">${ils(g.sub)}<small>${g.items.length} item${g.items.length === 1 ? "" : "s"}</small></span>
          <span class="buy">${g.items.map(({ l, r }) => `<span class="bi">${esc(lineTitle(l).en || lineTitle(l).he)}${l.qty > 1 ? ` ×${l.qty}` : ""} <em>${ils(r.o.total)}</em></span>`).join("")}</span>
        </div>`).join("")}
        <div class="sp-foot"><span>${worth ? `${sp.groups.length} stops instead of 1 · ${ils(save)} less than ${esc(brandOf(w.s))} alone` : `Best price for each item; one stop at ${esc(brandOf(w.s))} costs ${ils(w.total)}`}</span><b>${ils(sp.total)}</b></div>
        ${sp.nowhere.length ? `<div class="sp-none">Not sold within your walk: ${sp.nowhere.map(l => esc(lineTitle(l).en || lineTitle(l).he)).join(", ")}</div>` : ""}
      </div>`;
    if (animateOpen && !REDUCED) {
      const panel = $(".split-panel", box);
      panel.animate([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: EASE_OUT });
      $$(".sp-row", panel).forEach((r, i) => r.animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], { duration: 220, delay: 40 * i, easing: EASE_OUT, fill: "backwards" }));
      requestAnimationFrame(() => requestAnimationFrame(() => $$(".bar", panel).forEach(b => { b.style.transform = `scaleX(${b.dataset.to})`; })));
      setTimeout(() => $$(".bar", panel).forEach(b => { b.style.transform = `scaleX(${b.dataset.to})`; }), 60);
    } else if (animateOpen) $$(".bar", box).forEach(b => { b.style.transform = `scaleX(${b.dataset.to})`; });
  }

  // ---- neighbourhood map
  function pinFor(s, rank, total) {
    const big = hasPrices(s) && rank >= 0 && rank < 3;
    const md = big ? `<span class="md">${["🥇", "🥈", "🥉"][rank]}</span>` : "";
    const label = big || sel === s.id ? esc(brandOf(s)) : esc(bShort(s));
    const px = total != null && (big || sel === s.id) ? `<span class="px">${ils(total)}</span>` : "";
    return `<div class="pin${big || sel === s.id ? "" : " small"}${bLight(s) ? " light" : ""}${hasPrices(s) ? "" : " nop"}${sel === s.id ? " sel" : ""}"${dropped ? "" : " data-drop"} style="--c:${bColor(s)};--d:${Math.round(Math.min(900, s.walk * 45))}ms"><div class="hd">${label}${px}</div><div class="tl"></div><div class="dot"></div>${md}</div>`;
  }
  function renderShopCard() {
    const c = $(".shopcard", root);
    if (sel == null) { c.dataset.state = "closed"; return; }
    const s = S.stores[sel]; const lines = pricedLines(); const b = hasPrices(s) && lines.length ? baskets().find(r => r.s.id === sel) : null;
    c.innerHTML = `<button class="x" aria-label="Close">×</button><div class="cb" style="--c:${bColor(s)}"><i></i>${esc(brandOf(s))}</div><div class="muted">${locHTML(s)} · about ${Math.round(s.walk)} min walk${s.stale_from ? ` · prices from ${new Date(s.stale_from).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}</div>
      <div class="tt">${!hasPrices(s) ? `<span class="muted">${esc(noPriceWhy(s))}</span>` : b ? `<b>${ils(b.total)}</b> for ${b.found} of ${lines.length}${b.missing.length ? ` · missing ${b.missing.map(m => esc(lineTitle(m).en || lineTitle(m).he)).join(", ")}` : ""}` : lines.length ? "Has nothing from your list" : `${s.n_items.toLocaleString()} products · ${s.n_promos || 0} deals today`}</div>
      <a href="${directionsURL(s)}" target="_blank" rel="noopener">Walking directions</a>`;
    c.dataset.state = "open";
  }
  function popMedals(before) {
    if (REDUCED) return;
    const now = baskets().slice(0, 3).map(r => r.s.id).join(",");
    if (now !== before) $$(".v4 .md").forEach(m => m.classList.add("pop"));
  }

  function select(id) { sel = id; S.sel = id; $$(".sc", root).forEach(el => el.classList.toggle("sel", +el.dataset.sid === id)); mapc && mapc.select(id); renderShopCard(); }
  function all(what) {
    const before = lastPodium;
    renderLines(what && what.added); renderPodium(); mapc && mapc.render(); renderShopCard();
    if (what && (what.added || what.qty || what.removed)) popMedals(before);
  }

  // ---- tools under the map: translate, save to phone
  function renderTr() {
    const t = $(".trIn", root).value.trim(); const out = $(".trOut", root); const g = $(".trGoogle", root), mf = $(".trMorfix", root);
    if (!t) { out.innerHTML = ""; mf.hidden = true; return; }
    const he = isHeb(t); const r = he ? glossHe(t) : glossEn(t);
    out.dir = he ? "ltr" : "rtl";
    out.innerHTML = `<span class="from" dir="ltr">${r.known} of ${r.total} words from the glossary${r.known < r.total ? ", try Google for the rest" : ""}</span>${esc(r.text)}`;
    g.href = `https://translate.google.com/?sl=${he ? "iw" : "en"}&tl=${he ? "en" : "iw"}&op=translate&text=${encodeURIComponent(t)}`;
    mf.hidden = t.split(/\s+/).length > 2; mf.href = "https://www.morfix.co.il/" + encodeURIComponent(t);
  }
  let deferredInstall = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; root && renderSave(); });
  function renderSave() {
    const ua = navigator.userAgent; const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua); const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const iPhone = `<b>iPhone or iPad (Safari)</b><ol class="steps"><li>Tap the Share button (square with an arrow).</li><li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>`;
    const andr = `<b>Android (Chrome)</b><ol class="steps"><li>Tap the ⋮ menu.</li><li>Tap <b>Add to Home screen</b> or <b>Install app</b>.</li></ol>`;
    const desk = `<b>Computer</b><ol class="steps"><li><b>Chrome or Edge:</b> the install icon at the right end of the address bar.</li><li><b>Safari on Mac:</b> File → <b>Add to Dock</b>.</li></ol>`;
    let html = standalone ? `<p>It's saved on this device. Prices refresh every morning.</p>` : `<p class="muted">Prices refresh every morning. The list stays on this device; <b>Share list</b> sends it to someone.</p>`;
    html += ios ? iPhone + `<details><summary class="muted">Other devices</summary>${andr}${desk}</details>`
          : android ? andr + `<details><summary class="muted">Other devices</summary>${iPhone}${desk}</details>`
          : desk + `<details><summary class="muted">Phones</summary>${iPhone}${andr}</details>`;
    if (deferredInstall) html = `<p><button class="act primary installBtn">Install on this device</button></p>` + html;
    $(".saveBody", root).innerHTML = html;
    const ib = $(".installBtn", root); if (ib) ib.onclick = async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; renderSave(); };
  }
  function toast(msg) { const t = $(".toast", root); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 1900); }
  async function shareList() {
    if (!S.list.length) { toast("Your list is empty"); return; }
    const code = encodeList(S.list);
    const base = LOCAL ? (window.PUBLIC_URL || location.origin + "/") : location.origin + location.pathname;
    const url = base + "#list=" + code;
    try { if (navigator.share) { await navigator.share({ title: "Shopping list", url }); return; } await navigator.clipboard.writeText(url); toast("Link copied. Paste it in WhatsApp."); }
    catch (e) { if (e && e.name !== "AbortError") prompt("Copy this link:", url); }
  }
  async function refresh(btn) {
    btn.disabled = true; btn.textContent = "Refreshing…";
    await fetch("/api/refresh", { method: "POST" });
    const poll = setInterval(async () => {
      const st = await (await fetch("/api/refresh")).json(); if (st.running) return; clearInterval(poll);
      if (st.error) toast("Refresh failed"); else { await loadAll(); emit({}); toast("Prices updated"); }
      btn.disabled = false; btn.textContent = "Refresh prices";
    }, 4000);
  }

  window.App = {
    mount(stage) {
      style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
      const d = new Date(S.generated);
      stage.innerHTML = `<div class="v4"><div class="layout">
        <div class="printer"><div class="slot" aria-hidden="true"></div>
          <div class="receipt" data-enter>
            <div class="r-head"><div class="r-title">Shopping list</div>
              <div class="r-meta">${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · English or עברית</div></div>
            <hr class="dash">
            <div class="cmpwrap"></div>
            <div class="ideas">${["milk", "eggs", "bread", "tomatoes", "cottage cheese", "coffee", "bananas"].map(x => `<button class="idea" data-add="${x}">+ ${x}</button>`).join("")}</div>
            <hr class="dash"><ul class="lines"></ul><hr class="dash">
            <div class="r-foot"><span>Items</span><span class="count">0</span><span class="muted">Prices compared at every shop within your walk</span></div>
            <div class="r-small">Prices from the chains' official price files, ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
          </div></div>
        <div class="side">
          <div class="side-head"><div><h2>Who's cheapest for your list?</h2><p class="sub">The top three shops within your walk, re-ranked every time the list changes.</p></div>
            <div style="display:grid;gap:8px;justify-items:end">
              <div class="seg" role="group" aria-label="Walking distance"><button data-w="10" aria-pressed="${S.walk === 10}">10 min walk</button><button data-w="14" aria-pressed="${S.walk === 14}">14 min</button></div>
              <label class="chk"><input type="checkbox" class="club" ${S.club ? "checked" : ""}> Club and card deals</label>
              <div class="acts"><button class="act shareBtn">Share list</button>${LOCAL ? `<button class="act refreshBtn">Refresh prices</button>` : ""}</div></div></div>
          <div class="podium"></div>
          <div class="split"></div>
          <div class="mapcard"><div class="mapel"></div><div class="shopcard" data-state="closed"></div></div>
          <div class="extras">
            <details class="tool"><summary>Translate a word</summary><div class="tool-body">
              <div class="tr-row"><textarea class="trIn" placeholder="English or Hebrew" aria-label="Text to translate"></textarea><div class="trOut" aria-live="polite"></div></div>
              <div class="tr-actions"><button class="act primary trAdd">Add to list</button>
                <a class="act trGoogle" target="_blank" rel="noopener" href="https://translate.google.com/?sl=en&tl=iw">Google Translate</a>
                <a class="act trMorfix" target="_blank" rel="noopener" href="https://www.morfix.co.il/" hidden>Morfix</a></div></div></details>
            <details class="tool"><summary>Save it on your phone or computer</summary><div class="tool-body saveBody"></div></details>
          </div>
        </div></div></div>`;
      root = $(".v4", stage); dropped = false; lastPodium = "";
      cmp = composer($(".cmpwrap", root), { placeholder: "Add an item: milk, עגבניות…" });
      mapc = makeMap($(".mapel", root), { onSelect: select, pinFor });
      off = onChange(all); all({});
      setTimeout(() => { dropped = true; }, 1300);
      root.insertAdjacentHTML("beforeend", `<div class="toast" role="status"></div>`);
      renderSave();
      root.addEventListener("change", e => { if (e.target.matches(".club")) { S.club = e.target.checked; emit({}); } });
      root.addEventListener("input", e => { if (e.target.matches(".trIn")) renderTr(); });
      $(".shareBtn", root).addEventListener("click", shareList);
      const rb = $(".refreshBtn", root); if (rb) rb.addEventListener("click", () => refresh(rb));
      $(".trAdd", root).addEventListener("click", () => { const t = $(".trIn", root).value.trim(); if (!t) return; cmp.addText(t); $(".trIn", root).value = ""; renderTr(); toast("Added to your list"); });
      root.addEventListener("click", e => {
        const idea = e.target.closest("[data-add]"); if (idea) { cmp.addText(idea.dataset.add); return; }
        if (e.target.closest(".shopcard .x")) { select(null); return; }
        const tg = e.target.closest(".split-toggle"); if (tg) { splitOpen = !splitOpen; renderSplit(baskets()[0], splitOpen); return; }
        const sr = e.target.closest(".sp-row[data-sid]"); if (sr) { select(+sr.dataset.sid); $(".mapcard", root).scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "nearest" }); return; }
        const c = e.target.closest(".sc[data-sid]"); if (c) { select(+c.dataset.sid); return; }
        const w = e.target.closest(".seg button"); if (w) { S.walk = +w.dataset.w; $$(".seg button", root).forEach(b => b.setAttribute("aria-pressed", b === w)); emit({}); mapc && mapc.fit(); return; }
        const chIt = e.target.closest(".ch-it"); if (chIt) { pinExact(chIt.closest(".ln").dataset.id, chIt.dataset.k); return; }
        const ch = e.target.closest("[data-a=choose]"); if (ch) { const id = ch.closest(".ln").dataset.id; chooserOpen = chooserOpen === id ? null : id; renderLines(); return; }
        const t = e.target.closest(".tb"); if (!t) return;
        const ln = t.closest(".ln"); const id = ln.dataset.id;
        if (t.dataset.a === "inc") changeQty(id, 1);
        else if (t.dataset.a === "dec" && (S.list.find(l => lineId(l) === id) || {}).qty > 1) changeQty(id, -1);
        else { // the receipt voids the line: strike through, then it goes
          if (REDUCED) return removeLine(id);
          ln.classList.add("strike"); setTimeout(() => { ln.classList.add("out"); setTimeout(() => removeLine(id), 150); }, 180);
        }
      });
    },
    unmount() { off && off(); cmp && cmp.destroy(); mapc && mapc.destroy(); style && style.remove(); mapc = cmp = null; sel = null; S.sel = null; },
  };
})();
