require("dotenv").config();
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  Collection,
  REST,        // ✅ ADD THIS
  Routes       // ✅ ADD THIS
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const fs = require("fs");
const DATA_FILE = "./eco.json";

// ===== ECONOMY SYSTEM =====
let eco = {};

if (fs.existsSync("./eco.json")) {
  try {
    eco = JSON.parse(fs.readFileSync("./eco.json"));
  } catch {
    eco = {};
  }
}


let data = { warns: {} };

// load file
if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    data = { warns: {} };
  }
}

// safety (VERY IMPORTANT)
if (!data.warns) data.warns = {};

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

// ===== SLASH STORAGE =====
client.slash = new Collection();

// ===== COOLDOWN SYSTEM =====
const cooldowns = new Map();

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
  description: "Check balance",
  options: [
    {
      name: "user",
      description: "User to check",
      type: 6, // USER
      required: false
    }
  ],

  async execute(i) {
    const fs = require("fs");

    const target = i.options.getUser("user") || i.user;

    const db = JSON.parse(fs.readFileSync("./eco.json"));

    if (!db[target.id]) {
      db[target.id] = { wallet: 0, bank: 0 };
    }

    const wallet = db[target.id].wallet || 0;
    const bank = db[target.id].bank || 0;

    return i.reply(
      `<a:balance:1497983888792752229> ${target.username} has in wallet: ${wallet}\n` +
      `<:bankeed:1497983802566512691> has in bank: ${bank}`
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

  if (Date.now() - start > TIMEOUT) {
    return i.editReply({
      embeds: [
        {
          color: 0xff0000,
          description: `Timed out`
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

  await new Promise(r => setTimeout(r, 50));
}

// ✅ after loop
fs.writeFileSync("./eco.json", JSON.stringify(db, null, 2));

return i.editReply(
  `<:mk:1496873898879221882> added \`${amount}\` spooky coins to all members (${count})`
);
} // closes execute
}); // closes client.slash.set

client.slash.set("announce", {
  name: "announce",
  description: "Send an announcement",
  default_member_permissions: "0", // 🔒 hides from normal users

  options: [
    {
      name: "message",
      description: "Announcement message",
      type: 3,
      required: true
    },
    {
      name: "channel",
      description: "Channel to send in",
      type: 7,
      required: false
    }
  ],

  async execute(i) {

    // ===== STRICT ROLE CHECK =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER
    ];

    const hasPermission = i.member.roles.cache.some(role =>
      allowedRoles.includes(role.id)
    );

    if (!hasPermission) {
      return i.reply({ content: "❌ No permission", ephemeral: true });
    }

    const message = i.options.getString("message");
    const channel = i.options.getChannel("channel") || i.channel;

    // ===== EMBED =====
    const embed = {
      color: 0x2F3136, // grey
      title: `<:ann:1496885917288370186> announcement`,
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

client.slash.set("userinfo", {
  name: "userinfo",
  description: "Get user info",
  default_member_permissions: "0",

  options: [
    { name: "user", type: 6, description: "Select user", required: false },
    { name: "userid", type: 3, description: "User ID", required: false }
  ],

  async execute(i) {

    // ===== STAFF CHECK =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.ADMIN,
      ROLES.MODERATOR,
      ROLES.STAFF
    ];

    if (!i.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return i.reply({ content: "❌ No permission", ephemeral: true });
    }

    let user = i.options.getUser("user");
    const userIdInput = i.options.getString("userid");

    if (user && userIdInput) {
      return i.reply({
        content: "❌ Use either user or user ID",
        ephemeral: true
      });
    }

    if (!user && userIdInput) {
      try {
        user = await i.client.users.fetch(userIdInput);
      } catch {
        return i.reply({ content: "❌ Invalid user ID", ephemeral: true });
      }
    }

    if (!user) user = i.user;

    // ===== MEMBER =====
    let member = null;
    try {
      member = await i.guild.members.fetch(user.id);
    } catch {}

    const username = user.globalName || user.username;
    const avatar = user.displayAvatarURL({ dynamic: true });

    const created = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
    const joined = member
      ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
      : "Not in server";

    const displayName = member ? member.displayName : username;

    // ===== STATUS =====
    let status = "Offline";
    if (member?.presence?.status) {
      const map = {
        online: "🟢 Online",
        idle: "🌙 Idle",
        dnd: "⛔ Do Not Disturb",
        offline: "⚫ Offline"
      };
      status = map[member.presence.status] || "Offline";
    }

    // ===== ROLES =====
    let roles = "No roles";
    if (member) {
      const roleList = member.roles.cache
        .filter(r => r.id !== i.guild.id)
        .map(r => `<@&${r.id}>`);

      if (roleList.length) {
        roles = roleList.slice(0, 10).join(", ");
        if (roleList.length > 10) roles += " ...";
      }
    }

    // ===== BADGES =====
    const flags = user.flags?.toArray() || [];
    const badgeMap = {
      Staff: "🛠️ Staff",
      Partner: "🤝 Partner",
      Hypesquad: "🎉 HypeSquad",
      BugHunterLevel1: "🐛 Bug Hunter",
      BugHunterLevel2: "🐞 Bug Hunter+",
      HypeSquadOnlineHouse1: "🏠 Bravery",
      HypeSquadOnlineHouse2: "🏠 Brilliance",
      HypeSquadOnlineHouse3: "🏠 Balance",
      PremiumEarlySupporter: "💎 Early Supporter",
      VerifiedBot: "🤖 Verified Bot",
      ActiveDeveloper: "⚡ Dev"
    };

    const badges = flags.length
      ? flags.map(f => badgeMap[f] || f).join(", ")
      : "No badges";

    // ===== MUTUAL SERVERS =====
    const mutual = i.client.guilds.cache.filter(g =>
      g.members.cache.has(user.id)
    ).size;

    // ===== BANNER =====
    let banner = null;
    try {
      const fetched = await i.client.users.fetch(user.id, { force: true });
      banner = fetched.bannerURL({ size: 1024 });
    } catch {}

    // ===== EMBED =====
    const embed = {
      color: 0x2F3136,
      title: `<:executed:1496874383447429271> USER INFO`,
      thumbnail: { url: avatar },
      description:
        `**Name** - ${username}\n` +
        `**Display Name** - ${displayName}\n` +
        `**Status** - ${status}\n` +
        `**Badges** - ${badges}\n` +
        `**Mutual Servers** - ${mutual}\n` +
        `**Account Created** - ${created}\n` +
        `**When Joined** - ${joined}\n` +
        `**Roles** - ${roles}`
    };

    if (banner) embed.image = { url: banner };

    return i.reply({ embeds: [embed] });
  }
});

client.slash.set("avatar", {
  name: "avatar",
  description: "Show a user's avatar",
  options: [
    {
      name: "user",
      description: "Select a user",
      type: 6,
      required: false
    }
  ],

  async execute(i) {
    const user = i.options.getUser("user") || i.user;

    const avatar = user.displayAvatarURL({
      dynamic: true,
      size: 1024
    });

    const embed = {
      color: 0x2F3136,
      title: `${user.username}'s Avatar`,
      image: { url: avatar }
    };

    return i.reply({ embeds: [embed] });
  }
});

client.slash.set("8ball", {
  name: "8ball",
  description: "Ask the magic 8ball a question",

  options: [
    {
      name: "question",
      description: "Your question",
      type: 3,
      required: true
    }
  ],

  async execute(i) {
    const question = i.options.getString("question");

    const responses = [
      "Yes.",
      "No.",
      "Maybe.",
      "Definitely.",
      "Absolutely not.",
      "Ask again later.",
      "I think so.",
      "Doubt it.",
      "Without a doubt.",
      "Very unlikely.",
      "Signs point to yes.",
      "Cannot predict now."
    ];

    const answer = responses[Math.floor(Math.random() * responses.length)];

    const embed = {
      color: 0x2F3136,
      title: "🎱 Magic 8Ball",
      description:
        `**Question:** ${question}\n\n` +
        `**Answer:** ${answer}`
    };

    return i.reply({ embeds: [embed] });
  }
});

const shootCooldown = new Map();

client.slash.set("shoot", {
  name: "shoot",
  description: "Try to shoot someone",

  options: [
    {
      name: "user",
      description: "Target user",
      type: 6,
      required: true
    }
  ],

  async execute(i) {

    const userId = i.user.id;

    // ===== COOLDOWN =====
    const now = Date.now();
    const cooldown = 35000;

    if (shootCooldown.has(userId)) {
      const expire = shootCooldown.get(userId) + cooldown;

      if (now < expire) {
        const remaining = ((expire - now) / 1000).toFixed(1);
        return i.reply({
          content: `⏳ Wait ${remaining}s before shooting again`,
          ephemeral: true
        });
      }
    }

    shootCooldown.set(userId, now);

    const target = i.options.getUser("user");

    // ===== FAIL OR SUCCESS =====
    const isFail = Math.random() < 0.66;

    if (isFail) {
      return i.reply({
        content: `<:laugh:1496881613659967569> u failed to shoot ${target} - try again!`
      });
    }

    // ===== SUCCESS =====
    const parts = ["Chest", "Leg", "Hand"];
    const part = parts[Math.floor(Math.random() * parts.length)];

    return i.reply({
      content: `<:nice:1484839090708025396> Shot ${target} - ${part}`
    });
  }
});

client.slash.set("warnings", {
  name: "warnings",
  description: "Check warnings of a user",
  options: [
    {
      name: "user",
      description: "Select user",
      type: 6,
      required: false
    },
    {
      name: "id",
      description: "User ID",
      type: 3,
      required: false
    }
  ],

  execute: async (i) => {
    try {
      let targetUser = i.options.getUser("user");
const idInput = i.options.getString("id");

if (!targetUser && idInput) {
  try {
    targetUser = await i.client.users.fetch(idInput);
  } catch {
    targetUser = null;
  }
}

      if (!targetUser) {
        return i.reply({ content: "Provide a user or ID", ephemeral: true });
      }

      const member = await i.guild.members.fetch(targetUser.id).catch(() => null);

      const userData = data?.warns?.[targetUser.id] || { count: 0, history: [] };
const count = userData.count;

      // ===== NO WARNS
      if (!userData || count === 0) {
        return i.reply({
          embeds: [{
            color: 0x2F3136,
            author: {
              name: targetUser.tag,
              icon_url: targetUser.displayAvatarURL({ dynamic: true })
            },
            description:
              `User - <@${targetUser.id}>\n` +
              `Display - ${member?.displayName || targetUser.username}\n\n` +
              `√ No warnings in this server`
          }],
          ephemeral: true
        });
      }

      // ===== HISTORY
      const history = (userData.history || [])
  .slice(-5)
  .map((h, idx) => `#${idx + 1} • ${h.reason} - <@${h.staff}>`)
  .join("\n") || "No history";

      // ===== EMBED
      const embed = {
        color: 0x2F3136,
        author: {
          name: targetUser.tag,
          icon_url: targetUser.displayAvatarURL({ dynamic: true })
        },
        description:
          `User - <@${targetUser.id}>\n` +
          `Display - ${member?.displayName || targetUser.username}\n\n` +
          `<:calm:1496874083525070848> **Total warnings - ${count}**\n\n` +
          `History:\n${history}`
      };

      // ===== BUTTON
      const row = {
        type: 1,
        components: [
          {
            type: 2,
            style: 4,
            label: "Clear Warnings",
            custom_id: `clearwarn_${targetUser.id}`
          }
        ]
      };

      await i.reply({ embeds: [embed], components: [row] });

    } catch (err) {
      console.error(err);
      i.reply({ content: "Error occurred", ephemeral: true }).catch(() => {});
    }
  }
});

client.slash.set("addrole", {
  name: "addrole",
  description: "Add a role to a user",

  options: [
    {
      name: "user",
      description: "Select user",
      type: 6,
      required: true
    },
    {
      name: "role",
      description: "Select role",
      type: 8,
      required: true
    }
  ],

  async execute(i) {

    // ===== STAFF CHECK =====
    const allowedRoles = [
  ROLES.OWNER,
  ROLES.CO_OWNER,
  ROLES.SERVER_MANAGER
];

    const hasPermission = i.member.roles.cache.some(r =>
      allowedRoles.includes(r.id)
    );

    if (!hasPermission) {
      return i.reply({
        content: "<:fuck:1496881571247030293> No permission",
        ephemeral: true
      });
    }

    // ===== TARGET =====
    const targetUser = i.options.getUser("user");
    const role = i.options.getRole("role");

    const member = await i.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return i.reply({
        content: "<:fuck:1496881571247030293> User not found",
        ephemeral: true
      });
    }

    // ===== ROLE PROTECTION =====
    if (role.position >= i.member.roles.highest.position) {
      return i.reply({
        content: "<:fuck:1496881571247030293> Cannot add equal/higher role",
        ephemeral: true
      });
    }

    // ===== BOT ROLE CHECK =====
    if (role.position >= i.guild.members.me.roles.highest.position) {
      return i.reply({
        content: "<:fuck:1496881571247030293> My role is too low",
        ephemeral: true
      });
    }

    // ===== ALREADY HAS ROLE =====
    if (member.roles.cache.has(role.id)) {
      return i.reply({
        content: "<:fuck:1496881571247030293> User already has that role",
        ephemeral: true
      });
    }

    // ===== ADD ROLE =====
    await member.roles.add(role).catch(() => {});

    // ===== CHANNEL EMBED =====
    const embed = {
      color: 0x57F287,
      description:
        `<:mk:1496873898879221882> **Role Added**\n\n` +
        `👤 User: ${targetUser}\n` +
        `🎭 Role: ${role}\n` +
        `🛡️ Staff: <@${i.user.id}>`,
      timestamp: new Date()
    };

    await i.reply({ embeds: [embed] });

    // ===== DM USER =====
    await targetUser.send({
      embeds: [
        {
          color: 0x57F287,
          description:
            `<:mk:1496873898879221882> You received a role in **${i.guild.name}**\n\n` +
            `🎭 Role: ${role}`,
          timestamp: new Date()
        }
      ]
    }).catch(() => {});

    // ===== LOG CHANNEL =====
    const logChannel =
      i.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      await logChannel.send({
        embeds: [
          {
            color: 0x57F287,
            description:
              `<:mk:1496873898879221882> **Role Added Log**\n\n` +
              `👤 User: ${targetUser} (${targetUser.id})\n` +
              `🎭 Role: ${role.name}\n` +
              `🛡️ Staff: <@${i.user.id}>`,
            timestamp: new Date()
          }
        ]
      }).catch(() => {});
    }
  }
});

client.slash.set("removerole", {
  name: "removerole",
  description: "Remove a role from a user",

  options: [
    {
      name: "user",
      description: "Select user",
      type: 6,
      required: true
    },
    {
      name: "role",
      description: "Select role",
      type: 8,
      required: true
    }
  ],

  async execute(i) {

    // ===== OWNER / CO / MANAGER ONLY =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER
    ];

    const hasPermission = i.member.roles.cache.some(r =>
      allowedRoles.includes(r.id)
    );

    if (!hasPermission) {
      return i.reply({
        content: "<:fuck:1496881571247030293> No permission",
        ephemeral: true
      });
    }

    // ===== TARGET =====
    const targetUser = i.options.getUser("user");
    const role = i.options.getRole("role");

    const member = await i.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return i.reply({
        content: "<:fuck:1496881571247030293> User not found",
        ephemeral: true
      });
    }

    // ===== ROLE PROTECTION =====
    if (role.position >= i.member.roles.highest.position) {
      return i.reply({
        content: "<:fuck:1496881571247030293> Cannot remove equal/higher role",
        ephemeral: true
      });
    }

    // ===== BOT ROLE CHECK =====
    if (role.position >= i.guild.members.me.roles.highest.position) {
      return i.reply({
        content: "<:fuck:1496881571247030293> My role is too low",
        ephemeral: true
      });
    }

    // ===== USER DOESN'T HAVE ROLE =====
    if (!member.roles.cache.has(role.id)) {
      return i.reply({
        content: "<:fuck:1496881571247030293> User doesn't have that role",
        ephemeral: true
      });
    }

    // ===== REMOVE ROLE =====
    await member.roles.remove(role).catch(() => {});

    // ===== CHANNEL EMBED =====
    const embed = {
      color: 0xff0000,
      description:
        `<:mk:1496873898879221882> **Role Removed**\n\n` +
        `👤 User: ${targetUser}\n` +
        `🎭 Role: ${role}\n` +
        `🛡️ Staff: <@${i.user.id}>`,
      timestamp: new Date()
    };

    await i.reply({ embeds: [embed] });

    // ===== DM USER =====
    await targetUser.send({
      embeds: [
        {
          color: 0xff0000,
          description:
            `<:mk:1496873898879221882> A role was removed from you in **${i.guild.name}**\n\n` +
            `🎭 Role: ${role}`,
          timestamp: new Date()
        }
      ]
    }).catch(() => {});

    // ===== LOG CHANNEL =====
    const logChannel =
      i.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      await logChannel.send({
        embeds: [
          {
            color: 0xff0000,
            description:
              `<:mk:1496873898879221882> **Role Removed Log**\n\n` +
              `👤 User: ${targetUser} (${targetUser.id})\n` +
              `🎭 Role: ${role.name}\n` +
              `🛡️ Staff: <@${i.user.id}>`,
            timestamp: new Date()
          }
        ]
      }).catch(() => {});
    }
  }
});

