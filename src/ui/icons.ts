/**
 * Terminal icons from sebastiencs/icons-in-terminal
 * Source repository: https://github.com/sebastiencs/icons-in-terminal
 * Mapped to the exact unicode glyph codepoints defined in icons_bash.sh
 */
export const icons = {
  // Status & Notifications
  check: '\uE030',       // oct_check
  cross: '\uE133',       // fa_times_circle
  alert: '\uE023',       // oct_alert
  info: '\uE04B',        // oct_info
  bullet: '\uE030',      // check indicator

  // Operations & Commands
  plus: '\uE04F',        // oct_plus (add)
  trash: '\uE090',       // oct_trashcan (remove)
  sync: '\uE06C',        // oct_sync (sync/clone)
  wrench: '\uE184',      // fa_wrench (repair/fix)
  tools: '\uE027',       // oct_tools (capabilities/doctor)
  gear: '\uE025',        // oct_gear (settings/edit)
  zap: '\uE001',         // oct_zap (execution)
  pulse: '\uE06B',       // oct_pulse (live monitor)
  heartbeat: '\uE2D2',   // fa_heartbeat

  // Infrastructure & Transports
  server: '\uE075',      // oct_server (MCP host / server)
  terminal: '\uE08B',    // oct_terminal (stdio command)
  plug: '\uE094',        // oct_plug (SSE / HTTP remote)
  database: '\uE074',    // oct_database
  package: '\uE089',     // oct_package (dependency)

  // Security & Authentication
  key: '\uE03F',         // oct_key (API token / auth key)
  lock: '\uE058',        // oct_lock (credentials)
  shield: '\uE09E',      // oct_shield (safeguards & backup)
};

export type IconName = keyof typeof icons;

export function getIcon(name: IconName): string {
  return icons[name] || '';
}
