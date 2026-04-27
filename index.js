const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Collection
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ===== STAFF ROLE IDS =====
const ROLES = {
  OWNER: "1462451708927152198",
  CO_OWNER: "1475414762509828177",
  SERVER_MANAGER: "1462085176971628596",
  HEAD_MOD: "1477252730547339447",
  SENIOR_MOD: "1477252558568554567",
  JUNIOR_MOD: "1477252348966342890",
  MOD: "1477252194091663592",
  TRIAL_MOD: "1468481113965203591"
};

// ===== BYPASS ROLES =====
const BYPASS_ROLES = [
  ROLES.OWNER,
  ROLES.CO_OWNER,
  ROLES.SERVER_MANAGER
];

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ===== SLASH STORAGE =====
client.slash = new Collection();

// ===== COOLDOWN SYSTEM =====
const cooldowns = new Map();

function isBypass(member) {
  return BYPASS_ROLES.some(role => member.roles.cache.has(role));
}

function checkCooldown(userId, command, time, member) {
  if (isBypass(member)) return null;

  const key = `${command}_${userId}`;
  const now = Date.now();

  if (cooldowns.has(key)) {
    const expire = cooldowns.get(key) + time;
    if (now < expire) {
      return ((expire - now) / 1000).toFixed(1);
    }
  }

  cooldowns.set(key, now);
  return null;
}

// ===== SLASH COMMANDS =====
client.slash.set("balance", {
  name: "balance",
  description: "Check your balance",

  async execute(i) {
    const fs = require("fs");

    const db = JSON.parse(fs.readFileSync("./eco.json"));
    const userId = i.user.id;

    if (!db[userId]) {
      db[userId] = { wallet: 0, bank: 0 };
      fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));
    }

    const user = db[userId];

    return i.reply(
      `<a:balance:1497983888792752229> You have ${user.wallet} in your wallet\n` +
      `<:bankeed:1497983802566512691> You have ${user.bank} in your bank`
    );
  }
});

client.slash.set("work", {
  name: "work",
  description: "Earn spooky coins",

  async execute(i) {
    const fs = require("fs");

    // ===== COOLDOWN =====
    const cd = checkCooldown(i.user.id, "work", 46000, i.member);
    if (cd) {
      return i.reply({ content: `⏳ Wait ${cd}s`, ephemeral: true });
    }

    // ===== DATABASE =====
    const db = JSON.parse(fs.readFileSync("./eco.json"));
    const userId = i.user.id;

    if (!db[userId]) {
      db[userId] = { wallet: 0, bank: 0 };
    }

    // ===== RANDOM EARN =====
    const amount = Math.floor(Math.random() * (175 - 50 + 1)) + 50;

    db[userId].wallet += amount;

    fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

    // ===== RESPONSE =====
    return i.reply(
      `<:sus:1496881464124510269> You worked and earned ${amount} spooky coins`
    );
  }
});

// ===== READY =====
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [...client.slash.values()].map(cmd => ({
    name: cmd.name,
    description: cmd.description
  }));

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash commands registered");
});

// ===== PREFIX COMMANDS (!)
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.guild) return;

  if (!msg.content.startsWith("!")) return;

  const args = msg.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ===== PING =====
if (cmd === "ping") {
  const cd = checkCooldown(msg.author.id, "ping", 3000, msg.member);
  if (cd) {
    return msg.reply(`⏳ Wait ${cd}s`);
  }

  const sent = await msg.reply("🏓 Pinging...");

  const latency = sent.createdTimestamp - msg.createdTimestamp;
  const apiPing = Math.round(client.ws.ping);

  await sent.edit(
    `🏓 Pong!\n📡 Latency: ${latency}ms\n⚡ API: ${apiPing}ms`
  );
}

  // ===== EXAMPLE MOD COMMAND =====
  if (cmd === "say") {
    if (!msg.member.permissions.has("ManageMessages")) {
      return msg.reply("❌ No permission");
    }

    return msg.channel.send(args.join(" "));
  }
});

// ===== SLASH HANDLER (/)
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  const cmd = client.slash.get(i.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(i);
  } catch (err) {
    console.error(err);
    i.reply({ content: "❌ Error", ephemeral: true });
  }
});

// ===== LOGIN =====
client.login(TOKEN);