client.slash.set("help", {
  name: "help",
  description: "Show all bot commands",

  async execute(i) {
    try {

      // =========================
      // SLASH AUTO GROUPING
      // =========================
      const economy = [];
      const info = [];
      const fun = [];
      const staff = [];

      for (const cmd of client.slash.values()) {

        const line = `\`/${cmd.name}\` - ${cmd.description || "No desc"}`;

        if (["balance","work","rob","crime","gamble","withdraw","deposit"].includes(cmd.name)) {
          economy.push(line);
        }

        else if (["userinfo","avatar","serverinfo","warnings","help"].includes(cmd.name)) {
          info.push(line);
        }

        else if (["8ball","shoot"].includes(cmd.name)) {
          fun.push(line);
        }

        else {
          staff.push(line);
        }
      }

      // =========================
      // PREFIX AUTO (from your code style)
      // =========================
      const prefixCommands = [
        "`!warn` - Warn user",
        "`!ban` - Ban user",
        "`!unban` - Unban user",
        "`!massban` - Mass ban",
        "`!softban` - Soft ban",
        "`!kick` - Kick user",
        "`!mute` - Mute user",
        "`!unmute` - Unmute user",
        "`!deafen` - Voice deafen",
        "`!undeafen` - Remove deafen",
        "`!slowmode` - Set slowmode",
        "`!lock` - Lock channel",
        "`!unlock` - Unlock channel",
        "`!hide` - Hide channel",
        "`!unhide` - Unhide channel",
        "`!nuke` - Reset channel",
        "`!cleanup` - Clean messages",
        "`!forceban` - Permanent ban system",
        "`!roleadd` - Add role",
        "`!roleremove` - Remove role",
        "`!serverinfo` - Server info",
        "`!snipe` - Deleted messages"
      ];

      // =========================
      // EMBED (YOUR STYLE)
      // =========================
      const embed = {
        color: 0x2F3136,
        title: "📖 DARK HELP MENU",
        description:
          `<:calm:1496874083525070848> Full command list of the bot (AUTO UPDATING)`,

        fields: [

          {
            name: "💰 Economy (/)",
            value: economy.join("\n") || "No commands"
          },

          {
            name: "📊 Info (/)",
            value: info.join("\n") || "No commands"
          },

          {
            name: "🎮 Fun (/)",
            value: fun.join("\n") || "No commands"
          },

          {
            name: "⚙️ Staff (/)",
            value: staff.join("\n") || "No commands"
          },

          {
            name: "💀 Prefix Commands (! / ?)",
            value: prefixCommands.join("\n")
          },

          {
            name: "👑 Note",
            value:
              "✔ Slash commands auto-update\n" +
              "⚠ Prefix commands are static (Discord limitation)\n" +
              "👮 Staff-only commands require permissions"
          }
        ],

        footer: {
          text: `Requested by ${i.user.username}`
        }
      };

      return i.reply({ embeds: [embed], ephemeral: true });

    } catch (err) {
      console.error(err);
      return i.reply({
        content: "<:calm:1496874083525070848> Error loading help",
        ephemeral: true
      });
    }
  }
});

client.slash.set("setnick", {
  name: "setnick",
  description: "Change a user's nickname (Staff only)",

  options: [
    {
      name: "user",
      type: 6,
      description: "Target user",
      required: true
    },
    {
      name: "nickname",
      type: 3,
      description: "New nickname",
      required: true
    }
  ],

  async execute(i) {
    try {

      // ALL STAFF ROLES (edit/add your IDs here)
      const staffRoles = [
        ROLES.OWNER,
        ROLES.CO_OWNER,
        ROLES.SERVER_MANAGER,
        ROLES.HEAD_MOD,
        ROLES.SENIOR_MOD,
        ROLES.MODERATOR,
        ROLES.TRIAL_MOD
      ];

      // permission check
      if (!i.member.roles.cache.some(r => staffRoles.includes(r.id))) {
        return i.reply({
          content: "<:no:1496873950913761431> Staff only command",
          ephemeral: true
        });
      }

      const user = i.options.getUser("user");
      const nick = i.options.getString("nickname");

      const member = await i.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        return i.reply({
          content: "<:no:1496873950913761431> User not found in server",
          ephemeral: true
        });
      }

      // hierarchy protection
      if (member.roles.highest.position >= i.member.roles.highest.position) {
        return i.reply({
          content: "<:no:1496873950913761431> You cannot change this user's nickname",
          ephemeral: true
        });
      }

      await member.setNickname(nick).catch(() => null);

      return i.reply({
        embeds: [{
          color: 0x57F287,
          description:
            `<:calm:1496874083525070848> **Nickname Updated**\n\n` +
            `👤 User: <@${user.id}>\n` +
            `🏷️ New Nickname: **${nick}**\n` +
            `👮 Changed by: <@${i.user.id}>`
        }]
      });

    } catch (err) {
      console.error(err);
      return i.reply({
        content: "<:no:1496873950913761431> Error executing command",
        ephemeral: true
      });
    }
  }
});

