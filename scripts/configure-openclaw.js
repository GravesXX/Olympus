#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const OLYMPUS_DIR = path.resolve(__dirname, '..');
const OPENCLAW_DIR = path.join(require('os').homedir(), '.openclaw');
const CONFIG_PATH = path.join(OPENCLAW_DIR, 'openclaw.json');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

(async () => {
  console.log('');
  console.log('OLYMPUS — OpenClaw Configuration');
  console.log('================================');
  console.log('');
  console.log('You need 4 Discord bot tokens. Create them at:');
  console.log('https://discord.com/developers/applications');
  console.log('');
  console.log('For each bot, enable MESSAGE CONTENT INTENT under Bot settings.');
  console.log('');

  const tokens = {};
  for (const agent of ['absolute', 'athena', 'hermes', 'artemis']) {
    tokens[agent] = await ask(`${agent.charAt(0).toUpperCase() + agent.slice(1)} bot token: `);
  }

  const guildId = await ask('\nDiscord server (guild) ID: ');
  const generalChannelId = await ask('General channel ID: ');
  const athenaChannelId = await ask('Athena channel ID (or press Enter to skip): ') || null;
  const reportChannelId = await ask('Daily-job-report channel ID: ');
  const ownerId = await ask('Your Discord user ID: ');

  console.log('\nGenerating config...');

  // Extract bot user IDs from tokens
  const botIds = {};
  for (const [agent, token] of Object.entries(tokens)) {
    try {
      const encoded = token.split('.')[0];
      botIds[agent] = Buffer.from(encoded, 'base64').toString('utf-8');
    } catch {
      botIds[agent] = 'UNKNOWN';
    }
  }

  // Build agent list
  const agentList = [
    { id: 'absolute', name: 'Absolute', theme: 'Omniscient orchestrator', emoji: '\u{1F441}\uFE0F', default: true },
    { id: 'athena', name: 'Athena', theme: 'Strategic career engineer', emoji: '\u2694\uFE0F' },
    { id: 'hermes', name: 'Hermes', theme: 'Mock interview coach', emoji: '\u{1F399}\uFE0F' },
    { id: 'artemis', name: 'Artemis', theme: 'The Huntress', emoji: '\u{1F3F9}' },
  ];

  const allBotIds = Object.values(botIds);
  const allAgentIds = Object.keys(tokens);

  // Build Discord accounts config
  const accounts = {};
  for (const agent of allAgentIds) {
    const otherBotIds = allAgentIds.filter(a => a !== agent).map(a => botIds[a]);
    const channels = {};

    // General channel — require mention
    channels[generalChannelId] = { allow: true, requireMention: true };

    // Agent-specific channels
    if (agent === 'athena' && athenaChannelId) {
      channels[athenaChannelId] = { allow: true, requireMention: false };
    }
    if (agent === 'artemis') {
      channels[reportChannelId] = { allow: true, requireMention: false };
    }
    if (agent === 'athena') {
      channels[reportChannelId] = { allow: true, requireMention: true };
    }

    accounts[agent] = {
      token: tokens[agent],
      groupPolicy: 'allowlist',
      guilds: {
        [guildId]: {
          requireMention: true,
          users: [ownerId, ...otherBotIds],
          channels,
        },
      },
      streaming: 'off',
    };
  }

  const config = {
    agents: {
      defaults: {
        model: { primary: 'anthropic/claude-sonnet-4-6' },
        compaction: { mode: 'safeguard' },
        maxConcurrent: 4,
      },
      list: agentList.map(a => ({
        id: a.id,
        ...(a.default ? { default: true } : {}),
        workspace: path.join(OLYMPUS_DIR, 'agents', a.id, 'workspace'),
        identity: { name: a.name, theme: a.theme, emoji: a.emoji },
        subagents: {
          allowAgents: allAgentIds.filter(x => x !== a.id),
        },
      })),
    },
    bindings: allAgentIds.map(id => ({
      agentId: id,
      match: { channel: 'discord', accountId: id },
    })),
    channels: {
      discord: {
        enabled: true,
        groupPolicy: 'allowlist',
        streaming: 'off',
        dmPolicy: 'pairing',
        accounts,
      },
    },
    plugins: {
      allow: [...allAgentIds, 'discord'],
      load: {
        paths: allAgentIds.map(id =>
          path.join(OLYMPUS_DIR, 'agents', id, 'plugin', 'src', 'index.ts')
        ),
      },
      entries: Object.fromEntries([
        ...allAgentIds.map(id => [id, { enabled: true }]),
        ['discord', { enabled: true }],
      ]),
    },
  };

  // Write config
  fs.mkdirSync(OPENCLAW_DIR, { recursive: true });

  if (fs.existsSync(CONFIG_PATH)) {
    const backup = CONFIG_PATH + '.backup-' + Date.now();
    fs.copyFileSync(CONFIG_PATH, backup);
    console.log(`Backed up existing config to ${path.basename(backup)}`);

    // Merge: keep existing auth and gateway, replace agents/bindings/channels/plugins
    const existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const merged = {
      ...existing,
      agents: config.agents,
      bindings: config.bindings,
      channels: { ...existing.channels, discord: config.channels.discord },
      plugins: config.plugins,
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
  } else {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  }

  // Copy workspaces
  const wsDir = path.join(OPENCLAW_DIR, 'workspaces');
  fs.mkdirSync(wsDir, { recursive: true });
  for (const agent of allAgentIds) {
    const src = path.join(OLYMPUS_DIR, 'agents', agent, 'workspace');
    const dest = path.join(wsDir, agent);
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      fs.copyFileSync(path.join(src, file), path.join(dest, file));
    }
  }

  console.log('');
  console.log('Config written to ~/.openclaw/openclaw.json');
  console.log('Workspaces copied to ~/.openclaw/workspaces/');
  console.log('');
  console.log('Bot IDs detected:');
  for (const [agent, id] of Object.entries(botIds)) {
    console.log(`  ${agent}: ${id}`);
  }
  console.log('');
  console.log('Run "openclaw start" to bring all agents online.');

  rl.close();
})();
