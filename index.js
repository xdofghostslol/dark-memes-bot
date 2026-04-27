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

client.slash.set("rob", {
  name: "rob",
  description: "Rob a user's bank",
  options: [
    {
      name: "user",
      description: "User to rob",
      type: 6, // USER
      required: true
    }
  ],

  async execute(i) {
    const fs = require("fs");

    const target = i.options.getUser("user");

    // ===== BASIC CHECKS =====
    if (target.id === i.user.id) {
      return i.reply({ content: "❌ You can't rob yourself", ephemeral: true });
    }

    if (target.bot) {
      return i.reply({ content: "❌ You can't rob bots", ephemeral: true });
    }

    // ===== COOLDOWN =====
    const cd = checkCooldown(i.user.id, "rob", 60000, i.member);
    if (cd) {
      return i.reply({ content: `⏳ Wait ${cd}s`, ephemeral: true });
    }

    // ===== DATABASE =====
    const db = JSON.parse(fs.readFileSync("./eco.json"));

    if (!db[i.user.id]) db[i.user.id] = { wallet: 0, bank: 0 };
    if (!db[target.id]) db[target.id] = { wallet: 0, bank: 0 };

    const user = db[i.user.id];
    const victim = db[target.id];

    // ===== REQUIREMENT =====
    if (victim.bank < 500) {
      return i.reply({
        content: "❌ Target needs at least 500 in bank",
        ephemeral: true
      });
    }

    // ===== SUCCESS / FAIL =====
    const success = Math.random() < 0.5;

    if (success) {
      const amount = Math.floor(Math.random() * (victim.bank * 0.4)) + 100;

      victim.bank -= amount;
      user.wallet += amount;

      fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

      return i.reply({
        embeds: [
          {
            color: 0x00ff88,
            description:
              `<:papasus:1484838610879385740> **Rob Successful**\n\n` +
              `You robbed ${target.username}'s bank and got **${amount} spooky coins**`
          }
        ]
      });
    } else {
      const loss = 2000;

      user.wallet -= loss;
      if (user.wallet < 0) user.wallet = 0;

      fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

      return i.reply({
        embeds: [
          {
            color: 0xff4444,
            description:
              `<:laugh:1496881613659967569> **Rob Failed**\n\n` +
              `Police caught you and fined **${loss} spooky coins**`
          }
        ]
      });
    }
  }
});

client.slash.set("crime", {
  name: "crime",
  description: "Do a crime for spooky coins",

  async execute(i) {
    const fs = require("fs");

    // ===== DATABASE =====
    const db = JSON.parse(fs.readFileSync("./eco.json"));
    const userId = i.user.id;

    if (!db[userId]) db[userId] = { wallet: 0, bank: 0, crimeCount: 0 };

    const user = db[userId];

    // ===== INIT EXTRA DATA =====
    if (!user.crimeCount) user.crimeCount = 0;
    if (!user.lastCrime) user.lastCrime = 0;

    const now = Date.now();

    // ===== COOLDOWN LOGIC =====
    let cooldown = 50000; // 50s

    if (user.crimeCount === 1) cooldown = 5 * 60 * 1000; // 5m
    if (user.crimeCount >= 2) cooldown = 10 * 60 * 1000; // 10m

    const timePassed = now - user.lastCrime;

    if (timePassed < cooldown) {
      const remaining = ((cooldown - timePassed) / 1000).toFixed(1);
      return i.reply({ content: `⏳ Wait ${remaining}s`, ephemeral: true });
    }

    // ===== SUCCESS / FAIL =====
    const success = Math.random() < 0.5;

    // ===== SUCCESS =====
    if (success) {
      const amount = Math.floor(Math.random() * (678 - 500 + 1)) + 500;

      user.wallet += amount;
      user.crimeCount += 1;
      user.lastCrime = now;

      fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

      return i.reply({
        embeds: [
          {
            color: 0x00ff00,
            description:
              `<:trolled:1497924204694081626> **Crime Successful**\n\n` +
              `You crimed and got **${amount} spooky coins**`
          }
        ]
      });
    }

    // ===== FAIL =====
    else {
      user.crimeCount += 1;
      user.lastCrime = now;

      fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

      return i.reply({
        embeds: [
          {
            color: 0xff0000,
            description:
              `<:laugh:1496881613659967569> **Crime Failed**\n\n` +
              `The police are near`
          }
        ]
      });
    }
  }
});

client.slash.set("gamble", {
  name: "gamble",
  description: "Gamble your spooky coins",
  options: [
    {
      name: "amount",
      description: "Amount to gamble",
      type: 4,
      required: true
    }
  ],

  async execute(i) {
    const fs = require("fs");

    const amount = i.options.getInteger("amount");

    // ===== COOLDOWN =====
    const cd = checkCooldown(i.user.id, "gamble", 10000, i.member);
    if (cd) {
      return i.reply({ content: `⏳ Wait ${cd}s`, ephemeral: true });
    }

    // ===== DATABASE =====
    const db = JSON.parse(fs.readFileSync("./eco.json"));
    const userId = i.user.id;

    if (!db[userId]) db[userId] = { wallet: 0, bank: 0 };

    const user = db[userId];

    // ===== VALIDATION =====
    if (amount <= 0) {
      return i.reply({ content: "❌ Enter a valid amount", ephemeral: true });
    }

    if (user.wallet < amount) {
      return i.reply({ content: "❌ Not enough coins", ephemeral: true });
    }

    // ===== WIN / LOSE =====
    const win = Math.random() < 0.6;

    if (win) {
      user.wallet += amount;

      fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

      return i.reply({
        embeds: [
          {
            color: 0x00ff00,
            description:
              `<a:balance:1497983888792752229> **Gamble Won**\n\n` +
              `You won **${amount} spooky coins**`
          }
        ]
      });
    } else {
      user.wallet -= amount;

      fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

      return i.reply({
        embeds: [
          {
            color: 0xff0000,
            description:
              `<:fuck:1496881571247030293> **Gamble Lost**\n\n` +
              `You lost **${amount} spooky coins**`
          }
        ]
      });
    }
  }
});

client.slash.set("withdraw", {
  name: "withdraw",
  description: "Withdraw spooky coins from your bank",
  options: [
    {
      name: "amount",
      description: "Amount to withdraw",
      type: 4, // INTEGER
      required: true
    }
  ],

  async execute(i) {
    const fs = require("fs");

    const amount = i.options.getInteger("amount");

    // ===== DATABASE =====
    const db = JSON.parse(fs.readFileSync("./eco.json"));
    const userId = i.user.id;

    if (!db[userId]) db[userId] = { wallet: 0, bank: 0 };

    const user = db[userId];

    // ===== VALIDATION =====
    if (amount <= 0) {
      return i.reply({ content: "❌ Enter a valid amount", ephemeral: true });
    }

    if (user.bank < amount) {
      return i.reply({ content: "❌ Not enough coins in bank", ephemeral: true });
    }

    // ===== TRANSFER =====
    user.bank -= amount;
    user.wallet += amount;

    fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

    // ===== RESPONSE =====
    return i.reply({
      embeds: [
        {
          color: 0x57F287,
          description:
            `<:bankeed:1497983802566512691> **Withdraw Successful**\n\n` +
            `You withdrew **${amount} spooky coins**`
        }
      ]
    });
  }
});

client.slash.set("deposit", {
  name: "deposit",
  description: "Deposit spooky coins to your bank",
  options: [
    {
      name: "amount",
      description: "Amount to deposit",
      type: 4, // INTEGER
      required: true
    }
  ],

  async execute(i) {
    const fs = require("fs");

    const amount = i.options.getInteger("amount");

    // ===== DATABASE =====
    const db = JSON.parse(fs.readFileSync("./eco.json"));
    const userId = i.user.id;

    if (!db[userId]) db[userId] = { wallet: 0, bank: 0 };

    const user = db[userId];

    // ===== VALIDATION =====
    if (amount <= 0) {
      return i.reply({ content: "❌ Enter a valid amount", ephemeral: true });
    }

    if (user.wallet < amount) {
      return i.reply({ content: "❌ Not enough coins in wallet", ephemeral: true });
    }

    // ===== TRANSFER =====
    user.wallet -= amount;
    user.bank += amount;

    fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

    // ===== RESPONSE =====
    return i.reply({
      embeds: [
        {
          color: 0x57F287,
          description:
            `<a:balance:1497983888792752229> **Deposit Successful**\n\n` +
            `You deposited **${amount} spooky coins**`
        }
      ]
    });
  }
});

client.slash.set("addspookycoins", {
  name: "addspookycoins",
  description: "Add spooky coins to a user",
  options: [
    {
      name: "user",
      description: "User to add coins to",
      type: 6, // USER
      required: true
    },
    {
      name: "amount",
      description: "Amount to add",
      type: 4, // INTEGER
      required: true
    }
  ],

  async execute(i) {
    const fs = require("fs");

    // ===== PERMISSION (only owner/co/manager) =====
    if (!isBypass(i.member)) {
      return i.reply({ content: "❌ No permission", ephemeral: true });
    }

    const target = i.options.getUser("user");
    const amount = i.options.getInteger("amount");

    if (amount <= 0) {
      return i.reply({ content: "❌ Invalid amount", ephemeral: true });
    }

    const db = JSON.parse(fs.readFileSync("./eco.json"));

    if (!db[target.id]) db[target.id] = { wallet: 0, bank: 0 };

    // ✅ GENERATED coins (not taken from anywhere)
    db[target.id].wallet += amount;

    fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

    return i.reply(
      `<:mk:1496873898879221882> added \`${amount}\` to ${target.username}`
    );
  }
});

client.slash.set("removespookycoins", {
  name: "removespookycoins",
  description: "Remove spooky coins from a user",
  options: [
    {
      name: "user",
      description: "User to remove coins from",
      type: 6, // USER
      required: true
    },
    {
      name: "amount",
      description: "Amount to remove",
      type: 4, // INTEGER
      required: true
    }
  ],

  async execute(i) {
    const fs = require("fs");

    // ===== PERMISSION =====
    if (!isBypass(i.member)) {
      return i.reply({ content: "❌ No permission", ephemeral: true });
    }

    const target = i.options.getUser("user");
    const amount = i.options.getInteger("amount");

    if (amount <= 0) {
      return i.reply({ content: "❌ Invalid amount", ephemeral: true });
    }

    const db = JSON.parse(fs.readFileSync("./eco.json"));

    if (!db[target.id]) db[target.id] = { wallet: 0, bank: 0 };

    // ❌ remove from wallet only
    db[target.id].wallet -= amount;
    if (db[target.id].wallet < 0) db[target.id].wallet = 0;

    fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

    return i.reply(
      `<:mk:1496873898879221882> removed \`${amount}\` from ${target.username}`
    );
  }
});

client.slash.set("giveall", {
  name: "giveall",
  description: "Give spooky coins to all members",
  options: [
    {
      name: "amount",
      description: "Amount to give",
      type: 4,
      required: true
    }
  ],

  async execute(i) {
    const fs = require("fs");

    // ===== PERMISSION =====
    if (!isBypass(i.member)) {
      return i.reply({ content: "❌ No permission", ephemeral: true });
    }

    const amount = i.options.getInteger("amount");

    if (amount <= 0) {
      return i.reply({ content: "❌ Invalid amount", ephemeral: true });
    }

    await i.deferReply();

    const db = JSON.parse(fs.readFileSync("./eco.json"));

    // ===== FETCH MEMBERS =====
    const members = await i.guild.members.fetch();
    const memberArray = [...members.values()];

    const start = Date.now();
    const TIMEOUT = 60000; // 60 sec
    const BATCH_SIZE = 25; // 🔥 optimized for your server

    let count = 0;

    for (let i2 = 0; i2 < memberArray.length; i2 += BATCH_SIZE) {

      // ⏱ TIMEOUT CHECK
      if (Date.now() - start > TIMEOUT) {
        return i.editReply({
          embeds: [
            {
              color: 0xff0000,
              description:
                `<:bruh:1463071943271120937> **Giveall Timed Out**\n\n` +
                `Processed ${count} members`
            }
          ]
        });
      }

      const batch = memberArray.slice(i2, i2 + BATCH_SIZE);

      for (const member of batch) {
        if (member.user.bot) continue;

        if (!db[member.id]) db[member.id] = { wallet: 0, bank: 0 };

        db[member.id].wallet += amount;
        count++;
      }

      // small delay (keeps bot responsive)
      await new Promise(res => setTimeout(res, 5));
    }

    fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

    return i.editReply(
      `<:mk:1496873898879221882> added \`${amount}\` spooky coins to all the members (${count})`
    );
  }
});

client.slash.set("announce", {
  name: "announce",
  description: "Send an announcement",
  options: [
    {
      name: "message",
      description: "Announcement message",
      type: 3,
      required: true
    },
    {
      name: "channel",
      description: "Channel to send in (optional)",
      type: 7,
      required: false
    }
  ],

  async execute(i) {

    // ===== PERMISSION =====
    if (!isBypass(i.member)) {
      return i.reply({ content: "❌ No permission", ephemeral: true });
    }

    const message = i.options.getString("message");
    const channel = i.options.getChannel("channel") || i.channel;

    // ===== GREY EMBED =====
    const embed = {
      color: 0x2F3136, // 🔥 grey (Discord dark theme style)
      title: `<:announcement:1496542405405704192> announcement`,
      description: message,
      footer: {
        text: `Announced by ${i.user.username}`
      },
      timestamp: new Date()
    };

    await channel.send({ embeds: [embed] });

    return i.reply({ content: "✅ Announcement sent", ephemeral: true });
  }
});

// ===== READY =====
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // ✅ THIS LINE GOES HERE
  const commands = [...client.slash.values()].map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    options: cmd.options || []
  }));

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  // clear old
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: [] }
  );

  // register new
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