// =====================================================
// CLEAN AUTO BOOST SYSTEM
// REAL BOOST DETECTION + /boost COMMAND
// =====================================================

// ===== ROLE IDS =====
const VIP_ROLE = "1473267460726591599";
const BOOSTER_ROLE = "1473271384464429250";
const TRIAL_MOD = "1468481113965203591";

// ===== BOOST DATA =====
let boosts = {};

if (fs.existsSync("./boosts.json")) {
    boosts = JSON.parse(fs.readFileSync("./boosts.json"));
}

// =====================================================
// BOOST REWARD FUNCTION
// =====================================================
async function handleBoost(member, amount, channel) {

    try {

        // ===== ECONOMY CHECK =====
        if (!eco[member.id]) {
            eco[member.id] = {
                wallet: 0,
                bank: 0
            };
        }

        let coins = 0;
        let xp = 0;
        let rolesToAdd = [];
        let description = "";

        // =====================================================
        // 1 BOOST
        // =====================================================
        if (amount === 1) {

            coins = 50000;
            xp = 10000;

            rolesToAdd = [
                VIP_ROLE,
                BOOSTER_ROLE
            ];

            description =
`<a:boost:1504761906383028254> ${member} has boosted **our server 1x**!

<a:spurkle:1504759064264183819> Credited **10,000 XP**

<a:nitrobasic:1504762060267851836> Auto credited **50,000 spooky coins**

<a:bunni:1504758929039687781> VIP chat unlocked <#1504774562594951199>

<a:boost:1504761906383028254> Added roles:
<@&1473267460726591599>
<@&1473271384464429250>

Thank you for supporting our server ❤️`;
        }

        // =====================================================
        // 2 BOOSTS
        // =====================================================
        else if (amount === 2) {

            coins = 100000;
            xp = 12000;

            rolesToAdd = [
                VIP_ROLE,
                BOOSTER_ROLE,
                TRIAL_MOD
            ];

            description =
`<a:boost:1504761906383028254> ${member} has boosted **our server 2x**!

<a:dihrod:1504759585637007411> Trial Mod unlocked for **1 month**

<a:spurkle:1504759064264183819> Credited **12,000 XP**

<a:nitrobasic:1504762060267851836> Auto credited **100,000 spooky coins**

<a:bunni:1504758929039687781> VIP chat unlocked <#1504774562594951199>

<a:boost:1504761906383028254> Added roles:
<@&1473267460726591599>
<@&1473271384464429250>
<@&1468481113965203591>

Thank you for supporting our server ❤️`;
        }
        // =====================================================
        // 3 BOOSTS
        // =====================================================
        else if (amount >= 3) {

            coins = 1000000;
            xp = 50000;

            rolesToAdd = [
                VIP_ROLE,
                BOOSTER_ROLE,
                TRIAL_MOD
            ];

            description =
`<a:boost:1504761906383028254> ${member} has boosted **our server 3x**!

<a:dihrod:1504759585637007411> Trial Mod unlocked for **3 months**

<a:spurkle:1504759064264183819> Credited **50,000 XP**

<a:nitrobasic:1504762060267851836> Auto credited **1,000,000 spooky coins**

<a:bunni:1504758929039687781> VIP chat unlocked <#1504774562594951199>

<a:flowers:1504759119737913406> You can request a custom role in <#1478452247451930634>

<a:boost:1504761906383028254> Added roles:
<@&1473267460726591599>
<@&1473271384464429250>
<@&1468481113965203591>

Thank you for supporting our server ❤️`;
        }
         // =====================================================
        // GIVE ROLES
        // =====================================================
        await member.roles.add(rolesToAdd).catch(() => {});

        // =====================================================
        // AUTO CREDIT COINS
        // =====================================================
        eco[member.id].wallet += coins;

        // =====================================================
        // SAVE FILES
        // =====================================================
        fs.writeFileSync(
            "./eco.json",
            JSON.stringify(eco, null, 2)
        );

        boosts[member.id] = amount;

        fs.writeFileSync(
            "./boosts.json",
            JSON.stringify(boosts, null, 2)
        );

         // =====================================================
        // CLEAN EMBED
        // =====================================================
        if (channel) {

            await channel.send({
                embeds: [{
                    color: 0xF47FFF,

                    author: {
                        name: `${member.user.username} just boosted our server!`,
                        icon_url: member.user.displayAvatarURL({ dynamic: true })
                    },

                    thumbnail: {
                        url: member.guild.iconURL({ dynamic: true })
                    },

                    description: description,

                    footer: {
                        text: `${member.guild.name} • Thank you for boosting`
                    },

                    timestamp: new Date()
                }]
            });
        }

    } catch (err) {
        console.error(err);
    }
}
// =====================================================
// AUTO BOOST DETECTION
// =====================================================
client.on("guildMemberUpdate", async (oldMember, newMember) => {

    try {

        // USER STARTED BOOSTING
        if (!oldMember.premiumSince && newMember.premiumSince) {

            // DEFAULT AUTO = 1 BOOST
            const boostAmount = 1;

            // BOOST CHANNEL
 const boostChannel =
    newMember.guild.channels.cache.get("1484490743274799225");

            await handleBoost(
                newMember,
                boostAmount,
                boostChannel
            );
        }

    } catch (err) {
        console.error(err);
    }
});

// =====================================================
// MANUAL /BOOST COMMAND
// =====================================================
client.slash.set("boost", {
    name: "boost",
    description: "Manual boost rewards",

    options: [
        {
            name: "user",
            description: "Target user",
            type: 6,
            required: true
        },
        {
            name: "amount",
            description: "Boost amount",
            type: 4,
            required: true
        }
    ],

    async execute(i) {

        try {

            // ===== STAFF ONLY =====
            const allowedRoles = [
                ROLES.OWNER,
                ROLES.CO_OWNER,
                ROLES.SERVER_MANAGER
            ];

            if (!i.member.roles.cache.some(r =>
                allowedRoles.includes(r.id))
            ) {
                return i.reply({
                    content:
                        "<:no:1496873950913761431> You cannot use this command.",
                    ephemeral: true
                });
            }

            const user = i.options.getUser("user");
            const amount = i.options.getInteger("amount");

            if (![1,2,3].includes(amount)) {
                return i.reply({
                    content:
                        "<:no:1496873950913761431> Amount must be 1, 2 or 3.",
                    ephemeral: true
                });
            }

            const member =
                await i.guild.members.fetch(user.id);

            // PROCESS BOOST
            await handleBoost(
                member,
                amount,
                i.channel
            );

            return i.reply({
                content:
                    "<:calm:1496874083525070848> Boost rewards processed successfully.",
                ephemeral: true
            });

        } catch (err) {

            console.error(err);

            return i.reply({
                content:
                    "<:no:1496873950913761431> Error processing boost rewards.",
                ephemeral: true
            });
        }
    }
});
          
// =====================================================
// /PROMOTION
// =====================================================
client.slash.set("promotion", {
    name: "promotion",
    description: "Promote a staff member",

    options: [
        {
            name: "staff",
            description: "Select staff member",
            type: 6,
            required: true
        },
        {
            name: "role",
            description: "Select promotion role",
            type: 8,
            required: true
        },
        {
            name: "reason",
            description: "Promotion reason",
            type: 3,
            required: true
        }
    ],

    async execute(i) {

        try {

            // =========================================
            // ALLOWED STAFF
            // =========================================
            const allowedRoles = [
                ROLES.OWNER,
                ROLES.CO_OWNER,
                ROLES.SERVER_MANAGER
            ];

            if (!i.member.roles.cache.some(r =>
                allowedRoles.includes(r.id))
            ) {
                return i.reply({
                    content:
                        "<:no:1496873950913761431> You cannot use this command.",
                    ephemeral: true
                });
            }

            // =========================================
            // GET DATA
            // =========================================
            const user = i.options.getUser("staff");
            const role = i.options.getRole("role");
            const reason = i.options.getString("reason");

            const member =
                await i.guild.members.fetch(user.id);

            // =========================================
            // ADD ROLE
            // =========================================
            await member.roles.add(role);

            // =========================================
            // HIDDEN REPLY
            // =========================================
            await i.reply({
                content:
                    "<a:dihrod:1504759585637007411> Promotion processed successfully.",
                ephemeral: true
            });

            // =========================================
            // PUBLIC EMBED
            // =========================================
            return i.channel.send({
                embeds: [{
                    color: 0x5865F2,

                    author: {
                        name: "Staff Promotion",
                        icon_url: member.user.displayAvatarURL({
                            dynamic: true
                        })
                    },

                    thumbnail: {
                        url: i.guild.iconURL({ dynamic: true })
                    },

                    description:
`<a:dihrod:1504759585637007411> ${member} has been promoted

<a:dihrod:1504759585637007411> New Role:
${role}

<a:dihrod:1504759585637007411> Reason:
${reason}

<a:dihrod:1504759585637007411> Promoted By:
${i.user}`,

                    footer: {
                        text: `${i.guild.name} • Staff Management`
                    },

                    timestamp: new Date()
                }]
            });

        } catch (err) {

            console.error(err);

            return i.reply({
                content:
                    "<:no:1496873950913761431> Error processing promotion.",
                ephemeral: true
            });
        }
    }
});

// =====================================================
// /DEMOTION
// =====================================================
client.slash.set("demotion", {
    name: "demotion",
    description: "Demote a staff member",

    options: [
        {
            name: "staff",
            description: "Select staff member",
            type: 6,
            required: true
        },
        {
            name: "role",
            description: "Select role to remove",
            type: 8,
            required: true
        },
        {
            name: "reason",
            description: "Demotion reason",
            type: 3,
            required: true
        }
    ],

    async execute(i) {

        try {

            // =========================================
            // ALLOWED STAFF
            // =========================================
            const allowedRoles = [
                ROLES.OWNER,
                ROLES.CO_OWNER,
                ROLES.SERVER_MANAGER
            ];

            if (!i.member.roles.cache.some(r =>
                allowedRoles.includes(r.id))
            ) {
                return i.reply({
                    content:
                        "<:no:1496873950913761431> You cannot use this command.",
                    ephemeral: true
                });
            }

            // =========================================
            // GET DATA
            // =========================================
            const user = i.options.getUser("staff");
            const role = i.options.getRole("role");
            const reason = i.options.getString("reason");

            const member =
                await i.guild.members.fetch(user.id);

            // =========================================
            // REMOVE ROLE
            // =========================================
            await member.roles.remove(role);

            // =========================================
            // HIDDEN REPLY
            // =========================================
            await i.reply({
                content:
                    "<a:dihrod:1504759585637007411> Demotion processed successfully.",
                ephemeral: true
            });

            // =========================================
            // PUBLIC EMBED
            // =========================================
            return i.channel.send({
                embeds: [{
                    color: 0x5865F2,

                    author: {
                        name: "Staff Demotion",
                        icon_url: member.user.displayAvatarURL({
                            dynamic: true
                        })
                    },

                    thumbnail: {
                        url: i.guild.iconURL({ dynamic: true })
                    },

                    description:
`<a:dihrod:1504759585637007411> ${member} has been demoted

<a:dihrod:1504759585637007411> Removed Role:
${role}

<a:dihrod:1504759585637007411> Reason:
${reason}

<a:dihrod:1504759585637007411> Demoted By:
${i.user}`,

                    footer: {
                        text: `${i.guild.name} • Staff Management`
                    },

                    timestamp: new Date()
                }]
            });

        } catch (err) {

            console.error(err);

            return i.reply({
                content:
                    "<:no:1496873950913761431> Error processing demotion.",
                ephemeral: true
            });
        }
    }
});

// =====================================================
// /HOWGAY
// =====================================================
client.slash.set("howgay", {
    name: "howgay",
    description: "Check someone's gay meter 😭",

    options: [
        {
            name: "user",
            description: "Select user",
            type: 6,
            required: false
        }
    ],

    async execute(i) {

        try {

            // =========================================
            // TARGET USER
            // =========================================
            const user =
                i.options.getUser("user") || i.user;

            // RANDOM %
            const percent =
                Math.floor(Math.random() * 101);

            // =========================================
            // EMBED
            // =========================================
            return i.reply({
                embeds: [{
                    color: 0xFF73FA,

                    author: {
                        name: "Gay Meter",
                        icon_url: user.displayAvatarURL({
                            dynamic: true
                        })
                    },

                    thumbnail: {
                        url: user.displayAvatarURL({
                            dynamic: true
                        })
                    },

                    description:
`<a:gae:1504759187538706523> ${user} is **${percent}% Gay**`,

                    footer: {
                        text: `${i.guild.name} • Fun Command`
                    },

                    timestamp: new Date()
                }]
            });

        } catch (err) {

            console.error(err);

            return i.reply({
                content:
                    "<:no:1496873950913761431> Error executing command.",
                ephemeral: true
            });
        }
    }
});

// =====================================================
// /SHIP
// =====================================================
client.slash.set("ship", {
    name: "ship",
    description: "Ship two users together 😭",

    options: [
        {
            name: "user1",
            description: "Select first user",
            type: 6,
            required: true
        },
        {
            name: "user2",
            description: "Select second user",
            type: 6,
            required: true
        }
    ],

    async execute(i) {

        try {

            // =========================================
            // USERS
            // =========================================
            const user1 = i.options.getUser("user1");
            const user2 = i.options.getUser("user2");

            // RANDOM %
            const percent =
                Math.floor(Math.random() * 101);

            // =========================================
            // EMBED
            // =========================================
            return i.reply({
                embeds: [{
                    color: 0xFF73FA,

                    author: {
                        name: "Ship Meter",
                        icon_url: user1.displayAvatarURL({
                            dynamic: true
                        })
                    },

                    thumbnail: {
                        url: user2.displayAvatarURL({
                            dynamic: true
                        })
                    },

                    description:
`<a:aids:1504759014922129478> ${user1} + ${user2}

❤️ Compatibility: **${percent}%**`,

                    footer: {
                        text: `${i.guild.name} • Fun Command`
                    },

                    timestamp: new Date()
                }]
            });

        } catch (err) {

            console.error(err);

            return i.reply({
                content:
                    "<:no:1496873950913761431> Error executing command.",
                ephemeral: true
            });
        }
    }
});

const { REST, Routes } = require("discord.js");

module.exports = (client) => {

  client.once("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {

      const commands = [...client.slash.values()].map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        options: cmd.options || []
      }));

      console.log("Commands loaded:", commands.length);

      const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

      await rest.put(
        Routes.applicationGuildCommands(
          process.env.CLIENT_ID,
          process.env.GUILD_ID
        ),
        { body: commands }
      );

      console.log("Slash commands registered successfully");

    } catch (err) {
      console.error(err);
    }
  });

// ===== PREFIX COMMANDS (!) =====
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.guild) return;
  if (!msg.content.startsWith("!")) return;

  const args = msg.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ---------- PING ----------
  if (cmd === "ping") {
    const sent = await msg.reply("🏓 Pinging...");

    const msgLatency = sent.createdTimestamp - msg.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);
    const shardId = msg.guild.shardId ?? 0;

    await sent.edit(
      `🏓 Pong!\n` +
      `📨 Message Latency: **${msgLatency}ms**\n` +
      `🌐 API Latency: **${apiLatency}ms**\n` +
      `🧩 Shard: **${shardId}**`
    );
    return;
  }

    // ---------- PURGE ----------
  if (cmd === "purge") {
    if (!isBypass(msg.member)) return;

    const amount = parseInt(args[0]);

    if (!amount || amount < 1 || amount > 100) {
      return msg.reply("❌ Provide a number between 1-100");
    }

    await msg.channel.bulkDelete(amount, true);

    const reply = await msg.channel.send(`🧹 Cleared ${amount} messages`);
    setTimeout(() => reply.delete().catch(() => {}), 3000);
    return;
  }

  // ---------- POLL PING ----------
  if (cmd === "pollping") {
    if (!isBypass(msg.member)) return;

    const roleId = "1475423332865150986";
    await msg.delete().catch(() => {});
    await msg.channel.send(`<@&${roleId}>`);
    return;
  }

  // ---------- RAGEBAIT ----------
  if (cmd === "ragebait") {
    await msg.delete().catch(() => {});

    const gif = "https://media.tenor.com/n9y3mXz0vNB/tenor.gif";
    await msg.channel.send({
      content: gif,
      allowedMentions: { parse: [] }
    });
    return;
  }
  
if (cmd === "warn") {
  try {
    if (!isBypass(msg.member)) return;

    const targetUser =
      msg.mentions.users.first() ||
      client.users.cache.get(args[0]) ||
      await client.users.fetch(args[0]).catch(() => null);

    if (!targetUser) {
      return msg.reply("User not found");
    }

    if (targetUser.id === msg.author.id) {
      return msg.reply("You cannot warn yourself");
    }

    const member = msg.guild.members.cache.get(targetUser.id);
    const reason = args.slice(1).join(" ") || "No reason provided";

    // ===== WARN COUNT (memory)
    if (!data.warns[targetUser.id]) {
  data.warns[targetUser.id] = {
    count: 0,
    history: []
  };
}

data.warns[targetUser.id].count++;

data.warns[targetUser.id].history.push({
  reason: reason,
  staff: msg.author.id,
  time: Date.now()
});

const count = data.warns[targetUser.id].count;

// SAVE FILE
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    // ===== DM =====
await targetUser.send(
  `<:executed:1496874383447429271> You have been warned in **dark memes**\n\n` +
  `Reason : ${reason}\n` +
  `Total warnings - ${count}`
).catch(() => {});

    // ===== CONFIRM EMBED
    const confirmEmbed = {
      color: 0x2F3136,
      author: {
        name: targetUser.tag,
        icon_url: targetUser.displayAvatarURL({ dynamic: true })
      },
      description:
        `<:mk:1496873898879221882> **warn issued**\n\n` +
        `User - <@${targetUser.id}>\n` +
        `Display - ${member?.displayName || targetUser.username}\n` +
        `Reason - **${reason}**\n` +
        `Total warns - ${count}`
    };

    await msg.channel.send({ embeds: [confirmEmbed] });

    // ===== LOG
    const logEmbed = {
      color: 0x2F3136,
      author: {
        name: targetUser.tag,
        icon_url: targetUser.displayAvatarURL({ dynamic: true })
      },
      description:
        `<:mk:1496873898879221882> **warn issued**\n\n` +
        `User - <@${targetUser.id}> (${targetUser.id})\n` +
        `Display - ${member?.displayName || targetUser.username}\n` +
        `Reason - **${reason}**\n` +
        `Total warns - ${count}\n` +
        `Staff - <@${msg.author.id}>`
    };

    const logChannel = msg.guild.channels.cache.get("1479885510255186045");
    if (logChannel) {
      logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }

    } catch (err) {
    console.error(err);
    msg.reply("Error occurred").catch(() => {});
  }

  return;
}

    // =======================
// 🔇 MUTE COMMAND
// =======================
if (cmd === "mute") {
  try {

    // ===== STAFF CHECK =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD,
      ROLES.JUNIOR_MOD,
      ROLES.MOD,
      ROLES.TRIAL_MOD
    ];

    const hasPermission = msg.member.roles.cache.some(r =>
      allowedRoles.includes(r.id)
    );

    if (!hasPermission) {
      return msg.reply("❌ No permission");
    }

    // ===== TARGET =====
    const targetUser =
      msg.mentions.users.first() ||
      client.users.cache.get(args[0]) ||
      await client.users.fetch(args[0]).catch(() => null);

    if (!targetUser) {
      return msg.reply("❌ User not found");
    }

    const target = await msg.guild.members.fetch(targetUser.id).catch(() => null);

    if (!target) {
      return msg.reply("❌ User not in server");
    }

    // ===== SELF CHECK =====
    if (target.id === msg.author.id) {
      return msg.reply("❌ You cannot mute yourself");
    }

    // ===== BOT CHECK =====
    if (target.user.bot) {
      return msg.reply("❌ Cannot mute bots");
    }

    // ===== ROLE PROTECTION =====
    if (target.roles.highest.position >= msg.member.roles.highest.position) {
      return msg.reply("❌ Cannot mute equal or higher roles");
    }

    // ===== BOT ROLE CHECK =====
    if (
      target.roles.highest.position >=
      msg.guild.members.me.roles.highest.position
    ) {
      return msg.reply("❌ My role is too low");
    }

    // ===== REASON =====
    const reason = args.slice(1).join(" ") || "No reason provided";

    // ===== TIMEOUT =====
    await target.timeout(60 * 60 * 1000, reason);

    // ===== CHANNEL EMBED =====
    const embed = {
      color: 0xff0000,
      description:
        `<:muted:1496874136696262826>**User Muted**\n\n` +
        `User: ${target.user}\n` +
        `staff: <@${msg.author.id}>\n` +
        `Duration: 1 hour\n` +
        `Reason: ${reason}`,
      timestamp: new Date()
    };

    await msg.channel.send({ embeds: [embed] });

    // ===== DM USER =====
    await target.send({
      embeds: [
        {
          color: 0xff0000,
          description:
            `You were muted in **${msg.guild.name}**\n\n` +
            `Reason: ${reason}\n` +
            `Duration: 1 hour`,
          timestamp: new Date()
        }
      ]
    }).catch(() => {});

    // ===== LOG CHANNEL =====
    const logChannel = msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      await logChannel.send({
        embeds: [
          {
            color: 0xff0000,
            description:
              `**Mute Log**\n\n` +
              `User: ${target.user} (${target.id})\n` +
              `Staff: <@${msg.author.id}>\n` +
              `Reason: ${reason}\n` +
              ` Duration: 1 hour`,
            timestamp: new Date()
          }
        ]
      }).catch(() => {});
    }

  } catch (err) {
    console.error("MUTE ERROR:", err);
    return msg.reply("❌ Error while muting user").catch(() => {});
  }
}

