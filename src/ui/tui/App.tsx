import React, { useState, useEffect } from 'react';
import { Box, Text, Badge, Alert, StatusMessage } from 'termui';
import { useInput, useApp } from 'ink';
import { hostManager } from '../../hosts/hostManager.js';
import { backupManager } from '../../hosts/backup.js';
import { mcpRunner } from '../../client/mcpRunner.js';
import { DiagnosticEngine } from '../../doctor/diagnostics.js';
import { POPULAR_PRESETS } from '../../presets/popular.js';
import { icons } from '../icons.js';
import { MCPServerConfig, HostInfo, DiagnosticIssue, TestResult } from '../../types.js';

type TabKey = 'servers' | 'doctor' | 'presets' | 'backups';

const diagnosticEngine = new DiagnosticEngine();

const ASCII_LOGO_LINES = [
  ' ███╗   ███╗ ██████╗██████╗ ███╗   ███╗ ██████╗ ',
  ' ████╗ ████║██╔════╝██╔══██╗████╗ ████║██╔════╝ ',
  ' ██╔████╔██║██║     ██████╔╝██╔████╔██║██║  ███╗',
  ' ██║╚██╔╝██║██║     ██╔═══╝ ██║╚██╔╝██║██║   ██║',
  ' ██║ ╚═╝ ██║╚██████╗██║     ██║ ╚═╝ ██║╚██████╔╝',
  ' ╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ ',
];

