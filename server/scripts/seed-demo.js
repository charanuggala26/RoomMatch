import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import crypto from "node:crypto";
import dns from "node:dns";

import Expense from "../models/Expense.js";
import Group from "../models/Group.js";
import Settlement from "../models/Settlement.js";
import User from "../models/User.js";
import { equalSplit } from "../utils/balances.js";

dns.setServers(
  (process.env.DNS_SERVERS || "8.8.8.8,8.8.4.4")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean)
);

console.log("Seed DNS servers:", dns.getServers());

const dryRun = process.argv.includes("--dry-run");
const confirmed = process.argv.includes("--confirm");
const seededPassword = process.env.ROOMMATCH_DEMO_PASSWORD;

class SeedSetupError extends Error {}

const users = [
  {
    id: "64f000000000000000000001",
    email: "aanya.rao@roommatch.example.invalid",
    name: "Aanya Rao (Demo)",
    preferences: {
      sleepSchedule: "early",
      foodHabits: "veg",
      cleanliness: 5,
      noiseTolerance: 2,
      studyHabits: "silent",
      guestFrequency: "rarely",
      smoking: "never",
      pets: "okay",
      choreStyle: "schedule",
      cookingFrequency: "often",
      budgetMin: 7000,
      budgetMax: 12000,
      location: "Madhapur, Hyderabad",
    },
  },
  {
    id: "64f000000000000000000002",
    email: "rohan.mehta@roommatch.example.invalid",
    name: "Rohan Mehta (Demo)",
    preferences: {
      sleepSchedule: "flexible",
      foodHabits: "eggetarian",
      cleanliness: 4,
      noiseTolerance: 3,
      studyHabits: "mixed",
      guestFrequency: "sometimes",
      smoking: "never",
      pets: "love",
      choreStyle: "schedule",
      cookingFrequency: "sometimes",
      budgetMin: 8000,
      budgetMax: 14000,
      location: "Madhapur",
    },
  },
  {
    id: "64f000000000000000000003",
    email: "zoya.khan@roommatch.example.invalid",
    name: "Zoya Khan (Demo)",
    preferences: {
      sleepSchedule: "night",
      foodHabits: "nonveg",
      cleanliness: 3,
      noiseTolerance: 4,
      studyHabits: "social",
      guestFrequency: "often",
      smoking: "outside",
      pets: "okay",
      choreStyle: "flexible",
      cookingFrequency: "often",
      budgetMin: 9000,
      budgetMax: 15000,
      location: "Hitech City, Hyderabad",
    },
  },
  {
    id: "64f000000000000000000004",
    email: "dev.patel@roommatch.example.invalid",
    name: "Dev Patel (Demo)",
    preferences: {
      sleepSchedule: "early",
      foodHabits: "veg",
      cleanliness: 4,
      noiseTolerance: 2,
      studyHabits: "silent",
      guestFrequency: "rarely",
      smoking: "never",
      pets: "avoid",
      choreStyle: "together",
      cookingFrequency: "sometimes",
      budgetMin: 7500,
      budgetMax: 12500,
      location: "Madhapur, Hyderabad",
    },
  },
  {
    id: "64f000000000000000000005",
    email: "ishaan.verma@roommatch.example.invalid",
    name: "Ishaan Verma (Demo)",
    preferences: {
      sleepSchedule: "night",
      foodHabits: "eggetarian",
      cleanliness: 3,
      noiseTolerance: 4,
      studyHabits: "mixed",
      guestFrequency: "sometimes",
      smoking: "never",
      pets: "love",
      choreStyle: "flexible",
      cookingFrequency: "rarely",
      budgetMin: 6500,
      budgetMax: 11000,
      location: "Kondapur, Hyderabad",
    },
  },
  {
    id: "64f000000000000000000006",
    email: "vu.241fa04444@gmail.com",
    name: "VU Student (Demo)",
    defaultPassword: "Chand1",
    reuseExistingByEmail: true,
    resetPassword: true,
    updatePreferences: true,
    preferences: {
      sleepSchedule: "early",
      foodHabits: "veg",
      cleanliness: 4,
      noiseTolerance: 2,
      studyHabits: "silent",
      guestFrequency: "sometimes",
      smoking: "never",
      pets: "okay",
      choreStyle: "schedule",
      cookingFrequency: "often",
      budgetMin: 7000,
      budgetMax: 12000,
      location: "Madhapur, Hyderabad",
    },
  },
  {
    id: "64f000000000000000000007",
    email: "charan@gmail.com",
    name: "Charan (Demo)",
    defaultPassword: "Charan",
    reuseExistingByEmail: true,
    resetPassword: true,
    updatePreferences: true,
    preferences: {
      sleepSchedule: "flexible",
      foodHabits: "eggetarian",
      cleanliness: 4,
      noiseTolerance: 3,
      studyHabits: "mixed",
      guestFrequency: "sometimes",
      smoking: "never",
      pets: "love",
      choreStyle: "flexible",
      cookingFrequency: "sometimes",
      budgetMin: 8000,
      budgetMax: 14000,
      location: "Madhapur, Hyderabad",
    },
  },
];