// =======================
// 🔊 UNMUTE COMMAND
// =======================
if (cmd === "unmute") {
  try {

    // ===== STAFF CHECK =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD,
      ROLES.JUNIOR_MOD,
      ROLES.MOD,
      ROLES.TRIAL_MOD
    ];

    const hasPermission = msg.member.roles.cache.some(r =>
      allowedRoles.includes(r.id)
    );

    if (!hasPermission) {
      return msg.reply("❌ No permission");
    }

    // ===== TARGET =====
    const targetUser =
      msg.mentions.users.first() ||
      client.users.cache.get(args[0]) ||
      await client.users.fetch(args[0]).catch(() => null);

    if (!targetUser) {
      return msg.reply("❌ User not found");
    }

    const target = await msg.guild.members.fetch(targetUser.id).catch(() => null);

    if (!target) {
      return msg.reply("❌ User not in server");
    }

    // ===== ROLE PROTECTION =====
    if (target.roles.highest.position >= msg.member.roles.highest.position) {
      return msg.reply("❌ Cannot unmute equal or higher roles");
    }

    // ===== REMOVE TIMEOUT =====
    await target.timeout(null);

    // ===== CHANNEL EMBED =====
    const embed = {
      color: 0x00ff88,
      description:
        `<:mk:1496873898879221882> **User Unmuted**\n\n` +
        `👤 User: ${target.user}\n` +
        `🛡️ Staff: <@${msg.author.id}>`,
      timestamp: new Date()
    };

    await msg.channel.send({ embeds: [embed] });

    // ===== DM USER =====
    await target.send({
      embeds: [
        {
          color: 0x00ff88,
          description:
            `🔊 You were unmuted in **${msg.guild.name}**`,
          timestamp: new Date()
        }
      ]
    }).catch(() => {});

    // ===== LOG CHANNEL =====
    const logChannel = msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      await logChannel.send({
        embeds: [
          {
            color: 0x00ff88,
            description:
              `🔊 **Unmute Log**\n\n` +
              `👤 User: ${target.user} (${target.id})\n` +
              `🛡️ Staff: <@${msg.author.id}>`,
            timestamp: new Date()
          }
        ]
      }).catch(() => {});
    }

  } catch (err) {
    console.error("UNMUTE ERROR:", err);
    return msg.reply("❌ Error while unmuting user").catch(() => {});
  }
}
    
// =======================
// <:deafenem:1497924465961730158> DEAFEN COMMAND
// =======================
if (cmd === "deafen") {
  try {

    // ===== STAFF CHECK =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD,
      ROLES.JUNIOR_MOD,
      ROLES.MOD,
      ROLES.TRIAL_MOD
    ];

    const hasPermission = msg.member.roles.cache.some(r =>
      allowedRoles.includes(r.id)
    );

    if (!hasPermission) {
      return msg.reply("<:fuck:1496881571247030293> No permission");
    }

    // ===== TARGET =====
    const targetUser =
      msg.mentions.users.first() ||
      client.users.cache.get(args[0]) ||
      await client.users.fetch(args[0]).catch(() => null);

    if (!targetUser) {
      return msg.reply("<:fuck:1496881571247030293> User not found");
    }

    const target = await msg.guild.members.fetch(targetUser.id).catch(() => null);

    if (!target) {
      return msg.reply("<:fuck:1496881571247030293> User not in server");
    }

    // ===== VOICE CHECK =====
    if (!target.voice.channel) {
      return msg.reply("<:fuck:1496881571247030293> User is not in voice");
    }

    // ===== SELF CHECK =====
    if (target.id === msg.author.id) {
      return msg.reply("<:fuck:1496881571247030293> You cannot deafen yourself");
    }

    // ===== BOT CHECK =====
    if (target.user.bot) {
      return msg.reply("<:fuck:1496881571247030293> Cannot deafen bots");
    }

    // ===== ROLE PROTECTION =====
    if (target.roles.highest.position >= msg.member.roles.highest.position) {
      return msg.reply("<:fuck:1496881571247030293> Cannot deafen equal/higher roles");
    }

    // ===== BOT ROLE CHECK =====
    if (
      target.roles.highest.position >=
      msg.guild.members.me.roles.highest.position
    ) {
      return msg.reply("<:fuck:1496881571247030293> My role is too low");
    }

    // ===== REASON =====
    const reason = args.slice(1).join(" ") || "No reason provided";

    // ===== DEAFEN =====
    await target.voice.setDeaf(true, reason);

    // ===== CHANNEL EMBED =====
    const embed = {
      color: 0xff0000,
      description:
        `<:deafenem:1497924465961730158> **User Deafened**\n\n` +
        `👤 User: ${target.user}\n` +
        `🔊 Channel: ${target.voice.channel}\n` +
        `🛡️ Staff: <@${msg.author.id}>\n` +
        `📝 Reason: ${reason}`,
      timestamp: new Date()
    };

    await msg.channel.send({ embeds: [embed] });

    // ===== DM USER =====
    await target.send({
      embeds: [
        {
          color: 0xff0000,
          description:
            `<:deafenem:1497924465961730158> You were deafened in **${msg.guild.name}**\n\n` +
            `📝 Reason: ${reason}`,
          timestamp: new Date()
        }
      ]
    }).catch(() => {});

    // ===== LOG CHANNEL =====
    const logChannel = msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      await logChannel.send({
        embeds: [
          {
            color: 0xff0000,
            description:
              `<:deafenem:1497924465961730158> **Deafen Log**\n\n` +
              `👤 User: ${target.user} (${target.id})\n` +
              `🛡️ Staff: <@${msg.author.id}>\n` +
              `📝 Reason: ${reason}`,
            timestamp: new Date()
          }
        ]
      }).catch(() => {});
    }

  } catch (err) {
    console.error("DEAFEN ERROR:", err);
    return msg.reply("<:fuck:1496881571247030293> Error while deafening user");
  }
}


// =======================
// <:deafenem:1497924465961730158> UNDEAFEN COMMAND
// =======================
if (cmd === "undeafen") {
  try {

    // ===== STAFF CHECK =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD,
      ROLES.JUNIOR_MOD,
      ROLES.MOD,
      ROLES.TRIAL_MOD
    ];

    const hasPermission = msg.member.roles.cache.some(r =>
      allowedRoles.includes(r.id)
    );

    if (!hasPermission) {
      return msg.reply("<:fuck:1496881571247030293> No permission");
    }

    // ===== TARGET =====
    const targetUser =
      msg.mentions.users.first() ||
      client.users.cache.get(args[0]) ||
      await client.users.fetch(args[0]).catch(() => null);

    if (!targetUser) {
      return msg.reply("<:fuck:1496881571247030293> User not found");
    }

    const target = await msg.guild.members.fetch(targetUser.id).catch(() => null);

    if (!target) {
      return msg.reply("<:fuck:1496881571247030293> User not in server");
    }

    // ===== VOICE CHECK =====
    if (!target.voice.channel) {
      return msg.reply("<:fuck:1496881571247030293> User is not in voice");
    }

    // ===== ROLE PROTECTION =====
    if (target.roles.highest.position >= msg.member.roles.highest.position) {
      return msg.reply("<:fuck:1496881571247030293> Cannot undeafen equal/higher roles");
    }

    // ===== UNDEAFEN =====
    await target.voice.setDeaf(false);

    // ===== CHANNEL EMBED =====
    const embed = {
      color: 0x57F287,
      description:
        `<:deafenem:1497924465961730158> **User Undeafened**\n\n` +
        `👤 User: ${target.user}\n` +
        `🛡️ Staff: <@${msg.author.id}>`,
      timestamp: new Date()
    };

    await msg.channel.send({ embeds: [embed] });

    // ===== DM USER =====
    await target.send({
      embeds: [
        {
          color: 0x57F287,
          description:
            `<:deafenem:1497924465961730158> You were undeafened in **${msg.guild.name}**`,
          timestamp: new Date()
        }
      ]
    }).catch(() => {});

    // ===== LOG CHANNEL =====
    const logChannel = msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      await logChannel.send({
        embeds: [
          {
            color: 0x57F287,
            description:
              `<:deafenem:1497924465961730158> **Undeafen Log**\n\n` +
              `👤 User: ${target.user} (${target.id})\n` +
              `🛡️ Staff: <@${msg.author.id}>`,
            timestamp: new Date()
          }
        ]
      }).catch(() => {});
    }

  } catch (err) {
    console.error("UNDEAFEN ERROR:", err);
    return msg.reply("<:fuck:1496881571247030293> Error while undeafening user");
  }
}

// =======================
// <:mk:1496873898879221882> FORCEBAN COMMAND
// =======================
if (cmd === "forceban") {
  try {

    // ===== STAFF CHECK =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD
    ];

    const hasPermission = msg.member.roles.cache.some(r =>
      allowedRoles.includes(r.id)
    );

    if (!hasPermission) {
      return msg.reply("<:no:1496873950913761431> No permission");
    }

    // ===== INPUT =====
    const input = args[0];

    if (!input) {
      return msg.reply(
        "<:no:1496873950913761431> Provide user ID / mention / username"
      );
    }

    let targetUser = null;

    // ===== TRY MENTION =====
    targetUser = msg.mentions.users.first();

    // ===== TRY ID =====
    if (!targetUser) {
      targetUser =
        client.users.cache.get(input) ||
        await client.users.fetch(input).catch(() => null);
    }

    // ===== TRY USERNAME / DISPLAYNAME =====
    if (!targetUser) {
      const memberFind = msg.guild.members.cache.find(m =>
        m.user.username.toLowerCase() === input.toLowerCase() ||
        (m.displayName &&
         m.displayName.toLowerCase() === input.toLowerCase())
      );

      if (memberFind) targetUser = memberFind.user;
    }

    if (!targetUser) {
      return msg.reply("<:no:1496873950913761431> User not found");
    }

    // ===== SELF CHECK =====
    if (targetUser.id === msg.author.id) {
      return msg.reply(
        "<:no:1496873950913761431> You cannot forceban yourself"
      );
    }

    // ===== MEMBER CHECK =====
    const member = await msg.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    // ===== ROLE PROTECTION =====
    if (member) {

      if (
        member.roles.highest.position >=
        msg.member.roles.highest.position
      ) {
        return msg.reply(
          "<:no:1496873950913761431> Cannot ban force equal/higher roles"
        );
      }

      if (
        member.roles.highest.position >=
        msg.guild.members.me.roles.highest.position
      ) {
        return msg.reply(
          "<:no:1496873950913761431> My role is too low"
        );
      }
    }

    // ===== REASON =====
    const reason = args.slice(1).join(" ") || "No reason provided";

    // ===== FORCE BAN =====
    await msg.guild.members.ban(targetUser.id, {
      deleteMessageSeconds: 0,
      reason: `${reason} | Staff: ${msg.author.tag}`
    });

    // ===== SUCCESS EMBED =====
    const embed = {
      color: 0xff0000,
      description:
        `<:hammed:1496874002306699406> **Force Ban Executed**\n\n` +
        `👤 User: ${targetUser.tag}\n` +
        `🆔 ID: ${targetUser.id}\n` +
        `🛡️ Staff: <@${msg.author.id}>\n` +
        `📝 Reason: ${reason}\n\n` +
        `🔨 User can no longer join the server.`,
      timestamp: new Date()
    };

    await msg.channel.send({ embeds: [embed] });

    // ===== LOG CHANNEL =====
    const logChannel = msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      await logChannel.send({
        embeds: [
          {
            color: 0xff0000,
            description:
              `<:mk:1496873898879221882> **Force Ban Log**\n\n` +
              `👤 User: ${targetUser.tag} (${targetUser.id})\n` +
              `🛡️ Staff: <@${msg.author.id}>\n` +
              `📝 Reason: ${reason}`,
            timestamp: new Date()
          }
        ]
      }).catch(() => {});
    }

  } catch (err) {
    console.error("FORCEBAN ERROR:", err);

    return msg.reply(
      "<:no:1496873950913761431> Error while force banning user"
    );
  }
}