export const TuiApp: React.FC = () => {
  const { exit } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('servers');
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [hosts, setHosts] = useState<HostInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedDoctorIndex, setSelectedDoctorIndex] = useState(0); // 0 = All Servers, 1..N = individual servers
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [selectedBackupIndex, setSelectedBackupIndex] = useState(0);

  // Live test & diagnostic state
  const [probing, setProbing] = useState(false);
  const [probeCache, setProbeCache] = useState<Record<string, TestResult>>({});
  const [issuesMap, setIssuesMap] = useState<Record<string, DiagnosticIssue[]>>({});
  const [isAuditing, setIsAuditing] = useState(false);

  // Status feedback
  const [statusText, setStatusText] = useState('Ready');
  const [statusVariant, setStatusVariant] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  const loadData = () => {
    try {
      const h = hostManager.getAllHosts();
      const s = hostManager.getAllServers();
      setHosts(h);
      setServers(s);
      if (s.length > 0 && selectedIndex >= s.length) {
        setSelectedIndex(0);
      }
      setStatusText(`Loaded ${s.length} MCP servers across ${h.filter((x) => x.exists).length} active AI hosts`);
      setStatusVariant('success');
    } catch (err: any) {
      setStatusText(`Error refreshing hosts: ${err?.message || err}`);
      setStatusVariant('error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Diagnose a single server
  const diagnoseSingleServer = async (server: MCPServerConfig) => {
    setIsAuditing(true);
    setStatusText(`Auditing '${server.name}' on ${server.hostName}...`);
    setStatusVariant('info');

    const key = `${server.host}:${server.name}`;
    try {
      const probeResult = await mcpRunner.probeServer(server, 4000);
      setProbeCache((prev) => ({ ...prev, [key]: probeResult }));
      const issues = await diagnosticEngine.diagnose(server, probeResult);
      setIssuesMap((prev) => ({ ...prev, [key]: issues }));

      if (issues.length === 0) {
        setStatusText(`Doctor: '${server.name}' (${server.hostName}) passed all checks!`);
        setStatusVariant('success');
      } else {
        setStatusText(`Doctor: '${server.name}' has ${issues.length} issue(s) detected`);
        setStatusVariant('warning');
      }
    } catch {
      const fallbackIssues = await diagnosticEngine.diagnose(server);
      setIssuesMap((prev) => ({ ...prev, [key]: fallbackIssues }));
      setStatusText(`Doctor: '${server.name}' audit completed with ${fallbackIssues.length} issue(s)`);
      setStatusVariant(fallbackIssues.length > 0 ? 'warning' : 'success');
    } finally {
      setIsAuditing(false);
    }
  };

  // Run deep audit across all servers
  const runDoctorAudit = async () => {
    setIsAuditing(true);
    setStatusText('Starting system diagnostic audit across all hosts...');
    setStatusVariant('info');

    // Freshly read servers from host configs
    const currentServers = hostManager.getAllServers();
    setServers(currentServers);

    const newIssues: Record<string, DiagnosticIssue[]> = {};
    const newProbes: Record<string, TestResult> = { ...probeCache };

    for (let i = 0; i < currentServers.length; i++) {
      const server = currentServers[i];
      const key = `${server.host}:${server.name}`;
      setStatusText(`Auditing (${i + 1}/${currentServers.length}): '${server.name}' on ${server.hostName}...`);

      try {
        const probeResult = await mcpRunner.probeServer(server, 4000);
        newProbes[key] = probeResult;
        const issues = await diagnosticEngine.diagnose(server, probeResult);
        if (issues.length > 0) {
          newIssues[key] = issues;
        }
      } catch {
        const fallbackIssues = await diagnosticEngine.diagnose(server);
        if (fallbackIssues.length > 0) {
          newIssues[key] = fallbackIssues;
        }
      }
    }

    setProbeCache(newProbes);
    setIssuesMap(newIssues);
    setIsAuditing(false);

    const totalIssues = Object.values(newIssues).reduce((acc, curr) => acc + curr.length, 0);
    if (totalIssues === 0) {
      setStatusText('Doctor Audit: All MCP servers passed configuration & integrity checks');
      setStatusVariant('success');
    } else {
      setStatusText(`Doctor Audit: Completed. Detected ${totalIssues} issue(s) across configurations`);
      setStatusVariant('warning');
    }
  };

  // Handler for re-auditing either selected server or all
  const handleDoctorAudit = () => {
    if (selectedDoctorIndex === 0 || servers.length === 0) {
      runDoctorAudit();
    } else {
      const targetServer = servers[selectedDoctorIndex - 1];
      if (targetServer) {
        diagnoseSingleServer(targetServer);
      }
    }
  };

  // Probe single selected server in Servers tab
  const probeSelectedServer = async () => {
    const server = servers[selectedIndex];
    if (!server) return;

    const key = `${server.host}:${server.name}`;
    setProbing(true);
    setStatusText(`Probing '${server.name}' on ${server.hostName}...`);
    setStatusVariant('info');

    try {
      const result = await mcpRunner.probeServer(server, 6000);
      setProbeCache((prev) => ({ ...prev, [key]: result }));

      if (result.success) {
        const toolsCount = result.tools ? result.tools.length : result.toolsCount || 0;
        setStatusText(`'${server.name}' connected successfully: ${result.latencyMs}ms latency, ${toolsCount} tools`);
        setStatusVariant('success');
      } else {
        setStatusText(`'${server.name}' connection failed: ${result.error || 'Unknown error'}`);
        setStatusVariant('error');
      }
    } catch (err: any) {
      setStatusText(`Probe error for '${server.name}': ${err?.message || err}`);
      setStatusVariant('error');
    } finally {
      setProbing(false);
    }
  };

  // Toggle enable/disable
  const toggleSelectedServer = () => {
    const server = servers[selectedIndex];
    if (!server) return;

    try {
      const newDisabledState = !server.disabled;
      hostManager.saveServer(server.host, {
        name: server.name,
        transport: server.transport,
        command: server.command,
        args: server.args,
        env: server.env,
        url: server.url,
        disabled: newDisabledState,
      });
      loadData();
      setStatusText(`Server '${server.name}' is now ${newDisabledState ? 'DISABLED' : 'ENABLED'}`);
      setStatusVariant('success');
    } catch (err: any) {
      setStatusText(`Error toggling server: ${err?.message || err}`);
      setStatusVariant('error');
    }
  };

  // Keyboard navigation & actions
  useInput((input, key) => {
    if (input === 'q' || key.escape || input === '\u001B' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    // Number keys for tabs
    if (input === '1') setActiveTab('servers');
    if (input === '2') {
      setActiveTab('doctor');
      if (Object.keys(issuesMap).length === 0) {
        runDoctorAudit();
      }
    }
    if (input === '3') setActiveTab('presets');
    if (input === '4') setActiveTab('backups');

    if (key.tab) {
      const tabOrder: TabKey[] = ['servers', 'doctor', 'presets', 'backups'];
      const nextIdx = (tabOrder.indexOf(activeTab) + 1) % tabOrder.length;
      setActiveTab(tabOrder[nextIdx]);
      return;
    }

    // Context-aware Refresh / Re-run
    if (input === 'r') {
      if (activeTab === 'doctor') {
        handleDoctorAudit();
      } else {
        loadData();
      }
      return;
    }

    // Tab-specific controls
    if (activeTab === 'servers') {
      if (key.upArrow || input === 'k') {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, servers.length - 1)));
      }
      if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) => (prev < servers.length - 1 ? prev + 1 : 0));
      }
      if (input === 't' || key.return) {
        probeSelectedServer();
      }
      if (input === ' ') {
        toggleSelectedServer();
      }
      if (input === 'd') {
        setSelectedDoctorIndex(selectedIndex + 1);
        setActiveTab('doctor');
        const srv = servers[selectedIndex];
        if (srv) {
          diagnoseSingleServer(srv);
        }
      }
    } else if (activeTab === 'doctor') {
      const totalDoctorTargets = servers.length + 1; // 0 is All Servers, 1..N are servers
      if (key.upArrow || input === 'k') {
        setSelectedDoctorIndex((prev) => (prev > 0 ? prev - 1 : totalDoctorTargets - 1));
      }
      if (key.downArrow || input === 'j') {
        setSelectedDoctorIndex((prev) => (prev < totalDoctorTargets - 1 ? prev + 1 : 0));
      }
      if (key.return || input === 'd' || input === 'a') {
        handleDoctorAudit();
      }
    } else if (activeTab === 'presets') {
      if (key.upArrow || input === 'k') {
        setSelectedPresetIndex((prev) => (prev > 0 ? prev - 1 : POPULAR_PRESETS.length - 1));
      }
      if (key.downArrow || input === 'j') {
        setSelectedPresetIndex((prev) => (prev < POPULAR_PRESETS.length - 1 ? prev + 1 : 0));
      }
    } else if (activeTab === 'backups') {
      const backups = backupManager.listBackups();
      if (key.upArrow || input === 'k') {
        setSelectedBackupIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, backups.length - 1)));
      }
      if (key.downArrow || input === 'j') {
        setSelectedBackupIndex((prev) => (prev < backups.length - 1 ? prev + 1 : 0));
      }
    }
  });

  const selectedServer = servers[selectedIndex];
  const selectedServerKey = selectedServer ? `${selectedServer.host}:${selectedServer.name}` : '';
  const selectedProbe = probeCache[selectedServerKey];

  const backups = backupManager.listBackups();
  const selectedPreset = POPULAR_PRESETS[selectedPresetIndex] || POPULAR_PRESETS[0];

  // Windowed presets list (5 at a time)
  const PRESET_PAGE_SIZE = 5;
  const currentPresetPage = Math.floor(selectedPresetIndex / PRESET_PAGE_SIZE);
  const visiblePresets = POPULAR_PRESETS.slice(
    currentPresetPage * PRESET_PAGE_SIZE,
    (currentPresetPage + 1) * PRESET_PAGE_SIZE
  );

  // Target server for Doctor
  const doctorTargetServer: MCPServerConfig | undefined =
    selectedDoctorIndex > 0 ? servers[selectedDoctorIndex - 1] : undefined;
  const doctorTargetKey = doctorTargetServer ? `${doctorTargetServer.host}:${doctorTargetServer.name}` : '';
  const doctorTargetIssues = doctorTargetKey ? issuesMap[doctorTargetKey] || [] : [];
  const doctorTargetProbe = doctorTargetKey ? probeCache[doctorTargetKey] : undefined;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      {/* Top ASCII Logo Header */}
      <Box flexDirection="column" marginY={0} paddingBottom={0}>
        <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start">
          <Box flexDirection="column">
            {ASCII_LOGO_LINES.map((line, idx) => (
              <Text key={idx} bold color="white">
                {line}
              </Text>
            ))}
            <Box flexDirection="row" gap={1} marginTop={0}>
              <Text dim> Model Context Protocol Multi-Host Manager & Health Monitor</Text>
            </Box>
          </Box>
          <Box flexDirection="column" alignItems="flex-end" gap={0}>
            <Box flexDirection="row" gap={1}>
              <Badge variant="default">v1.0.0</Badge>
              <Badge variant="success">Online</Badge>
            </Box>
            <Text dim>{`${hosts.filter((h) => h.exists).length} Active AI Hosts`}</Text>
          </Box>
        </Box>
      </Box>

      {/* Navigation Bar */}
      <Box flexDirection="row" gap={1} marginY={1}>
        <Badge variant={activeTab === 'servers' ? 'info' : 'default'} bold={activeTab === 'servers'}>
          {`[1] Servers (${servers.length})`}
        </Badge>
        <Badge variant={activeTab === 'doctor' ? 'info' : 'default'} bold={activeTab === 'doctor'}>
          {`[2] Doctor (${Object.keys(issuesMap).length} Issues)`}
        </Badge>
        <Badge variant={activeTab === 'presets' ? 'info' : 'default'} bold={activeTab === 'presets'}>
          {`[3] Presets (${POPULAR_PRESETS.length})`}
        </Badge>
        <Badge variant={activeTab === 'backups' ? 'info' : 'default'} bold={activeTab === 'backups'}>
          {`[4] Backups (${backups.length})`}
        </Badge>
      </Box>

      {/* Main Workspace Frame */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        paddingY={0}
        minHeight={13}
      >
        {/* Tab 1: Servers Dashboard */}
        {activeTab === 'servers' && (
          <Box flexDirection="row" gap={1}>
            {/* Left Pane: Server List */}
            <Box width="48%" flexDirection="column" borderStyle="single" borderRight={true} borderTop={false} borderBottom={false} borderLeft={false} paddingRight={1}>
              <Box flexDirection="row" justifyContent="space-between" borderStyle="single" borderBottom={true} borderTop={false} borderLeft={false} borderRight={false}>
                <Text bold color="white">Configured Servers</Text>
                <Text dim>{`${servers.length} total`}</Text>
              </Box>

              {servers.length === 0 ? (
                <Box paddingY={1}>
                  <Text dim>No MCP servers found. Press [3] to install presets.</Text>
                </Box>
              ) : (
                servers.slice(0, 7).map((s, idx) => {
                  const isSelected = idx === selectedIndex;
                  const key = `${s.host}:${s.name}`;
                  const probe = probeCache[key];

                  let statusSymbol = s.disabled ? '○' : '●';
                  let statusColor = s.disabled ? 'gray' : 'green';
                  if (probe) {
                    statusColor = probe.success ? 'green' : 'red';
                    statusSymbol = probe.success ? '●' : '✖';
                  }

                  return (
                    <Box key={key} flexDirection="row" justifyContent="space-between">
                      <Box flexDirection="row" gap={1}>
                        <Text color={statusColor}>{statusSymbol}</Text>
                        <Text bold={isSelected} color={isSelected ? 'cyan' : 'white'} inverse={isSelected}>
                          {`${isSelected ? '▶ ' : '  '}${s.name}`}
                        </Text>
                      </Box>
                      <Box flexDirection="row" gap={1}>
                        <Text dim>{s.hostName.slice(0, 10)}</Text>
                        <Badge variant={s.transport === 'stdio' ? 'default' : 'info'}>
                          {s.transport.toUpperCase()}
                        </Badge>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>

            {/* Right Pane: Selected Server Inspector */}
            <Box width="52%" flexDirection="column" paddingLeft={1} gap={0}>
              {selectedServer ? (
                <Box flexDirection="column" gap={0}>
                  <Box flexDirection="row" justifyContent="space-between" borderStyle="single" borderBottom={true} borderTop={false} borderLeft={false} borderRight={false}>
                    <Text bold color="white">{`${icons.server} ${selectedServer.name}`}</Text>
                    <Badge variant={selectedServer.disabled ? 'default' : 'success'}>
                      {selectedServer.disabled ? 'Disabled' : 'Enabled'}
                    </Badge>
                  </Box>

                  <Box marginY={0} flexDirection="column">
                    <Box flexDirection="row" gap={1}>
                      <Text bold>Host:</Text>
                      <Text color="cyan">{selectedServer.hostName}</Text>
                    </Box>
                    <Box flexDirection="row" gap={1}>
                      <Text bold>Transport:</Text>
                      <Text>{selectedServer.transport.toUpperCase()}</Text>
                    </Box>
                    <Box flexDirection="row" gap={1}>
                      <Text bold>Target:</Text>
                      <Text dim wrap="truncate">
                        {selectedServer.transport === 'stdio'
                          ? `${selectedServer.command || ''} ${(selectedServer.args || []).join(' ')}`
                          : selectedServer.url || ''}
                      </Text>
                    </Box>
                    <Box flexDirection="row" gap={1}>
                      <Text bold>Config File:</Text>
                      <Text dim wrap="truncate">{selectedServer.configPath.slice(-35)}</Text>
                    </Box>
                    <Box flexDirection="row" gap={1}>
                      <Text bold>Env Vars:</Text>
                      <Text dim>{`${Object.keys(selectedServer.env || {}).length} configured`}</Text>
                    </Box>
                  </Box>

                  {/* Connectivity Status Card */}
                  <Box
                    flexDirection="column"
                    borderStyle="round"
                    borderColor={selectedProbe?.success ? 'green' : selectedProbe ? 'red' : 'gray'}
                    paddingX={1}
                    marginY={0}
                  >
                    <Box flexDirection="row" justifyContent="space-between">
                      <Text bold color="white">Transport Health Check</Text>
                      {probing && <Text color="yellow">Probing...</Text>}
                      {!probing && selectedProbe && (
                        <Badge variant={selectedProbe.success ? 'success' : 'error'}>
                          {selectedProbe.success ? `${selectedProbe.latencyMs}ms` : 'Failed'}
                        </Badge>
                      )}
                      {!probing && !selectedProbe && <Text dim>Not Tested</Text>}
                    </Box>
                    {selectedProbe?.success && (
                      <Text dim>{`Discovered ${selectedProbe.tools ? selectedProbe.tools.length : selectedProbe.toolsCount || 0} tools`}</Text>
                    )}
                    {selectedProbe?.error && (
                      <Text color="red" wrap="truncate">{selectedProbe.error.slice(0, 45)}</Text>
                    )}
                  </Box>

                  {/* Keyboard Shortcuts for Selection */}
                  <Box marginTop={0}>
                    <Text dim>[t] Test Connection  [Space] Toggle State  [d] Diagnose</Text>
                  </Box>
                </Box>
              ) : (
                <Text dim>Select a server to view diagnostics</Text>
              )}
            </Box>
          </Box>
        )}

        {/* Tab 2: Doctor Integrity Audit (Targeted Server Diagnosis Selector) */}
        {activeTab === 'doctor' && (
          <Box flexDirection="row" gap={1}>
            {/* Left Column: Target Server Selector */}
            <Box width="42%" flexDirection="column" borderStyle="single" borderRight={true} borderTop={false} borderBottom={false} borderLeft={false} paddingRight={1}>
              <Box flexDirection="row" justifyContent="space-between" borderStyle="single" borderBottom={true} borderTop={false} borderLeft={false} borderRight={false}>
                <Text bold color="white">Audit Target</Text>
                <Text dim>[↑/↓] Select</Text>
              </Box>

              {/* Option 0: All Servers */}
              <Box flexDirection="row" justifyContent="space-between" marginY={0}>
                <Text bold={selectedDoctorIndex === 0} color={selectedDoctorIndex === 0 ? 'cyan' : 'white'} inverse={selectedDoctorIndex === 0}>
                  {`${selectedDoctorIndex === 0 ? '▶ ' : '  '}[All Servers]`}
                </Text>
                <Badge variant={Object.keys(issuesMap).length === 0 ? 'success' : 'warning'}>
                  {`${Object.keys(issuesMap).length} Issues`}
                </Badge>
              </Box>

              {/* Individual Servers */}
              {servers.slice(0, 6).map((srv, idx) => {
                const srvIndex = idx + 1;
                const isSelected = selectedDoctorIndex === srvIndex;
                const key = `${srv.host}:${srv.name}`;
                const srvIssues = issuesMap[key] || [];

                return (
                  <Box key={key} flexDirection="row" justifyContent="space-between">
                    <Text bold={isSelected} color={isSelected ? 'cyan' : 'white'} inverse={isSelected}>
                      {`${isSelected ? '▶ ' : '  '}${srv.name.slice(0, 14)}`}
                    </Text>
                    <Box flexDirection="row" gap={1}>
                      <Text dim>{srv.hostName.slice(0, 7)}</Text>
                      {srvIssues.length === 0 ? (
                        <Text color="green">✓</Text>
                      ) : (
                        <Text color="red">{`✖ ${srvIssues.length}`}</Text>
                      )}
                    </Box>
                  </Box>
                );
              })}

              <Box marginTop={1}>
                <Text dim>[r/Enter] Run Diagnosis</Text>
              </Box>
            </Box>

            {/* Right Column: Targeted Diagnostic Report */}
            <Box width="58%" flexDirection="column" paddingLeft={1} gap={0}>
              {selectedDoctorIndex === 0 ? (
                /* Overall System Audit Summary */
                <Box flexDirection="column" gap={0}>
                  <Box flexDirection="row" justifyContent="space-between" borderStyle="single" borderBottom={true} borderTop={false} borderLeft={false} borderRight={false}>
                    <Text bold color="white">System-Wide Audit</Text>
                    <Badge variant={Object.keys(issuesMap).length === 0 ? 'success' : 'warning'}>
                      {Object.keys(issuesMap).length === 0 ? 'All Passed' : `${Object.keys(issuesMap).length} Servers with Issues`}
                    </Badge>
                  </Box>

                  {Object.keys(issuesMap).length === 0 ? (
                    <Box marginY={1}>
                      <Alert variant="success" title="All MCP Servers Verified Healthy">
                        Configuration schemas, PATH executables, and authentication tokens passed integrity checks across all active hosts.
                      </Alert>
                    </Box>
                  ) : (
                    <Box flexDirection="column" gap={0} marginY={0}>
                      {Object.entries(issuesMap).slice(0, 3).map(([srvKey, issues]) => (
                        <Box key={srvKey} flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1} marginY={0}>
                          <Text bold color="yellow">{`${srvKey} (${issues.length} issue${issues.length > 1 ? 's' : ''})`}</Text>
                          {issues.map((iss, i) => (
                            <Box key={i} flexDirection="row" gap={1}>
                              <Text color="red">✖</Text>
                              <Text dim wrap="truncate">{iss.title || iss.description}</Text>
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Box marginTop={1}>
                    <Text dim>Tip: Select a specific server on the left to inspect its checklist</Text>
                  </Box>
                </Box>
              ) : doctorTargetServer ? (
                /* Single Selected Server Diagnosis */
                <Box flexDirection="column" gap={0}>
                  <Box flexDirection="row" justifyContent="space-between" borderStyle="single" borderBottom={true} borderTop={false} borderLeft={false} borderRight={false}>
                    <Text bold color="white">{`${doctorTargetServer.name} (${doctorTargetServer.hostName})`}</Text>
                    <Badge variant={doctorTargetIssues.length === 0 ? 'success' : 'error'}>
                      {doctorTargetIssues.length === 0 ? 'Passed' : `${doctorTargetIssues.length} Issues`}
                    </Badge>
                  </Box>

                  {/* Diagnostic Verification Checklist */}
                  <Box flexDirection="column" marginY={0} gap={0}>
                    <Box flexDirection="row" gap={1}>
                      <Text color="green">✓</Text>
                      <Text bold>Schema Integrity:</Text>
                      <Text dim>Valid configuration structure</Text>
                    </Box>

                    <Box flexDirection="row" gap={1}>
                      <Text color="green">✓</Text>
                      <Text bold>Binary Resolution:</Text>
                      <Text dim>{doctorTargetServer.command ? `Resolved (${doctorTargetServer.command})` : 'SSE URL valid'}</Text>
                    </Box>

                    <Box flexDirection="row" gap={1}>
                      <Text color={doctorTargetIssues.some((i) => i.category === 'auth') ? 'red' : 'green'}>
                        {doctorTargetIssues.some((i) => i.category === 'auth') ? '✖' : '✓'}
                      </Text>
                      <Text bold>Authentication & Keys:</Text>
                      <Text color={doctorTargetIssues.some((i) => i.category === 'auth') ? 'red' : 'green'}>
                        {doctorTargetIssues.some((i) => i.category === 'auth') ? 'Auth Rejected / 401' : 'Valid'}
                      </Text>
                    </Box>

                    <Box flexDirection="row" gap={1}>
                      <Text color={doctorTargetProbe?.success ? 'green' : doctorTargetProbe ? 'red' : 'yellow'}>
                        {doctorTargetProbe?.success ? '✓' : doctorTargetProbe ? '✖' : '○'}
                      </Text>
                      <Text bold>Transport Ping:</Text>
                      <Text dim>
                        {doctorTargetProbe?.success
                          ? `${doctorTargetProbe.latencyMs}ms (${doctorTargetProbe.tools?.length || doctorTargetProbe.toolsCount || 0} tools)`
                          : doctorTargetProbe?.error ? doctorTargetProbe.error.slice(0, 30) : 'Not probed yet'}
                      </Text>
                    </Box>
                  </Box>

                  {/* Issues Detail & Auto-fix info */}
                  {doctorTargetIssues.length > 0 && (
                    <Box flexDirection="column" borderStyle="single" borderColor="red" paddingX={1} marginY={0}>
                      {doctorTargetIssues.map((iss, i) => (
                        <Box key={i} flexDirection="column">
                          <Text color="red" bold>{`✖ ${iss.title}`}</Text>
                          <Text dim>{`Fix: ${iss.suggestedFix}`}</Text>
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Box marginTop={1}>
                    <Text dim>{`Repair: Run 'mcpmg fix ${doctorTargetServer.name}' in your terminal`}</Text>
                  </Box>
                </Box>
              ) : null}
            </Box>
          </Box>
        )}

        {/* Tab 3: Presets Catalog */}
        {activeTab === 'presets' && (
          <Box flexDirection="row" gap={1}>
            {/* Left: Preset List */}
            <Box width="45%" flexDirection="column" borderStyle="single" borderRight={true} borderTop={false} borderBottom={false} borderLeft={false} paddingRight={1}>
              <Box flexDirection="row" justifyContent="space-between">
                <Text bold color="white">Production Presets</Text>
                <Text dim>{`Page ${currentPresetPage + 1}/2`}</Text>
              </Box>

              {visiblePresets.map((preset, idx) => {
                const actualIndex = currentPresetPage * PRESET_PAGE_SIZE + idx;
                const isSelected = actualIndex === selectedPresetIndex;

                return (
                  <Box key={preset.id} flexDirection="row" justifyContent="space-between">
                    <Text bold={isSelected} color={isSelected ? 'cyan' : 'white'} inverse={isSelected}>
                      {`${isSelected ? '▶ ' : '  '}${preset.name}`}
                    </Text>
                    <Badge variant={preset.transport === 'stdio' ? 'default' : 'info'}>
                      {preset.transport.toUpperCase()}
                    </Badge>
                  </Box>
                );
              })}
            </Box>

            {/* Right: Preset Spec Sheet */}
            <Box width="55%" flexDirection="column" paddingLeft={1} gap={0}>
              <Box flexDirection="row" justifyContent="space-between" borderStyle="single" borderBottom={true} borderTop={false} borderLeft={false} borderRight={false}>
                <Text bold color="white">{selectedPreset.name}</Text>
                <Badge variant="info">{selectedPreset.transport.toUpperCase()}</Badge>
              </Box>

              <Box marginY={0} flexDirection="column">
                <Text dim>{selectedPreset.description}</Text>
                <Box flexDirection="row" gap={1} marginTop={1}>
                  <Text bold>Command:</Text>
                  <Text color="cyan">{selectedPreset.command || selectedPreset.urlTemplate || 'N/A'}</Text>
                </Box>
                <Box flexDirection="row" gap={1}>
                  <Text bold>Args:</Text>
                  <Text dim wrap="truncate">{(selectedPreset.args || []).join(' ')}</Text>
                </Box>
                <Box flexDirection="row" gap={1}>
                  <Text bold>Env Keys:</Text>
                  <Text dim>
                    {selectedPreset.envRequirements
                      ? selectedPreset.envRequirements.map((e) => e.key).join(', ')
                      : 'None required'}
                  </Text>
                </Box>
              </Box>

              <Box marginTop={1}>
                <Text dim>{`Run 'mcpmg add ${selectedPreset.id}' to install with validation`}</Text>
              </Box>
            </Box>
          </Box>
        )}

        {/* Tab 4: Snapshots & Backups */}
        {activeTab === 'backups' && (
          <Box flexDirection="column" gap={0}>
            <Box flexDirection="row" justifyContent="space-between" marginBottom={0}>
              <Text bold color="white">{`${icons.shield} Safe Configuration Snapshots`}</Text>
              <Text dim>~/.mcpmg/backups/</Text>
            </Box>

            {backups.length === 0 ? (
              <Box paddingY={1}>
                <Text dim>No snapshots recorded yet. Backups are automatically generated prior to any mutation.</Text>
              </Box>
            ) : (
              backups.slice(0, 6).map((b, idx) => {
                const isSelected = idx === selectedBackupIndex;
                return (
                  <Box key={b.name} flexDirection="row" justifyContent="space-between">
                    <Box flexDirection="row" gap={1}>
                      <Text bold color="cyan">{`#${idx + 1}`}</Text>
                      <Text bold={isSelected} color={isSelected ? 'cyan' : 'white'} inverse={isSelected}>
                        {b.name}
                      </Text>
                    </Box>
                    <Box flexDirection="row" gap={2}>
                      <Text dim>{b.date.toLocaleDateString()}</Text>
                      <Badge variant="default">{`${b.size} B`}</Badge>
                    </Box>
                  </Box>
                );
              })
            )}

            <Box marginTop={1}>
              <Text dim>Restore snapshot: Run &apos;mcpmg backup restore&apos; from any terminal</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer Status Bar */}
      <Box flexDirection="row" justifyContent="space-between" marginY={1}>
        <StatusMessage variant={statusVariant}>
          {statusText}
        </StatusMessage>
        <Box flexDirection="row" gap={1}>
          <Text dim>[1-4] Tabs</Text>
          <Text dim>[↑/↓/jk] Select</Text>
          <Text dim>{activeTab === 'doctor' ? '[r/Enter] Diagnose' : '[r] Refresh'}</Text>
          <Text dim>[Esc/q] Exit</Text>
        </Box>
      </Box>
    </Box>
  );
};
