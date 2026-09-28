// Seeds the starting data. Safe to run more than once: it only inserts into
// empty tables.
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/db");
  const { activityTypes, cleaningZones, members, roles } = await import("../src/db/schema");

  if ((await db.select().from(members).limit(1)).length === 0) {
    const names = [
      "Francess Thompson",
      "Emelia Sesay",
      "Mary Kargbo",
      "Mr. Joseph",
      "Mariama Issa",
      "Mabinty Kamara",
      "Grace Mbachu",
      "Helen Blessing Sesay",
      "Akifa Barrie",
      "Isata Feika",
      "Ramatu Turay",
      "Mrs. Bah",
      "Francess Browne",
      "Emily Fanday",
      "Kumba Sesay",
      "Jeremiah Kamara",
      "Ken Kargbo",
      "Emmanuel",
      "Petrina Tholley",
      "Agness Prinka",
    ];
    await db.insert(members).values(names.map((fullName) => ({ fullName })));
    console.log(`Added ${names.length} members`);
  }

  let roleIds: number[] = [];
  const existingRoles = await db.select().from(roles);
  if (existingRoles.length === 0) {
    const inserted = await db
      .insert(roles)
      .values([
        { name: "Opening Prayer", sortOrder: 1 },
        { name: "Word Sharing", sortOrder: 2 },
        { name: "Closing Prayer", sortOrder: 3 },
      ])
      .returning();
    roleIds = inserted.map((r) => r.id);
    console.log("Added roles");
  } else {
    roleIds = existingRoles.map((r) => r.id);
  }

  if ((await db.select().from(activityTypes).limit(1)).length === 0) {
    await db.insert(activityTypes).values([
      { name: "Service", hasCleaning: true, defaultRoleIds: roleIds },
      { name: "Evangelism", hasCleaning: false, defaultRoleIds: roleIds.slice(0, 1) },
      { name: "Prayer meeting", hasCleaning: false, defaultRoleIds: roleIds.slice(0, 2) },
    ]);
    console.log("Added activity types");
  }

  if ((await db.select().from(cleaningZones).limit(1)).length === 0) {
    await db.insert(cleaningZones).values([
      { name: "Balcony", sortOrder: 1, peopleNeeded: 1 },
      { name: "Corridors", sortOrder: 2, peopleNeeded: 1 },
      { name: "Stairways", sortOrder: 3, peopleNeeded: 1 },
      { name: "Downstairs and external areas", sortOrder: 4, peopleNeeded: 2 },
      { name: "Female toilets", sortOrder: 5, peopleNeeded: 1, genderRule: "female" },
      { name: "Male toilets", sortOrder: 6, peopleNeeded: 1, genderRule: "male" },
      { name: "Main auditorium", sortOrder: 7, peopleNeeded: 2 },
      { name: "Prayer room (downstairs, with adjacent toilets)", sortOrder: 8, peopleNeeded: 1 },
    ]);
    console.log("Added cleaning zones");
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