// =======================
// <:hammed:1496874002306699406> UNFORCEBAN COMMAND
// =======================
if (cmd === "unfb") {
  try {

    // ===== STAFF CHECK =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD
    ];

    const hasPermission = msg.member.roles.cache.some(r =>
      allowedRoles.includes(r.id)
    );

    if (!hasPermission) {
      return msg.reply("<:no:1496873950913761431> No permission");
    }

    // ===== INPUT =====
    const input = args[0];

    if (!input) {
      return msg.reply(
        "<:no:1496873950913761431> Provide user ID"
      );
    }

    // ===== GET BAN =====
    const bans = await msg.guild.bans.fetch();

    const bannedUser = bans.get(input);

    if (!bannedUser) {
      return msg.reply(
        "<:no:1496873950913761431> User is not banned"
      );
    }

    // ===== UNBAN =====
    await msg.guild.members.unban(input);

    // ===== SUCCESS EMBED =====
    const embed = {
      color: 0x57F287,
      description:
        `<:hammed:1496874002306699406> **Force Ban Removed**\n\n` +
        `👤 User: ${bannedUser.user.tag}\n` +
        `🆔 ID: ${bannedUser.user.id}\n` +
        `🛡️ Staff: <@${msg.author.id}>\n\n` +
        `✅ User can now join the server again.`,
      timestamp: new Date()
    };

    await msg.channel.send({ embeds: [embed] });

    // ===== LOG CHANNEL =====
    const logChannel = msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      await logChannel.send({
        embeds: [
          {
            color: 0x57F287,
            description:
              `<:hammed:1496874002306699406> **UNFORCEBAN LOG**\n\n` +
              `👤 User: ${bannedUser.user.tag} (${bannedUser.user.id})\n` +
              `🛡️ Staff: <@${msg.author.id}>`,
            timestamp: new Date()
          }
        ]
      }).catch(() => {});
    }

  } catch (err) {
    console.error("UNFB ERROR:", err);

    return msg.reply(
      "<:no:1496873950913761431> Error while removing forceban"
    );
  }
}

// =======================
// <:hammed:1496874002306699406> KICK COMMAND
// =======================
if (cmd === "kick") {
  try {

    // ===== STAFF CHECK =====
  const allowedRoles = [
  ROLES.OWNER,
  ROLES.CO_OWNER,
  ROLES.SERVER_MANAGER,
  ROLES.HEAD_MOD,
  ROLES.SENIOR_MOD
];

    const hasPermission = msg.member.roles.cache.some(r =>
      allowedRoles.includes(r.id)
    );

    if (!hasPermission) {
      return msg.reply("<:no:1496873950913761431> No permission");
    }

    // ===== TARGET =====
    const targetUser =
      msg.mentions.users.first() ||
      client.users.cache.get(args[0]) ||
      await client.users.fetch(args[0]).catch(() => null);

    if (!targetUser) {
      return msg.reply("<:no:1496873950913761431> User not found");
    }

    const target = await msg.guild.members.fetch(targetUser.id).catch(() => null);

    if (!target) {
      return msg.reply("<:no:1496873950913761431> User not in server");
    }

    // ===== SELF CHECK =====
    if (target.id === msg.author.id) {
      return msg.reply("<:no:1496873950913761431> You cannot kick yourself");
    }

    // ===== BOT CHECK =====
    if (target.user.bot) {
      return msg.reply("<:no:1496873950913761431> Cannot kick bots");
    }

    // ===== ROLE PROTECTION =====
    if (target.roles.highest.position >= msg.member.roles.highest.position) {
      return msg.reply("<:no:1496873950913761431> Cannot kick equal/higher roles");
    }

    // ===== BOT ROLE CHECK =====
    if (
      target.roles.highest.position >=
      msg.guild.members.me.roles.highest.position
    ) {
      return msg.reply("<:no:1496873950913761431> My role is too low");
    }

    // ===== REASON =====
    const reason = args.slice(1).join(" ") || "No reason provided";

    // ===== DM USER =====
    await target.send({
      embeds: [
        {
          color: 0xff9900,
          description:
            `<:hammed:1496874002306699406> You were kicked from **${msg.guild.name}**\n\n` +
            `📝 Reason: ${reason}`,
          timestamp: new Date()
        }
      ]
    }).catch(() => {});

    // ===== KICK =====
    await target.kick(`${reason} | Staff: ${msg.author.tag}`);

    // ===== SUCCESS EMBED =====
    const embed = {
      color: 0xff9900,
      description:
        `<:hammed:1496874002306699406> **User Kicked**\n\n` +
        `👤 User: ${target.user}\n` +
        `🛡️ Staff: <@${msg.author.id}>\n` +
        `📝 Reason: ${reason}`,
      timestamp: new Date()
    };

    await msg.channel.send({ embeds: [embed] });

    // ===== LOG CHANNEL =====
    const logChannel = msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      await logChannel.send({
        embeds: [
          {
            color: 0xff9900,
            description:
              `<:hammed:1496874002306699406> **Kick Log**\n\n` +
              `👤 User: ${target.user.tag} (${target.id})\n` +
              `🛡️ Staff: <@${msg.author.id}>\n` +
              `📝 Reason: ${reason}`,
            timestamp: new Date()
          }
        ]
      }).catch(() => {});
    }

  } catch (err) {
    console.error("KICK ERROR:", err);

    return msg.reply(
      "<:no:1496873950913761431> Error while kicking user"
    );
  }
}

if (cmd === "ban") {
  try {

    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply("<:no:1496873950913761431> No permission");
    }

    const target =
      msg.mentions.members.first() ||
      msg.guild.members.cache.get(args[0]);

    if (!target) return msg.reply("<:no:1496873950913761431> User not found");

    if (target.id === msg.author.id)
      return msg.reply("<:no:1496873950913761431> You can't ban yourself");

    // role protection
    if (target.roles.highest.position >= msg.member.roles.highest.position) {
      return msg.reply("<:no:1496873950913761431> You cannot ban this user");
    }

    const reason = args.slice(1).join(" ") || "No reason provided";

    await target.send(
      `<:hammed:1496874002306699406> You were banned from **${msg.guild.name}**\nReason: ${reason}`
    ).catch(() => {});

    await target.ban({ reason });

    msg.channel.send({
      embeds: [{
        color: 0xff0000,
        description:
          `<:hammed:1496874002306699406> **User Banned**\n\n` +
          `👤 User: ${target.user.tag}\n` +
          `🆔 ID: ${target.id}\n` +
          `📄 Reason: ${reason}\n` +
          `👮 Staff: <@${msg.author.id}>`
      }]
    });

    const log = msg.guild.channels.cache.get("1479885510255186045");
    if (log) {
      log.send({
        embeds: [{
          color: 0xff0000,
          description:
            `🔨 **Ban Log**\nUser: ${target.user.tag}\nReason: ${reason}\nStaff: <@${msg.author.id}>`
        }]
      });
    }

  } catch (e) {
    console.error(e);
    msg.reply("<:no:1496873950913761431> Ban failed");
  }
}
    
if (cmd === "unban") {
  try {

    // ===== PERMISSIONS =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply("<:no:1496873950913761431> No permission");
    }

    // ===== USER ID =====
    const userId = args[0];

    if (!userId) {
      return msg.reply(
        "<:no:1496873950913761431> Provide user ID"
      );
    }

    // ===== CHECK BANS =====
    const bans = await msg.guild.bans.fetch();

    const bannedUser = bans.get(userId);

    if (!bannedUser) {
      return msg.reply(
        "<:no:1496873950913761431> User is not banned"
      );
    }

    // ===== UNBAN =====
    await msg.guild.members.unban(userId);

    // ===== RESPONSE =====
    msg.channel.send({
      embeds: [{
        color: 0x57F287,
        description:
          `<:mk:1496873898879221882> **User Unbanned**\n\n` +
          `👤 ${bannedUser.user.tag}\n` +
          `🆔 ${userId}\n` +
          `👮 Staff: <@${msg.author.id}>`
      }]
    });

    // ===== LOG =====
    const logChannel = msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      logChannel.send({
        embeds: [{
          color: 0x57F287,
          description:
            `<:mk:1496873898879221882> **Unban Logs**\n\n` +
            `👤 ${bannedUser.user.tag}\n` +
            `🆔 ${userId}\n` +
            `👮 Staff: <@${msg.author.id}>`
        }]
      }).catch(() => {});
    }

  } catch (err) {
    console.error(err);

    msg.reply(
      "<:no:1496873950913761431> Error while unbanning user"
    ).catch(() => {});
  }
}

