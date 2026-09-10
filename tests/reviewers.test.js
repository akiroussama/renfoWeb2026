import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selectReviewers } from "../scripts/lib/reviewers.js";

const rand = () => 0.5;
const lower = (a) => [...a].map((s) => s.toLowerCase()).sort();

describe("selectReviewers", () => {
  it("sélectionne deux pairs distincts", () => {
    const r = selectReviewers({
      author: "alice",
      participants: [{ login: "alice" }, { login: "bob" }, { login: "carol" }],
      completedLogins: [],
      owner: "akiroussama",
      random: rand,
    });
    assert.equal(r.reviewers.length, 2);
    assert.equal(r.missing, 0);
    assert.deepEqual(lower(r.reviewers), ["bob", "carol"]);
  });
  it("exclut auteur et déduplique sans casse", () => {
    const r = selectReviewers({
      author: "Alice",
      participants: [
        { login: "ALICE" },
        { login: "Bob" },
        { login: "bob" },
        { login: "Carol" },
      ],
      completedLogins: [],
      owner: "akiroussama",
      random: rand,
    });
    assert.deepEqual(lower(r.reviewers), ["bob", "carol"]);
    assert.equal(r.missing, 0);
  });
  it("privilégie les logins terminés", () => {
    const r = selectReviewers({
      author: "alice",
      participants: [
        { login: "bob" },
        { login: "carol" },
        { login: "dave" },
        { login: "eve" },
      ],
      completedLogins: ["carol", "dave"],
      owner: "akiroussama",
      random: rand,
    });
    assert.deepEqual(lower(r.reviewers), ["carol", "dave"]);
    assert.equal(r.missing, 0);
  });
  it("préfère autre équipe parmi terminés", () => {
    const r = selectReviewers({
      author: "alice",
      participants: [
        { login: "alice", team: "core" },
        { login: "bob", team: "core" },
        { login: "carol", team: "docs" },
        { login: "dave", team: "docs" },
      ],
      completedLogins: ["bob", "carol", "dave"],
      owner: "akiroussama",
      random: rand,
    });
    assert.deepEqual(lower(r.reviewers), ["carol", "dave"]);
    assert.equal(r.missing, 0);
  });
  it("repli propriétaire avec un seul pair", () => {
    const r = selectReviewers({
      author: "alice",
      participants: [{ login: "alice" }, { login: "bob" }],
      completedLogins: [],
      owner: "akiroussama",
      random: rand,
    });
    assert.deepEqual(lower(r.reviewers), ["akiroussama", "bob"]);
    assert.equal(r.missing, 0);
  });
  it("propriétaire auteur jamais sélectionné", () => {
    const r = selectReviewers({
      author: "akiroussama",
      participants: [{ login: "akiroussama" }, { login: "bob" }],
      completedLogins: [],
      owner: "akiroussama",
      random: rand,
    });
    assert.deepEqual(lower(r.reviewers), ["bob"]);
    assert.equal(r.missing, 1);
  });
  it("sans pairs manque honnête", () => {
    const r = selectReviewers({
      author: "alice",
      participants: [{ login: "alice" }],
      completedLogins: [],
      owner: "akiroussama",
      random: rand,
    });
    assert.deepEqual(lower(r.reviewers), ["akiroussama"]);
    assert.equal(r.missing, 1);
  });
  it("ne mute pas les entrées", () => {
    const participants = [{ login: "bob" }, { login: "carol" }];
    const completedLogins = ["bob"];
    const snapP = JSON.stringify(participants);
    const snapC = JSON.stringify(completedLogins);
    selectReviewers({
      author: "alice",
      participants,
      completedLogins,
      owner: "akiroussama",
      random: rand,
    });
    assert.equal(JSON.stringify(participants), snapP);
    assert.equal(JSON.stringify(completedLogins), snapC);
  });
});