const groupSpecs = [
  {
    id: "64f100000000000000000001",
    name: "Banyan House (Demo)",
    members: [...users.slice(0, 4), users[5], users[6]],
    expenses: [
      ["64f200000000000000000001", "November rent", "rent", 28000, 1, -3],
      ["64f200000000000000000002", "October electricity", "electricity", 2460, 2, -11],
      ["64f200000000000000000003", "Weekly groceries", "grocery", 3840, 3, -9],
      ["64f200000000000000000004", "Fiber internet", "wifi", 999, 1, -7],
      ["64f200000000000000000005", "Cleaning supplies", "shared", 860, 0, -6],
      ["64f200000000000000000006", "November electricity", "electricity", 2180, 2, -1],
      ["64f200000000000000000007", "Kitchen essentials", "grocery", 1725, 3, -2],
      ["64f200000000000000000008", "Water can delivery", "other", 420, 1, 0],
      ["64f200000000000000000013", "Professional cleaning", "shared", 1500, 4, -2],
      ["64f200000000000000000014", "Pantry restock", "grocery", 2200, 5, -1],
    ],
    settlements: [
      ["64f300000000000000000001", 2, 0, 1600],
      ["64f300000000000000000002", 3, 0, 900],
    ],
  },
  {
    id: "64f100000000000000000002",
    name: "Lakeview Flat (Demo)",
    members: [users[0], users[1], users[4], users[5], users[6]],
    expenses: [
      ["64f200000000000000000009", "November rent", "rent", 24000, 2, -2],
      ["64f200000000000000000010", "Electricity and utilities", "electricity", 1930, 1, -8],
      ["64f200000000000000000011", "Weekend groceries", "grocery", 2160, 2, -4],
      ["64f200000000000000000012", "Wi-Fi plan", "wifi", 899, 0, -1],
      ["64f200000000000000000015", "Water and maintenance", "other", 1350, 3, -5],
      ["64f200000000000000000016", "Kitchen essentials", "grocery", 1780, 4, -3],
    ],
    settlements: [],
  },
];

const toObjectId = (id) => new mongoose.Types.ObjectId(id);
const dateDaysAgo = (days) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

function assertSafeArgs() {
  if (!process.env.MONGO_URI) {
    throw new SeedSetupError("MONGO_URI is not configured.");
  }

  if (!dryRun && !confirmed) {
    throw new SeedSetupError(
      "Run with --confirm to write data, or --dry-run to preview."
    );
  }

  for (const spec of users.filter((u) => u.resetPassword)) {
    const password = spec.defaultPassword;

    if (password.length !== 6) {
      throw new SeedSetupError(
        `${spec.email} demo password must be exactly 6 characters.`
      );
    }
  }
}