if (cmd === "softban") {
  try {

    // ===== PERMISSIONS =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply("<:no:1496873950913761431> No permission");
    }

    // ===== TARGET =====
    const target =
      msg.mentions.members.first() ||
      msg.guild.members.cache.get(args[0]);

    if (!target) {
      return msg.reply(
        "<:no:1496873950913761431> Mention a user or provide ID"
      );
    }

    // ===== SELF CHECK =====
    if (target.id === msg.author.id) {
      return msg.reply(
        "<:no:1496873950913761431> You cannot softban yourself"
      );
    }

    // ===== BOT CHECK =====
    if (target.id === client.user.id) {
      return msg.reply(
        "<:no:1496873950913761431> You cannot softban the bot"
      );
    }

    // ===== ROLE CHECK =====
    if (
      target.roles.highest.position >=
      msg.member.roles.highest.position
    ) {
      return msg.reply(
        "<:no:1496873950913761431> Cannot softban equal/higher roles"
      );
    }

    // ===== BOT ROLE CHECK =====
    if (
      target.roles.highest.position >=
      msg.guild.members.me.roles.highest.position
    ) {
      return msg.reply(
        "<:no:1496873950913761431> My role is too low"
      );
    }

    // ===== REASON =====
    const reason = args.slice(1).join(" ") || "No reason provided";

    // ===== DM =====
    await target.send({
      embeds: [{
        color: 0xff9900,
        description:
          `<:hammed:1496874002306699406> You were softbanned from **${msg.guild.name}**\n\n` +
          `📝 Reason: ${reason}`
      }]
    }).catch(() => {});

    // ===== BAN =====
    await target.ban({
      deleteMessageSeconds: 604800,
      reason: `${reason} | Staff: ${msg.author.tag}`
    });

    // ===== UNBAN =====
    await msg.guild.members.unban(target.id);

    // ===== RESPONSE =====
    msg.channel.send({
      embeds: [{
        color: 0xff9900,
        description:
          `<:hammed:1496874002306699406> **Softban Executed**\n\n` +
          `👤 ${target.user.tag}\n` +
          `🆔 ${target.id}\n` +
          `📝 ${reason}\n` +
          `👮 Staff: <@${msg.author.id}>`
      }]
    });

    // ===== LOG =====
    const logChannel =
      msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      logChannel.send({
        embeds: [{
          color: 0xff9900,
          description:
            `<:hammed:1496874002306699406> **Softban Logs**\n\n` +
            `👤 ${target.user.tag}\n` +
            `🆔 ${target.id}\n` +
            `📝 ${reason}\n` +
            `👮 Staff: <@${msg.author.id}>`
        }]
      }).catch(() => {});
    }

  } catch (err) {
    console.error(err);

    msg.reply(
      "<:no:1496873950913761431> Error while softbanning user"
    ).catch(() => {});
  }
}

if (cmd === "slowmode") {
  try {

    // ===== PERMISSIONS =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD,
      ROLES.JUNIOR_MOD,
      ROLES.MOD,
      ROLES.TRIAL_MOD
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply(
        "<:no:1496873950913761431> No permission"
      );
    }

    // ===== TIME =====
    const seconds = parseInt(args[0]);

    if (isNaN(seconds)) {
      return msg.reply(
        "<:no:1496873950913761431> Provide seconds"
      );
    }

    // ===== LIMIT =====
    if (seconds < 0 || seconds > 21600) {
      return msg.reply(
        "<:no:1496873950913761431> Range is 0-21600 seconds"
      );
    }

    // ===== APPLY =====
    await msg.channel.setRateLimitPerUser(seconds);

    // ===== RESPONSE =====
    let sent;

    if (seconds === 0) {

      sent = await msg.channel.send({
        embeds: [{
          color: 0x57F287,
          description:
            `<:mk:1496873898879221882> **Slowmode Removed**\n\n` +
            `📍 Channel: ${msg.channel}\n` +
            `👮 Staff: <@${msg.author.id}>`
        }]
      });

    } else {

      sent = await msg.channel.send({
        embeds: [{
          color: 0xff9900,
          description:
            `<:hammed:1496874002306699406> **Slowmode Enabled**\n\n` +
            `⏱️ Time: ${seconds}s\n` +
            `📍 Channel: ${msg.channel}\n` +
            `👮 Staff: <@${msg.author.id}>`
        }]
      });

    }

    // ===== AUTO DELETE =====
    setTimeout(() => {
      sent.delete().catch(() => {});
    }, 5000);

    // ===== LOGS =====
    const logChannel =
      msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      logChannel.send({
        embeds: [{
          color: 0x2F3136,
          description:
            `⏱️ **Slowmode Logs**\n\n` +
            `📍 Channel: ${msg.channel}\n` +
            `⏱️ Time: ${seconds}s\n` +
            `👮 Staff: <@${msg.author.id}>`
        }]
      }).catch(() => {});
    }

  } catch (err) {
    console.error(err);

    msg.reply(
      "<:no:1496873950913761431> Error while setting slowmode"
    ).catch(() => {});
  }
}

if (cmd === "lock") {
  try {

    // ===== PERMISSIONS =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD,
      ROLES.JUNIOR_MOD,
      ROLES.MOD,
      ROLES.TRIAL_MOD
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply(
        "<:no:1496873950913761431> No permission"
      );
    }

    // ===== ALREADY LOCKED CHECK =====
    const perms = msg.channel.permissionsFor(msg.guild.roles.everyone);

    if (perms && perms.has("SendMessages") === false) {
      return msg.reply(
        "<:no:1496873950913761431> Channel already locked"
      );
    }

    // ===== LOCK =====
    await msg.channel.permissionOverwrites.edit(
      msg.guild.roles.everyone,
      {
        SendMessages: false
      }
    );

    // ===== RESPONSE =====
    const sent = await msg.channel.send({
      embeds: [{
        color: 0xff0000,
        description:
          `<:hammed:1496874002306699406> **Channel Locked**\n\n` +
          `📍 Channel: ${msg.channel}\n` +
          `👮 Staff: <@${msg.author.id}>`
      }]
    });

    // ===== AUTO DELETE =====
    setTimeout(() => {
      sent.delete().catch(() => {});
    }, 5000);

    // ===== LOGS =====
    const logChannel =
      msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      logChannel.send({
        embeds: [{
          color: 0xff0000,
          description:
            `🔒 **Channel Lock Logs**\n\n` +
            `📍 Channel: ${msg.channel}\n` +
            `👮 Staff: <@${msg.author.id}>`
        }]
      }).catch(() => {});
    }

  } catch (err) {
    console.error(err);

    msg.reply(
      "<:no:1496873950913761431> Error while locking channel"
    ).catch(() => {});
  }
}

if (cmd === "unlock") {
  try {

    // ===== PERMISSIONS =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD,
      ROLES.JUNIOR_MOD,
      ROLES.MOD,
      ROLES.TRIAL_MOD
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply(
        "<:no:1496873950913761431> No permission"
      );
    }

    // ===== ALREADY UNLOCKED CHECK =====
    const perms = msg.channel.permissionsFor(msg.guild.roles.everyone);

    if (perms && perms.has("SendMessages") === true) {
      return msg.reply(
        "<:no:1496873950913761431> Channel already unlocked"
      );
    }

    // ===== UNLOCK =====
    await msg.channel.permissionOverwrites.edit(
      msg.guild.roles.everyone,
      {
        SendMessages: true
      }
    );

    // ===== RESPONSE =====
    const sent = await msg.channel.send({
      embeds: [{
        color: 0x57F287,
        description:
          `<:mk:1496873898879221882> **Channel Unlocked**\n\n` +
          `📍 Channel: ${msg.channel}\n` +
          `👮 Staff: <@${msg.author.id}>`
      }]
    });

    // ===== AUTO DELETE =====
    setTimeout(() => {
      sent.delete().catch(() => {});
    }, 5000);

    // ===== LOGS =====
    const logChannel =
      msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      logChannel.send({
        embeds: [{
          color: 0x57F287,
          description:
            `🔓 **Channel Unlock Logs**\n\n` +
            `📍 Channel: ${msg.channel}\n` +
            `👮 Staff: <@${msg.author.id}>`
        }]
      }).catch(() => {});
    }

  } catch (err) {
    console.error(err);

    msg.reply(
      "<:no:1496873950913761431> Error while unlocking channel"
    ).catch(() => {});
  }
}

if (cmd === "nuke") {
  try {

    // ===== PERMISSIONS =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply(
        "<:no:1496873950913761431> No permission"
      );
    }

    // ===== CLONE CHANNEL =====
    const newChannel = await msg.channel.clone();

    await newChannel.setPosition(msg.channel.position);

    // ===== DELETE OLD =====
    await msg.channel.delete();

    // ===== NUKE MESSAGE =====
    const sent = await newChannel.send({
      embeds: [{
        color: 0xff0000,
        description:
          `<:hammed:1496874002306699406> **Channel Nuked**\n\n` +
          `👮 Staff: <@${msg.author.id}>`
      }]
    });

    // ===== AUTO DELETE =====
    setTimeout(() => {
      sent.delete().catch(() => {});
    }, 5000);

    // ===== LOGS =====
    const logChannel =
      newChannel.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      logChannel.send({
        embeds: [{
          color: 0xff0000,
          description:
            `☢️ **Channel Nuke Logs**\n\n` +
            `📍 Channel: ${newChannel}\n` +
            `👮 Staff: <@${msg.author.id}>`
        }]
      }).catch(() => {});
    }

  } catch (err) {
    console.error(err);

    msg.reply(
      "<:no:1496873950913761431> Error while nuking channel"
    ).catch(() => {});
  }
}

if (cmd === "cleanup") {
  try {

    // ===== PERMISSIONS =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply(
        "<:no:1496873950913761431> No permission"
      );
    }

    // ===== AMOUNT =====
    const amount = parseInt(args[0]);

    if (!amount || amount < 1 || amount > 100) {
      return msg.reply(
        "<:no:1496873950913761431> Provide amount 1-100"
      );
    }

    // ===== FETCH =====
    const messages = await msg.channel.messages.fetch({
      limit: amount
    });

    // ===== FILTER =====
    const filtered = messages.filter(m =>
      m.author.bot ||
      m.content.startsWith("!")
    );

    // ===== DELETE =====
    await msg.channel.bulkDelete(filtered, true);

    // ===== RESPONSE =====
    const sent = await msg.channel.send({
      embeds: [{
        color: 0x57F287,
        description:
          `<:mk:1496873898879221882> **Cleanup Completed**\n\n` +
          `🧹 Removed: ${filtered.size} messages\n` +
          `👮 Staff: <@${msg.author.id}>`
      }]
    });

    // ===== AUTO DELETE =====
    setTimeout(() => {
      sent.delete().catch(() => {});
    }, 5000);

    // ===== LOGS =====
    const logChannel =
      msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      logChannel.send({
        embeds: [{
          color: 0x57F287,
          description:
            `🧹 **Cleanup Logs**\n\n` +
            `📍 Channel: ${msg.channel}\n` +
            `🧹 Removed: ${filtered.size} messages\n` +
            `👮 Staff: <@${msg.author.id}>`
        }]
      }).catch(() => {});
    }

  } catch (err) {
    console.error(err);

    msg.reply(
      "<:no:1496873950913761431> Error while cleaning messages"
    ).catch(() => {});
  }
}

if (cmd === "rolereq") {
  try {

    // ===== PERMISSIONS =====
    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply(
        "<:no:1496873950913761431> No permission"
      );
    }

    // ===== ROLE =====
    const role =
      msg.mentions.roles.first() ||
      msg.guild.roles.cache.get(args[0]) ||
      msg.guild.roles.cache.find(r =>
        r.name.toLowerCase() === args.join(" ").toLowerCase()
      );

    if (!role) {
      return msg.reply(
        "<:no:1496873950913761431> Mention role, role ID, or role name"
      );
    }

    // ===== MEMBERS =====
    const members = role.members.map(member =>
      `👤 ${member.user.tag}\n🆔 ${member.id}`
    );

    // ===== EMPTY =====
    if (!members.length) {
      return msg.channel.send({
        embeds: [{
          color: 0x2F3136,
          description:
            `<:no:1496873950913761431> No users found in ${role}`
        }]
      });
    }

    // ===== SPLIT =====
    const chunks = [];

    for (let i = 0; i < members.length; i += 10) {
      chunks.push(members.slice(i, i + 10).join("\n\n"));
    }

    // ===== EMBEDS =====
    for (let i = 0; i < chunks.length; i++) {

      await msg.channel.send({
        embeds: [{
          color: 0x2F3136,
          title: `<:mk:1496873898879221882> Role Members`,
          description:
            `🎭 Role: ${role}\n` +
            `👥 Members: ${role.members.size}\n\n` +
            `${chunks[i]}`,
          footer: {
            text: `Page ${i + 1}/${chunks.length}`
          }
        }]
      });

    }

    // ===== LOGS =====
    const logChannel =
      msg.guild.channels.cache.get("1479885510255186045");

    if (logChannel) {
      logChannel.send({
        embeds: [{
          color: 0x2F3136,
          description:
            `🎭 **RoleReq Logs**\n\n` +
            `🎭 Role: ${role.name}\n` +
            `👥 Members: ${role.members.size}\n` +
            `👮 Staff: <@${msg.author.id}>`
        }]
      }).catch(() => {});
    }

  } catch (err) {
    console.error(err);

    msg.reply(
      "<:no:1496873950913761431> Error while fetching role members"
    ).catch(() => {});
  }
}

if (cmd === "massban") {
  try {

    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply("<:no:1496873950913761431> No permission");
    }

    const ids = args;

    if (!ids.length) {
      return msg.reply("<:no:1496873950913761431> Provide user IDs");
    }

    let success = 0;
    let fail = 0;

    for (const id of ids) {
      try {
        const member = await msg.guild.members.fetch(id);

        if (member.roles.highest.position >= msg.member.roles.highest.position) {
          fail++;
          continue;
        }

        await member.ban({ reason: "Mass ban executed" });
        success++;

      } catch {
        fail++;
      }
    }

    msg.channel.send({
      embeds: [{
        color: 0xff0000,
        description:
          `<:hammed:1496874002306699406> **Mass Ban Completed**\n\n` +
          `✅ Success: ${success}\n` +
          `❌ Failed: ${fail}`
      }]
    });

  } catch (e) {
    console.error(e);
    msg.reply("<:no:1496873950913761431> Massban failed");
  }
}

if (cmd === "hide") {
  try {

    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply("<:no:1496873950913761431> No permission");
    }

    await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, {
      ViewChannel: false
    });

    msg.channel.send({
      embeds: [{
        color: 0x2F3136,
        description:
          `<:mk:1496873898879221882> **Channel Hidden**\nStaff only access enabled`
      }]
    });

  } catch (e) {
    console.error(e);
    msg.reply("<:no:1496873950913761431> Hide failed");
  }
}

if (cmd === "unhide") {
  try {

    const allowedRoles = [
      ROLES.OWNER,
      ROLES.CO_OWNER,
      ROLES.SERVER_MANAGER,
      ROLES.HEAD_MOD,
      ROLES.SENIOR_MOD
    ];

    if (!msg.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
      return msg.reply("<:no:1496873950913761431> No permission");
    }

    await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, {
      ViewChannel: true
    });

    msg.channel.send({
      embeds: [{
        color: 0x57F287,
        description:
          `<:mk:1496873898879221882> **Channel Unhidden**`
      }]
    });

  } catch (e) {
    console.error(e);
    msg.reply("<:no:1496873950913761431> Unhide failed");
  }
}

if (cmd === "serverinfo") {
  try {

    const g = msg.guild;

    msg.channel.send({
      embeds: [{
        color: 0x2F3136,
        title: "📊 Server Info",
        thumbnail: { url: g.iconURL({ dynamic: true }) },
        fields: [
          { name: "Name", value: g.name, inline: true },
          { name: "Owner", value: `<@${g.ownerId}>`, inline: true },
          { name: "Members", value: `${g.memberCount}`, inline: true },
          { name: "Boosts", value: `${g.premiumSubscriptionCount}`, inline: true },
          { name: "Roles", value: `${g.roles.cache.size}`, inline: true },
          { name: "Channels", value: `${g.channels.cache.size}`, inline: true },
          { name: "ID", value: g.id, inline: true }
        ]
      }]
    });

  } catch (e) {
    console.error(e);
  }
}

}); // closes client.on("messageCreate")
 
// ===== SLASH HANDLER (/)
client.on("interactionCreate", async (i) => {
  // 🔹 handle buttons FIRST
if (i.isButton()) {
  if (i.customId.startsWith("clearwarn_")) {
    const userId = i.customId.split("_")[1];

    delete data.warns[userId];
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    return i.reply({ content: "Warnings cleared", ephemeral: true });
  }
}

// 🔹 then slash commands
if (!i.isChatInputCommand()) return;

  const cmd = client.slash.get(i.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(i);
  } catch (err) {
    console.error("SLASH ERROR:", err);

    if (i.replied || i.deferred) {
      await i.followUp({
        content: "❌ Something went wrong!",
        ephemeral: true
      }).catch(() => {});
    } else {
      await i.reply({
        content: "❌ Something went wrong!",
        ephemeral: true
      }).catch(() => {});
    }
  }
}); // <<< END SLASH HANDLER (DO NOT TOUCH)

// ===== SAFE ZONE BELOW (ADD NEW CODE ONLY HERE)
// ===== LOGS + MESSAGE REWARDS =====

const LOG_CHANNEL_ID = "1479885191953780888";

function log(guild) {
  return guild.channels.cache.get(LOG_CHANNEL_ID);
}

// =======================
// 🗑️ MESSAGE DELETE
// =======================
client.on("messageDelete", async (msg) => {
  if (!msg.guild || msg.author?.bot) return;

  const ch = log(msg.guild);
  if (!ch) return;

  const embed = {
    color: 0xff0000,
    author: {
      name: msg.author?.tag || "Unknown",
      icon_url: msg.author?.displayAvatarURL({ dynamic: true })
    },
    description:
      `🗑️ **Message Deleted**\n\n` +
      `User: <@${msg.author?.id || "unknown"}>\n` +
      `Channel: <#${msg.channel.id}>\n\n` +
      `**Content:**\n${msg.content || "*No text*"}`,
    timestamp: new Date()
  };

  if (msg.attachments?.first()) {
    embed.image = { url: msg.attachments.first().url };
  }

  ch.send({ embeds: [embed] }).catch(() => {});
});


// =======================
// ✏️ MESSAGE EDIT
// =======================
client.on("messageUpdate", async (oldMsg, newMsg) => {
  if (!newMsg.guild || newMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;

  const ch = log(newMsg.guild);
  if (!ch) return;

  ch.send({
    embeds: [{
      color: 0xffa500,
      author: {
        name: newMsg.author.tag,
        icon_url: newMsg.author.displayAvatarURL({ dynamic: true })
      },
      description:
        `✏️ **Message Edited**\n\n` +
        `User: <@${newMsg.author.id}>\n` +
        `Channel: <#${newMsg.channel.id}>\n\n` +
        `**Before:**\n${oldMsg.content || "*No text*"}\n\n` +
        `**After:**\n${newMsg.content || "*No text*"}`,
      timestamp: new Date()
    }]
  }).catch(() => {});
});


// =======================
// 🧹 BULK DELETE
// =======================
client.on("messageDeleteBulk", async (messages) => {
  const guild = messages.first()?.guild;
  if (!guild) return;

  const ch = log(guild);
  if (!ch) return;

  ch.send({
    embeds: [{
      color: 0x8b0000,
      description:
        `🧹 **Bulk Delete**\n\n` +
        `Messages: ${messages.size}\n` +
        `Channel: <#${messages.first().channel.id}>`,
      timestamp: new Date()
    }]
  });
});


// =======================
// 🧑 MEMBER UPDATE (NICK + ROLES)
// =======================
client.on("guildMemberUpdate", async (oldM, newM) => {
  const ch = log(newM.guild);
  if (!ch) return;

  // nickname
  if (oldM.nickname !== newM.nickname) {
    ch.send({
      embeds: [{
        color: 0x3498db,
        author: {
          name: newM.user.tag,
          icon_url: newM.user.displayAvatarURL({ dynamic: true })
        },
        description:
          `🧑 **Nickname Changed**\n\n` +
          `User: <@${newM.id}>\n\n` +
          `Before: ${oldM.nickname || "None"}\n` +
          `After: ${newM.nickname || "None"}`,
        timestamp: new Date()
      }]
    });
  }

  // roles
  const oldRoles = oldM.roles.cache;
  const newRoles = newM.roles.cache;

  const added = newRoles.filter(r => !oldRoles.has(r.id));
  const removed = oldRoles.filter(r => !newRoles.has(r.id));

  if (added.size || removed.size) {
    ch.send({
      embeds: [{
        color: 0x9b59b6,
        author: {
          name: newM.user.tag,
          icon_url: newM.user.displayAvatarURL({ dynamic: true })
        },
        description:
          `🎭 **Roles Updated**\n\n` +
          `User: <@${newM.id}>\n\n` +
          (added.size ? `➕ Added: ${added.map(r => `<@&${r.id}>`).join(", ")}\n` : "") +
          (removed.size ? `➖ Removed: ${removed.map(r => `<@&${r.id}>`).join(", ")}` : ""),
        timestamp: new Date()
      }]
    });
  }
});


// =======================
// ⚙️ COMMAND LOGGER
// =======================

// slash
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  const ch = log(i.guild);
  if (!ch) return;

  ch.send({
    embeds: [{
      color: 0x2ecc71,
      description:
        `⚙️ **Slash Command**\n\n` +
        `User: <@${i.user.id}>\n` +
        `/${i.commandName}`,
      timestamp: new Date()
    }]
  }).catch(() => {});
});

// prefix + 💀 MESSAGE REWARDS
client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  // =======================
  // 💰 MESSAGE REWARDS
  // =======================
  if (!data.users) data.users = {};
  if (!data.users[msg.author.id]) {
    data.users[msg.author.id] = { messages: 0, coins: 0 };
  }

  const user = data.users[msg.author.id];
  user.messages += 1;

  let reward = null;

  if (user.messages === 100) reward = 1000;
  if (user.messages === 300) reward = 1500;
  if (user.messages === 500) reward = 3000;
  if (user.messages === 1000) reward = 10000;

  if (reward) {
    user.coins += reward;

    msg.channel.send(
`\\m<:mk:1496873898879221882> 
You reached ${user.messages} messages and got ${reward} spooky coins nice!
-# chat more for more rewards`
    ).catch(() => {});
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  // =======================
  // ⚙️ PREFIX LOGGER
  // =======================
  if (!msg.content.startsWith("!")) return;

  const ch = log(msg.guild);
  if (!ch) return;

  ch.send({
    embeds: [{
      color: 0x2ecc71,
      description:
        `⚙️ **Prefix Command**\n\n` +
        `User: <@${msg.author.id}>\n` +
        `${msg.content}`,
      timestamp: new Date()
    }]
  }).catch(() => {});
});

// ===== LOGIN (ALWAYS KEEP AT VERY BOTTOM)
client.login(process.env.TOKEN);