async function seed() {
  assertSafeArgs();

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log("Connected to MongoDB.");

  const existingUsers = new Map(
    (
      await User.find({
        email: { $in: users.map((u) => u.email) },
      })
        .select("email _id name")
        .lean()
    ).map((u) => [u.email, u])
  );

  const insertedUsers = [];
  const userUpdates = [];

  for (const spec of users) {
    const existing = existingUsers.get(spec.email);
    const byId = await User.findById(spec.id)
      .select("email _id")
      .lean();

    if (existing) {
      if (
        !spec.reuseExistingByEmail &&
        String(existing._id) !== spec.id
      ) {
        throw new SeedSetupError(
          `Email already exists under a different ID: ${spec.email}`
        );
      }

      spec.id = String(existing._id);

      const set = {};

      if (spec.updatePreferences) {
        set.preferences = spec.preferences;
        set.profileComplete = true;
      }

      if (spec.resetPassword) {
        set.password = await bcrypt.hash(spec.defaultPassword, 10);
      }

      if (Object.keys(set).length) {
        userUpdates.push({
          _id: existing._id,
          email: spec.email,
          set,
        });
      }

      continue;
    }

    if (byId && byId.email !== spec.email) {
      throw new SeedSetupError(
        `User ID collision for ${spec.email}.`
      );
    }

    const password =
      spec.defaultPassword ||
      seededPassword ||
      crypto.randomBytes(24).toString("base64url");

    insertedUsers.push({
      _id: toObjectId(spec.id),
      name: spec.name,
      email: spec.email,
      password: await bcrypt.hash(password, 10),
      preferences: spec.preferences,
      profileComplete: true,
    });
  }

  const newGroups = [];

  for (const spec of groupSpecs) {
    const current = await Group.findById(spec.id)
      .select("name")
      .lean();

    if (current && current.name !== spec.name) {
      throw new SeedSetupError(
        `Group identity collision: ${spec.name}`
      );
    }

    if (!current) newGroups.push(spec);
  }

  const expenseSpecs = groupSpecs.flatMap((group) =>
    group.expenses.map((expense) => ({ group, expense }))
  );

  const expenseIds = expenseSpecs.map(({ expense }) =>
    toObjectId(expense[0])
  );

  const existingExpenseIds = new Set(
    (
      await Expense.find({ _id: { $in: expenseIds } })
        .select("_id")
        .lean()
    ).map((e) => String(e._id))
  );

  const settlementSpecs = groupSpecs.flatMap((group) =>
    group.settlements.map((settlement) => ({ group, settlement }))
  );

  const settlementIds = settlementSpecs.map(({ settlement }) =>
    toObjectId(settlement[0])
  );

  const existingSettlementIds = new Set(
    (
      await Settlement.find({ _id: { $in: settlementIds } })
        .select("_id")
        .lean()
    ).map((s) => String(s._id))
  );

  const membershipAdds = [];

  for (const spec of groupSpecs) {
    const current = await Group.findById(spec.id)
      .select("members")
      .lean();

    const currentIds = new Set(
      (current?.members || []).map((id) => String(id))
    );

    for (const member of spec.members) {
      if (!currentIds.has(member.id)) {
        membershipAdds.push({
          groupId: spec.id,
          userId: member.id,
        });
      }
    }
  }

  const planned = {
    users: insertedUsers.length,
    userProfilesUpdated: userUpdates.length,
    passwordsSet: userUpdates.filter((u) => u.set.password).length,
    groupMemberships: membershipAdds.length,
    groups: newGroups.length,
    expenses: expenseSpecs.filter(
      ({ expense }) => !existingExpenseIds.has(expense[0])
    ).length,
    settlements: settlementSpecs.filter(
      ({ settlement }) =>
        !existingSettlementIds.has(settlement[0])
    ).length,
  };

  console.log(
    `${dryRun ? "Dry run" : "Seed plan"}:`,
    JSON.stringify(planned)
  );

  if (dryRun) return;

  if (insertedUsers.length) {
    await User.insertMany(insertedUsers, { ordered: true });
  }

  for (const update of userUpdates) {
    await User.updateOne(
      { _id: update._id, email: update.email },
      { $set: update.set }
    );
  }

  for (const spec of newGroups) {
    await Group.create({
      _id: toObjectId(spec.id),
      name: spec.name,
      members: spec.members.map((m) => toObjectId(m.id)),
      createdBy: toObjectId(spec.members[0].id),
    });
  }

  // Add missing group members without removing existing members.
  for (const spec of groupSpecs) {
    await Group.updateOne(
      { _id: toObjectId(spec.id), name: spec.name },
      {
        $addToSet: {
          members: {
            $each: spec.members.map((m) => toObjectId(m.id)),
          },
        },
      }
    );
  }

  const expensesToCreate = expenseSpecs
    .filter(({ expense }) => !existingExpenseIds.has(expense[0]))
    .map(({ group, expense }) => {
      const [id, title, category, amount, payerIndex, daysAgo] =
        expense;

      const memberIds = group.members.map((m) =>
        toObjectId(m.id)
      );

      return {
        _id: toObjectId(id),
        group: toObjectId(group.id),
        title,
        category,
        amount,
        paidBy: memberIds[payerIndex],
        splits: equalSplit(amount, memberIds),
        date: dateDaysAgo(daysAgo),
      };
    });

  if (expensesToCreate.length) {
    await Expense.insertMany(expensesToCreate, { ordered: true });
  }

  const settlementsToCreate = settlementSpecs
    .filter(
      ({ settlement }) =>
        !existingSettlementIds.has(settlement[0])
    )
    .map(({ group, settlement }) => {
      const [id, fromIndex, toIndex, amount] = settlement;

      return {
        _id: toObjectId(id),
        group: toObjectId(group.id),
        from: toObjectId(group.members[fromIndex].id),
        to: toObjectId(group.members[toIndex].id),
        amount,
      };
    });

  if (settlementsToCreate.length) {
    await Settlement.insertMany(settlementsToCreate, {
      ordered: true,
    });
  }

  console.log("Demo seed completed successfully.");
  console.log("VU account password: Chand1");
  console.log("Charan account password: Charan");
  console.log("Existing records were preserved.");
}

seed()
  .catch((error) => {
    if (error.name === "ValidationError") {
      console.error("Validation error:");

      for (const [path, detail] of Object.entries(error.errors || {})) {
        console.error(`${path}: ${detail.message}`);
      }
    } else {
      console.error("Demo seed failed:", error.message);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });